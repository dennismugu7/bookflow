-- Release 1.0.1: Google Play's reviewer login. /api/review-sign-in checks the password, then,
-- with the secret key, finds or creates the review user and refreshes its demo salon. Only the
-- service role can call these functions; the review email is fixed here, so they can't be
-- pointed at anyone else's account.

-- Failed tries, counted in one place so the limit holds across server instances -----------------

create table private.review_sign_in_attempts (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now()
);

create index review_sign_in_attempts_created_at_idx
  on private.review_sign_in_attempts (created_at);

revoke all on private.review_sign_in_attempts from public, anon, authenticated;
grant select, insert, delete on private.review_sign_in_attempts to service_role;

-- 5 failures in 15 minutes block the next try before the password is checked.
create function public.review_sign_in_blocked()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select count(*) >= 5
    from private.review_sign_in_attempts a
   where a.created_at > now() - interval '15 minutes';
$$;

create function public.record_review_sign_in_failure()
returns void
language plpgsql
volatile
security definer
set search_path = ''
as $$
begin
  delete from private.review_sign_in_attempts a where a.created_at < now() - interval '1 day';
  insert into private.review_sign_in_attempts default values;
end;
$$;

-- The review user, by its email only: a targeted lookup, never a list of users.
create function public.get_review_user_id()
returns uuid
language sql
stable
security definer
set search_path = ''
as $$
  select u.id from auth.users u where u.email = 'support@mugu-labs.com' limit 1;
$$;

-- The demo salon -------------------------------------------------------------------------------

-- One demo booking, on the first active team member who is free then. Returns null when no one
-- is, or when the period is empty (e.g. "earlier today" just after midnight).
create function private.review_demo_book(
  p_salon_id uuid,
  p_service_id uuid,
  p_client_id uuid,
  p_status public.booking_status,
  p_starts timestamptz,
  p_ends timestamptz
)
returns uuid
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  v_service public.services;
  v_staff_id uuid;
  v_booking_id uuid;
begin
  if p_starts is null or p_ends is null or p_ends <= p_starts then
    return null;
  end if;
  select * into v_service from public.services sv where sv.id = p_service_id;

  for v_staff_id in
    select st.id from public.staff st
     where st.salon_id = p_salon_id and st.is_active
     order by st.sort_order, st.created_at, st.id
  loop
    begin
      insert into public.bookings (salon_id, staff_id, client_id, status, period, total_kes, source)
      values (p_salon_id, v_staff_id, p_client_id, p_status, tstzrange(p_starts, p_ends),
              v_service.price_kes, 'owner')
      returning id into v_booking_id;
      exit;
    exception when exclusion_violation then
      v_booking_id := null;
    end;
  end loop;
  if v_booking_id is null then
    return null;
  end if;

  insert into public.booking_services (booking_id, service_id, name, duration_min, price_kes, position)
  values (v_booking_id, v_service.id, v_service.name, v_service.duration_min, v_service.price_kes, 0);
  insert into public.booking_events (booking_id, actor_id, type, data)
  values (v_booking_id, null, 'created', '{"by": "review_demo"}');
  return v_booking_id;
end;
$$;

-- Creates Demo Salon when the review user has none, then tops up its bookings: today one in
-- progress, one later and one served earlier; 2 tomorrow; 1 in 3 days. Only what's missing is
-- added, and bookings that ended over 14 days ago are removed. All data is fake.
create function private.ensure_review_demo(p_owner uuid, p_now timestamptz default now())
returns uuid
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  v_salon_id uuid;
  v_tz text;
  v_today date;
  v_day_start timestamptz;
  v_day_end timestamptz;
  v_services uuid[];
  v_clients uuid[];
  v_n int := 0;
  v_service_id uuid;
  v_client_id uuid;
  v_minutes int;
  v_starts timestamptz;
  v_ends timestamptz;
  v_day record;
  v_slot time;
  v_have int;
begin
  if p_owner is null or not exists (select 1 from auth.users u where u.id = p_owner) then
    raise exception 'Unknown user' using errcode = 'BF404';
  end if;

  select m.salon_id into v_salon_id
    from public.salon_members m
   where m.user_id = p_owner and m.role = 'owner'
   order by m.created_at, m.salon_id
   limit 1;

  -- The salon, once -----------------------------------------------------------------------------
  if v_salon_id is null then
    -- Published, so Today shows the bookings instead of the setup steps.
    insert into public.salons (slug, name, tagline, address, phone, timezone, is_published)
    values (
      case when exists (select 1 from public.salons s where s.slug = 'demo-salon')
           then 'demo-salon-' || substr(replace(gen_random_uuid()::text, '-', ''), 1, 6)
           else 'demo-salon' end,
      'Demo Salon', 'Look your best, feel your best', 'Kilimani, Nairobi', '+254700000010',
      'Africa/Nairobi', true
    )
    returning id into v_salon_id;

    insert into public.salon_members (salon_id, user_id, role)
    values (v_salon_id, p_owner, 'owner');

    -- Monday to Saturday, 08:00-18:00.
    insert into public.opening_hours (salon_id, weekday, opens, closes)
    select v_salon_id, d, time '08:00', time '18:00' from generate_series(1, 6) as d;

    insert into public.services (salon_id, name, duration_min, price_kes, sort_order) values
      (v_salon_id, 'Wash & blow-dry', 60, 1500, 0),
      (v_salon_id, 'Gel manicure', 45, 1200, 1),
      (v_salon_id, 'Men''s haircut', 30, 600, 2),
      (v_salon_id, 'Facial', 60, 2500, 3),
      (v_salon_id, 'Box braids', 180, 4500, 4);

    insert into public.staff (salon_id, display_name, title, sort_order) values
      (v_salon_id, 'Amani', 'Stylist', 0),
      (v_salon_id, 'Neema', 'Nail technician', 1),
      (v_salon_id, 'Baraka', 'Barber', 2);

    insert into public.staff_services (salon_id, staff_id, service_id)
    select v_salon_id, st.id, sv.id
      from public.staff st
      join public.services sv on sv.salon_id = st.salon_id
     where st.salon_id = v_salon_id;

    insert into public.clients (salon_id, full_name, phone, email) values
      (v_salon_id, 'Zawadi Kerubo', '+254700000011', 'zawadi.kerubo@example.com'),
      (v_salon_id, 'Imani Chebet', '+254700000012', 'imani.chebet@example.com'),
      (v_salon_id, 'Tumaini Wekesa', '+254700000013', 'tumaini.wekesa@example.com'),
      (v_salon_id, 'Furaha Atieno', '+254700000014', 'furaha.atieno@example.com'),
      (v_salon_id, 'Jabari Kiprono', '+254700000015', 'jabari.kiprono@example.com'),
      (v_salon_id, 'Nia Wambui', '+254700000016', 'nia.wambui@example.com'),
      (v_salon_id, 'Pendo Akinyi', '+254700000017', 'pendo.akinyi@example.com'),
      (v_salon_id, 'Rehema Nyokabi', '+254700000018', 'rehema.nyokabi@example.com');
  end if;

  -- Old bookings go (the audit trail has no cascade) ------------------------------------------------
  delete from public.booking_events e
   using public.bookings b
   where b.id = e.booking_id and b.salon_id = v_salon_id
     and upper(b.period) < p_now - interval '14 days';
  delete from public.bookings b
   where b.salon_id = v_salon_id and upper(b.period) < p_now - interval '14 days';

  -- Bookings, in the salon's time zone -------------------------------------------------------------
  select s.timezone into v_tz from public.salons s where s.id = v_salon_id;
  v_today := (p_now at time zone v_tz)::date;
  v_day_start := v_today::timestamp at time zone v_tz;
  v_day_end := (v_today + 1)::timestamp at time zone v_tz;

  select coalesce(array_agg(sv.id order by sv.sort_order, sv.created_at, sv.id), '{}')
    into v_services
    from public.services sv where sv.salon_id = v_salon_id and sv.is_bookable;
  select coalesce(array_agg(c.id order by c.created_at, c.id), '{}')
    into v_clients
    from public.clients c where c.salon_id = v_salon_id;
  if cardinality(v_services) = 0 then
    return v_salon_id;
  end if;
  select count(*)::int into v_n from public.bookings b where b.salon_id = v_salon_id;

  -- In progress now.
  if not exists (
    select 1 from public.bookings b
     where b.salon_id = v_salon_id and b.status = 'confirmed' and b.period @> p_now
  ) then
    v_service_id := v_services[1 + v_n % cardinality(v_services)];
    v_client_id := v_clients[1 + v_n % greatest(cardinality(v_clients), 1)];
    select sv.duration_min into v_minutes from public.services sv where sv.id = v_service_id;
    v_starts := greatest(v_day_start, to_timestamp(floor(extract(epoch from p_now - interval '20 minutes') / 300) * 300));
    v_ends := greatest(v_starts + make_interval(mins => v_minutes), p_now + interval '15 minutes');
    if private.review_demo_book(v_salon_id, v_service_id, v_client_id, 'confirmed', v_starts, v_ends) is not null then
      v_n := v_n + 1;
    end if;
  end if;

  -- Served earlier today.
  if not exists (
    select 1 from public.bookings b
     where b.salon_id = v_salon_id and b.status = 'completed'
       and lower(b.period) >= v_day_start and upper(b.period) <= p_now
  ) then
    v_service_id := v_services[1 + v_n % cardinality(v_services)];
    v_client_id := v_clients[1 + v_n % greatest(cardinality(v_clients), 1)];
    select sv.duration_min into v_minutes from public.services sv where sv.id = v_service_id;
    v_ends := to_timestamp(floor(extract(epoch from p_now - interval '30 minutes') / 300) * 300);
    v_starts := v_ends - make_interval(mins => v_minutes);
    if v_starts < v_day_start then
      v_starts := v_day_start;
      v_ends := least(v_day_start + make_interval(mins => v_minutes), p_now);
    end if;
    if private.review_demo_book(v_salon_id, v_service_id, v_client_id, 'completed', v_starts, v_ends) is not null then
      v_n := v_n + 1;
    end if;
  end if;

  -- Later today.
  if not exists (
    select 1 from public.bookings b
     where b.salon_id = v_salon_id and b.status = 'confirmed'
       and lower(b.period) > p_now and lower(b.period) < v_day_end
  ) then
    v_service_id := v_services[1 + v_n % cardinality(v_services)];
    v_client_id := v_clients[1 + v_n % greatest(cardinality(v_clients), 1)];
    select sv.duration_min into v_minutes from public.services sv where sv.id = v_service_id;
    v_starts := to_timestamp(ceil(extract(epoch from p_now + interval '90 minutes') / 300) * 300);
    if v_starts + make_interval(mins => v_minutes) > v_day_end then
      v_starts := to_timestamp(ceil(extract(epoch from p_now + interval '10 minutes') / 300) * 300);
    end if;
    v_ends := least(v_starts + make_interval(mins => v_minutes), v_day_end);
    if private.review_demo_book(v_salon_id, v_service_id, v_client_id, 'confirmed', v_starts, v_ends) is not null then
      v_n := v_n + 1;
    end if;
  end if;

  -- Tomorrow (2) and in 3 days (1), at fixed local times.
  for v_day in select * from (values (1, 2), (3, 1)) as d (offset_days, wanted) loop
    select count(*)::int into v_have
      from public.bookings b
     where b.salon_id = v_salon_id and b.status in ('confirmed', 'completed')
       and (lower(b.period) at time zone v_tz)::date = v_today + v_day.offset_days;
    foreach v_slot in array array[time '10:00', time '14:00', time '16:00', time '11:30'] loop
      exit when v_have >= v_day.wanted;
      v_service_id := v_services[1 + v_n % cardinality(v_services)];
      v_client_id := v_clients[1 + v_n % greatest(cardinality(v_clients), 1)];
      select sv.duration_min into v_minutes from public.services sv where sv.id = v_service_id;
      v_starts := (v_today + v_day.offset_days + v_slot) at time zone v_tz;
      if private.review_demo_book(v_salon_id, v_service_id, v_client_id, 'confirmed',
                                  v_starts, v_starts + make_interval(mins => v_minutes)) is not null then
        v_have := v_have + 1;
        v_n := v_n + 1;
      end if;
    end loop;
  end loop;

  return v_salon_id;
end;
$$;

-- What the server calls: only ever for the review user.
create function public.ensure_review_demo(p_owner uuid)
returns uuid
language plpgsql
volatile
security definer
set search_path = ''
as $$
begin
  if not exists (
    select 1 from auth.users u where u.id = p_owner and u.email = 'support@mugu-labs.com'
  ) then
    raise exception 'Only the review user gets the demo salon' using errcode = '42501';
  end if;
  return private.ensure_review_demo(p_owner);
end;
$$;

revoke execute on function private.review_demo_book(uuid, uuid, uuid, public.booking_status, timestamptz, timestamptz)
  from public, anon, authenticated;
revoke execute on function private.ensure_review_demo(uuid, timestamptz) from public, anon, authenticated;
revoke execute on function public.review_sign_in_blocked() from public, anon, authenticated;
revoke execute on function public.record_review_sign_in_failure() from public, anon, authenticated;
revoke execute on function public.get_review_user_id() from public, anon, authenticated;
revoke execute on function public.ensure_review_demo(uuid) from public, anon, authenticated;

grant execute on function private.ensure_review_demo(uuid, timestamptz) to service_role;
grant execute on function public.review_sign_in_blocked() to service_role;
grant execute on function public.record_review_sign_in_failure() to service_role;
grant execute on function public.get_review_user_id() to service_role;
grant execute on function public.ensure_review_demo(uuid) to service_role;
