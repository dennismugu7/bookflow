begin;
select plan(5);

insert into auth.users (id, email)
values ('d0000000-0000-4000-8000-000000000004', 'new-owner@example.test');

set local role authenticated;
set local request.jwt.claims = '{"sub":"d0000000-0000-4000-8000-000000000004","role":"authenticated"}';

select lives_ok($$ select public.create_salon('Glow Studio', 'glow-studio') $$,
  'a signed-in user can create a salon');
select is(
  (select m.role::text from public.salon_members m
     join public.salons s on s.id = m.salon_id
    where s.slug = 'glow-studio' and m.user_id = 'd0000000-0000-4000-8000-000000000004'),
  'owner', 'the creator becomes the owner');
select throws_ok($$ select public.create_salon('Another Glow', 'glow-studio') $$,
  '23505', null, 'slugs are unique');
select throws_ok($$ select public.create_salon('Bad Slug', 'Bad Slug') $$,
  '23514', null, 'invalid slugs are rejected');
reset role;

set local role anon;
set local request.jwt.claims = '{"role":"anon"}';
select throws_ok($$ select public.create_salon('Anon Salon', 'anon-salon') $$,
  '42501', null, 'anonymous visitors cannot create salons');
reset role;

select * from finish();
rollback;
