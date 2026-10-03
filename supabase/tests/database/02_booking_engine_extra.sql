-- Builder-owned tests for the booking engine (phase 1b), beyond the lead's acceptance tests.
begin;
select plan(22);

insert into auth.users (id, email, phone) values
  ('d0000000-0000-4000-8000-000000000001', 'owner@example.test', null),
  ('d0000000-0000-4000-8000-000000000004', 'outsider@example.test', null),
  ('d0000000-0000-4000-8000-000000000021', 'returning@example.test', '+254700000021');

insert into public.salons (id, slug, name, is_published, timezone) values
  ('a0000000-0000-4000-8000-000000000001', 'late-salon', 'Late Salon', true, 'Africa/Nairobi'),
  ('a0000000-0000-4000-8000-000000000003', 'allday-salon', 'All-day Salon', true, 'Africa/Nairobi'),
  ('a0000000-0000-4000-8000-000000000004', 'draft-salon', 'Draft Salon', false, 'Africa/Nairobi');

-- late-salon closes at midnight; allday-salon is open around the clock.
insert into public.opening_hours (salon_id, weekday, opens, closes)
  select 'a0000000-0000-4000-8000-000000000001', w, '10:00', '24:00' from generate_series(1, 7) as w;
insert into public.opening_hours (salon_id, weekday, opens, closes)
  select 'a0000000-0000-4000-8000-000000000003', w, '00:00', '24:00' from generate_series(1, 7) as w;

insert into public.staff (id, salon_id, display_name) values
  ('b0000000-0000-4000-8000-000000000001', 'a0000000-0000-4000-8000-000000000001', 'Njeri'),
  ('b0000000-0000-4000-8000-000000000003', 'a0000000-0000-4000-8000-000000000003', 'Akinyi'),
  ('b0000000-0000-4000-8000-000000000004', 'a0000000-0000-4000-8000-000000000004', 'Draft');

insert into public.services (id, salon_id, name, duration_min, price_kes) values
  ('c0000000-0000-4000-8000-000000000001', 'a0000000-0000-4000-8000-000000000001', 'Trim', 30, 1000),
  ('c0000000-0000-4000-8000-000000000003', 'a0000000-0000-4000-8000-000000000003', 'Trim', 30, 1000),
  ('c0000000-0000-4000-8000-000000000004', 'a0000000-0000-4000-8000-000000000004', 'Trim', 30, 1000);

insert into public.staff_services (salon_id, staff_id, service_id) values
  ('a0000000-0000-4000-8000-000000000001', 'b0000000-0000-4000-8000-000000000001', 'c0000000-0000-4000-8000-000000000001'),
  ('a0000000-0000-4000-8000-000000000003', 'b0000000-0000-4000-8000-000000000003', 'c0000000-0000-4000-8000-000000000003'),
  ('a0000000-0000-4000-8000-000000000004', 'b0000000-0000-4000-8000-000000000004', 'c0000000-0000-4000-8000-000000000004');

insert into public.salon_members (salon_id, user_id, role) values
  ('a0000000-0000-4000-8000-000000000001', 'd0000000-0000-4000-8000-000000000001', 'owner'),
  ('a0000000-0000-4000-8000-000000000003', 'd0000000-0000-4000-8000-000000000001', 'owner');

insert into public.bookings (id, salon_id, staff_id, status, period) values
  ('f0000000-0000-4000-8000-000000000020', 'a0000000-0000-4000-8000-000000000001', 'b0000000-0000-4000-8000-000000000001',
   'confirmed', tstzrange(((current_date + 20) + time '10:00') at time zone 'Africa/Nairobi',
                          ((current_date + 20) + time '10:30') at time zone 'Africa/Nairobi'));

-- An existing client with a verified phone whose name the owner has edited.
insert into public.clients (salon_id, full_name, phone, phone_verified)
values ('a0000000-0000-4000-8000-000000000001', 'Name Set By Owner', '+254700000021', true);

set local role anon;
set local request.jwt.claims = '{"role":"anon"}';

-- Availability ----------------------------------------------------------------

select is((select count(*)::int from public.get_availability('late-salon',
  array['c0000000-0000-4000-8000-000000000001']::uuid[], current_date + 7)),
  55, 'a salon closing at 24:00 offers starts up to 23:30');

select is((select max(starts_at) from public.get_availability('late-salon',
  array['c0000000-0000-4000-8000-000000000001']::uuid[], current_date + 7)),
  ((current_date + 7) + time '23:30') at time zone 'Africa/Nairobi', 'the last start ends exactly at midnight');

select is((select count(*)::int from public.get_availability('allday-salon',
  array['c0000000-0000-4000-8000-000000000003']::uuid[], (now() at time zone 'Africa/Nairobi')::date)
  where starts_at < now() + interval '30 minutes'),
  0, 'no start is sooner than the 30-minute lead time');

-- The first start today is the first 15-minute step at least 30 minutes from now (if it fits).
select is((select min(starts_at) from public.get_availability('allday-salon',
  array['c0000000-0000-4000-8000-000000000003']::uuid[], (now() at time zone 'Africa/Nairobi')::date)),
  (with d as (select ((now() at time zone 'Africa/Nairobi')::date + time '00:00') at time zone 'Africa/Nairobi' as day_start),
        f as (select day_start, day_start + ceil(extract(epoch from (now() + interval '30 minutes' - day_start)) / 900)
                                  * interval '15 minutes' as first_start from d)
   select case when first_start + interval '30 minutes' <= day_start + interval '1 day' then first_start end from f),
  'today''s first start is the next 15-minute step after the lead time');

select is((select count(*)::int from public.get_availability('allday-salon',
  array['c0000000-0000-4000-8000-000000000003']::uuid[], current_date + 60)) > 0,
  true, 'the 60th day ahead is still bookable');

select throws_ok($$ select * from public.get_availability('late-salon',
  array['c0000000-0000-4000-8000-000000000001', 'c0000000-0000-4000-8000-000000000001']::uuid[], current_date + 7) $$,
  'BF400', null, 'the same service twice is invalid input');

select throws_ok($$ select * from public.get_availability('late-salon',
  array[]::uuid[], current_date + 7) $$,
  'BF404', null, 'an empty service list is not found');

select throws_ok($$ select * from public.get_availability('late-salon',
  array['c0000000-0000-4000-8000-000000000001']::uuid[], current_date + 7, 'b0000000-0000-4000-8000-000000000003') $$,
  'BF404', null, 'a staff member from another salon is not found');

-- Holds -------------------------------------------------------------------------

-- Holds are created by our server with the secret key and the client's address (ADR 0008).
reset role;
set local role service_role;
set local request.jwt.claims = '{"role":"service_role"}';

select throws_ok($$ select * from public.create_hold('late-salon', array['c0000000-0000-4000-8000-000000000001']::uuid[],
  ((current_date + 7) + time '12:00') at time zone 'Africa/Nairobi',
  'b0000000-0000-4000-8000-000000000001', 'has spaces and !punctuation', '192.0.2.50') $$,
  'BF400', null, 'a token with unsupported characters is rejected');

select throws_ok($$ select * from public.create_hold('draft-salon', array['c0000000-0000-4000-8000-000000000004']::uuid[],
  ((current_date + 7) + time '12:00') at time zone 'Africa/Nairobi',
  'b0000000-0000-4000-8000-000000000004', 'draft-token-0000000001', '192.0.2.50') $$,
  'BF404', null, 'an unpublished salon cannot be held');

select lives_ok($$ select * from public.create_hold('late-salon', array['c0000000-0000-4000-8000-000000000001']::uuid[],
  ((current_date + 7) + time '12:00') at time zone 'Africa/Nairobi',
  'b0000000-0000-4000-8000-000000000001', 'first-visitor-00000001', '192.0.2.50') $$,
  'a visitor holds 12:00');
select lives_ok($$ select public.release_hold('first-visitor-00000001') $$, 'and releases it');
select lives_ok($$ select * from public.create_hold('late-salon', array['c0000000-0000-4000-8000-000000000001']::uuid[],
  ((current_date + 7) + time '12:00') at time zone 'Africa/Nairobi',
  'b0000000-0000-4000-8000-000000000001', 'second-visitor-0000001', '192.0.2.50') $$,
  'a released time can be held by someone else');

reset role;
set local role anon;
set local request.jwt.claims = '{"role":"anon"}';
select throws_ok($$ select count(*) from private.hold_log $$,
  '42501', null, 'visitors cannot read the hold log');

reset role;

select is((select count(*)::int from public.booking_events e join public.bookings b on b.id = e.booking_id
  where b.hold_token_hash = encode(sha256('first-visitor-00000001'::bytea), 'hex') and e.type in ('held', 'released')),
  2, 'holding and releasing are both logged');

-- Confirmation ------------------------------------------------------------------

set local role authenticated;
set local request.jwt.claims = '{"sub":"d0000000-0000-4000-8000-000000000021","role":"authenticated"}';

select throws_ok($$ select public.confirm_booking('second-visitor-0000001', '   ') $$,
  'BF400', null, 'a blank name is rejected');
select lives_ok($$ select public.confirm_booking('second-visitor-0000001', 'Name Typed By Client') $$,
  'a returning client confirms');
reset role;

select is((select c.full_name || ' / ' || (c.user_id is not null)::text from public.clients c
  where c.salon_id = 'a0000000-0000-4000-8000-000000000001' and c.phone = '+254700000021'),
  'Name Set By Owner / true', 'an existing client keeps the owner''s name and gets linked to the user');

-- Status changes and owners -------------------------------------------------------

set local role authenticated;
set local request.jwt.claims = '{"sub":"d0000000-0000-4000-8000-000000000004","role":"authenticated"}';
select throws_ok($$ select public.update_booking_status('f0000000-0000-4000-8000-000000000020', 'completed') $$,
  'BF404', null, 'outsiders cannot even see that a booking exists');
reset role;

set local role authenticated;
set local request.jwt.claims = '{"sub":"d0000000-0000-4000-8000-000000000001","role":"authenticated"}';
select throws_ok($$ update public.salon_members set role = 'staff'
  where user_id = 'd0000000-0000-4000-8000-000000000001' $$,
  'BF403', null, 'the last owner cannot demote themselves');
select lives_ok($$ select public.update_booking_status('f0000000-0000-4000-8000-000000000020', 'no_show') $$,
  'an owner can mark a no-show');
reset role;

select lives_ok($$ delete from public.salons where id = 'a0000000-0000-4000-8000-000000000003' $$,
  'deleting a salon is not blocked by last-owner protection');

select * from finish();
rollback;
