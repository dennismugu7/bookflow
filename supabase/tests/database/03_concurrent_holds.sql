-- Builder-owned: two visitors racing for the same slot, using two real sessions via dblink.
-- Other sessions can't see this test's transaction, so fixtures are committed through a
-- separate connection and removed again at the start and end. If a run is aborted half-way,
-- run `supabase db reset --no-seed` before the next local test run (CI always starts fresh).
begin;
select plan(4);

create extension if not exists dblink with schema extensions;

-- Connect over the network address this session uses: dblink needs real password auth,
-- and localhost inside the database container is trusted without one.
create temporary table race_conn on commit drop as
  select format('host=%s port=%s dbname=postgres user=postgres password=postgres',
                host(inet_server_addr()), inet_server_port()) as conn;

create temporary table race_cleanup (sql text) on commit drop;
insert into race_cleanup values ($cleanup$
  delete from public.booking_events where booking_id in
    (select id from public.bookings where salon_id = '0a000000-0000-4000-8000-0000000000aa');
  delete from public.booking_services where booking_id in
    (select id from public.bookings where salon_id = '0a000000-0000-4000-8000-0000000000aa');
  delete from public.bookings where salon_id = '0a000000-0000-4000-8000-0000000000aa';
  delete from public.salons where id = '0a000000-0000-4000-8000-0000000000aa';
  delete from private.hold_log where ip in ('192.0.2.201', '192.0.2.202');
$cleanup$);

select extensions.dblink_connect('setup', (select conn from race_conn));
select extensions.dblink_exec('setup', (select sql from race_cleanup));
select extensions.dblink_exec('setup', $fixtures$
  insert into public.salons (id, slug, name, is_published, timezone)
  values ('0a000000-0000-4000-8000-0000000000aa', 'race-salon', 'Race Salon', true, 'Africa/Nairobi');
  insert into public.opening_hours (salon_id, weekday, opens, closes)
    select '0a000000-0000-4000-8000-0000000000aa', w, '10:00', '18:00' from generate_series(1, 7) as w;
  insert into public.staff (id, salon_id, display_name)
  values ('0b000000-0000-4000-8000-0000000000aa', '0a000000-0000-4000-8000-0000000000aa', 'Njeri');
  insert into public.services (id, salon_id, name, duration_min, price_kes)
  values ('0c000000-0000-4000-8000-0000000000aa', '0a000000-0000-4000-8000-0000000000aa', 'Trim', 30, 1000);
  insert into public.staff_services (salon_id, staff_id, service_id)
  values ('0a000000-0000-4000-8000-0000000000aa', '0b000000-0000-4000-8000-0000000000aa', '0c000000-0000-4000-8000-0000000000aa');
$fixtures$);

-- Visitor A holds 10:00 and keeps the transaction open.
select extensions.dblink_connect('visitor_a', (select conn from race_conn));
select extensions.dblink_exec('visitor_a', $$
  begin;
  set local role anon;
  set local request.headers = '{"x-forwarded-for":"192.0.2.201"}';
$$);
select * from extensions.dblink('visitor_a', $$
  select hold_id::text from public.create_hold('race-salon', array['0c000000-0000-4000-8000-0000000000aa']::uuid[],
    ((current_date + 7) + time '10:00') at time zone 'Africa/Nairobi',
    '0b000000-0000-4000-8000-0000000000aa', 'race-visitor-a-000001')
$$) as t (hold_id text);

-- Visitor B asks for the same slot before A commits. A's row is invisible to B's availability
-- check, so B gets as far as the insert and must wait on the exclusion constraint.
select extensions.dblink_connect('visitor_b', (select conn from race_conn));
select extensions.dblink_exec('visitor_b', $$
  set request.headers = '{"x-forwarded-for":"192.0.2.202"}';
  set role anon;
$$);
select extensions.dblink_send_query('visitor_b', $$
  select hold_id::text from public.create_hold('race-salon', array['0c000000-0000-4000-8000-0000000000aa']::uuid[],
    ((current_date + 7) + time '10:00') at time zone 'Africa/Nairobi',
    '0b000000-0000-4000-8000-0000000000aa', 'race-visitor-b-000001')
$$);
select pg_sleep(0.5);

select is(extensions.dblink_is_busy('visitor_b'), 1, 'the second visitor waits while the first hold is in flight');

select extensions.dblink_exec('visitor_a', 'commit');

select throws_ok($$ select * from extensions.dblink_get_result('visitor_b') as t (hold_id text) $$,
  'BF409', null, 'the second visitor loses the race with "slot not available"');

select is((select count(*)::int from public.bookings
  where salon_id = '0a000000-0000-4000-8000-0000000000aa' and status = 'held'),
  1, 'exactly one hold exists for the contested slot');

select is((select count(*)::int from public.bookings
  where salon_id = '0a000000-0000-4000-8000-0000000000aa'
    and hold_token_hash = encode(sha256('race-visitor-a-000001'::bytea), 'hex')),
  1, 'the first visitor keeps the slot');

select extensions.dblink_disconnect('visitor_a');
select extensions.dblink_disconnect('visitor_b');
select extensions.dblink_exec('setup', (select sql from race_cleanup));
select extensions.dblink_disconnect('setup');

select * from finish();
rollback;
