-- Release 1.0.1 extras: the reviewer login's rate limit, user lookup, guards and edge times.
begin;
select plan(18);

insert into auth.users (id, email) values
  ('d0000000-0000-4000-8000-0000000000aa', 'support@mugu-labs.com'),
  ('d0000000-0000-4000-8000-0000000000bb', 'owner-b@example.test');

-- Only the server can use the reviewer functions.
set local role anon;
select throws_ok($$ select public.review_sign_in_blocked() $$, '42501', null, 'anon cannot check the limit');
select throws_ok($$ select public.get_review_user_id() $$, '42501', null, 'anon cannot look up the review user');
reset role;
set local role authenticated;
set local request.jwt.claims = '{"sub":"d0000000-0000-4000-8000-0000000000bb","role":"authenticated"}';
select throws_ok($$ select public.record_review_sign_in_failure() $$, '42501', null,
  'authenticated cannot record failures');
select throws_ok($$ select public.ensure_review_demo('d0000000-0000-4000-8000-0000000000aa') $$, '42501', null,
  'authenticated cannot seed the demo');
reset role;

-- The rate limit: 5 failures in 15 minutes.
set local role service_role;
select is(public.get_review_user_id(), 'd0000000-0000-4000-8000-0000000000aa'::uuid, 'the review user is found by email');
select is(public.review_sign_in_blocked(), false, 'not blocked at first');
select public.record_review_sign_in_failure() from generate_series(1, 4);
select is(public.review_sign_in_blocked(), false, 'not blocked after 4 failures');
select public.record_review_sign_in_failure();
select is(public.review_sign_in_blocked(), true, 'blocked after 5');
reset role;
update private.review_sign_in_attempts set created_at = now() - interval '16 minutes';
set local role service_role;
select is(public.review_sign_in_blocked(), false, 'failures older than 15 minutes no longer count');

-- The public wrapper only seeds the review user.
select throws_ok($$ select public.ensure_review_demo('d0000000-0000-4000-8000-0000000000bb') $$, '42501', null,
  'another account never gets the demo salon');
select lives_ok($$ select public.ensure_review_demo('d0000000-0000-4000-8000-0000000000aa') $$,
  'the server seeds the review user at the real time');
select ok((select s.is_published from public.salons s join public.salon_members m on m.salon_id = s.id
           where m.user_id = 'd0000000-0000-4000-8000-0000000000aa'),
  'the demo salon is published, so Today shows its bookings');
reset role;

-- Near midnight and just after it, nothing fails.
select lives_ok($$ select private.ensure_review_demo('d0000000-0000-4000-8000-0000000000aa',
  (((now() at time zone 'Africa/Nairobi')::date + 5 + time '23:50') at time zone 'Africa/Nairobi')) $$,
  'late at night still works');
select lives_ok($$ select private.ensure_review_demo('d0000000-0000-4000-8000-0000000000aa',
  (((now() at time zone 'Africa/Nairobi')::date + 6 + time '00:02') at time zone 'Africa/Nairobi')) $$,
  'just after midnight still works');

-- Bookings that ended over 14 days ago go.
select private.ensure_review_demo('d0000000-0000-4000-8000-0000000000aa', now() + interval '30 days');
select is((select count(*)::int from public.bookings b
             join public.salon_members m on m.salon_id = b.salon_id
            where m.user_id = 'd0000000-0000-4000-8000-0000000000aa'
              and upper(b.period) < now() + interval '16 days'), 0,
  'bookings older than 14 days are removed');

-- A deleted account comes back with a fresh demo salon.
set local role service_role;
select public.delete_account_data('d0000000-0000-4000-8000-0000000000aa', 'other', null);
reset role;
delete from auth.users where id = 'd0000000-0000-4000-8000-0000000000aa';
insert into auth.users (id, email) values ('d0000000-0000-4000-8000-0000000000ac', 'support@mugu-labs.com');
select is((select count(*)::int from public.salons where slug = 'demo-salon'), 0, 'the deleted demo salon is gone');
select private.ensure_review_demo('d0000000-0000-4000-8000-0000000000ac');
select is((select count(*)::int from public.salons where slug = 'demo-salon'), 1, 'the next sign-in recreates it');

-- Someone else's salon called demo-salon doesn't block the demo.
set local role service_role;
select public.delete_account_data('d0000000-0000-4000-8000-0000000000ac', 'other', null);
reset role;
delete from auth.users where id = 'd0000000-0000-4000-8000-0000000000ac';
insert into public.salons (slug, name) values ('demo-salon', 'Not the demo');
insert into auth.users (id, email) values ('d0000000-0000-4000-8000-0000000000ad', 'support@mugu-labs.com');
select private.ensure_review_demo('d0000000-0000-4000-8000-0000000000ad');
select is((select count(*)::int from public.salons s join public.salon_members m on m.salon_id = s.id
            where m.user_id = 'd0000000-0000-4000-8000-0000000000ad' and s.slug like 'demo-salon-%'), 1,
  'a taken slug gets a suffix');

select * from finish();
rollback;
