begin;
select plan(14);

insert into auth.users (id, email) values
  ('d0000000-0000-4000-8000-000000000001', 'owner-a@example.test'),
  ('d0000000-0000-4000-8000-000000000003', 'owner-b@example.test'),
  ('d0000000-0000-4000-8000-000000000004', 'outsider@example.test');
insert into public.salons (id, slug, name) values
  ('a0000000-0000-4000-8000-000000000001', 'salon-a', 'Salon A'),
  ('a0000000-0000-4000-8000-000000000002', 'salon-b', 'Salon B');
insert into public.salon_members (salon_id, user_id, role) values
  ('a0000000-0000-4000-8000-000000000001', 'd0000000-0000-4000-8000-000000000001', 'owner'),
  ('a0000000-0000-4000-8000-000000000002', 'd0000000-0000-4000-8000-000000000003', 'owner');

set local role authenticated;
set local request.jwt.claims = '{"sub":"d0000000-0000-4000-8000-000000000001","role":"authenticated"}';

select throws_ok($$ select public.set_salon_published('a0000000-0000-4000-8000-000000000001', true) $$,
  'BF422', null, 'an empty salon cannot be published');
select is(public.salon_setup_status('a0000000-0000-4000-8000-000000000001') ->> 'services', 'false',
  'setup status reports missing services');
select lives_ok($$ insert into public.services (id, salon_id, name, duration_min, price_kes)
  values ('c0000000-0000-4000-8000-000000000001', 'a0000000-0000-4000-8000-000000000001', 'Trim', 30, 1000) $$,
  'the owner adds a service');
select throws_ok($$ select public.set_salon_published('a0000000-0000-4000-8000-000000000001', true) $$,
  'BF422', null, 'a salon with services but no team or hours cannot be published');

insert into public.staff (id, salon_id, display_name)
values ('b0000000-0000-4000-8000-000000000001', 'a0000000-0000-4000-8000-000000000001', 'Njeri');
insert into public.staff_services (salon_id, staff_id, service_id)
values ('a0000000-0000-4000-8000-000000000001', 'b0000000-0000-4000-8000-000000000001', 'c0000000-0000-4000-8000-000000000001');
insert into public.opening_hours (salon_id, weekday, opens, closes)
values ('a0000000-0000-4000-8000-000000000001', 1, '10:00', '18:00');

select is(public.salon_setup_status('a0000000-0000-4000-8000-000000000001'),
  '{"services": true, "team": true, "hours": true}'::jsonb, 'setup status is complete');
select throws_ok($$ update public.salons set is_published = true where id = 'a0000000-0000-4000-8000-000000000001' $$,
  'BF403', null, 'publishing cannot bypass the checks with a direct update');
select lives_ok($$ select public.set_salon_published('a0000000-0000-4000-8000-000000000001', true) $$,
  'a complete salon can be published');
reset role;

select is((select is_published from public.salons where id = 'a0000000-0000-4000-8000-000000000001'),
  true, 'the salon is published');

set local role authenticated;
set local request.jwt.claims = '{"sub":"d0000000-0000-4000-8000-000000000004","role":"authenticated"}';
select throws_ok($$ select public.set_salon_published('a0000000-0000-4000-8000-000000000001', false) $$,
  '42501', null, 'only an owner can unpublish');
reset role;

set local role authenticated;
set local request.jwt.claims = '{"sub":"d0000000-0000-4000-8000-000000000001","role":"authenticated"}';
select lives_ok($$ select public.set_salon_published('a0000000-0000-4000-8000-000000000001', false) $$,
  'an owner can unpublish at any time');
select lives_ok($$ insert into storage.objects (bucket_id, name)
  values ('salon-media', 'a0000000-0000-4000-8000-000000000001/logo/logo-1.jpg') $$,
  'an owner can upload into their salon''s folder');
select throws_ok($$ insert into storage.objects (bucket_id, name)
  values ('salon-media', 'a0000000-0000-4000-8000-000000000002/logo/logo-1.jpg') $$,
  '42501', null, 'an owner cannot upload into another salon''s folder');
reset role;

select is((select is_published from public.salons where id = 'a0000000-0000-4000-8000-000000000001'),
  false, 'the salon is unpublished');

set local role authenticated;
set local request.jwt.claims = '{"sub":"d0000000-0000-4000-8000-000000000004","role":"authenticated"}';
select throws_ok($$ insert into storage.objects (bucket_id, name)
  values ('salon-media', 'a0000000-0000-4000-8000-000000000001/banner/banner-1.jpg') $$,
  '42501', null, 'an outsider cannot upload into a salon''s folder');
reset role;

select * from finish();
rollback;
