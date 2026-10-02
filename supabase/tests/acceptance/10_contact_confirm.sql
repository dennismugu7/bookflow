begin;
select plan(13);

insert into auth.users (id, email, email_confirmed_at, is_anonymous) values
  ('d0000000-0000-4000-8000-000000000021', 'achieng@example.test', now(), false),
  ('d0000000-0000-4000-8000-000000000022', 'unconfirmed@example.test', null, false),
  ('d0000000-0000-4000-8000-000000000023', null, null, true),
  ('d0000000-0000-4000-8000-000000000024', 'other@example.test', now(), false);

insert into public.salons (id, slug, name, is_published, timezone)
values ('a0000000-0000-4000-8000-000000000001', 'salon-a', 'Salon A', true, 'Africa/Nairobi');
insert into public.staff (id, salon_id, display_name)
values ('b0000000-0000-4000-8000-000000000001', 'a0000000-0000-4000-8000-000000000001', 'Njeri');

insert into public.bookings (id, salon_id, staff_id, status, period, hold_expires_at, hold_token_hash, total_kes, source)
select ('f0000000-0000-4000-8000-00000000000' || n)::uuid,
       'a0000000-0000-4000-8000-000000000001', 'b0000000-0000-4000-8000-000000000001', 'held',
       tstzrange(((current_date + 7) + time '09:00' + n * interval '1 hour') at time zone 'Africa/Nairobi',
                 ((current_date + 7) + time '09:30' + n * interval '1 hour') at time zone 'Africa/Nairobi'),
       now() + interval '10 minutes', encode(sha256(('contact-token-0000000' || n)::bytea), 'hex'), 1000, 'web'
  from generate_series(1, 5) as n;

-- Signed in with a confirmed email
set local role authenticated;
set local request.jwt.claims = '{"sub":"d0000000-0000-4000-8000-000000000021","role":"authenticated"}';
select lives_ok($$ select public.confirm_booking_contact('contact-token-00000001', 'Achieng Ouma', '0700 000 021') $$,
  'a client signed in with a confirmed email can confirm with a phone number');
reset role;

select is((select c.phone from public.clients c join public.bookings b on b.client_id = c.id
  where b.id = 'f0000000-0000-4000-8000-000000000001'), '+254700000021', 'a local Kenyan number is stored in E.164');
select is((select c.phone_verified from public.clients c join public.bookings b on b.client_id = c.id
  where b.id = 'f0000000-0000-4000-8000-000000000001'), false, 'the phone is marked unverified');
select is((select c.email from public.clients c join public.bookings b on b.client_id = c.id
  where b.id = 'f0000000-0000-4000-8000-000000000001'), 'achieng@example.test', 'the client''s email is recorded');
select is((select status::text from public.bookings where id = 'f0000000-0000-4000-8000-000000000001'),
  'confirmed', 'the booking is confirmed');

set local role authenticated;
set local request.jwt.claims = '{"sub":"d0000000-0000-4000-8000-000000000021","role":"authenticated"}';
select lives_ok($$ select public.confirm_booking_contact('contact-token-00000002', 'Achieng Ouma', '+254700000022') $$,
  'the same client can book again');
reset role;

select is((select count(*)::int from public.clients
  where salon_id = 'a0000000-0000-4000-8000-000000000001' and user_id = 'd0000000-0000-4000-8000-000000000021'),
  1, 'a returning client keeps one client record');

set local role authenticated;
set local request.jwt.claims = '{"sub":"d0000000-0000-4000-8000-000000000022","role":"authenticated"}';
select throws_ok($$ select public.confirm_booking_contact('contact-token-00000003', 'Unconfirmed', '0700000023') $$,
  'BF401', null, 'an unconfirmed email cannot confirm');
reset role;

set local role authenticated;
set local request.jwt.claims = '{"sub":"d0000000-0000-4000-8000-000000000023","role":"authenticated"}';
select throws_ok($$ select public.confirm_booking_contact('contact-token-00000003', 'Anonymous', '0700000023') $$,
  'BF401', null, 'an anonymous session cannot confirm');
reset role;

set local role authenticated;
set local request.jwt.claims = '{"sub":"d0000000-0000-4000-8000-000000000021","role":"authenticated"}';
select throws_ok($$ select public.confirm_booking_contact('contact-token-00000003', 'Achieng Ouma', '12345') $$,
  'BF400', null, 'an invalid phone number is rejected');
reset role;

set local role authenticated;
set local request.jwt.claims = '{"sub":"d0000000-0000-4000-8000-000000000024","role":"authenticated"}';
select lives_ok($$ select public.confirm_booking_contact('contact-token-00000004', 'Someone Else', '+254700000022') $$,
  'another person may enter a phone number already used by someone else');
reset role;

select is((select count(*)::int from public.clients
  where salon_id = 'a0000000-0000-4000-8000-000000000001' and phone = '+254700000022'),
  2, 'an unverified phone never merges two people into one client record');

set local role anon;
set local request.jwt.claims = '{"role":"anon"}';
select throws_ok($$ select public.confirm_booking_contact('contact-token-00000005', 'Anon', '0700000025') $$,
  '42501', null, 'anonymous visitors cannot confirm');
reset role;

select * from finish();
rollback;
