begin;
select plan(12);

create temp table d as select ((now() at time zone 'Africa/Nairobi')::date + 1) as day;
grant select on d to public;

insert into auth.users (id, email) values
  ('d0000000-0000-4000-8000-000000000001', 'owner-a@example.test'),
  ('d0000000-0000-4000-8000-000000000004', 'outsider@example.test');
insert into public.salons (id, slug, name, is_published, timezone)
values ('a0000000-0000-4000-8000-000000000001', 'salon-a', 'Salon A', true, 'Africa/Nairobi');
insert into public.salon_members (salon_id, user_id, role)
values ('a0000000-0000-4000-8000-000000000001', 'd0000000-0000-4000-8000-000000000001', 'owner');
insert into public.opening_hours (salon_id, weekday, opens, closes)
  select 'a0000000-0000-4000-8000-000000000001', w, '09:00', '18:00' from generate_series(1, 7) as w;
insert into public.staff (id, salon_id, display_name) values
  ('b0000000-0000-4000-8000-000000000001', 'a0000000-0000-4000-8000-000000000001', 'Njeri'),
  ('b0000000-0000-4000-8000-000000000002', 'a0000000-0000-4000-8000-000000000001', 'Amina');
insert into public.services (id, salon_id, name, duration_min, price_kes) values
  ('c0000000-0000-4000-8000-000000000001', 'a0000000-0000-4000-8000-000000000001', 'Trim', 30, 1000),
  ('c0000000-0000-4000-8000-000000000002', 'a0000000-0000-4000-8000-000000000001', 'Silk press', 60, 2000);
insert into public.staff_services (salon_id, staff_id, service_id) values
  ('a0000000-0000-4000-8000-000000000001', 'b0000000-0000-4000-8000-000000000001', 'c0000000-0000-4000-8000-000000000001'),
  ('a0000000-0000-4000-8000-000000000001', 'b0000000-0000-4000-8000-000000000001', 'c0000000-0000-4000-8000-000000000002');
insert into public.clients (id, salon_id, full_name, phone) values
  ('e0000000-0000-4000-8000-000000000051', 'a0000000-0000-4000-8000-000000000001', 'Wanjiru Otieno', '+254700000051');
insert into public.bookings (salon_id, staff_id, client_id, status, period, total_kes, source) values
  ('a0000000-0000-4000-8000-000000000001', 'b0000000-0000-4000-8000-000000000001', 'e0000000-0000-4000-8000-000000000051',
   'confirmed', tstzrange(((select day from d) + time '10:00') at time zone 'Africa/Nairobi',
                          ((select day from d) + time '10:30') at time zone 'Africa/Nairobi'), 1000, 'web'),
  ('a0000000-0000-4000-8000-000000000001', 'b0000000-0000-4000-8000-000000000001', 'e0000000-0000-4000-8000-000000000051',
   'confirmed', tstzrange(((select day from d) + time '13:00') at time zone 'Africa/Nairobi',
                          ((select day from d) + time '14:00') at time zone 'Africa/Nairobi'), 2000, 'owner'),
  ('a0000000-0000-4000-8000-000000000001', 'b0000000-0000-4000-8000-000000000001', 'e0000000-0000-4000-8000-000000000051',
   'cancelled', tstzrange(((select day from d) + time '15:00') at time zone 'Africa/Nairobi',
                          ((select day from d) + time '15:30') at time zone 'Africa/Nairobi'), 1000, 'web');

set local role authenticated;
set local request.jwt.claims = '{"sub":"d0000000-0000-4000-8000-000000000001","role":"authenticated"}';
select is((public.get_day_agenda('a0000000-0000-4000-8000-000000000001', (select day from d)) -> 'stats' ->> 'booked')::int,
  2, 'cancelled bookings are not counted');
select is((public.get_day_agenda('a0000000-0000-4000-8000-000000000001', (select day from d)) -> 'stats' ->> 'expected_kes')::int,
  3000, 'expected takings add up the active bookings');
select is((public.get_day_agenda('a0000000-0000-4000-8000-000000000001', (select day from d)) -> 'stats' ->> 'free_min')::int,
  450, 'free time is the open hours not taken by bookings');
select is(jsonb_array_length(public.get_day_agenda('a0000000-0000-4000-8000-000000000001', (select day from d)) -> 'gaps'),
  3, 'the day has three free gaps');
select lives_ok($$ select public.owner_create_booking('a0000000-0000-4000-8000-000000000001',
  'b0000000-0000-4000-8000-000000000001', array['c0000000-0000-4000-8000-000000000001']::uuid[],
  ((select day from d) + time '11:00') at time zone 'Africa/Nairobi', null, 'Mary Wambui', null) $$,
  'an owner can add a walk-in without a phone');
select throws_ok($$ select public.owner_create_booking('a0000000-0000-4000-8000-000000000001',
  'b0000000-0000-4000-8000-000000000001', array['c0000000-0000-4000-8000-000000000001']::uuid[],
  ((select day from d) + time '10:15') at time zone 'Africa/Nairobi', 'e0000000-0000-4000-8000-000000000051', null, null) $$,
  'BF409', null, 'a booking cannot overlap another');
select throws_ok($$ select public.owner_create_booking('a0000000-0000-4000-8000-000000000001',
  'b0000000-0000-4000-8000-000000000002', array['c0000000-0000-4000-8000-000000000001']::uuid[],
  ((select day from d) + time '16:00') at time zone 'Africa/Nairobi', 'e0000000-0000-4000-8000-000000000051', null, null) $$,
  'BF422', null, 'the professional must offer the services');
select is((public.get_day_agenda('a0000000-0000-4000-8000-000000000001', (select day from d)) -> 'stats' ->> 'free_min')::int,
  420, 'the walk-in takes its time out of the free gaps');
reset role;

select is((select status::text || '|' || source || '|' || total_kes from public.bookings b
  join public.clients c on c.id = b.client_id where c.full_name = 'Mary Wambui'),
  'confirmed|owner|1000', 'the walk-in is confirmed with its price');
select is((select count(*)::int from public.clients where full_name = 'Mary Wambui' and phone is null),
  1, 'the walk-in client is saved without a phone');

set local role authenticated;
set local request.jwt.claims = '{"sub":"d0000000-0000-4000-8000-000000000004","role":"authenticated"}';
select throws_ok($$ select public.get_day_agenda('a0000000-0000-4000-8000-000000000001', (select day from d)) $$,
  '42501', null, 'outsiders cannot see a salon''s day');
select throws_ok($$ select public.owner_create_booking('a0000000-0000-4000-8000-000000000001',
  'b0000000-0000-4000-8000-000000000001', array['c0000000-0000-4000-8000-000000000001']::uuid[],
  ((select day from d) + time '16:00') at time zone 'Africa/Nairobi', null, 'Intruder', null) $$,
  '42501', null, 'outsiders cannot add bookings');
reset role;

select * from finish();
rollback;
