begin;
select plan(11);

insert into auth.users (id, email) values
  ('d0000000-0000-4000-8000-000000000001', 'owner@example.test'),
  ('d0000000-0000-4000-8000-000000000002', 'staff@example.test'),
  ('d0000000-0000-4000-8000-000000000003', 'co-owner@example.test');

insert into public.salons (id, slug, name, is_published)
values ('a0000000-0000-4000-8000-000000000001', 'salon-a', 'Salon A', true);
insert into public.staff (id, salon_id, display_name) values
  ('b0000000-0000-4000-8000-000000000001', 'a0000000-0000-4000-8000-000000000001', 'Njeri'),
  ('b0000000-0000-4000-8000-000000000002', 'a0000000-0000-4000-8000-000000000001', 'Amina');
insert into public.salon_members (salon_id, user_id, role, staff_id) values
  ('a0000000-0000-4000-8000-000000000001', 'd0000000-0000-4000-8000-000000000001', 'owner', null),
  ('a0000000-0000-4000-8000-000000000001', 'd0000000-0000-4000-8000-000000000002', 'staff', 'b0000000-0000-4000-8000-000000000001');
insert into public.bookings (id, salon_id, staff_id, status, period, total_kes) values
  ('f0000000-0000-4000-8000-000000000001', 'a0000000-0000-4000-8000-000000000001', 'b0000000-0000-4000-8000-000000000001', 'confirmed',
   tstzrange('2026-11-10 10:00+03', '2026-11-10 10:30+03'), 1000),
  ('f0000000-0000-4000-8000-000000000002', 'a0000000-0000-4000-8000-000000000001', 'b0000000-0000-4000-8000-000000000002', 'confirmed',
   tstzrange('2026-11-10 10:00+03', '2026-11-10 10:30+03'), 1000),
  ('f0000000-0000-4000-8000-000000000003', 'a0000000-0000-4000-8000-000000000001', 'b0000000-0000-4000-8000-000000000001', 'confirmed',
   tstzrange('2026-11-10 12:00+03', '2026-11-10 12:30+03'), 1000);

-- Staff member (Njeri)
set local role authenticated;
set local request.jwt.claims = '{"sub":"d0000000-0000-4000-8000-000000000002","role":"authenticated"}';
select lives_ok($$ select public.update_booking_status('f0000000-0000-4000-8000-000000000001', 'completed') $$,
  'staff can check in their own booking');
select throws_ok($$ select public.update_booking_status('f0000000-0000-4000-8000-000000000002', 'completed') $$,
  '42501', null, 'staff cannot change another staff member''s booking');
select throws_ok($$ select public.update_booking_status('f0000000-0000-4000-8000-000000000003', 'cancelled') $$,
  '42501', null, 'staff cannot cancel bookings');
select results_eq($$ with u as (update public.bookings set total_kes = 1
  where id = 'f0000000-0000-4000-8000-000000000003' returning 1) select count(*)::int from u $$,
  $$ values (0) $$, 'staff cannot edit bookings directly');
reset role;

-- Owner
set local role authenticated;
set local request.jwt.claims = '{"sub":"d0000000-0000-4000-8000-000000000001","role":"authenticated"}';
select lives_ok($$ select public.update_booking_status('f0000000-0000-4000-8000-000000000003', 'cancelled', 'Client requested') $$,
  'an owner can cancel a booking');
select throws_ok($$ select public.update_booking_status('f0000000-0000-4000-8000-000000000003', 'completed') $$,
  'BF422', null, 'a cancelled booking is final');
select throws_ok($$ select public.update_booking_status('f0000000-0000-4000-8000-000000000002', 'held') $$,
  'BF422', null, 'a booking cannot go back to held');
reset role;

select is((select status::text from public.bookings where id = 'f0000000-0000-4000-8000-000000000001'),
  'completed', 'the staff check-in was saved');
select is((select data ->> 'reason' from public.booking_events
  where booking_id = 'f0000000-0000-4000-8000-000000000003' and type = 'status_changed'),
  'Client requested', 'the cancellation reason is logged');

-- Last owner protection
set local role authenticated;
set local request.jwt.claims = '{"sub":"d0000000-0000-4000-8000-000000000001","role":"authenticated"}';
select throws_ok($$ delete from public.salon_members
  where salon_id = 'a0000000-0000-4000-8000-000000000001' and user_id = 'd0000000-0000-4000-8000-000000000001' $$,
  'BF403', null, 'the last owner cannot leave the salon');
reset role;

insert into public.salon_members (salon_id, user_id, role)
values ('a0000000-0000-4000-8000-000000000001', 'd0000000-0000-4000-8000-000000000003', 'owner');

set local role authenticated;
set local request.jwt.claims = '{"sub":"d0000000-0000-4000-8000-000000000001","role":"authenticated"}';
select lives_ok($$ delete from public.salon_members
  where salon_id = 'a0000000-0000-4000-8000-000000000001' and user_id = 'd0000000-0000-4000-8000-000000000001' $$,
  'an owner can leave when another owner remains');
reset role;

select * from finish();
rollback;
