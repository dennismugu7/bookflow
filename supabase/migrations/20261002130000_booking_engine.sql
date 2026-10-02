-- Booking engine: availability, holds, confirmation and status changes.
-- All booking logic lives here; the apps only call these functions.
--
-- Error codes (mirrored in @bookflow/shared):
--   BF400 invalid input · BF401 no verified phone · BF403 business rule · BF404 not found
--   BF409 slot not available · BF410 hold expired · BF422 status change not allowed
--   BF429 too many holds · 42501 role/ownership

-- Settings -------------------------------------------------------------------

-- The single source of the engine's constants.
create function private.booking_settings(
  out slot_step interval,
  out lead_time interval,
  out horizon_days int,
  out hold_duration interval,
  out holds_per_ip_per_hour int
)
language sql
immutable
set search_path = ''
as $$
  select interval '15 minutes', interval '30 minutes', 60, interval '10 minutes', 10;
$$;

-- Schema changes ---------------------------------------------------------------

-- sha256 of the visitor's hold token; the raw token is never stored.
alter table public.bookings add column hold_token_hash text;

create index bookings_hold_token_hash_idx on public.bookings (hold_token_hash)
  where hold_token_hash is not null;

create table private.hold_log (
  ip text not null,
  created_at timestamptz not null default now()
);

create index hold_log_ip_created_at_idx on private.hold_log (ip, created_at);

revoke all on private.hold_log from public, anon, authenticated;

-- Staff change bookings only through update_booking_status().
drop policy "bookings: owners or own staff update" on public.bookings;

create policy "bookings: owners update"
  on public.bookings for update to authenticated
  using (private.is_salon_owner(salon_id))
  with check (private.is_salon_owner(salon_id));

-- Last-owner protection --------------------------------------------------------

create function private.protect_last_owner()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if old.role <> 'owner' or (tg_op = 'UPDATE' and new.role = 'owner') then
    return coalesce(new, old);
  end if;

  -- During a salon delete the salon row is already gone, so the cascade is allowed.
  if exists (select 1 from public.salons s where s.id = old.salon_id)
     and not exists (
       select 1 from public.salon_members m
       where m.salon_id = old.salon_id and m.role = 'owner' and m.user_id <> old.user_id
     ) then
    raise exception 'A salon must keep at least one owner' using errcode = 'BF403';
  end if;

  return coalesce(new, old);
end;
$$;

create trigger salon_members_protect_last_owner
  before delete or update of role on public.salon_members
  for each row execute function private.protect_last_owner();

-- Helpers ----------------------------------------------------------------------

create function private.hold_token_hash(p_hold_token text)
returns text
language plpgsql
stable
set search_path = ''
as $$
begin
  -- Restricting the alphabet keeps the hash well defined (no bytea escape sequences).
  if p_hold_token is null or p_hold_token !~ '^[A-Za-z0-9_-]{20,128}$' then
    raise exception 'Invalid hold token' using errcode = 'BF400';
  end if;
  return encode(sha256(convert_to(p_hold_token, 'UTF8')), 'hex');
end;
$$;

-- Availability -------------------------------------------------------------------

create function public.get_availability(
  p_salon_slug text,
  p_service_ids uuid[],
  p_date date,
  p_staff_id uuid default null
)
returns table (staff_id uuid, starts_at timestamptz, ends_at timestamptz)
language plpgsql
stable
security definer
set search_path = ''
as $$
#variable_conflict use_column
declare
  v_settings record;
  v_salon public.salons;
  v_service_count int;
  v_matched int;
  v_duration interval;
  v_today date;
  v_weekday smallint;
begin
  select * into v_settings from private.booking_settings();

  select * into v_salon from public.salons s where s.slug = p_salon_slug and s.is_published;
  if not found then
    raise exception 'Salon not found' using errcode = 'BF404';
  end if;

  v_service_count := coalesce(cardinality(p_service_ids), 0);
  if v_service_count = 0 then
    raise exception 'No services requested' using errcode = 'BF404';
  end if;
  if (select count(distinct x) from unnest(p_service_ids) as x) <> v_service_count then
    raise exception 'Duplicate services requested' using errcode = 'BF400';
  end if;

  select count(*), make_interval(mins => coalesce(sum(sv.duration_min), 0)::int)
    into v_matched, v_duration
    from public.services sv
   where sv.salon_id = v_salon.id and sv.is_bookable and sv.id = any (p_service_ids);
  if v_matched <> v_service_count then
    raise exception 'Service not found' using errcode = 'BF404';
  end if;

  if p_staff_id is not null and not exists (
    select 1 from public.staff st
    where st.id = p_staff_id and st.salon_id = v_salon.id and st.is_active
  ) then
    raise exception 'Staff member not found' using errcode = 'BF404';
  end if;

  v_today := (now() at time zone v_salon.timezone)::date;
  if p_date is null or p_date < v_today or p_date > v_today + v_settings.horizon_days then
    return;
  end if;
  v_weekday := extract(isodow from p_date)::smallint;

  return query
  with candidates as (
    select st.id, st.sort_order
      from public.staff st
     where st.salon_id = v_salon.id
       and st.is_active
       and (p_staff_id is null or st.id = p_staff_id)
       and (select count(*) from public.staff_services ss
             where ss.staff_id = st.id and ss.service_id = any (p_service_ids)) = v_service_count
  ),
  -- Staff hours for the weekday replace the salon's opening hours for that staff member.
  windows as (
    select c.id as staff_id, c.sort_order,
           (p_date + sh.starts) at time zone v_salon.timezone as window_start,
           (p_date + sh.ends) at time zone v_salon.timezone as window_end
      from candidates c
      join public.staff_hours sh on sh.staff_id = c.id and sh.weekday = v_weekday
    union all
    select c.id, c.sort_order,
           (p_date + oh.opens) at time zone v_salon.timezone,
           (p_date + oh.closes) at time zone v_salon.timezone
      from candidates c
      join public.opening_hours oh on oh.salon_id = v_salon.id and oh.weekday = v_weekday
     where not exists (
       select 1 from public.staff_hours sh where sh.staff_id = c.id and sh.weekday = v_weekday
     )
  ),
  slots as (
    select distinct w.staff_id, w.sort_order, gs as starts_at, gs + v_duration as ends_at
      from windows w
     cross join lateral generate_series(w.window_start, w.window_end - v_duration, v_settings.slot_step) as gs
  )
  select sl.staff_id, sl.starts_at, sl.ends_at
    from slots sl
   where sl.starts_at >= now() + v_settings.lead_time
     and not exists (
       select 1 from public.bookings b
        where b.staff_id = sl.staff_id
          and b.period && tstzrange(sl.starts_at, sl.ends_at)
          and (b.status in ('confirmed', 'completed', 'no_show')
               or (b.status = 'held' and b.hold_expires_at > now()))
     )
     and not exists (
       select 1 from public.time_off t
        where t.staff_id = sl.staff_id and t.period && tstzrange(sl.starts_at, sl.ends_at)
     )
   order by sl.starts_at, sl.sort_order, sl.staff_id;
end;
$$;

-- Holds ----------------------------------------------------------------------

create function public.create_hold(
  p_salon_slug text,
  p_service_ids uuid[],
  p_starts_at timestamptz,
  p_staff_id uuid,
  p_hold_token text
)
returns table (hold_id uuid, staff_id uuid, expires_at timestamptz)
language plpgsql
volatile
security definer
set search_path = ''
as $$
#variable_conflict use_column
declare
  v_settings record;
  v_token_hash text;
  v_ip text;
  v_salon public.salons;
  v_staff_id uuid;
  v_duration interval;
  v_total int;
  v_period tstzrange;
  v_booking_id uuid;
  v_expires_at timestamptz;
begin
  select * into v_settings from private.booking_settings();

  -- 1. Token
  v_token_hash := private.hold_token_hash(p_hold_token);

  -- 2. Rate limit per client IP (first x-forwarded-for entry).
  v_ip := coalesce(
    nullif(btrim(split_part(
      nullif(current_setting('request.headers', true), '')::jsonb ->> 'x-forwarded-for', ',', 1)), ''),
    'unknown');
  delete from private.hold_log where created_at < now() - interval '1 day';
  if (select count(*) from private.hold_log h
       where h.ip = v_ip and h.created_at > now() - interval '1 hour') >= v_settings.holds_per_ip_per_hour then
    raise exception 'Too many holds, try again later' using errcode = 'BF429';
  end if;

  -- 3. One active hold per visitor.
  update public.bookings b set status = 'expired'
   where b.hold_token_hash = v_token_hash and b.status = 'held';

  -- 4. The slot must be offered right now (also validates salon, services and staff).
  select * into v_salon from public.salons s where s.slug = p_salon_slug and s.is_published;
  if not found then
    raise exception 'Salon not found' using errcode = 'BF404';
  end if;

  select a.staff_id into v_staff_id
    from public.get_availability(p_salon_slug, p_service_ids,
                                 (p_starts_at at time zone v_salon.timezone)::date, p_staff_id) a
    join public.staff st on st.id = a.staff_id
   where a.starts_at = p_starts_at
   order by st.sort_order, st.id
   limit 1;
  if v_staff_id is null then
    raise exception 'Slot not available' using errcode = 'BF409';
  end if;

  select make_interval(mins => sum(sv.duration_min)::int), sum(sv.price_kes)::int
    into v_duration, v_total
    from public.services sv
   where sv.salon_id = v_salon.id and sv.id = any (p_service_ids);
  v_period := tstzrange(p_starts_at, p_starts_at + v_duration);

  -- 5. Lapsed holds still count for the exclusion constraint until they are marked expired.
  update public.bookings b set status = 'expired'
   where b.staff_id = v_staff_id and b.status = 'held'
     and b.hold_expires_at <= now() and b.period && v_period;

  -- 6. Insert the hold. A concurrent request for the same slot loses on the exclusion constraint.
  v_expires_at := now() + v_settings.hold_duration;
  begin
    insert into public.bookings
      (salon_id, staff_id, status, period, hold_expires_at, hold_token_hash, total_kes, source)
    values
      (v_salon.id, v_staff_id, 'held', v_period, v_expires_at, v_token_hash, v_total, 'web')
    returning id into v_booking_id;
  exception when exclusion_violation then
    raise exception 'Slot not available' using errcode = 'BF409';
  end;

  insert into public.booking_services (booking_id, service_id, name, duration_min, price_kes, position)
  select v_booking_id, sv.id, sv.name, sv.duration_min, sv.price_kes, (req.ord - 1)::smallint
    from unnest(p_service_ids) with ordinality as req (service_id, ord)
    join public.services sv on sv.id = req.service_id
   order by req.ord;

  insert into public.booking_events (booking_id, actor_id, type)
  values (v_booking_id, auth.uid(), 'held');

  insert into private.hold_log (ip) values (v_ip);

  return query select v_booking_id, v_staff_id, v_expires_at;
end;
$$;

create function public.release_hold(p_hold_token text)
returns void
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  v_booking_id uuid;
begin
  update public.bookings b set status = 'expired'
   where b.hold_token_hash = private.hold_token_hash(p_hold_token)
     and b.status = 'held' and b.hold_expires_at > now()
  returning b.id into v_booking_id;

  if v_booking_id is null then
    raise exception 'Hold not found' using errcode = 'BF404';
  end if;

  insert into public.booking_events (booking_id, actor_id, type)
  values (v_booking_id, auth.uid(), 'released');
end;
$$;

-- Confirmation ---------------------------------------------------------------

create function public.confirm_booking(p_hold_token text, p_full_name text)
returns uuid
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  v_user_id uuid := auth.uid();
  v_phone text;
  v_name text := btrim(p_full_name);
  v_token_hash text;
  v_booking public.bookings;
  v_client_id uuid;
begin
  if v_user_id is null then
    raise exception 'Sign in to confirm a booking' using errcode = '42501';
  end if;

  select nullif(btrim(u.phone), '') into v_phone from auth.users u where u.id = v_user_id;
  if v_phone is null then
    raise exception 'A verified phone number is required' using errcode = 'BF401';
  end if;
  if left(v_phone, 1) <> '+' then
    v_phone := '+' || v_phone;
  end if;

  if v_name is null or char_length(v_name) not between 1 and 80 then
    raise exception 'Name must be 1-80 characters' using errcode = 'BF400';
  end if;

  v_token_hash := private.hold_token_hash(p_hold_token);

  select * into v_booking from public.bookings b
   where b.hold_token_hash = v_token_hash and b.status = 'held'
   for update;
  if not found then
    raise exception 'Hold not found' using errcode = 'BF404';
  end if;
  if v_booking.hold_expires_at <= now() then
    -- Note: the raise rolls this back; a lapsed hold is already ignored by availability.
    update public.bookings set status = 'expired' where id = v_booking.id;
    raise exception 'Hold expired' using errcode = 'BF410';
  end if;

  -- Keep an existing client's name: the owner may have edited it.
  insert into public.clients as c (salon_id, full_name, phone, user_id)
  values (v_booking.salon_id, v_name, v_phone, v_user_id)
  on conflict (salon_id, phone) do update
    set user_id = coalesce(c.user_id, excluded.user_id)
  returning c.id into v_client_id;

  update public.bookings
     set status = 'confirmed', client_id = v_client_id, hold_token_hash = null
   where id = v_booking.id;

  insert into public.booking_events (booking_id, actor_id, type)
  values (v_booking.id, v_user_id, 'confirmed');

  return v_booking.id;
end;
$$;

-- Status changes ---------------------------------------------------------------

create function public.update_booking_status(
  p_booking_id uuid,
  p_status public.booking_status,
  p_reason text default null
)
returns void
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  v_user_id uuid := auth.uid();
  v_booking public.bookings;
begin
  if v_user_id is null then
    raise exception 'Sign in to change bookings' using errcode = '42501';
  end if;

  select * into v_booking from public.bookings b
   where b.id = p_booking_id and private.is_salon_member(b.salon_id)
   for update;
  if not found then
    raise exception 'Booking not found' using errcode = 'BF404';
  end if;

  if not (v_booking.status = 'confirmed' and p_status in ('completed', 'no_show', 'cancelled')) then
    raise exception 'Cannot change a % booking to %', v_booking.status, p_status using errcode = 'BF422';
  end if;

  if not private.is_salon_owner(v_booking.salon_id)
     and (v_booking.staff_id is distinct from private.my_staff_id(v_booking.salon_id)
          or p_status not in ('completed', 'no_show')) then
    raise exception 'Not allowed to make this change' using errcode = '42501';
  end if;

  update public.bookings
     set status = p_status,
         cancel_reason = case when p_status = 'cancelled' then p_reason else cancel_reason end
   where id = v_booking.id;

  insert into public.booking_events (booking_id, actor_id, type, data)
  values (v_booking.id, v_user_id, 'status_changed',
          jsonb_build_object('from', v_booking.status, 'to', p_status, 'reason', p_reason));
end;
$$;

-- Execute grants ---------------------------------------------------------------

revoke execute on function public.get_availability(text, uuid[], date, uuid) from public;
revoke execute on function public.create_hold(text, uuid[], timestamptz, uuid, text) from public;
revoke execute on function public.release_hold(text) from public;
grant execute on function public.get_availability(text, uuid[], date, uuid) to anon, authenticated;
grant execute on function public.create_hold(text, uuid[], timestamptz, uuid, text) to anon, authenticated;
grant execute on function public.release_hold(text) to anon, authenticated;

revoke execute on function public.confirm_booking(text, text) from public, anon;
revoke execute on function public.update_booking_status(uuid, public.booking_status, text) from public, anon;
grant execute on function public.confirm_booking(text, text) to authenticated;
grant execute on function public.update_booking_status(uuid, public.booking_status, text) to authenticated;
