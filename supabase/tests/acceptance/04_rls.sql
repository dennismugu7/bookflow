begin;
select plan(19);

-- Fixtures (as the test superuser, which bypasses RLS)
insert into auth.users (id, email) values
  ('d0000000-0000-4000-8000-000000000001', 'owner-a@example.test'),
  ('d0000000-0000-4000-8000-000000000002', 'staff-a@example.test'),
  ('d0000000-0000-4000-8000-000000000003', 'owner-b@example.test'),
  ('d0000000-0000-4000-8000-000000000004', 'outsider@example.test');

insert into public.salons (id, slug, name, is_published) values
  ('a0000000-0000-4000-8000-000000000001', 'salon-a', 'Salon A', true),
  ('a0000000-0000-4000-8000-000000000002', 'salon-b', 'Salon B', false);

insert into public.staff (id, salon_id, display_name) values
  ('b0000000-0000-4000-8000-000000000001', 'a0000000-0000-4000-8000-000000000001', 'Njeri'),
  ('b0000000-0000-4000-8000-000000000002', 'a0000000-0000-4000-8000-000000000002', 'Wanjiku');

insert into public.salon_members (salon_id, user_id, role, staff_id) values
  ('a0000000-0000-4000-8000-000000000001', 'd0000000-0000-4000-8000-000000000001', 'owner', null),
  ('a0000000-0000-4000-8000-000000000001', 'd0000000-0000-4000-8000-000000000002', 'staff', 'b0000000-0000-4000-8000-000000000001'),
  ('a0000000-0000-4000-8000-000000000002', 'd0000000-0000-4000-8000-000000000003', 'owner', null);

insert into public.services (id, salon_id, name, duration_min, price_kes) values
  ('c0000000-0000-4000-8000-000000000001', 'a0000000-0000-4000-8000-000000000001', 'Trim', 15, 1000),
  ('c0000000-0000-4000-8000-000000000002', 'a0000000-0000-4000-8000-000000000002', 'Braids', 60, 2500);

insert into public.clients (id, salon_id, full_name, phone) values
  ('e0000000-0000-4000-8000-000000000001', 'a0000000-0000-4000-8000-000000000001', 'Client A', '+254700000001'),
  ('e0000000-0000-4000-8000-000000000002', 'a0000000-0000-4000-8000-000000000002', 'Client B', '+254700000002');

insert into public.bookings (id, salon_id, staff_id, client_id, status, period) values
  ('f0000000-0000-4000-8000-000000000001', 'a0000000-0000-4000-8000-000000000001', 'b0000000-0000-4000-8000-000000000001',
   'e0000000-0000-4000-8000-000000000001', 'confirmed', tstzrange('2026-11-10 09:00+03', '2026-11-10 10:00+03')),
  ('f0000000-0000-4000-8000-000000000002', 'a0000000-0000-4000-8000-000000000002', 'b0000000-0000-4000-8000-000000000002',
   'e0000000-0000-4000-8000-000000000002', 'confirmed', tstzrange('2026-11-10 09:00+03', '2026-11-10 10:00+03'));

-- Anonymous visitor
set local role anon;
set local request.jwt.claims = '{"role":"anon"}';
select is((select count(*)::int from public.salons), 1, 'anon sees only published salons');
select is((select count(*)::int from public.clients), 0, 'anon cannot read clients');
select is((select count(*)::int from public.bookings), 0, 'anon cannot read bookings');
select is((select count(*)::int from public.services), 1, 'anon sees only services of published salons');
select throws_ok($$ insert into public.salons (slug, name) values ('x-salon', 'X') $$,
  '42501', null, 'anon cannot create salons directly');
reset role;

-- Staff member of salon A
set local role authenticated;
set local request.jwt.claims = '{"sub":"d0000000-0000-4000-8000-000000000002","role":"authenticated"}';
select is((select count(*)::int from public.services where salon_id = 'a0000000-0000-4000-8000-000000000001'), 1,
  'staff see their salon''s services');
select is((select count(*)::int from public.clients), 1, 'staff see only their salon''s clients');
select throws_ok($$ insert into public.services (salon_id, name, duration_min, price_kes)
  values ('a0000000-0000-4000-8000-000000000001', 'Staff service', 30, 500) $$,
  '42501', null, 'staff cannot create services');
select results_eq($$ with u as (update public.salons set name = 'Changed by staff'
  where id = 'a0000000-0000-4000-8000-000000000001' returning 1) select count(*)::int from u $$,
  $$ values (0) $$, 'staff cannot edit the salon');
reset role;

-- Owner of salon A
set local role authenticated;
set local request.jwt.claims = '{"sub":"d0000000-0000-4000-8000-000000000001","role":"authenticated"}';
select is((select count(*)::int from public.clients), 1, 'an owner sees only their own clients');
select is((select count(*)::int from public.bookings), 1, 'an owner sees only their own bookings');
select results_eq($$ with u as (update public.salons set name = 'Hacked'
  where id = 'a0000000-0000-4000-8000-000000000002' returning 1) select count(*)::int from u $$,
  $$ values (0) $$, 'an owner cannot edit another salon');
select lives_ok($$ insert into public.services (salon_id, name, duration_min, price_kes)
  values ('a0000000-0000-4000-8000-000000000001', 'Wash', 30, 800) $$,
  'an owner can add a service to their salon');
select throws_ok($$ insert into public.services (salon_id, name, duration_min, price_kes)
  values ('a0000000-0000-4000-8000-000000000002', 'Sneaky', 30, 800) $$,
  '42501', null, 'an owner cannot add a service to another salon');
reset role;

-- Owner of salon B (unpublished)
set local role authenticated;
set local request.jwt.claims = '{"sub":"d0000000-0000-4000-8000-000000000003","role":"authenticated"}';
select is((select count(*)::int from public.salons), 2, 'an owner sees their unpublished salon plus published ones');
reset role;

-- Signed-in user with no salon
set local role authenticated;
set local request.jwt.claims = '{"sub":"d0000000-0000-4000-8000-000000000004","role":"authenticated"}';
select is((select count(*)::int from public.salons), 1, 'an outsider sees only published salons');
select is((select count(*)::int from public.clients), 0, 'an outsider sees no clients');
select is((select count(*)::int from public.bookings), 0, 'an outsider sees no bookings');
select throws_ok($$ insert into public.salon_members (salon_id, user_id, role)
  values ('a0000000-0000-4000-8000-000000000001', 'd0000000-0000-4000-8000-000000000004', 'owner') $$,
  '42501', null, 'an outsider cannot make themselves an owner');
reset role;

select * from finish();
rollback;
