begin;
select plan(9);

insert into auth.users (id, email) values
  ('d1200000-0000-4000-8000-000000000001', 'owner-p@example.test'),
  ('d1200000-0000-4000-8000-000000000002', 'staff-p@example.test');
insert into public.salons (id, slug, name, is_published, timezone)
values ('a1200000-0000-4000-8000-000000000001', 'salon-p', 'Salon P', false, 'Africa/Nairobi');
insert into public.salon_members (salon_id, user_id, role) values
  ('a1200000-0000-4000-8000-000000000001', 'd1200000-0000-4000-8000-000000000001', 'owner'),
  ('a1200000-0000-4000-8000-000000000001', 'd1200000-0000-4000-8000-000000000002', 'staff');

set local role authenticated;
set local request.jwt.claims = '{"sub":"d1200000-0000-4000-8000-000000000001","role":"authenticated"}';
select throws_ok($$ select public.set_salon_photos('a1200000-0000-4000-8000-000000000001',
  array['a1200000-0000-4000-8000-000000000001/banner/1.jpg', 'a1200000-0000-4000-8000-000000000001/banner/1.jpg']) $$,
  'BF400', null, 'a duplicate path is refused');
select throws_ok($$ select public.set_salon_photos('a1200000-0000-4000-8000-000000000001',
  array['a1200000-0000-4000-8000-000000000001/banner/1.png']) $$,
  'BF400', null, 'only .jpg files');
select throws_ok($$ select public.set_salon_photos('a1200000-0000-4000-8000-000000000001',
  array[null]::text[]) $$,
  'BF400', null, 'a null path is refused');
select throws_ok($$ insert into public.salon_photos (salon_id, path, position)
  values ('a1200000-0000-4000-8000-000000000001', 'a1200000-0000-4000-8000-000000000001/banner/x.jpg', 0) $$,
  '42501', null, 'owners cannot insert photos directly');
select lives_ok($$ select public.set_salon_photos('a1200000-0000-4000-8000-000000000001',
  array['a1200000-0000-4000-8000-000000000001/banner/a.jpg', 'a1200000-0000-4000-8000-000000000001/banner/b.jpg']) $$,
  'six or fewer valid photos are saved');
select is((select count(*)::int from public.salon_photos), 2, 'the owner sees an unpublished salon''s photos');
select lives_ok($$ update public.salons set share_message = 'Karibu!' where id = 'a1200000-0000-4000-8000-000000000001' $$,
  'the owner saves a share message');

set local request.jwt.claims = '{"sub":"d1200000-0000-4000-8000-000000000002","role":"authenticated"}';
select is((select count(*)::int from public.salon_photos), 2, 'staff see their salon''s photos');
select throws_ok($$ select public.set_salon_photos('a1200000-0000-4000-8000-000000000001', array[]::text[]) $$,
  '42501', null, 'staff cannot change the photos');
reset role;

select * from finish();
rollback;
