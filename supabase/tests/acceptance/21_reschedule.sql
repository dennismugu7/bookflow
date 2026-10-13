begin;
select plan(17);

create temp table d as select ((now() at time zone 'Africa/Nairobi')::date + 1) as day;
grant select on d to public;

insert into auth.users (id, email) values
  ('d0000000-0000-4000-8000-000000000001', 'owner@example.test'),
  ('d0000000-0000-4000-8000-000000000002', 'staff@example.test'),
  ('d0000000-0000-4000-8000-000000000004', 'outsider@example.test');
insert into public.salons (id, slug, name, is_published, timezone)
values ('a0000000-0000-4000-8000-000000000001', 'salon-a', 'Salon A', true, 'Africa/Nairobi');
insert into public.staff (id, salon_id, display_name) values
  ('b0000000-0000-4000-8000-000000000001', 'a0000000-0000-4000-8000-000000000001', 'Njeri'),
  ('b0000000-0000-4000-8000-000000000002', 'a0000000-0000-4000-8000-000000000001', 'Amina');
insert into public.salon_members (salon_id, user_id, role, staff_id) values
  ('a0000000-0000-4000-8000-000000000001', 'd0000000-0000-4000-8000-000000000001', 'owner', null),
  ('a0000000-0000-4000-8000-000000000001', 'd0000000-0000-4000-8000-000000000002', 'staff', 'b0000000-0000-4000-8000-000000000001');

-- Tomorrow in Nairobi. 1: Njeri 10:00–10:30. 2: Njeri 12:00–13:00. 3: Amina 10:00–10:30.
-- 4: Njeri 15:00–15:30, cancelled. 5: Njeri 14:00–14:30, a hold that lapsed a minute ago.
insert into public.bookings (id, salon_id, staff_id, status, period, total_kes, hold_expires_at) values
  ('f0000000-0000-4000-8000-000000000001', 'a0000000-0000-4000-8000-000000000001', 'b0000000-0000-4000-8000-000000000001', 'confirmed',
   tstzrange(((select day from d) + time '10:00') at time zone 'Africa/Nairobi',
             ((select day from d) + time '10:30') at time zone 'Africa/Nairobi'), 1000, null),
  ('f0000000-0000-4000-8000-000000000002', 'a0000000-0000-4000-8000-000000000001', 'b0000000-0000-4000-8000-000000000001', 'confirmed',
   tstzrange(((select day from d) + time '12:00') at time zone 'Africa/Nairobi',
             ((select day from d) + time '13:00') at time zone 'Africa/Nairobi'), 2000, null),
  ('f0000000-0000-4000-8000-000000000003', 'a0000000-0000-4000-8000-000000000001', 'b0000000-0000-4000-8000-000000000002', 'confirmed',
   tstzrange(((select day from d) + time '10:00') at time zone 'Africa/Nairobi',
             ((select day from d) + time '10:30') at time zone 'Africa/Nairobi'), 1000, null),
  ('f0000000-0000-4000-8000-000000000004', 'a0000000-0000-4000-8000-000000000001', 'b0000000-0000-4000-8000-000000000001', 'cancelled',
   tstzrange(((select day from d) + time '15:00') at time zone 'Africa/Nairobi',
             ((select day from d) + time '15:30') at time zone 'Africa/Nairobi'), 1000, null),
  ('f0000000-0000-4000-8000-000000000005', 'a0000000-0000-4000-8000-000000000001', 'b0000000-0000-4000-8000-000000000001', 'held',
   tstzrange(((select day from d) + time '14:00') at time zone 'Africa/Nairobi',
             ((select day from d) + time '14:30') at time zone 'Africa/Nairobi'), 1000, now() - interval '1 minute');

-- Staff member (Njeri)
set local role authenticated;
set local request.jwt.claims = '{"sub":"d0000000-0000-4000-8000-000000000002","role":"authenticated"}';
select throws_ok($$ select public.reschedule_booking('f0000000-0000-4000-8000-000000000001',
  ((select day from d) + time '11:00') at time zone 'Africa/Nairobi') $$,
  '42501', null, 'staff cannot move bookings, even their own');
reset role;

-- Outsider
set local role authenticated;
set local request.jwt.claims = '{"sub":"d0000000-0000-4000-8000-000000000004","role":"authenticated"}';
select throws_ok($$ select public.reschedule_booking('f0000000-0000-4000-8000-000000000001',
  ((select day from d) + time '11:00') at time zone 'Africa/Nairobi') $$,
  'BF404', null, 'outsiders cannot find the booking');
reset role;

-- Owner
set local role authenticated;
set local request.jwt.claims = '{"sub":"d0000000-0000-4000-8000-000000000001","role":"authenticated"}';
select lives_ok($$ select public.reschedule_booking('f0000000-0000-4000-8000-000000000001',
  ((select day from d) + time '11:00') at time zone 'Africa/Nairobi') $$,
  'an owner can move a confirmed booking');
select throws_ok($$ select public.reschedule_booking('f0000000-0000-4000-8000-000000000001',
  ((select day from d) + time '12:30') at time zone 'Africa/Nairobi') $$,
  'BF409', null, 'a booking cannot move onto another booking of the same professional');
select lives_ok($$ select public.reschedule_booking('f0000000-0000-4000-8000-000000000001',
  ((select day from d) + time '15:00') at time zone 'Africa/Nairobi') $$,
  'a cancelled booking does not block the new time');
select lives_ok($$ select public.reschedule_booking('f0000000-0000-4000-8000-000000000002',
  ((select day from d) + time '14:00') at time zone 'Africa/Nairobi') $$,
  'a lapsed hold does not block the new time');
select lives_ok($$ select public.reschedule_booking('f0000000-0000-4000-8000-000000000003',
  ((select day from d) + time '12:15') at time zone 'Africa/Nairobi') $$,
  'another professional''s bookings do not block');
select lives_ok($$ select public.reschedule_booking('f0000000-0000-4000-8000-000000000003',
  ((select day from d) + time '12:15') at time zone 'Africa/Nairobi') $$,
  'moving to the same time is accepted');
select throws_ok($$ select public.reschedule_booking('f0000000-0000-4000-8000-000000000004',
  ((select day from d) + time '16:00') at time zone 'Africa/Nairobi') $$,
  'BF422', null, 'only confirmed bookings move');
select throws_ok($$ select public.reschedule_booking('f0000000-0000-4000-8000-000000000001',
  now() - interval '1 hour') $$,
  'BF400', null, 'a booking cannot move into the past');
select throws_ok($$ select public.reschedule_booking('f0000000-0000-4000-8000-000000000001', null) $$,
  'BF400', null, 'a new time is required');
reset role;

select is((select period from public.bookings where id = 'f0000000-0000-4000-8000-000000000001'),
  tstzrange(((select day from d) + time '15:00') at time zone 'Africa/Nairobi',
            ((select day from d) + time '15:30') at time zone 'Africa/Nairobi'),
  'the 30-minute booking is still 30 minutes, at its new time');
select is((select period from public.bookings where id = 'f0000000-0000-4000-8000-000000000002'),
  tstzrange(((select day from d) + time '14:00') at time zone 'Africa/Nairobi',
            ((select day from d) + time '15:00') at time zone 'Africa/Nairobi'),
  'the 60-minute booking is still 60 minutes, at its new time');
select is((select status::text from public.bookings where id = 'f0000000-0000-4000-8000-000000000005'),
  'expired', 'the lapsed hold in the way is marked expired');
select is((select count(*)::int from public.booking_events
            where booking_id = 'f0000000-0000-4000-8000-000000000001' and type = 'rescheduled'
              and actor_id = 'd0000000-0000-4000-8000-000000000001'),
  2, 'each move is recorded with who made it');
select is((select count(*)::int from public.booking_events
            where booking_id = 'f0000000-0000-4000-8000-000000000003' and type = 'rescheduled'),
  1, 'moving to the same time records nothing');
select is((select count(*)::int from private.push_outbox), 0, 'moving a booking queues no push');

select * from finish();
rollback;
