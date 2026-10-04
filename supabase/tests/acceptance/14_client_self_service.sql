begin;
select plan(12);

insert into auth.users (id, email) values
  ('d0000000-0000-4000-8000-000000000041', 'client-41@example.test'),
  ('d0000000-0000-4000-8000-000000000042', 'client-42@example.test'),
  ('d0000000-0000-4000-8000-000000000043', 'newcomer@example.test');
insert into public.salons (id, slug, name, phone, is_published, timezone)
values ('a0000000-0000-4000-8000-000000000001', 'salon-a', 'Salon A', '+254700000099', true, 'Africa/Nairobi');
insert into public.staff (id, salon_id, display_name)
values ('b0000000-0000-4000-8000-000000000001', 'a0000000-0000-4000-8000-000000000001', 'Njeri');
insert into public.services (id, salon_id, name, duration_min, price_kes)
values ('c0000000-0000-4000-8000-000000000001', 'a0000000-0000-4000-8000-000000000001', 'Trim', 30, 1000);
insert into public.clients (id, salon_id, full_name, phone, email, user_id) values
  ('e0000000-0000-4000-8000-000000000041', 'a0000000-0000-4000-8000-000000000001', 'Wanjiru Otieno', '+254700000041',
   'client-41@example.test', 'd0000000-0000-4000-8000-000000000041'),
  ('e0000000-0000-4000-8000-000000000042', 'a0000000-0000-4000-8000-000000000001', 'Brian Kip', '+254700000042',
   'client-42@example.test', 'd0000000-0000-4000-8000-000000000042');
insert into public.bookings (id, salon_id, staff_id, client_id, status, period, total_kes, source) values
  ('f0000000-0000-4000-8000-000000000041', 'a0000000-0000-4000-8000-000000000001', 'b0000000-0000-4000-8000-000000000001',
   'e0000000-0000-4000-8000-000000000041', 'confirmed',
   tstzrange(now() + interval '7 days', now() + interval '7 days 30 minutes'), 1000, 'web'),
  ('f0000000-0000-4000-8000-000000000042', 'a0000000-0000-4000-8000-000000000001', 'b0000000-0000-4000-8000-000000000001',
   'e0000000-0000-4000-8000-000000000041', 'confirmed',
   tstzrange(now() + interval '1 hour', now() + interval '90 minutes'), 1000, 'web'),
  ('f0000000-0000-4000-8000-000000000043', 'a0000000-0000-4000-8000-000000000001', 'b0000000-0000-4000-8000-000000000001',
   'e0000000-0000-4000-8000-000000000041', 'completed',
   tstzrange(now() - interval '3 days', now() - interval '3 days' + interval '30 minutes'), 1000, 'web'),
  ('f0000000-0000-4000-8000-000000000044', 'a0000000-0000-4000-8000-000000000001', 'b0000000-0000-4000-8000-000000000001',
   'e0000000-0000-4000-8000-000000000041', 'cancelled',
   tstzrange(now() + interval '5 days', now() + interval '5 days 30 minutes'), 1000, 'web'),
  ('f0000000-0000-4000-8000-000000000045', 'a0000000-0000-4000-8000-000000000001', 'b0000000-0000-4000-8000-000000000001',
   'e0000000-0000-4000-8000-000000000042', 'confirmed',
   tstzrange(now() + interval '8 days', now() + interval '8 days 30 minutes'), 1000, 'web');

set local role authenticated;
set local request.jwt.claims = '{"sub":"d0000000-0000-4000-8000-000000000041","role":"authenticated"}';
select is(jsonb_array_length(public.get_my_bookings()), 4, 'a client sees all four of their bookings');
select is((select count(*)::int from jsonb_array_elements(public.get_my_bookings()) b
  where b ->> 'id' = 'f0000000-0000-4000-8000-000000000045'), 0, 'a client never sees someone else''s booking');
select lives_ok($$ select public.cancel_my_booking('f0000000-0000-4000-8000-000000000041', 'Change of plans') $$,
  'a client can cancel a booking more than 2 hours ahead');
select throws_ok($$ select public.cancel_my_booking('f0000000-0000-4000-8000-000000000042', null) $$,
  'BF422', null, 'a booking starting within 2 hours cannot be cancelled online');
select throws_ok($$ select public.cancel_my_booking('f0000000-0000-4000-8000-000000000043', null) $$,
  'BF422', null, 'a completed booking cannot be cancelled');
select is(public.get_my_client_profile('salon-a') ->> 'full_name', 'Wanjiru Otieno',
  'a returning client gets their saved name');
reset role;

select is((select status::text || '|' || cancel_reason from public.bookings where id = 'f0000000-0000-4000-8000-000000000041'),
  'cancelled|Change of plans', 'the booking is cancelled with its reason');
select is((select count(*)::int from public.booking_events
  where booking_id = 'f0000000-0000-4000-8000-000000000041' and type = 'status_changed' and data ->> 'by' = 'client'),
  1, 'the cancellation is recorded as done by the client');
select lives_ok($$ insert into public.bookings (salon_id, staff_id, status, period, total_kes, source)
  values ('a0000000-0000-4000-8000-000000000001', 'b0000000-0000-4000-8000-000000000001', 'confirmed',
          (select period from public.bookings where id = 'f0000000-0000-4000-8000-000000000041'), 1000, 'owner') $$,
  'the cancelled time can be booked again');

set local role authenticated;
set local request.jwt.claims = '{"sub":"d0000000-0000-4000-8000-000000000042","role":"authenticated"}';
select throws_ok($$ select public.cancel_my_booking('f0000000-0000-4000-8000-000000000042', null) $$,
  'BF404', null, 'nobody can cancel someone else''s booking');
reset role;

set local role authenticated;
set local request.jwt.claims = '{"sub":"d0000000-0000-4000-8000-000000000043","role":"authenticated"}';
select is(public.get_my_client_profile('salon-a') is null, true, 'a first-time client has no saved profile');
reset role;

set local role anon;
set local request.jwt.claims = '{"role":"anon"}';
select throws_ok($$ select public.get_my_bookings() $$, '42501', null, 'visitors cannot list bookings');
reset role;

select * from finish();
rollback;
