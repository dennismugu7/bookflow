-- Builder-owned tests for salon setup (phase 2b), beyond the lead's acceptance tests.
begin;
select plan(16);

insert into auth.users (id, email) values
  ('d0000000-0000-4000-8000-000000000001', 'owner@example.test'),
  ('d0000000-0000-4000-8000-000000000002', 'staff@example.test'),
  ('d0000000-0000-4000-8000-000000000004', 'outsider@example.test');
insert into public.salons (id, slug, name)
values ('a0000000-0000-4000-8000-000000000001', 'salon-a', 'Salon A');
insert into public.staff (id, salon_id, display_name, is_active) values
  ('b0000000-0000-4000-8000-000000000001', 'a0000000-0000-4000-8000-000000000001', 'Njeri', false);
insert into public.salon_members (salon_id, user_id, role, staff_id) values
  ('a0000000-0000-4000-8000-000000000001', 'd0000000-0000-4000-8000-000000000001', 'owner', null),
  ('a0000000-0000-4000-8000-000000000001', 'd0000000-0000-4000-8000-000000000002', 'staff', 'b0000000-0000-4000-8000-000000000001');
insert into public.services (id, salon_id, name, duration_min, price_kes, is_bookable) values
  ('c0000000-0000-4000-8000-000000000001', 'a0000000-0000-4000-8000-000000000001', 'Trim', 30, 1000, false);
insert into public.staff_services (salon_id, staff_id, service_id) values
  ('a0000000-0000-4000-8000-000000000001', 'b0000000-0000-4000-8000-000000000001', 'c0000000-0000-4000-8000-000000000001');
insert into public.opening_hours (salon_id, weekday, opens, closes)
values ('a0000000-0000-4000-8000-000000000001', 6, '10:00', '24:00');

-- Status rules ---------------------------------------------------------------------

set local role authenticated;
set local request.jwt.claims = '{"sub":"d0000000-0000-4000-8000-000000000002","role":"authenticated"}';
select is(public.salon_setup_status('a0000000-0000-4000-8000-000000000001'),
  '{"services": false, "team": false, "hours": true}'::jsonb,
  'staff can read the status; hidden services and inactive staff do not count; 24:00 closing counts');
select throws_ok($$ select public.set_salon_published('a0000000-0000-4000-8000-000000000001', true) $$,
  '42501', null, 'staff cannot publish');
reset role;

set local role authenticated;
set local request.jwt.claims = '{"sub":"d0000000-0000-4000-8000-000000000004","role":"authenticated"}';
select throws_ok($$ select public.salon_setup_status('a0000000-0000-4000-8000-000000000001') $$,
  '42501', null, 'outsiders cannot read the status');
reset role;

set local role anon;
set local request.jwt.claims = '{"role":"anon"}';
select throws_ok($$ select public.salon_setup_status('a0000000-0000-4000-8000-000000000001') $$,
  '42501', null, 'visitors cannot call the status function');
reset role;

set local role authenticated;
set local request.jwt.claims = '{"sub":"d0000000-0000-4000-8000-000000000001","role":"authenticated"}';
select throws_ok($$ select public.set_salon_published('a0000000-0000-4000-8000-000000000001', true) $$,
  'BF422', 'Finish setting up before publishing: services, team',
  'the error names what is missing');

update public.services set is_bookable = true where id = 'c0000000-0000-4000-8000-000000000001';
select is(public.salon_setup_status('a0000000-0000-4000-8000-000000000001') ->> 'team', 'false',
  'an inactive staff member does not count as a team');
update public.staff set is_active = true where id = 'b0000000-0000-4000-8000-000000000001';
select lives_ok($$ select public.set_salon_published('a0000000-0000-4000-8000-000000000001', true) $$,
  'the salon publishes once everything is in place');
select lives_ok($$ select public.set_salon_published('a0000000-0000-4000-8000-000000000001', true) $$,
  'publishing again is harmless');
select lives_ok($$ update public.salons set tagline = 'Braids and more' where id = 'a0000000-0000-4000-8000-000000000001' $$,
  'owners still edit other salon fields directly');
select throws_ok($$ update public.salons set is_published = false where id = 'a0000000-0000-4000-8000-000000000001' $$,
  'BF403', null, 'unpublishing also goes through the function');
reset role;

select lives_ok($$ update public.salons set is_published = false where id = 'a0000000-0000-4000-8000-000000000001' $$,
  'the database owner (migrations, dashboard) is not blocked');

-- Media ------------------------------------------------------------------------------

select is((select public from storage.buckets where id = 'salon-media'), true, 'the media bucket is public');

set local role authenticated;
set local request.jwt.claims = '{"sub":"d0000000-0000-4000-8000-000000000001","role":"authenticated"}';
select throws_ok($$ insert into storage.objects (bucket_id, name) values ('salon-media', 'not-a-uuid/logo/x.jpg') $$,
  '42501', null, 'a malformed folder name is refused, not a cast error');
select lives_ok($$ insert into storage.objects (bucket_id, name)
  values ('salon-media', 'a0000000-0000-4000-8000-000000000001/staff/njeri.jpg') $$,
  'the owner uploads a staff photo');
-- The Storage API sets this before its own deletes; plain SQL deletes are blocked otherwise.
set local storage.allow_delete_query = 'true';
delete from storage.objects
 where bucket_id = 'salon-media' and name = 'a0000000-0000-4000-8000-000000000001/staff/njeri.jpg';
-- The owner can still see their folder, so a delete hidden by RLS would leave the row counted here.
select is((select count(*)::int from storage.objects
  where bucket_id = 'salon-media' and name = 'a0000000-0000-4000-8000-000000000001/staff/njeri.jpg'),
  0, 'the owner can delete their media');
reset role;

set local role authenticated;
set local request.jwt.claims = '{"sub":"d0000000-0000-4000-8000-000000000002","role":"authenticated"}';
select throws_ok($$ insert into storage.objects (bucket_id, name)
  values ('salon-media', 'a0000000-0000-4000-8000-000000000001/logo/x.jpg') $$,
  '42501', null, 'staff cannot upload salon media');
reset role;

select * from finish();
rollback;
