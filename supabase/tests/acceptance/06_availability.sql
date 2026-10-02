begin;
select plan(14);

insert into public.salons (id, slug, name, is_published, timezone) values
  ('a0000000-0000-4000-8000-000000000001', 'salon-a', 'Salon A', true, 'Africa/Nairobi'),
  ('a0000000-0000-4000-8000-000000000002', 'salon-b', 'Salon B', false, 'Africa/Nairobi');
insert into public.opening_hours (salon_id, weekday, opens, closes)
  select 'a0000000-0000-4000-8000-000000000001', w, '10:00', '18:00' from generate_series(1, 7) as w;
insert into public.staff (id, salon_id, display_name, sort_order) values
  ('b0000000-0000-4000-8000-000000000001', 'a0000000-0000-4000-8000-000000000001', 'Njeri', 1),
  ('b0000000-0000-4000-8000-000000000002', 'a0000000-0000-4000-8000-000000000001', 'Amina', 2);
insert into public.services (id, salon_id, name, duration_min, price_kes) values
  ('c0000000-0000-4000-8000-000000000001', 'a0000000-0000-4000-8000-000000000001', 'Trim', 30, 1000),
  ('c0000000-0000-4000-8000-000000000002', 'a0000000-0000-4000-8000-000000000001', 'Braids', 60, 2500),
  ('c0000000-0000-4000-8000-000000000003', 'a0000000-0000-4000-8000-000000000002', 'Hidden', 30, 500);
insert into public.staff_services (salon_id, staff_id, service_id) values
  ('a0000000-0000-4000-8000-000000000001', 'b0000000-0000-4000-8000-000000000001', 'c0000000-0000-4000-8000-000000000001'),
  ('a0000000-0000-4000-8000-000000000001', 'b0000000-0000-4000-8000-000000000001', 'c0000000-0000-4000-8000-000000000002'),
  ('a0000000-0000-4000-8000-000000000001', 'b0000000-0000-4000-8000-000000000002', 'c0000000-0000-4000-8000-000000000001');

-- Day +8: Njeri booked 12:00-13:00
insert into public.bookings (salon_id, staff_id, status, period) values
  ('a0000000-0000-4000-8000-000000000001', 'b0000000-0000-4000-8000-000000000001', 'confirmed',
   tstzrange(((current_date + 8) + time '12:00') at time zone 'Africa/Nairobi',
             ((current_date + 8) + time '13:00') at time zone 'Africa/Nairobi'));
-- Day +9: Amina off all day
insert into public.time_off (salon_id, staff_id, period) values
  ('a0000000-0000-4000-8000-000000000001', 'b0000000-0000-4000-8000-000000000002',
   tstzrange(((current_date + 9) + time '00:00') at time zone 'Africa/Nairobi',
             ((current_date + 10) + time '00:00') at time zone 'Africa/Nairobi'));
-- Day +10's weekday: Njeri works 14:00-16:00 only
insert into public.staff_hours (salon_id, staff_id, weekday, starts, ends) values
  ('a0000000-0000-4000-8000-000000000001', 'b0000000-0000-4000-8000-000000000001',
   extract(isodow from current_date + 10)::smallint, '14:00', '16:00');
-- Day +11: an expired hold; day +12: an active hold (Njeri 10:00-11:00)
insert into public.bookings (salon_id, staff_id, status, period, hold_expires_at) values
  ('a0000000-0000-4000-8000-000000000001', 'b0000000-0000-4000-8000-000000000001', 'held',
   tstzrange(((current_date + 11) + time '10:00') at time zone 'Africa/Nairobi',
             ((current_date + 11) + time '11:00') at time zone 'Africa/Nairobi'), now() - interval '1 minute'),
  ('a0000000-0000-4000-8000-000000000001', 'b0000000-0000-4000-8000-000000000001', 'held',
   tstzrange(((current_date + 12) + time '10:00') at time zone 'Africa/Nairobi',
             ((current_date + 12) + time '11:00') at time zone 'Africa/Nairobi'), now() + interval '5 minutes');

set local role anon;
set local request.jwt.claims = '{"role":"anon"}';

select is((select count(*)::int from public.get_availability('salon-a',
  array['c0000000-0000-4000-8000-000000000001']::uuid[], current_date + 7)
  where staff_id = 'b0000000-0000-4000-8000-000000000001'),
  31, 'a 30-minute service has 31 start times in a 10:00-18:00 day');

select is((select count(distinct staff_id)::int from public.get_availability('salon-a',
  array['c0000000-0000-4000-8000-000000000002']::uuid[], current_date + 7)),
  1, 'only staff who offer the service are offered');

select is((select count(*)::int from public.get_availability('salon-a',
  array['c0000000-0000-4000-8000-000000000002']::uuid[], current_date + 7)),
  29, 'a 60-minute service has 29 start times');

select is((select count(*)::int from public.get_availability('salon-a',
  array['c0000000-0000-4000-8000-000000000001', 'c0000000-0000-4000-8000-000000000002']::uuid[], current_date + 7)),
  27, 'combined services need one staff member offering all of them, for the total duration');

select is((select count(*)::int from public.get_availability('salon-a',
  array['c0000000-0000-4000-8000-000000000001']::uuid[], current_date + 7, 'b0000000-0000-4000-8000-000000000002')),
  31, 'choosing a professional returns only their times');

select is((select count(*)::int from public.get_availability('salon-a',
  array['c0000000-0000-4000-8000-000000000001']::uuid[], current_date + 8)
  where staff_id = 'b0000000-0000-4000-8000-000000000001'),
  26, 'times overlapping a confirmed booking are removed');

select is((select count(*)::int from public.get_availability('salon-a',
  array['c0000000-0000-4000-8000-000000000001']::uuid[], current_date + 9)
  where staff_id = 'b0000000-0000-4000-8000-000000000002'),
  0, 'staff on time off have no times');

select is((select count(*)::int from public.get_availability('salon-a',
  array['c0000000-0000-4000-8000-000000000001']::uuid[], current_date + 10)
  where staff_id = 'b0000000-0000-4000-8000-000000000001'),
  7, 'staff working hours replace the salon''s hours');

select is((select count(*)::int from public.get_availability('salon-a',
  array['c0000000-0000-4000-8000-000000000001']::uuid[], current_date + 11)
  where staff_id = 'b0000000-0000-4000-8000-000000000001'),
  31, 'an expired hold does not block');

select is((select count(*)::int from public.get_availability('salon-a',
  array['c0000000-0000-4000-8000-000000000001']::uuid[], current_date + 12)
  where staff_id = 'b0000000-0000-4000-8000-000000000001'),
  27, 'an active hold blocks its time');

select is((select count(*)::int from public.get_availability('salon-a',
  array['c0000000-0000-4000-8000-000000000001']::uuid[], current_date - 1)),
  0, 'past days have no times');

select is((select count(*)::int from public.get_availability('salon-a',
  array['c0000000-0000-4000-8000-000000000001']::uuid[], current_date + 90)),
  0, 'days beyond the 60-day horizon have no times');

select throws_ok($$ select * from public.get_availability('salon-b',
  array['c0000000-0000-4000-8000-000000000003']::uuid[], current_date + 7) $$,
  'BF404', null, 'an unpublished salon is not found');

select throws_ok($$ select * from public.get_availability('salon-a',
  array['c0000000-0000-4000-8000-000000000003']::uuid[], current_date + 7) $$,
  'BF404', null, 'another salon''s service is not found');

reset role;
select * from finish();
rollback;
