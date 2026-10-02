-- Builder-owned tests: rules not covered by the lead's acceptance tests.
begin;
select plan(17);

insert into auth.users (id, email) values
  ('d0000000-0000-4000-8000-000000000001', 'owner-a@example.test'),
  ('d0000000-0000-4000-8000-000000000002', 'staff-a@example.test');

insert into public.salons (id, slug, name, is_published)
values ('a0000000-0000-4000-8000-000000000001', 'salon-a', 'Salon A', true);

insert into public.staff (id, salon_id, display_name) values
  ('b0000000-0000-4000-8000-000000000001', 'a0000000-0000-4000-8000-000000000001', 'Njeri'),
  ('b0000000-0000-4000-8000-000000000002', 'a0000000-0000-4000-8000-000000000001', 'Amina');

insert into public.salon_members (salon_id, user_id, role, staff_id) values
  ('a0000000-0000-4000-8000-000000000001', 'd0000000-0000-4000-8000-000000000001', 'owner', null),
  ('a0000000-0000-4000-8000-000000000001', 'd0000000-0000-4000-8000-000000000002', 'staff', 'b0000000-0000-4000-8000-000000000001');

insert into public.services (salon_id, name, duration_min, price_kes, is_bookable) values
  ('a0000000-0000-4000-8000-000000000001', 'Visible', 30, 500, true),
  ('a0000000-0000-4000-8000-000000000001', 'Hidden', 30, 500, false);

insert into public.bookings (id, salon_id, staff_id, status, period) values
  ('f0000000-0000-4000-8000-000000000001', 'a0000000-0000-4000-8000-000000000001', 'b0000000-0000-4000-8000-000000000001',
   'confirmed', tstzrange('2026-11-10 09:00+03', '2026-11-10 10:00+03')),
  ('f0000000-0000-4000-8000-000000000002', 'a0000000-0000-4000-8000-000000000001', 'b0000000-0000-4000-8000-000000000002',
   'confirmed', tstzrange('2026-11-10 09:00+03', '2026-11-10 10:00+03'));

insert into public.booking_events (id, booking_id, type)
values ('a1000000-0000-4000-8000-000000000001', 'f0000000-0000-4000-8000-000000000001', 'created');

-- Constraints
select lives_ok($$
  insert into public.bookings (salon_id, staff_id, status, period)
  values ('a0000000-0000-4000-8000-000000000001', 'b0000000-0000-4000-8000-000000000001', 'expired',
          tstzrange('2026-11-10 09:00+03', '2026-11-10 10:00+03'))
$$, 'an expired hold never blocks the time');

select lives_ok($$
  insert into public.opening_hours (salon_id, weekday, opens, closes)
  values ('a0000000-0000-4000-8000-000000000001', 7, '18:00', '24:00')
$$, 'opening hours may close at 24:00');

select throws_ok($$
  insert into public.opening_hours (salon_id, weekday, opens, closes)
  values ('a0000000-0000-4000-8000-000000000001', 1, '18:00', '09:00')
$$, '23514', null, 'opening hours must close after they open');

select throws_ok($$
  insert into public.opening_hours (salon_id, weekday, opens, closes)
  values ('a0000000-0000-4000-8000-000000000001', 0, '09:00', '18:00')
$$, '23514', null, 'weekday 0 is rejected (ISO 1-7)');

select throws_ok($$
  insert into public.time_off (salon_id, staff_id, period)
  values ('a0000000-0000-4000-8000-000000000001', 'b0000000-0000-4000-8000-000000000001',
          tstzrange('2026-11-10 09:00+03', '2026-11-10 09:00+03'))
$$, '23514', null, 'time off cannot be an empty range');

select throws_ok($$
  insert into public.bookings (salon_id, staff_id, status, period, source)
  values ('a0000000-0000-4000-8000-000000000001', 'b0000000-0000-4000-8000-000000000001', 'confirmed',
          tstzrange('2026-11-12 09:00+03', '2026-11-12 10:00+03'), 'api')
$$, '23514', null, 'booking source must be web or owner');

-- updated_at is maintained by trigger
update public.salons set updated_at = '2000-01-01' where id = 'a0000000-0000-4000-8000-000000000001';
update public.salons set tagline = 'New tagline' where id = 'a0000000-0000-4000-8000-000000000001';
select is((select updated_at from public.salons where id = 'a0000000-0000-4000-8000-000000000001'), now(),
  'updated_at is refreshed on update');

-- Anonymous visitor
set local role anon;
set local request.jwt.claims = '{"role":"anon"}';
select is((select count(*)::int from public.services where salon_id = 'a0000000-0000-4000-8000-000000000001'), 1,
  'anon does not see non-bookable services');
select is((select count(*)::int from public.salon_members), 0, 'anon cannot read memberships');
reset role;

-- Staff member (acts as Njeri)
set local role authenticated;
set local request.jwt.claims = '{"sub":"d0000000-0000-4000-8000-000000000002","role":"authenticated"}';
select is((select count(*)::int from public.services where salon_id = 'a0000000-0000-4000-8000-000000000001'), 2,
  'members see non-bookable services');
-- Since phase 1b, staff change bookings only through update_booking_status().
select results_eq($$ with u as (update public.bookings set status = 'completed'
  where id = 'f0000000-0000-4000-8000-000000000001' returning 1) select count(*)::int from u $$,
  $$ values (0) $$, 'staff cannot update even their own booking directly');
select results_eq($$ with u as (update public.bookings set status = 'completed'
  where id = 'f0000000-0000-4000-8000-000000000002' returning 1) select count(*)::int from u $$,
  $$ values (0) $$, 'staff cannot update another staff member''s booking');
select results_eq($$ with u as (update public.bookings set staff_id = 'b0000000-0000-4000-8000-000000000002'
  where id = 'f0000000-0000-4000-8000-000000000001' returning 1) select count(*)::int from u $$,
  $$ values (0) $$, 'staff cannot hand their booking to someone else');
reset role;

-- Owner
set local role authenticated;
set local request.jwt.claims = '{"sub":"d0000000-0000-4000-8000-000000000001","role":"authenticated"}';
select is((select count(*)::int from public.booking_events), 1, 'members can read booking events');
select results_eq($$ with d as (delete from public.bookings
  where id = 'f0000000-0000-4000-8000-000000000002' returning 1) select count(*)::int from d $$,
  $$ values (0) $$, 'bookings cannot be deleted, even by the owner');
select throws_ok($$ update public.booking_events set type = 'edited' $$,
  '42501', null, 'booking events cannot be edited');
select throws_ok($$ delete from public.booking_events $$,
  '42501', null, 'booking events cannot be deleted');
reset role;

select * from finish();
rollback;
