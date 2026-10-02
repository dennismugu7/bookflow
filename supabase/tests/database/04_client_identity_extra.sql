-- Builder-owned tests for client identity (phase 1c), beyond the lead's acceptance tests.
begin;
select plan(21);

insert into auth.users (id, email, email_confirmed_at, phone) values
  ('d0000000-0000-4000-8000-000000000001', 'owner@example.test', now(), null),
  ('d0000000-0000-4000-8000-000000000031', 'wanjiru@example.test', now(), '254700000031'),
  ('d0000000-0000-4000-8000-000000000032', 'kamau@example.test', now(), null);

insert into public.salons (id, slug, name, is_published, timezone)
values ('a0000000-0000-4000-8000-000000000001', 'salon-a', 'Salon A', true, 'Africa/Nairobi');
insert into public.staff (id, salon_id, display_name)
values ('b0000000-0000-4000-8000-000000000001', 'a0000000-0000-4000-8000-000000000001', 'Njeri');
insert into public.salon_members (salon_id, user_id, role)
values ('a0000000-0000-4000-8000-000000000001', 'd0000000-0000-4000-8000-000000000001', 'owner');

insert into public.bookings (id, salon_id, staff_id, status, period, hold_expires_at, hold_token_hash, total_kes, source)
select ('f0000000-0000-4000-8000-00000000003' || n)::uuid,
       'a0000000-0000-4000-8000-000000000001', 'b0000000-0000-4000-8000-000000000001', 'held',
       tstzrange(((current_date + 8) + time '09:00' + n * interval '1 hour') at time zone 'Africa/Nairobi',
                 ((current_date + 8) + time '09:30' + n * interval '1 hour') at time zone 'Africa/Nairobi'),
       case when n = 6 then now() - interval '1 minute' else now() + interval '10 minutes' end,
       encode(sha256(('identity-token-000000' || n)::bytea), 'hex'), 1000, 'web'
  from generate_series(1, 6) as n;

-- Phone normalisation matches normalizeKenyanPhone -----------------------------------

select is(private.normalize_kenyan_phone('(0700) 000021'), '+254700000021', 'SQL: brackets and spaces are stripped');
select is(private.normalize_kenyan_phone('0110-000-021'), '+254110000021', 'SQL: 01xx numbers are Kenyan too');
select is(private.normalize_kenyan_phone('254700000021'), '+254700000021', 'SQL: a missing plus is added');
select is(private.normalize_kenyan_phone('+0700000021'), null, 'SQL: a plus followed by 0 is rejected');
select is(private.normalize_kenyan_phone(null), null, 'SQL: null is rejected');

-- Contact path ------------------------------------------------------------------------

set local role authenticated;
set local request.jwt.claims = '{"sub":"d0000000-0000-4000-8000-000000000031","role":"authenticated"}';
select throws_ok($$ select public.confirm_booking_contact('identity-token-0000001', '   ', '0700000031') $$,
  'BF400', null, 'a blank name is rejected');
select throws_ok($$ select public.confirm_booking_contact('unknown-token-00000000', 'Wanjiru', '0700000031') $$,
  'BF404', null, 'an unknown hold is rejected');
select throws_ok($$ select public.confirm_booking_contact('identity-token-0000006', 'Wanjiru', '0700000031') $$,
  'BF410', null, 'an expired hold is rejected');
select lives_ok($$ select public.confirm_booking_contact('identity-token-0000001', 'Wanjiru', '0700000031') $$,
  'a client confirms with a typed phone');
select throws_ok($$ select public.confirm_booking_contact('identity-token-0000001', 'Wanjiru', '0700000031') $$,
  'BF404', null, 'a hold cannot be confirmed twice');
reset role;

select is((select data from public.booking_events
  where booking_id = 'f0000000-0000-4000-8000-000000000031' and type = 'confirmed'),
  '{"method": "contact"}'::jsonb, 'the confirmation records the contact method');
select is((select hold_token_hash from public.bookings where id = 'f0000000-0000-4000-8000-000000000031'),
  null, 'the hold token is cleared');

-- Verified-phone path upgrades the same client record --------------------------------

set local role authenticated;
set local request.jwt.claims = '{"sub":"d0000000-0000-4000-8000-000000000031","role":"authenticated"}';
select lives_ok($$ select public.confirm_booking('identity-token-0000002', 'Wanjiru') $$,
  'the same user confirms later with a verified phone');
reset role;

select is((select count(*)::int || ' / ' || bool_and(phone_verified)::text from public.clients
  where user_id = 'd0000000-0000-4000-8000-000000000031'),
  '1 / true', 'the user keeps one client record, now with a verified phone');

-- A typed phone never replaces a verified one, and the owner's name stays
update public.clients set full_name = 'Wanjiru (owner edit)' where user_id = 'd0000000-0000-4000-8000-000000000031';
set local role authenticated;
set local request.jwt.claims = '{"sub":"d0000000-0000-4000-8000-000000000031","role":"authenticated"}';
select lives_ok($$ select public.confirm_booking_contact('identity-token-0000003', 'New Name', '0700000099') $$,
  'a verified client can still confirm by contact');
reset role;

select is((select full_name || ' / ' || phone || ' / ' || phone_verified::text from public.clients
  where user_id = 'd0000000-0000-4000-8000-000000000031'),
  'Wanjiru (owner edit) / +254700000031 / true', 'a typed phone never replaces a verified phone or the name');

-- Verified path never merges into an unverified record with the same phone ------------

insert into public.clients (salon_id, full_name, phone, user_id)
values ('a0000000-0000-4000-8000-000000000001', 'Typed By Someone', '+254700000032', null);
update auth.users set phone = '254700000032' where id = 'd0000000-0000-4000-8000-000000000032';

set local role authenticated;
set local request.jwt.claims = '{"sub":"d0000000-0000-4000-8000-000000000032","role":"authenticated"}';
select lives_ok($$ select public.confirm_booking('identity-token-0000004', 'Kamau') $$,
  'a verified phone confirms even if someone typed the same number');
reset role;

select is((select count(*)::int from public.clients
  where salon_id = 'a0000000-0000-4000-8000-000000000001' and phone = '+254700000032' and user_id is null),
  1, 'the unverified record is left alone');

-- Apps cannot mark a phone verified ----------------------------------------------------

set local role authenticated;
set local request.jwt.claims = '{"sub":"d0000000-0000-4000-8000-000000000001","role":"authenticated"}';
insert into public.clients (salon_id, full_name, phone, phone_verified)
values ('a0000000-0000-4000-8000-000000000001', 'Walk-in', '+254700000033', true);
update public.clients set phone_verified = true where phone = '+254700000032' and user_id is null;
update public.clients set phone = '+254700000034' where user_id = 'd0000000-0000-4000-8000-000000000032';
reset role;

select is((select phone_verified from public.clients where phone = '+254700000033'),
  false, 'an owner cannot create a client with a verified phone');
select is((select phone_verified from public.clients where phone = '+254700000032' and user_id is null),
  false, 'an owner cannot mark a phone verified');
select is((select phone_verified from public.clients where user_id = 'd0000000-0000-4000-8000-000000000032'),
  false, 'changing a verified phone clears the flag');

select * from finish();
rollback;
