-- Phase 3a: holds are created only by our server (ADR 0008), and clients can read their booking.

-- create_hold: server-only, with the client IP passed in --------------------------------

drop function public.create_hold(text, uuid[], timestamptz, uuid, text);

create function public.create_hold(
  p_salon_slug text,
  p_service_ids uuid[],
  p_starts_at timestamptz,
  p_staff_id uuid,
  p_hold_token text,
  p_client_ip text
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

  -- 2. Rate limit per client IP, as reported by our server from Vercel's own headers (ADR 0008).
  begin
    v_ip := host(nullif(btrim(p_client_ip), '')::inet);
  exception when invalid_text_representation then
    v_ip := null;
  end;
  if v_ip is null then
    raise exception 'A valid client address is required' using errcode = 'BF400';
  end if;
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

revoke execute on function public.create_hold(text, uuid[], timestamptz, uuid, text, text)
  from public, anon, authenticated;
grant execute on function public.create_hold(text, uuid[], timestamptz, uuid, text, text) to service_role;

-- get_my_booking ---------------------------------------------------------------------------

-- The signed-in client's own booking. Anything else, including unknown ids, is BF404 so the
-- function never reveals whether a booking exists.
create function public.get_my_booking(p_booking_id uuid)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_user_id uuid := auth.uid();
  v_result jsonb;
begin
  if v_user_id is null then
    raise exception 'Sign in to see this booking' using errcode = '42501';
  end if;

  select jsonb_build_object(
           'id', b.id,
           'status', b.status,
           'starts_at', lower(b.period),
           'ends_at', upper(b.period),
           'total_kes', b.total_kes,
           'staff_name', st.display_name,
           'salon', jsonb_build_object(
             'name', s.name, 'slug', s.slug, 'address', s.address,
             'maps_url', s.maps_url, 'timezone', s.timezone),
           'services', coalesce((
             select jsonb_agg(jsonb_build_object(
                      'name', bs.name, 'duration_min', bs.duration_min, 'price_kes', bs.price_kes)
                    order by bs.position)
               from public.booking_services bs
              where bs.booking_id = b.id), '[]'::jsonb))
    into v_result
    from public.bookings b
    join public.clients c on c.id = b.client_id and c.salon_id = b.salon_id
    join public.salons s on s.id = b.salon_id
    join public.staff st on st.id = b.staff_id
   where b.id = p_booking_id and c.user_id = v_user_id;

  if v_result is null then
    raise exception 'Booking not found' using errcode = 'BF404';
  end if;
  return v_result;
end;
$$;

revoke execute on function public.get_my_booking(uuid) from public, anon;
grant execute on function public.get_my_booking(uuid) to authenticated;
