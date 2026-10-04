begin;
select plan(19);

create temp table d as select ((now() at time zone 'Africa/Nairobi')::date + 2) as day;
grant select on d to public;

insert into auth.users (id, email) values
  ('d0000000-0000-4000-8000-000000000061', 'owner-61@example.test'),
  ('d0000000-0000-4000-8000-000000000062', 'staff-62@example.test');
insert into public.salons (id, slug, name, is_published, timezone) values
  ('a0000000-0000-4000-8000-000000000061', 'salon-61', 'Salon 61', true, 'Africa/Nairobi'),
  ('a0000000-0000-4000-8000-000000000062', 'salon-62', 'Salon 62', true, 'Africa/Nairobi');
insert into public.staff (id, salon_id, display_name) values
  ('b0000000-0000-4000-8000-000000000061', 'a0000000-0000-4000-8000-000000000061', 'Njeri'),
  ('b0000000-0000-4000-8000-000000000062', 'a0000000-0000-4000-8000-000000000061', 'Salome');
insert into public.salon_members (salon_id, user_id, role, staff_id) values
  ('a0000000-0000-4000-8000-000000000061', 'd0000000-0000-4000-8000-000000000061', 'owner', null),
  ('a0000000-0000-4000-8000-000000000061', 'd0000000-0000-4000-8000-000000000062', 'staff',
   'b0000000-0000-4000-8000-000000000062');
-- Split days: 09–13 and 14–18 every day.
insert into public.opening_hours (salon_id, weekday, opens, closes)
  select 'a0000000-0000-4000-8000-000000000061', w, t.opens, t.closes
    from generate_series(1, 7) as w,
         (values (time '09:00', time '13:00'), (time '14:00', time '18:00')) as t (opens, closes);
insert into public.services (id, salon_id, name, duration_min, price_kes) values
  ('c0000000-0000-4000-8000-000000000061', 'a0000000-0000-4000-8000-000000000061', 'Trim', 30, 1000);
insert into public.staff_services (salon_id, staff_id, service_id) values
  ('a0000000-0000-4000-8000-000000000061', 'b0000000-0000-4000-8000-000000000061', 'c0000000-0000-4000-8000-000000000061');
insert into public.clients (id, salon_id, full_name, phone) values
  ('e0000000-0000-4000-8000-000000000061', 'a0000000-0000-4000-8000-000000000061', 'Achieng Ouma', '+254700000061'),
  ('e0000000-0000-4000-8000-000000000062', 'a0000000-0000-4000-8000-000000000062', 'Other Salon', '+254700000062');

create function pg_temp.at(t time) returns timestamptz language sql as
  $$ select ((select day from d) + t) at time zone 'Africa/Nairobi' $$;

insert into public.bookings (id, salon_id, staff_id, client_id, status, period, total_kes, source) values
  ('f0000000-0000-4000-8000-000000000061', 'a0000000-0000-4000-8000-000000000061', 'b0000000-0000-4000-8000-000000000061',
   'e0000000-0000-4000-8000-000000000061', 'completed', tstzrange(pg_temp.at('09:00'), pg_temp.at('09:30')), 1000, 'web'),
  ('f0000000-0000-4000-8000-000000000062', 'a0000000-0000-4000-8000-000000000061', 'b0000000-0000-4000-8000-000000000061',
   'e0000000-0000-4000-8000-000000000061', 'no_show', tstzrange(pg_temp.at('09:30'), pg_temp.at('10:00')), 700, 'web'),
  ('f0000000-0000-4000-8000-000000000063', 'a0000000-0000-4000-8000-000000000061', 'b0000000-0000-4000-8000-000000000062',
   'e0000000-0000-4000-8000-000000000061', 'confirmed', tstzrange(pg_temp.at('14:00'), pg_temp.at('15:00')), 2500, 'owner');
insert into public.bookings (salon_id, staff_id, status, period, hold_expires_at, total_kes, source) values
  ('a0000000-0000-4000-8000-000000000061', 'b0000000-0000-4000-8000-000000000061', 'held',
   tstzrange(pg_temp.at('11:00'), pg_temp.at('11:30')), now() + interval '5 minutes', 1000, 'web');

set local role authenticated;
set local request.jwt.claims = '{"sub":"d0000000-0000-4000-8000-000000000062","role":"authenticated"}';
create temp table agenda as
  select public.get_day_agenda('a0000000-0000-4000-8000-000000000061', (select day from d)) as a;

select is((select jsonb_array_length(a -> 'bookings') from agenda), 3,
  'staff members see the day; holds are not listed');
select is((select a -> 'bookings' -> 0 ->> 'status' from agenda), 'completed', 'bookings come in time order');
select is((select (a -> 'stats' ->> 'booked')::int from agenda), 2, 'no-shows are not counted as booked');
select is((select (a -> 'stats' ->> 'expected_kes')::int from agenda), 3500, 'no-shows add nothing to expected');
select is((select jsonb_agg(g ->> 'minutes')::text from agenda, jsonb_array_elements(a -> 'gaps') g),
  '["60", "90", "180"]', 'gaps follow split hours and skip active holds and no-shows');
select is((select (a -> 'stats' ->> 'free_min')::int from agenda), 330, 'free time adds up the gaps');
select is((select (a -> 'bookings' -> 0 ->> 'is_new')::boolean from agenda), true, 'a fresh web booking is new');
select is((select (a -> 'bookings' -> 2 ->> 'is_new')::boolean from agenda), false, 'an owner booking is never new');
select is((select (a -> 'bookings' -> 2 -> 'client' ->> 'visit_number')::int from agenda), 2,
  'visit numbers skip no-shows');
select is((select a -> 'bookings' -> 2 ->> 'staff_name' from agenda), 'Salome', 'each booking names its staff member');
select throws_ok($$ select public.owner_create_booking('a0000000-0000-4000-8000-000000000061',
  'b0000000-0000-4000-8000-000000000061', array['c0000000-0000-4000-8000-000000000061']::uuid[],
  pg_temp.at('16:00'), null, 'Walk In', null) $$, '42501', null, 'staff members cannot add bookings');

set local request.jwt.claims = '{"sub":"d0000000-0000-4000-8000-000000000061","role":"authenticated"}';
select is(public.owner_create_booking('a0000000-0000-4000-8000-000000000061',
  'b0000000-0000-4000-8000-000000000061', array['c0000000-0000-4000-8000-000000000061']::uuid[],
  pg_temp.at('20:00'), null, 'Someone Else', '0700 000 061') is not null, true,
  'owners may book outside opening hours');
select is((select count(*)::int from public.clients where phone = '+254700000061'), 1,
  'a known phone reuses that client instead of adding a duplicate');
select throws_ok($$ select public.owner_create_booking('a0000000-0000-4000-8000-000000000061',
  'b0000000-0000-4000-8000-000000000061', array['c0000000-0000-4000-8000-000000000061']::uuid[],
  pg_temp.at('16:00'), null, 'Bad Phone', '12') $$, 'BF400', null, 'an invalid phone is rejected');
select throws_ok($$ select public.owner_create_booking('a0000000-0000-4000-8000-000000000061',
  'b0000000-0000-4000-8000-000000000061', array['c0000000-0000-4000-8000-000000000061']::uuid[],
  pg_temp.at('16:00'), null, '  ', null) $$, 'BF400', null, 'a client or a name is required');
select throws_ok($$ select public.owner_create_booking('a0000000-0000-4000-8000-000000000061',
  'b0000000-0000-4000-8000-000000000061', array['c0000000-0000-4000-8000-000000000061']::uuid[],
  pg_temp.at('16:00'), 'e0000000-0000-4000-8000-000000000062', null, null) $$, 'BF404', null,
  'a client from another salon is not found');
select ok(
  (select bool_and((g ->> 'starts_at')::timestamptz >= now())
     from jsonb_array_elements(public.get_day_agenda('a0000000-0000-4000-8000-000000000061',
       (now() at time zone 'Africa/Nairobi')::date) -> 'gaps') g) is not false,
  'today, no gap starts in the past');
reset role;

select is((select e.type || '|' || (e.data ->> 'by') || '|' || count(bs.*)
   from public.bookings b
   join public.booking_events e on e.booking_id = b.id
   join public.booking_services bs on bs.booking_id = b.id
  where b.period @> pg_temp.at('20:00')
  group by e.type, e.data), 'created|owner|1', 'an owner booking keeps its services and a created event');
select ok(exists (select 1 from pg_publication_tables
  where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'bookings'),
  'bookings are published to realtime');

select * from finish();
rollback;
