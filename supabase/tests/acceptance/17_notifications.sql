begin;
select plan(18);

create temp table d as select ((now() at time zone 'Africa/Nairobi')::date + 1) as day;
grant select on d to public;

insert into auth.users (id, email) values
  ('d0000000-0000-4000-8000-000000000001', 'owner-a@example.test'),
  ('d0000000-0000-4000-8000-000000000002', 'co-owner@example.test'),
  ('d0000000-0000-4000-8000-000000000041', 'client-41@example.test');
insert into public.salons (id, slug, name, is_published, timezone)
values ('a0000000-0000-4000-8000-000000000001', 'salon-a', 'Salon A', true, 'Africa/Nairobi');
insert into public.salon_members (salon_id, user_id, role) values
  ('a0000000-0000-4000-8000-000000000001', 'd0000000-0000-4000-8000-000000000001', 'owner'),
  ('a0000000-0000-4000-8000-000000000001', 'd0000000-0000-4000-8000-000000000002', 'owner');
insert into public.staff (id, salon_id, display_name)
values ('b0000000-0000-4000-8000-000000000001', 'a0000000-0000-4000-8000-000000000001', 'Njeri');
insert into public.services (id, salon_id, name, duration_min, price_kes) values
  ('c0000000-0000-4000-8000-000000000001', 'a0000000-0000-4000-8000-000000000001', 'Silk press', 30, 1500),
  ('c0000000-0000-4000-8000-000000000002', 'a0000000-0000-4000-8000-000000000001', 'Trim', 30, 1000);
insert into public.clients (id, salon_id, full_name, phone, email, user_id) values
  ('e0000000-0000-4000-8000-000000000041', 'a0000000-0000-4000-8000-000000000001', 'Wanjiru Otieno', '+254700000041',
   'client-41@example.test', 'd0000000-0000-4000-8000-000000000041');

-- Owner A turns notifications on; the co-owner turns off new-booking alerts.
set local role authenticated;
set local request.jwt.claims = '{"sub":"d0000000-0000-4000-8000-000000000001","role":"authenticated"}';
select lives_ok($$ select public.register_push_token('ExponentPushToken[test-owner-a]') $$, 'an owner registers this phone');
select throws_ok($$ select public.register_push_token('not-a-token') $$, 'BF400', null, 'only Expo push tokens are accepted');
select is(public.get_notification_prefs(), '{"new_bookings":true,"cancellations":true,"morning_summary":false}'::jsonb,
  'new bookings and cancellations are on by default, the morning summary is off');
reset role;
set local role authenticated;
set local request.jwt.claims = '{"sub":"d0000000-0000-4000-8000-000000000002","role":"authenticated"}';
select is(public.set_notification_prefs(false, true, false),
  '{"new_bookings":false,"cancellations":true,"morning_summary":false}'::jsonb, 'each person sets their own switches');
reset role;

-- Web bookings arrive as holds and are then confirmed; the owner adds one booking herself.
insert into public.bookings (id, salon_id, staff_id, client_id, status, period, hold_expires_at, total_kes, source) values
  ('f0000000-0000-4000-8000-000000000051', 'a0000000-0000-4000-8000-000000000001', 'b0000000-0000-4000-8000-000000000001',
   'e0000000-0000-4000-8000-000000000041', 'held',
   tstzrange(((select day from d) + time '10:30') at time zone 'Africa/Nairobi',
             ((select day from d) + time '11:00') at time zone 'Africa/Nairobi'), now() + interval '10 minutes', 1500, 'web'),
  ('f0000000-0000-4000-8000-000000000053', 'a0000000-0000-4000-8000-000000000001', 'b0000000-0000-4000-8000-000000000001',
   'e0000000-0000-4000-8000-000000000041', 'held',
   tstzrange(now() + interval '7 days', now() + interval '7 days 30 minutes'), now() + interval '10 minutes', 1000, 'web');
insert into public.bookings (id, salon_id, staff_id, client_id, status, period, total_kes, source) values
  ('f0000000-0000-4000-8000-000000000052', 'a0000000-0000-4000-8000-000000000001', 'b0000000-0000-4000-8000-000000000001',
   'e0000000-0000-4000-8000-000000000041', 'confirmed',
   tstzrange(((select day from d) + time '09:00') at time zone 'Africa/Nairobi',
             ((select day from d) + time '09:30') at time zone 'Africa/Nairobi'), 1000, 'owner');
insert into public.booking_services (booking_id, service_id, name, duration_min, price_kes) values
  ('f0000000-0000-4000-8000-000000000051', 'c0000000-0000-4000-8000-000000000001', 'Silk press', 30, 1500),
  ('f0000000-0000-4000-8000-000000000052', 'c0000000-0000-4000-8000-000000000002', 'Trim', 30, 1000),
  ('f0000000-0000-4000-8000-000000000053', 'c0000000-0000-4000-8000-000000000002', 'Trim', 30, 1000);
update public.bookings set status = 'confirmed', hold_expires_at = null
 where id in ('f0000000-0000-4000-8000-000000000051', 'f0000000-0000-4000-8000-000000000053');

select is((select count(*)::int from private.push_outbox
  where booking_id = 'f0000000-0000-4000-8000-000000000051' and kind = 'new_booking'),
  1, 'a web booking notifies each member who wants new-booking alerts');
select is((select user_id from private.push_outbox
  where booking_id = 'f0000000-0000-4000-8000-000000000051' and kind = 'new_booking'),
  'd0000000-0000-4000-8000-000000000001'::uuid, 'the co-owner who turned them off is skipped');
select is((select title from private.push_outbox
  where booking_id = 'f0000000-0000-4000-8000-000000000051' and kind = 'new_booking'),
  'New booking · Wanjiru Otieno', 'the title names the client');
select is((select body from private.push_outbox
  where booking_id = 'f0000000-0000-4000-8000-000000000051' and kind = 'new_booking'),
  'Silk press · Tomorrow, 10:30 · with Njeri', 'the body gives services, when and with whom');
select is((select data from private.push_outbox
  where booking_id = 'f0000000-0000-4000-8000-000000000051' and kind = 'new_booking'),
  jsonb_build_object('kind', 'new_booking', 'booking_id', 'f0000000-0000-4000-8000-000000000051',
                     'date', (select day from d)::text), 'the tap target is the booking and its day');
select is((select count(*)::int from private.push_outbox where booking_id = 'f0000000-0000-4000-8000-000000000052'),
  0, 'bookings the salon adds itself do not notify');

-- The owner cancels her own booking: no alert. The client cancels hers: an alert.
set local request.jwt.claims = '{"sub":"d0000000-0000-4000-8000-000000000001","role":"authenticated"}';
update public.bookings set status = 'cancelled' where id = 'f0000000-0000-4000-8000-000000000052';
select is((select count(*)::int from private.push_outbox
  where booking_id = 'f0000000-0000-4000-8000-000000000052' and kind = 'cancellation'),
  0, 'cancellations by the salon do not notify');
set local role authenticated;
set local request.jwt.claims = '{"sub":"d0000000-0000-4000-8000-000000000041","role":"authenticated"}';
select lives_ok($$ select public.cancel_my_booking('f0000000-0000-4000-8000-000000000053', 'Change of plans') $$,
  'the client cancels online');
reset role;
select is((select count(*)::int from private.push_outbox
  where booking_id = 'f0000000-0000-4000-8000-000000000053' and kind = 'cancellation'),
  2, 'a client cancellation notifies both owners');
select matches((select body from private.push_outbox
  where booking_id = 'f0000000-0000-4000-8000-000000000053' and kind = 'cancellation' limit 1),
  '^Trim · .* · "Change of plans"$', 'the body ends with the client''s reason');

-- Morning summary at 07:00 salon time, once a day, for people who turned it on.
set local role authenticated;
set local request.jwt.claims = '{"sub":"d0000000-0000-4000-8000-000000000001","role":"authenticated"}';
select public.set_notification_prefs(true, true, true);
reset role;
select is(public.queue_morning_summaries(((select day from d) + time '07:05') at time zone 'Africa/Nairobi'),
  1, 'one morning summary is queued');
select is((select title || ' | ' || body from private.push_outbox where kind = 'morning_summary'),
  'Today at Salon A | 1 booking · first at 10:30 with Njeri', 'the summary counts the day''s bookings');
select is(public.queue_morning_summaries(((select day from d) + time '07:20') at time zone 'Africa/Nairobi'),
  0, 'the summary is sent once a day');
set local role authenticated;
set local request.jwt.claims = '{"sub":"d0000000-0000-4000-8000-000000000001","role":"authenticated"}';
select throws_ok($$ select public.queue_morning_summaries(now()) $$, '42501', null,
  'only the server queues summaries');
reset role;

select * from finish();
rollback;
