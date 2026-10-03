-- Builder-owned tests for set_opening_hours (phase 2b).
begin;
select plan(8);

insert into auth.users (id, email) values
  ('d0000000-0000-4000-8000-000000000001', 'owner@example.test'),
  ('d0000000-0000-4000-8000-000000000004', 'outsider@example.test');
insert into public.salons (id, slug, name)
values ('a0000000-0000-4000-8000-000000000001', 'salon-a', 'Salon A');
insert into public.salon_members (salon_id, user_id, role)
values ('a0000000-0000-4000-8000-000000000001', 'd0000000-0000-4000-8000-000000000001', 'owner');
insert into public.opening_hours (salon_id, weekday, opens, closes)
values ('a0000000-0000-4000-8000-000000000001', 3, '08:00', '12:00');

set local role authenticated;
set local request.jwt.claims = '{"sub":"d0000000-0000-4000-8000-000000000001","role":"authenticated"}';

select lives_ok($$ select public.set_opening_hours('a0000000-0000-4000-8000-000000000001',
  '[{"weekday":1,"opens":"10:00","closes":"13:00"},{"weekday":1,"opens":"14:00","closes":"24:00"},
    {"weekday":6,"opens":"09:00","closes":"17:00"}]') $$,
  'the owner saves a week with a split day and a midnight close');
select is((select string_agg(weekday || ' ' || opens || '-' || closes, '; ' order by weekday, opens)
  from public.opening_hours where salon_id = 'a0000000-0000-4000-8000-000000000001'),
  '1 10:00:00-13:00:00; 1 14:00:00-24:00:00; 6 09:00:00-17:00:00', 'the old week is replaced by the new one');
select throws_ok($$ select public.set_opening_hours('a0000000-0000-4000-8000-000000000001',
  '[{"weekday":2,"opens":"10:00","closes":"14:00"},{"weekday":2,"opens":"13:00","closes":"18:00"}]') $$,
  'BF400', 'Opening ranges on the same day overlap', 'overlapping ranges are refused');
select throws_ok($$ select public.set_opening_hours('a0000000-0000-4000-8000-000000000001',
  '[{"weekday":2,"opens":"18:00","closes":"10:00"}]') $$,
  'BF400', null, 'a range that closes before it opens is refused');
select throws_ok($$ select public.set_opening_hours('a0000000-0000-4000-8000-000000000001',
  '[{"weekday":8,"opens":"10:00","closes":"18:00"}]') $$,
  'BF400', null, 'weekdays run 1 to 7');
select is((select count(*)::int from public.opening_hours where salon_id = 'a0000000-0000-4000-8000-000000000001'),
  3, 'a refused save leaves the previous hours in place');
select lives_ok($$ select public.set_opening_hours('a0000000-0000-4000-8000-000000000001', '[]') $$,
  'an owner can close every day');
reset role;

set local role authenticated;
set local request.jwt.claims = '{"sub":"d0000000-0000-4000-8000-000000000004","role":"authenticated"}';
select throws_ok($$ select public.set_opening_hours('a0000000-0000-4000-8000-000000000001', '[]') $$,
  '42501', null, 'outsiders cannot change hours');
reset role;

select * from finish();
rollback;
