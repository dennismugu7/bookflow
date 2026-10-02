begin;
select plan(15);

insert into public.salons (id, slug, name, is_published, timezone)
values ('a0000000-0000-4000-8000-000000000001', 'salon-a', 'Salon A', true, 'Africa/Nairobi');
insert into public.opening_hours (salon_id, weekday, opens, closes)
  select 'a0000000-0000-4000-8000-000000000001', w, '10:00', '18:00' from generate_series(1, 7) as w;
insert into public.staff (id, salon_id, display_name, sort_order) values
  ('b0000000-0000-4000-8000-000000000001', 'a0000000-0000-4000-8000-000000000001', 'Njeri', 1),
  ('b0000000-0000-4000-8000-000000000002', 'a0000000-0000-4000-8000-000000000001', 'Amina', 2);
insert into public.services (id, salon_id, name, duration_min, price_kes)
values ('c0000000-0000-4000-8000-000000000001', 'a0000000-0000-4000-8000-000000000001', 'Trim', 30, 1000);
insert into public.staff_services (salon_id, staff_id, service_id) values
  ('a0000000-0000-4000-8000-000000000001', 'b0000000-0000-4000-8000-000000000001', 'c0000000-0000-4000-8000-000000000001'),
  ('a0000000-0000-4000-8000-000000000001', 'b0000000-0000-4000-8000-000000000002', 'c0000000-0000-4000-8000-000000000001');

set local role anon;
set local request.jwt.claims = '{"role":"anon"}';
set local request.headers = '{"x-forwarded-for":"203.0.113.9, 10.0.0.1"}';

select lives_ok($$ select * from public.create_hold('salon-a', array['c0000000-0000-4000-8000-000000000001']::uuid[],
  ((current_date + 7) + time '10:00') at time zone 'Africa/Nairobi',
  'b0000000-0000-4000-8000-000000000001', 'test-token-0000000001') $$,
  'a visitor can hold a free slot');

select throws_ok($$ select * from public.create_hold('salon-a', array['c0000000-0000-4000-8000-000000000001']::uuid[],
  ((current_date + 7) + time '10:00') at time zone 'Africa/Nairobi',
  'b0000000-0000-4000-8000-000000000001', 'test-token-0000000002') $$,
  'BF409', null, 'a held slot cannot be held again');

select is((select h.staff_id from public.create_hold('salon-a', array['c0000000-0000-4000-8000-000000000001']::uuid[],
  ((current_date + 7) + time '10:00') at time zone 'Africa/Nairobi',
  null, 'test-token-0000000003') as h),
  'b0000000-0000-4000-8000-000000000002'::uuid, 'any professional picks the next free staff member');

select throws_ok($$ select * from public.create_hold('salon-a', array['c0000000-0000-4000-8000-000000000001']::uuid[],
  ((current_date + 7) + time '09:00') at time zone 'Africa/Nairobi',
  'b0000000-0000-4000-8000-000000000001', 'test-token-0000000004') $$,
  'BF409', null, 'a time outside working hours cannot be held');

select throws_ok($$ select * from public.create_hold('salon-a', array['c0000000-0000-4000-8000-000000000001']::uuid[],
  ((current_date + 7) + time '15:00') at time zone 'Africa/Nairobi',
  'b0000000-0000-4000-8000-000000000001', 'short') $$,
  'BF400', null, 'a short hold token is rejected');

select lives_ok($$ select * from public.create_hold('salon-a', array['c0000000-0000-4000-8000-000000000001']::uuid[],
  ((current_date + 7) + time '14:00') at time zone 'Africa/Nairobi',
  'b0000000-0000-4000-8000-000000000001', 'test-token-0000000001') $$,
  'the same visitor can pick a different time');

reset role;

select is((select count(*)::int from public.bookings
  where status = 'held' and hold_token_hash = encode(sha256('test-token-0000000001'::bytea), 'hex')),
  1, 'a visitor keeps at most one active hold');

select is((select hold_expires_at from public.bookings
  where status = 'held' and hold_token_hash = encode(sha256('test-token-0000000001'::bytea), 'hex')),
  now() + interval '10 minutes', 'holds last 10 minutes');

select is((select total_kes from public.bookings
  where hold_token_hash = encode(sha256('test-token-0000000003'::bytea), 'hex')),
  1000, 'the hold records the total price');

select is((select count(*)::int from public.booking_services bs join public.bookings b on b.id = bs.booking_id
  where b.hold_token_hash = encode(sha256('test-token-0000000003'::bytea), 'hex') and bs.price_kes = 1000),
  1, 'the hold snapshots each service and its price');

set local role anon;
set local request.jwt.claims = '{"role":"anon"}';

select throws_ok($$ select public.release_hold('unknown-token-000000000') $$,
  'BF404', null, 'releasing an unknown hold is not found');

select lives_ok($$ select public.release_hold('test-token-0000000003') $$,
  'a visitor can release their hold');

reset role;

select is((select status::text from public.bookings
  where hold_token_hash = encode(sha256('test-token-0000000003'::bytea), 'hex')),
  'expired', 'a released hold no longer blocks');

set local role anon;
set local request.jwt.claims = '{"role":"anon"}';
set local request.headers = '{"x-forwarded-for":"198.51.100.7"}';

select is((select count(*)::int
  from generate_series(0, 9) as i,
  lateral public.create_hold('salon-a', array['c0000000-0000-4000-8000-000000000001']::uuid[],
    (((current_date + 8) + time '10:00') at time zone 'Africa/Nairobi') + i * interval '30 minutes',
    'b0000000-0000-4000-8000-000000000001', 'rate-limit-token-00000' || lpad(i::text, 2, '0'))),
  10, 'ten holds from one address within an hour are allowed');

select throws_ok($$ select * from public.create_hold('salon-a', array['c0000000-0000-4000-8000-000000000001']::uuid[],
  ((current_date + 8) + time '16:00') at time zone 'Africa/Nairobi',
  'b0000000-0000-4000-8000-000000000001', 'rate-limit-token-0000099') $$,
  'BF429', null, 'the eleventh hold from one address within an hour is refused');

reset role;
select * from finish();
rollback;
