-- Phase 4b/4c: the owner's Calendar (a day or a week, per team member, with time off and closed
-- days) and Clients (a searchable list with segments, a profile with stats and private notes).

-- One booking as the agenda shows it ------------------------------------------------------------

-- Shared by get_day_agenda, get_range_agenda and get_client_profile so the item shape stays the
-- same everywhere. Called only from those security definer functions.
create function private.agenda_booking_item(p_booking public.bookings)
returns jsonb
language sql
stable
set search_path = ''
as $$
  select jsonb_build_object(
    'id', p_booking.id,
    'status', p_booking.status,
    'starts_at', lower(p_booking.period),
    'ends_at', upper(p_booking.period),
    'source', p_booking.source,
    'is_new', p_booking.source = 'web' and p_booking.created_at > now() - interval '24 hours',
    'staff_id', p_booking.staff_id,
    'staff_name', st.display_name,
    'total_kes', p_booking.total_kes,
    'client', case when c.id is null then null else jsonb_build_object(
      'id', c.id,
      'full_name', c.full_name,
      'phone', c.phone,
      'phone_verified', c.phone_verified,
      'visit_number', (
        select count(*) from public.bookings v
         where v.salon_id = p_booking.salon_id and v.client_id = c.id
           and v.status in ('confirmed', 'completed')
           and lower(v.period) <= lower(p_booking.period))) end,
    'services', coalesce((
      select jsonb_agg(jsonb_build_object(
               'name', bs.name, 'duration_min', bs.duration_min, 'price_kes', bs.price_kes)
             order by bs.position)
        from public.booking_services bs
       where bs.booking_id = p_booking.id), '[]'::jsonb))
  from public.staff st
  left join public.clients c on c.id = p_booking.client_id
 where st.id = p_booking.staff_id;
$$;

revoke execute on function private.agenda_booking_item(public.bookings) from public, anon, authenticated;

-- get_day_agenda, now built on the shared item (output unchanged) ------------------------------

create or replace function public.get_day_agenda(p_salon_id uuid, p_date date)
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

  select coalesce(jsonb_agg(private.agenda_booking_item(b) order by lower(b.period), b.id), '[]'::jsonb)
    into v_bookings
    from public.bookings b
   where b.salon_id = p_salon_id
     and b.status in ('confirmed', 'completed', 'no_show')
     and lower(b.period) <@ v_day;

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

-- get_range_agenda --------------------------------------------------------------------------

-- Up to a week of days for the Calendar: the team, and for each date in the salon's zone its
-- opening windows (none = closed), bookings and time off.
create function public.get_range_agenda(p_salon_id uuid, p_from date, p_to date)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_zone text;
begin
  if not private.is_salon_member(p_salon_id) then
    raise exception 'Not a member of this salon' using errcode = '42501';
  end if;
  if p_from is null or p_to is null or p_to < p_from or p_to - p_from > 6 then
    raise exception 'Pick a range of one to seven days' using errcode = 'BF400';
  end if;

  select s.timezone into v_zone from public.salons s where s.id = p_salon_id;

  return jsonb_build_object(
    'staff', (
      select coalesce(jsonb_agg(jsonb_build_object(
               'id', st.id,
               'name', st.display_name,
               'photo_path', st.photo_path,
               'sort_order', st.sort_order,
               'active', st.is_active)
             order by st.sort_order, st.created_at, st.id), '[]'::jsonb)
        from public.staff st
       where st.salon_id = p_salon_id),
    'days', (
      select jsonb_agg(jsonb_build_object(
               'date', day.d,
               'open', (
                 select coalesce(jsonb_agg(jsonb_build_object(
                          'opens', to_char(oh.opens, 'HH24:MI'),
                          'closes', to_char(oh.closes, 'HH24:MI'))
                        order by oh.opens), '[]'::jsonb)
                   from public.opening_hours oh
                  where oh.salon_id = p_salon_id and oh.weekday = extract(isodow from day.d)),
               'bookings', (
                 select coalesce(jsonb_agg(private.agenda_booking_item(b)
                                           order by lower(b.period), b.id), '[]'::jsonb)
                   from public.bookings b
                  where b.salon_id = p_salon_id
                    and b.status in ('confirmed', 'completed', 'no_show')
                    and lower(b.period) <@ day.r),
               'time_off', (
                 select coalesce(jsonb_agg(jsonb_build_object(
                          'staff_id', t.staff_id,
                          'starts_at', lower(t.period),
                          'ends_at', upper(t.period),
                          'reason', t.reason)
                        order by lower(t.period), t.id), '[]'::jsonb)
                   from public.time_off t
                  where t.salon_id = p_salon_id and t.period && day.r))
             order by day.d)
        from (
          select g::date as d,
                 tstzrange(g::date::timestamp at time zone v_zone,
                           (g::date + 1)::timestamp at time zone v_zone) as r
            from generate_series(p_from, p_to, interval '1 day') as g
        ) as day));
end;
$$;

revoke execute on function public.get_range_agenda(uuid, date, date) from public, anon;
grant execute on function public.get_range_agenda(uuid, date, date) to authenticated;

-- Client facts ------------------------------------------------------------------------------

-- Visits, gaps and segments for each client of a salon, at query time. Shared by get_clients and
-- get_client_profile. A "visit" is a completed booking.
create function private.client_facts(p_salon_id uuid)
returns table (
  client_id uuid,
  visits int,
  spent_kes int,
  no_shows int,
  last_visit timestamptz,
  next_booking timestamptz,
  avg_gap_days numeric,
  segments text[]
)
language sql
stable
set search_path = ''
as $$
  with per_client as (
    select c.id,
           count(*) filter (where b.status = 'completed')::int as visits,
           coalesce(sum(b.total_kes) filter (where b.status = 'completed'), 0)::int as spent_kes,
           count(*) filter (where b.status = 'no_show')::int as no_shows,
           min(lower(b.period)) filter (where b.status = 'completed') as first_visit,
           max(lower(b.period)) filter (where b.status = 'completed') as last_visit,
           min(lower(b.period)) filter (where b.status = 'confirmed' and upper(b.period) > now())
             as next_booking,
           min(lower(b.period)) filter (where b.status in ('confirmed', 'completed', 'no_show'))
             as first_booking
      from public.clients c
      left join public.bookings b on b.client_id = c.id and b.salon_id = c.salon_id
     where c.salon_id = p_salon_id
     group by c.id
  ), with_gap as (
    select pc.*,
           -- The average of the gaps between consecutive visits is the span over the gap count.
           case when pc.visits >= 2 then
             round((extract(epoch from pc.last_visit - pc.first_visit) / 86400 / (pc.visits - 1))::numeric, 1)
           end as avg_gap_days
      from per_client pc
  )
  select g.id, g.visits, g.spent_kes, g.no_shows, g.last_visit, g.next_booking, g.avg_gap_days,
         array_remove(array[
           case when g.first_booking >= now() - interval '30 days' then 'new' end,
           case when g.visits >= 3 then 'regular' end,
           case when g.visits >= 1
                 and g.next_booking is null
                 and extract(epoch from now() - g.last_visit) / 86400
                     > greatest(60, 2 * g.avg_gap_days) then 'lapsed' end
         ], null)
    from with_gap g;
$$;

revoke execute on function private.client_facts(uuid) from public, anon, authenticated;

-- get_clients -------------------------------------------------------------------------------

-- The client list: counts per segment for the whole salon, and up to 200 clients matching the
-- search (name, or phone digits) and segment, soonest booking first, then latest visit, then name.
create function public.get_clients(p_salon_id uuid, p_search text default null, p_segment text default 'all')
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_segment text := coalesce(p_segment, 'all');
  v_text text := nullif(btrim(coalesce(p_search, '')), '');
  v_digits text;
  v_like text;
begin
  if not private.is_salon_member(p_salon_id) then
    raise exception 'Not a member of this salon' using errcode = '42501';
  end if;
  if v_segment not in ('all', 'new', 'regular', 'lapsed') then
    raise exception 'Unknown segment' using errcode = 'BF400';
  end if;

  if v_text is not null then
    v_like := '%' || replace(replace(replace(v_text, '\', '\\'), '%', '\%'), '_', '\_') || '%';
    -- "0712" also finds "+254712…"; a lone digit is too broad to match phones on.
    v_digits := ltrim(regexp_replace(v_text, '\D', '', 'g'), '0');
    if char_length(v_digits) < 2 then
      v_digits := null;
    end if;
  end if;

  return (
    with facts as (
      select f.*, c.full_name, c.phone, c.phone_verified
        from private.client_facts(p_salon_id) f
        join public.clients c on c.id = f.client_id
    )
    select jsonb_build_object(
      'counts', jsonb_build_object(
        'all', (select count(*) from facts),
        'new', (select count(*) from facts where 'new' = any (segments)),
        'regular', (select count(*) from facts where 'regular' = any (segments)),
        'lapsed', (select count(*) from facts where 'lapsed' = any (segments))),
      'clients', coalesce((
        select jsonb_agg(jsonb_build_object(
                 'id', x.client_id,
                 'full_name', x.full_name,
                 'phone', x.phone,
                 'phone_verified', x.phone_verified,
                 'visits', x.visits,
                 'last_visit', x.last_visit,
                 'next_booking', x.next_booking,
                 'avg_gap_days', x.avg_gap_days,
                 'segments', to_jsonb(x.segments))
               order by x.next_booking asc nulls last, x.last_visit desc nulls last,
                        lower(x.full_name), x.client_id)
          from (
            select * from facts
             where (v_segment = 'all' or v_segment = any (segments))
               and (v_text is null
                    or full_name ilike v_like
                    or (v_digits is not null and phone like '%' || v_digits || '%'))
             order by next_booking asc nulls last, last_visit desc nulls last,
                      lower(full_name), client_id
             limit 200
          ) as x), '[]'::jsonb)));
end;
$$;

revoke execute on function public.get_clients(uuid, text, text) from public, anon;
grant execute on function public.get_clients(uuid, text, text) to authenticated;

-- get_client_profile ------------------------------------------------------------------------

-- One client for the owner: details, stats, the next booking and up to 50 past visits. Anyone who
-- isn't a member of the client's salon gets BF404, so a client's existence isn't revealed.
create function public.get_client_profile(p_client_id uuid)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_client public.clients;
  v_facts record;
begin
  select * into v_client from public.clients c where c.id = p_client_id;
  if v_client.id is null or not private.is_salon_member(v_client.salon_id) then
    raise exception 'Client not found' using errcode = 'BF404';
  end if;

  select * into v_facts from private.client_facts(v_client.salon_id) f where f.client_id = v_client.id;

  return jsonb_build_object(
    'client', jsonb_build_object(
      'id', v_client.id,
      'full_name', v_client.full_name,
      'phone', v_client.phone,
      'phone_verified', v_client.phone_verified,
      'notes', v_client.notes,
      'has_account', v_client.user_id is not null),
    'stats', jsonb_build_object(
      'visits', v_facts.visits,
      'spent_kes', v_facts.spent_kes,
      'avg_gap_days', v_facts.avg_gap_days,
      'no_shows', v_facts.no_shows),
    'upcoming', (
      select private.agenda_booking_item(b)
        from public.bookings b
       where b.salon_id = v_client.salon_id and b.client_id = v_client.id
         and b.status = 'confirmed' and upper(b.period) > now()
       order by lower(b.period), b.id
       limit 1),
    'past', (
      select coalesce(jsonb_agg(private.agenda_booking_item(p) order by lower(p.period) desc, p.id),
                      '[]'::jsonb)
        from public.bookings p
       where p.id in (
         select b.id from public.bookings b
          where b.salon_id = v_client.salon_id and b.client_id = v_client.id
            and b.status in ('completed', 'no_show')
          order by lower(b.period) desc, b.id
          limit 50)));
end;
$$;

revoke execute on function public.get_client_profile(uuid) from public, anon;
grant execute on function public.get_client_profile(uuid) to authenticated;

-- Notes -------------------------------------------------------------------------------------

-- Owners save notes with a direct update (the owner update policy); keep them short.
alter table public.clients
  add constraint clients_notes_length check (notes is null or char_length(notes) <= 1000);
