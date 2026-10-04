begin;
select plan(11);

insert into auth.users (id, email) values
  ('d0000000-0000-4000-8000-000000000051', 'client-51@example.test');
insert into public.salons (id, slug, name, is_published, timezone) values
  ('a0000000-0000-4000-8000-000000000051', 'salon-x', 'Salon X', true, 'Africa/Nairobi'),
  ('a0000000-0000-4000-8000-000000000052', 'salon-hidden', 'Salon Hidden', false, 'Africa/Nairobi');
insert into public.staff (id, salon_id, display_name) values
  ('b0000000-0000-4000-8000-000000000051', 'a0000000-0000-4000-8000-000000000051', 'Akinyi');
insert into public.services (id, salon_id, name, duration_min, price_kes) values
  ('c0000000-0000-4000-8000-000000000051', 'a0000000-0000-4000-8000-000000000051', 'Wash', 30, 500);
insert into public.clients (id, salon_id, full_name, phone, user_id) values
  ('e0000000-0000-4000-8000-000000000051', 'a0000000-0000-4000-8000-000000000051', 'Test Client', '+254700000051',
   'd0000000-0000-4000-8000-000000000051'),
  ('e0000000-0000-4000-8000-000000000052', 'a0000000-0000-4000-8000-000000000052', 'Test Client', '+254700000051',
   'd0000000-0000-4000-8000-000000000051');
insert into public.bookings (id, salon_id, staff_id, client_id, status, period, total_kes, source) values
  ('f0000000-0000-4000-8000-000000000051', 'a0000000-0000-4000-8000-000000000051', 'b0000000-0000-4000-8000-000000000051',
   'e0000000-0000-4000-8000-000000000051', 'confirmed',
   tstzrange(now() + interval '3 days', now() + interval '3 days 30 minutes'), 500, 'web'),
  ('f0000000-0000-4000-8000-000000000052', 'a0000000-0000-4000-8000-000000000051', 'b0000000-0000-4000-8000-000000000051',
   'e0000000-0000-4000-8000-000000000051', 'confirmed',
   tstzrange(now() + interval '6 days', now() + interval '6 days 30 minutes'), 500, 'web'),
  ('f0000000-0000-4000-8000-000000000053', 'a0000000-0000-4000-8000-000000000051', 'b0000000-0000-4000-8000-000000000051',
   'e0000000-0000-4000-8000-000000000051', 'confirmed',
   tstzrange(now() + interval '2 hours 5 minutes', now() + interval '2 hours 35 minutes'), 500, 'web');
insert into public.bookings (id, salon_id, staff_id, status, period, hold_expires_at, total_kes, source) values
  ('f0000000-0000-4000-8000-000000000054', 'a0000000-0000-4000-8000-000000000051', 'b0000000-0000-4000-8000-000000000051',
   'held', tstzrange(now() + interval '9 days', now() + interval '9 days 30 minutes'), now() + interval '5 minutes', 500, 'web');
insert into public.booking_services (booking_id, service_id, name, duration_min, price_kes, position) values
  ('f0000000-0000-4000-8000-000000000051', 'c0000000-0000-4000-8000-000000000051', 'Wash', 30, 500, 0);

set local role authenticated;
set local request.jwt.claims = '{"sub":"d0000000-0000-4000-8000-000000000051","role":"authenticated"}';

select is(public.get_my_bookings() -> 0 ->> 'id', 'f0000000-0000-4000-8000-000000000052',
  'bookings come newest first');
select is((select b -> 'services' -> 0 ->> 'service_id' from jsonb_array_elements(public.get_my_bookings()) b
  where b ->> 'id' = 'f0000000-0000-4000-8000-000000000051'), 'c0000000-0000-4000-8000-000000000051',
  'each service carries its id for Book again');
select ok((public.get_my_bookings() -> 0 -> 'salon') ? 'phone', 'the salon phone is included');
select lives_ok($$ select public.cancel_my_booking('f0000000-0000-4000-8000-000000000053', '   ') $$,
  'a booking just over 2 hours ahead can still be cancelled');
select lives_ok($$ select public.cancel_my_booking('f0000000-0000-4000-8000-000000000051', '  ' || repeat('x', 250) || '  ') $$,
  'a long reason is accepted');
select throws_ok($$ select public.cancel_my_booking('f0000000-0000-4000-8000-000000000051', null) $$,
  'BF422', null, 'a cancelled booking cannot be cancelled again');
select throws_ok($$ select public.cancel_my_booking('f0000000-0000-4000-8000-000000000099', null) $$,
  'BF404', null, 'an unknown booking is not found');
select is(public.get_my_client_profile('salon-hidden'), null, 'no profile at an unpublished salon');
select is(public.get_my_client_profile('salon-x') ->> 'phone', '+254700000051', 'the saved phone is returned');
reset role;

select is((select char_length(cancel_reason) from public.bookings where id = 'f0000000-0000-4000-8000-000000000051'),
  200, 'the reason is trimmed to 200 characters');
select is((select cancel_reason from public.bookings where id = 'f0000000-0000-4000-8000-000000000053'),
  null, 'a blank reason is stored as null');

select * from finish();
rollback;
