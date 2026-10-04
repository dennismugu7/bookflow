begin;
select plan(17);

insert into auth.users (id, email) values
  ('d1000000-0000-4000-8000-000000000001', 'owner-x@example.test'),
  ('d1000000-0000-4000-8000-000000000002', 'owner-y@example.test'),
  ('d1000000-0000-4000-8000-000000000041', 'client-x@example.test');
insert into public.salons (id, slug, name, is_published, timezone)
values ('a1000000-0000-4000-8000-000000000001', 'salon-x', 'Salon X', true, 'Africa/Nairobi');
insert into public.salon_members (salon_id, user_id, role) values
  ('a1000000-0000-4000-8000-000000000001', 'd1000000-0000-4000-8000-000000000001', 'owner');
insert into public.staff (id, salon_id, display_name)
values ('b1000000-0000-4000-8000-000000000001', 'a1000000-0000-4000-8000-000000000001', 'Achieng');
insert into public.services (id, salon_id, name, duration_min, price_kes) values
  ('c1000000-0000-4000-8000-000000000001', 'a1000000-0000-4000-8000-000000000001', 'Braids', 30, 1500),
  ('c1000000-0000-4000-8000-000000000002', 'a1000000-0000-4000-8000-000000000001', 'Wash', 30, 500);
insert into public.clients (id, salon_id, full_name, phone, user_id) values
  ('e1000000-0000-4000-8000-000000000041', 'a1000000-0000-4000-8000-000000000001', 'Akinyi Test',
   '+254700000042', 'd1000000-0000-4000-8000-000000000041');

-- Tokens: a shared phone moves to whoever registers it last; unregister only touches your own.
set local role authenticated;
set local request.jwt.claims = '{"sub":"d1000000-0000-4000-8000-000000000002","role":"authenticated"}';
select public.register_push_token('ExpoPushToken[shared-phone]');
set local request.jwt.claims = '{"sub":"d1000000-0000-4000-8000-000000000001","role":"authenticated"}';
select public.register_push_token('ExpoPushToken[shared-phone]');
select public.unregister_push_token('ExpoPushToken[nobody]');
reset role;
select is((select user_id from private.push_tokens where token = 'ExpoPushToken[shared-phone]'),
  'd1000000-0000-4000-8000-000000000001'::uuid, 'a shared phone moves to the last person to register it');

set local role authenticated;
set local request.jwt.claims = '{"sub":"d1000000-0000-4000-8000-000000000002","role":"authenticated"}';
select public.unregister_push_token('ExpoPushToken[shared-phone]');
reset role;
select is((select count(*)::int from private.push_tokens), 1, 'nobody can remove another person''s phone');

set local role authenticated;
set local request.jwt.claims = '{"sub":"d1000000-0000-4000-8000-000000000001","role":"authenticated"}';
select throws_ok($$ select * from private.push_tokens $$, '42501', null, 'tokens are not readable directly');
select throws_ok($$ select * from private.push_outbox $$, '42501', null, 'the outbox is not readable directly');
select throws_ok($$ select public.register_push_token('ExpoPushToken[bad token]') $$, 'BF400', null,
  'tokens with spaces are refused');
reset role;
set local role anon;
select throws_ok($$ select public.register_push_token('ExpoPushToken[x]') $$, '42501', null,
  'signed-out visitors cannot register a phone');
reset role;

-- Today's web booking with two services, then a client cancellation without a reason.
insert into public.bookings (id, salon_id, staff_id, client_id, status, period, hold_expires_at, total_kes, source) values
  ('f1000000-0000-4000-8000-000000000001', 'a1000000-0000-4000-8000-000000000001', 'b1000000-0000-4000-8000-000000000001',
   'e1000000-0000-4000-8000-000000000041', 'held',
   tstzrange(now() + interval '3 hours', now() + interval '4 hours'), now() + interval '10 minutes', 2000, 'web'),
  ('f1000000-0000-4000-8000-000000000002', 'a1000000-0000-4000-8000-000000000001', 'b1000000-0000-4000-8000-000000000001',
   'e1000000-0000-4000-8000-000000000041', 'held',
   tstzrange(now() + interval '20 days', now() + interval '20 days 30 minutes'), now() + interval '10 minutes', 500, 'web');
insert into public.booking_services (booking_id, service_id, name, duration_min, price_kes, position) values
  ('f1000000-0000-4000-8000-000000000001', 'c1000000-0000-4000-8000-000000000002', 'Wash', 30, 500, 1),
  ('f1000000-0000-4000-8000-000000000001', 'c1000000-0000-4000-8000-000000000001', 'Braids', 30, 1500, 0),
  ('f1000000-0000-4000-8000-000000000002', 'c1000000-0000-4000-8000-000000000002', 'Wash', 30, 500, 0);
update public.bookings set status = 'confirmed', hold_expires_at = null
 where id in ('f1000000-0000-4000-8000-000000000001', 'f1000000-0000-4000-8000-000000000002');

select matches((select body from private.push_outbox where booking_id = 'f1000000-0000-4000-8000-000000000001'),
  '^Braids, Wash · (Today|Tomorrow), \d\d:\d\d · with Achieng$', 'services follow their position');
select matches((select body from private.push_outbox where booking_id = 'f1000000-0000-4000-8000-000000000002'),
  '^Wash · (Mon|Tue|Wed|Thu|Fri|Sat|Sun) \d{1,2} [A-Z][a-z]{2}, \d\d:\d\d · with Achieng$',
  'later days read "Mon 5 Oct, 10:30"');
select is((select private.push_when(((now() at time zone 'Africa/Nairobi')::date + time '14:00') at time zone 'Africa/Nairobi', 'Africa/Nairobi')),
  'Today, 14:00', 'today reads "Today, 14:00"');

select ok((select sent_at is not null from private.push_outbox where booking_id = 'f1000000-0000-4000-8000-000000000001'),
  'a row for someone with a phone is handed to pg_net');
select ok((select convert_from(body, 'utf8')::jsonb @> '[{"to":"ExpoPushToken[shared-phone]","channelId":"bookings"}]'
                   and url = 'https://exp.host/--/api/v2/push/send'
             from net.http_request_queue order by id desc limit 1),
  'the request goes to that phone on the bookings channel');

update public.bookings set status = 'held', hold_expires_at = now() + interval '5 minutes'
 where id = 'f1000000-0000-4000-8000-000000000002';
select is((select count(*)::int from private.push_outbox where booking_id = 'f1000000-0000-4000-8000-000000000002'),
  1, 'only held → confirmed counts as a new booking');
update public.bookings set status = 'confirmed', hold_expires_at = null
 where id = 'f1000000-0000-4000-8000-000000000002';
delete from private.push_outbox where booking_id = 'f1000000-0000-4000-8000-000000000002';

set local role authenticated;
set local request.jwt.claims = '{"sub":"d1000000-0000-4000-8000-000000000041","role":"authenticated"}';
select public.cancel_my_booking('f1000000-0000-4000-8000-000000000002');
reset role;
select matches((select body from private.push_outbox
  where booking_id = 'f1000000-0000-4000-8000-000000000002' and kind = 'cancellation'),
  '^Wash · [A-Z][a-z]{2} \d{1,2} [A-Z][a-z]{2}, \d\d:\d\d$', 'no reason, no quote');

-- A member without a registered phone: the row stays unsent.
insert into public.salon_members (salon_id, user_id, role)
values ('a1000000-0000-4000-8000-000000000001', 'd1000000-0000-4000-8000-000000000002', 'owner');
update public.bookings set status = 'cancelled' where id = 'f1000000-0000-4000-8000-000000000001';
select is((select count(*)::int from private.push_outbox
  where booking_id = 'f1000000-0000-4000-8000-000000000001' and kind = 'cancellation' and sent_at is null),
  1, 'people without a phone get an unsent row');

-- Morning summary: nothing outside 07:00–07:59 or on a day without bookings.
set local role authenticated;
set local request.jwt.claims = '{"sub":"d1000000-0000-4000-8000-000000000001","role":"authenticated"}';
select public.set_notification_prefs(true, true, true);
reset role;
select is(public.queue_morning_summaries(((now() at time zone 'Africa/Nairobi')::date + 30 + time '08:00') at time zone 'Africa/Nairobi'),
  0, 'not at 08:00');
select is(public.queue_morning_summaries(((now() at time zone 'Africa/Nairobi')::date + 30 + time '07:00') at time zone 'Africa/Nairobi'),
  0, 'not on a day without bookings');
insert into public.bookings (salon_id, staff_id, status, period, source) values
  ('a1000000-0000-4000-8000-000000000001', 'b1000000-0000-4000-8000-000000000001', 'completed',
   tstzrange(((now() at time zone 'Africa/Nairobi')::date + 25 + time '09:00') at time zone 'Africa/Nairobi',
             ((now() at time zone 'Africa/Nairobi')::date + 25 + time '09:30') at time zone 'Africa/Nairobi'), 'owner');
select is(public.queue_morning_summaries(((now() at time zone 'Africa/Nairobi')::date + 25 + time '07:45') at time zone 'Africa/Nairobi')
  + public.queue_morning_summaries(((now() at time zone 'Africa/Nairobi')::date + 25 + time '07:00') at time zone 'Africa/Nairobi'),
  1, 'once on a day with a booking');

select * from finish();
rollback;
