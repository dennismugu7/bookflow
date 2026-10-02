begin;
select plan(10);

insert into auth.users (id, email, phone) values
  ('d0000000-0000-4000-8000-000000000011', 'client@example.test', '254700000011'),
  ('d0000000-0000-4000-8000-000000000012', 'nophone@example.test', null);

insert into public.salons (id, slug, name, is_published, timezone)
values ('a0000000-0000-4000-8000-000000000001', 'salon-a', 'Salon A', true, 'Africa/Nairobi');
insert into public.staff (id, salon_id, display_name)
values ('b0000000-0000-4000-8000-000000000001', 'a0000000-0000-4000-8000-000000000001', 'Njeri');

insert into public.bookings (id, salon_id, staff_id, status, period, hold_expires_at, hold_token_hash, total_kes, source) values
  ('f0000000-0000-4000-8000-000000000001', 'a0000000-0000-4000-8000-000000000001', 'b0000000-0000-4000-8000-000000000001', 'held',
   tstzrange(((current_date + 7) + time '10:00') at time zone 'Africa/Nairobi', ((current_date + 7) + time '10:30') at time zone 'Africa/Nairobi'),
   now() + interval '10 minutes', encode(sha256('confirm-token-00000001'::bytea), 'hex'), 1000, 'web'),
  ('f0000000-0000-4000-8000-000000000002', 'a0000000-0000-4000-8000-000000000001', 'b0000000-0000-4000-8000-000000000001', 'held',
   tstzrange(((current_date + 7) + time '11:00') at time zone 'Africa/Nairobi', ((current_date + 7) + time '11:30') at time zone 'Africa/Nairobi'),
   now() - interval '1 minute', encode(sha256('confirm-token-00000002'::bytea), 'hex'), 1000, 'web'),
  ('f0000000-0000-4000-8000-000000000003', 'a0000000-0000-4000-8000-000000000001', 'b0000000-0000-4000-8000-000000000001', 'held',
   tstzrange(((current_date + 7) + time '12:00') at time zone 'Africa/Nairobi', ((current_date + 7) + time '12:30') at time zone 'Africa/Nairobi'),
   now() + interval '10 minutes', encode(sha256('confirm-token-00000003'::bytea), 'hex'), 1000, 'web');

set local role authenticated;
set local request.jwt.claims = '{"sub":"d0000000-0000-4000-8000-000000000011","role":"authenticated"}';

select throws_ok($$ select public.confirm_booking('unknown-token-000000000', 'Wanjiru Otieno') $$,
  'BF404', null, 'an unknown hold cannot be confirmed');
select throws_ok($$ select public.confirm_booking('confirm-token-00000002', 'Wanjiru Otieno') $$,
  'BF410', null, 'an expired hold cannot be confirmed');
select lives_ok($$ select public.confirm_booking('confirm-token-00000001', 'Wanjiru Otieno') $$,
  'a signed-in client can confirm their hold');
select throws_ok($$ select public.confirm_booking('confirm-token-00000001', 'Wanjiru Otieno') $$,
  'BF404', null, 'a hold cannot be confirmed twice');
reset role;

select is((select status::text from public.bookings where id = 'f0000000-0000-4000-8000-000000000001'),
  'confirmed', 'the booking is confirmed');
select is((select c.phone from public.clients c join public.bookings b on b.client_id = c.id
  where b.id = 'f0000000-0000-4000-8000-000000000001'),
  '+254700000011', 'the client is recorded with an E.164 phone');
select is((select c.user_id from public.clients c join public.bookings b on b.client_id = c.id
  where b.id = 'f0000000-0000-4000-8000-000000000001'),
  'd0000000-0000-4000-8000-000000000011'::uuid, 'the client is linked to the signed-in user');
select is((select count(*)::int from public.booking_events
  where booking_id = 'f0000000-0000-4000-8000-000000000001' and type = 'confirmed'),
  1, 'the confirmation is logged');

set local role authenticated;
set local request.jwt.claims = '{"sub":"d0000000-0000-4000-8000-000000000012","role":"authenticated"}';
select throws_ok($$ select public.confirm_booking('confirm-token-00000003', 'No Phone') $$,
  'BF401', null, 'a user without a verified phone cannot confirm');
reset role;

set local role anon;
set local request.jwt.claims = '{"role":"anon"}';
select throws_ok($$ select public.confirm_booking('confirm-token-00000003', 'Anon') $$,
  '42501', null, 'anonymous visitors cannot confirm');
reset role;

select * from finish();
rollback;
