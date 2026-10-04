-- Phase 4a: the owner's Today. The day's agenda with stats and free gaps, walk-in and phone
-- bookings added by the owner, and realtime updates for bookings.

-- Walk-ins may have no phone ---------------------------------------------------------------

-- The E.164 check passes on null, and the verified-phone unique index only covers phones that are
-- present. Both confirm functions still always set a phone.
alter table public.clients alter column phone drop not null;

-- get_day_agenda ----------------------------------------------------------------------------

-- One salon's day for its members: the bookings in time order, the stats tiles and the free gaps.
-- A gap is open time when no one in the salon is booked (a v1 simplification; per-staff free time
-- comes with the Calendar in 4b).
create function public.get_day_agenda(p_salon_id uuid, p_date date)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_salon public.salons;
  v_day tstzrange;
  v_open tstzmultirange;
  v_busy tstzmultirange;
  v_from timestamptz;
  v_bookings jsonb;
  v_gaps jsonb;
begin
  if not private.is_salon_member(p_salon_id) then
    raise exception 'Not a member of this salon' using errcode = '42501';
  end if;
  if p_date is null then
    raise exception 'A date is required' using errcode = 'BF400';
  end if;

  select * into v_salon from public.salons s where s.id = p_salon_id;
  v_day := tstzrange(p_date::timestamp at time zone v_salon.timezone,
                     (p_date + 1)::timestamp at time zone v_salon.timezone);

  select coalesce(jsonb_agg(rows.item order by rows.starts_at, rows.id), '[]'::jsonb)
    into v_bookings
    from (
      select lower(b.period) as starts_at, b.id, jsonb_build_object(
               'id', b.id,
               'status', b.status,
               'starts_at', lower(b.period),
               'ends_at', upper(b.period),
               'source', b.source,
               'is_new', b.source = 'web' and b.created_at > now() - interval '24 hours',
               'staff_id', b.staff_id,
               'staff_name', st.display_name,
               'total_kes', b.total_kes,
               'client', case when c.id is null then null else jsonb_build_object(
                 'id', c.id,
                 'full_name', c.full_name,
                 'phone', c.phone,
                 'phone_verified', c.phone_verified,
                 'visit_number', (
                   select count(*) from public.bookings v
                    where v.salon_id = b.salon_id and v.client_id = c.id
                      and v.status in ('confirmed', 'completed')
                      and lower(v.period) <= lower(b.period))) end,
               'services', coalesce((
                 select jsonb_agg(jsonb_build_object(
                          'name', bs.name, 'duration_min', bs.duration_min, 'price_kes', bs.price_kes)
                        order by bs.position)
                   from public.booking_services bs
                  where bs.booking_id = b.id), '[]'::jsonb)) as item
        from public.bookings b
        join public.staff st on st.id = b.staff_id
        left join public.clients c on c.id = b.client_id
       where b.salon_id = p_salon_id
         and b.status in ('confirmed', 'completed', 'no_show')
         and lower(b.period) <@ v_day
    ) as rows;

  -- Open time for the weekday, minus everything taken by any staff member.
  select range_agg(tstzrange((p_date + oh.opens) at time zone v_salon.timezone,
                             (p_date + oh.closes) at time zone v_salon.timezone))
    into v_open
    from public.opening_hours oh
   where oh.salon_id = p_salon_id and oh.weekday = extract(isodow from p_date);

  select range_agg(b.period) into v_busy
    from public.bookings b
   where b.salon_id = p_salon_id
     and b.period && v_day
     and (b.status in ('confirmed', 'completed', 'no_show')
          or (b.status = 'held' and b.hold_expires_at > now()));

  -- Today, nothing before now, rounded up to the next 5 minutes.
  if p_date = (now() at time zone v_salon.timezone)::date then
    v_from := to_timestamp(ceil(extract(epoch from now()) / 300) * 300);
    v_open := v_open * tstzmultirange(tstzrange(v_from, null));
  end if;

  select coalesce(jsonb_agg(jsonb_build_object(
           'starts_at', lower(g),
           'ends_at', upper(g),
           'minutes', (extract(epoch from upper(g) - lower(g)) / 60)::int)
         order by lower(g)), '[]'::jsonb)
    into v_gaps
    from unnest(coalesce(v_open, '{}'::tstzmultirange) - coalesce(v_busy, '{}'::tstzmultirange)) as g
   where upper(g) - lower(g) >= interval '30 minutes';

  return jsonb_build_object(
    'date', p_date,
    'stats', jsonb_build_object(
      'booked', (select count(*) from jsonb_array_elements(v_bookings) x
                  where x ->> 'status' in ('confirmed', 'completed')),
      'expected_kes', (select coalesce(sum((x ->> 'total_kes')::int), 0) from jsonb_array_elements(v_bookings) x
                        where x ->> 'status' in ('confirmed', 'completed')),
      'free_min', (select coalesce(sum((x ->> 'minutes')::int), 0) from jsonb_array_elements(v_gaps) x)),
    'bookings', v_bookings,
    'gaps', v_gaps);
end;
$$;

revoke execute on function public.get_day_agenda(uuid, date) from public, anon;
grant execute on function public.get_day_agenda(uuid, date) to authenticated;

-- owner_create_booking ----------------------------------------------------------------------

-- A walk-in or phone booking added by an owner: confirmed at once, priced from the services.
-- Opening hours aren't enforced (the app warns first); overlaps are, by the exclusion constraint.
create function public.owner_create_booking(
  p_salon_id uuid,
  p_staff_id uuid,
  p_service_ids uuid[],
  p_starts_at timestamptz,
  p_client_id uuid default null,
  p_client_name text default null,
  p_client_phone text default null
)
returns uuid
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  v_service_count int := coalesce(cardinality(p_service_ids), 0);
  v_matched int;
  v_duration interval;
  v_total int;
  v_name text := btrim(p_client_name);
  v_phone text;
  v_client_id uuid;
  v_period tstzrange;
  v_booking_id uuid;
begin
  if not private.is_salon_owner(p_salon_id) then
    raise exception 'Only owners can add bookings' using errcode = '42501';
  end if;
  if p_starts_at is null then
    raise exception 'A start time is required' using errcode = 'BF400';
  end if;

  -- Services and staff -----------------------------------------------------------------------
  select count(*), make_interval(mins => coalesce(sum(sv.duration_min), 0)::int),
         coalesce(sum(sv.price_kes), 0)::int
    into v_matched, v_duration, v_total
    from public.services sv
   where sv.salon_id = p_salon_id and sv.is_bookable and sv.id = any (p_service_ids);
  if v_service_count = 0
     or v_matched <> v_service_count
     or (select count(distinct x) from unnest(p_service_ids) as x) <> v_service_count then
    raise exception 'Pick services this salon offers' using errcode = 'BF422';
  end if;

  if not exists (
    select 1 from public.staff st
     where st.id = p_staff_id and st.salon_id = p_salon_id and st.is_active
  ) or (select count(*) from public.staff_services ss
         where ss.staff_id = p_staff_id and ss.service_id = any (p_service_ids)) <> v_service_count then
    raise exception 'This team member does not offer these services' using errcode = 'BF422';
  end if;

  -- Client: an existing one, or a new one by name (an optional phone reuses a match) ----------
  if p_client_id is not null then
    select c.id into v_client_id from public.clients c
     where c.id = p_client_id and c.salon_id = p_salon_id;
    if v_client_id is null then
      raise exception 'Client not found' using errcode = 'BF404';
    end if;
  elsif v_name is not null and v_name <> '' then
    if char_length(v_name) > 80 then
      raise exception 'Name must be 1-80 characters' using errcode = 'BF400';
    end if;
    if nullif(btrim(p_client_phone), '') is not null then
      v_phone := private.normalize_kenyan_phone(p_client_phone);
      if v_phone is null then
        raise exception 'Enter a valid phone number' using errcode = 'BF400';
      end if;
      select c.id into v_client_id from public.clients c
       where c.salon_id = p_salon_id and c.phone = v_phone
       order by c.phone_verified desc, c.created_at, c.id
       limit 1;
    end if;
    if v_client_id is null then
      insert into public.clients (salon_id, full_name, phone)
      values (p_salon_id, v_name, v_phone)
      returning id into v_client_id;
    end if;
  else
    raise exception 'Pick a client or type a name' using errcode = 'BF400';
  end if;

  -- The booking ------------------------------------------------------------------------------
  v_period := tstzrange(p_starts_at, p_starts_at + v_duration);

  -- Lapsed holds still count for the exclusion constraint until they are marked expired.
  update public.bookings b set status = 'expired'
   where b.staff_id = p_staff_id and b.status = 'held'
     and b.hold_expires_at <= now() and b.period && v_period;

  begin
    insert into public.bookings (salon_id, staff_id, client_id, status, period, total_kes, source)
    values (p_salon_id, p_staff_id, v_client_id, 'confirmed', v_period, v_total, 'owner')
    returning id into v_booking_id;
  exception when exclusion_violation then
    raise exception 'That time is taken' using errcode = 'BF409';
  end;

  insert into public.booking_services (booking_id, service_id, name, duration_min, price_kes, position)
  select v_booking_id, sv.id, sv.name, sv.duration_min, sv.price_kes, (req.ord - 1)::smallint
    from unnest(p_service_ids) with ordinality as req (service_id, ord)
    join public.services sv on sv.id = req.service_id
   order by req.ord;

  insert into public.booking_events (booking_id, actor_id, type, data)
  values (v_booking_id, auth.uid(), 'created', '{"by": "owner"}');

  return v_booking_id;
end;
$$;

revoke execute on function public.owner_create_booking(uuid, uuid, uuid[], timestamptz, uuid, text, text)
  from public, anon;
grant execute on function public.owner_create_booking(uuid, uuid, uuid[], timestamptz, uuid, text, text)
  to authenticated;

-- Realtime ----------------------------------------------------------------------------------

-- Today refetches when a booking changes. Realtime applies the bookings RLS policies, so only the
-- salon's members receive its changes.
alter publication supabase_realtime add table public.bookings;
