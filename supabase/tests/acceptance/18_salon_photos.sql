begin;
select plan(12);

insert into auth.users (id, email) values
  ('d0000000-0000-4000-8000-000000000001', 'owner-a@example.test'),
  ('d0000000-0000-4000-8000-000000000004', 'outsider@example.test');
insert into public.salons (id, slug, name, is_published, timezone) values
  ('a0000000-0000-4000-8000-000000000001', 'salon-a', 'Salon A', true, 'Africa/Nairobi'),
  ('a0000000-0000-4000-8000-000000000002', 'salon-b', 'Salon B', false, 'Africa/Nairobi');
insert into public.salon_members (salon_id, user_id, role) values
  ('a0000000-0000-4000-8000-000000000001', 'd0000000-0000-4000-8000-000000000001', 'owner'),
  ('a0000000-0000-4000-8000-000000000002', 'd0000000-0000-4000-8000-000000000001', 'owner');

set local role authenticated;
set local request.jwt.claims = '{"sub":"d0000000-0000-4000-8000-000000000001","role":"authenticated"}';
select lives_ok($$ select public.set_salon_photos('a0000000-0000-4000-8000-000000000001',
  array['a0000000-0000-4000-8000-000000000001/banner/1.jpg', 'a0000000-0000-4000-8000-000000000001/banner/2.jpg', 'a0000000-0000-4000-8000-000000000001/banner/3.jpg']) $$, 'an owner saves three salon photos');
reset role;
select is((select array_agg(path order by position) from public.salon_photos where salon_id = 'a0000000-0000-4000-8000-000000000001'),
  array['a0000000-0000-4000-8000-000000000001/banner/1.jpg', 'a0000000-0000-4000-8000-000000000001/banner/2.jpg', 'a0000000-0000-4000-8000-000000000001/banner/3.jpg'], 'the photos keep their order');
select is((select banner_path from public.salons where id = 'a0000000-0000-4000-8000-000000000001'), 'a0000000-0000-4000-8000-000000000001/banner/1.jpg',
  'the first photo is the banner');

set local role authenticated;
set local request.jwt.claims = '{"sub":"d0000000-0000-4000-8000-000000000001","role":"authenticated"}';
select public.set_salon_photos('a0000000-0000-4000-8000-000000000001', array['a0000000-0000-4000-8000-000000000001/banner/2.jpg', 'a0000000-0000-4000-8000-000000000001/banner/1.jpg']);
reset role;
select is((select banner_path from public.salons where id = 'a0000000-0000-4000-8000-000000000001'), 'a0000000-0000-4000-8000-000000000001/banner/2.jpg',
  'making another photo the banner moves it first');
select is((select count(*)::int from public.salon_photos where salon_id = 'a0000000-0000-4000-8000-000000000001'), 2, 'removed photos are gone');

set local role authenticated;
set local request.jwt.claims = '{"sub":"d0000000-0000-4000-8000-000000000001","role":"authenticated"}';
select throws_ok($$ select public.set_salon_photos('a0000000-0000-4000-8000-000000000001', array['a0000000-0000-4000-8000-000000000001/banner/1.jpg', 'a0000000-0000-4000-8000-000000000001/banner/2.jpg',
  'a0000000-0000-4000-8000-000000000001/banner/3.jpg', 'a0000000-0000-4000-8000-000000000001/banner/4.jpg', 'a0000000-0000-4000-8000-000000000001/banner/5.jpg', 'a0000000-0000-4000-8000-000000000001/banner/6.jpg', 'a0000000-0000-4000-8000-000000000001/banner/7.jpg']) $$,
  'BF400', null, 'at most six photos');
select throws_ok($$ select public.set_salon_photos('a0000000-0000-4000-8000-000000000001', array['a0000000-0000-4000-8000-000000000002/banner/1.jpg']) $$,
  'BF400', null, 'only photos stored under this salon');
select public.set_salon_photos('a0000000-0000-4000-8000-000000000002', array['a0000000-0000-4000-8000-000000000002/banner/1.jpg']);
select public.set_salon_photos('a0000000-0000-4000-8000-000000000002', array[]::text[]);
reset role;
select is((select banner_path from public.salons where id = 'a0000000-0000-4000-8000-000000000002'), null, 'no photos means no banner');
insert into public.salon_photos (salon_id, path, position) values ('a0000000-0000-4000-8000-000000000002', 'a0000000-0000-4000-8000-000000000002/banner/9.jpg', 0);

set local role authenticated;
set local request.jwt.claims = '{"sub":"d0000000-0000-4000-8000-000000000004","role":"authenticated"}';
select throws_ok($$ select public.set_salon_photos('a0000000-0000-4000-8000-000000000001', array['a0000000-0000-4000-8000-000000000001/banner/1.jpg']) $$,
  '42501', null, 'only the owner changes the photos');
reset role;

set local role anon;
select is((select count(*)::int from public.salon_photos where salon_id = 'a0000000-0000-4000-8000-000000000001'), 2,
  'anyone sees a published salon''s photos');
select is((select count(*)::int from public.salon_photos where salon_id = 'a0000000-0000-4000-8000-000000000002'), 0,
  'nobody sees an unpublished salon''s photos');
reset role;

set local role authenticated;
set local request.jwt.claims = '{"sub":"d0000000-0000-4000-8000-000000000001","role":"authenticated"}';
select throws_ok($$ update public.salons set share_message = repeat('a', 201) where id = 'a0000000-0000-4000-8000-000000000001' $$,
  '23514', null, 'the share message is at most 200 characters');
reset role;

select * from finish();
rollback;
