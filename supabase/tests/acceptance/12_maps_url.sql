begin;
select plan(3);

insert into auth.users (id, email) values ('d0000000-0000-4000-8000-000000000001', 'owner-a@example.test');
insert into public.salons (id, slug, name) values ('a0000000-0000-4000-8000-000000000001', 'salon-a', 'Salon A');
insert into public.salon_members (salon_id, user_id, role)
values ('a0000000-0000-4000-8000-000000000001', 'd0000000-0000-4000-8000-000000000001', 'owner');

set local role authenticated;
set local request.jwt.claims = '{"sub":"d0000000-0000-4000-8000-000000000001","role":"authenticated"}';
select lives_ok($$ update public.salons set maps_url = 'https://maps.app.goo.gl/ySvketsuMA7dAbvQ7'
  where id = 'a0000000-0000-4000-8000-000000000001' $$, 'an owner can save a Google Maps app link');
select lives_ok($$ update public.salons set maps_url = 'https://www.google.com/maps/place/Galana+Plaza/@-1.29,36.784,17z'
  where id = 'a0000000-0000-4000-8000-000000000001' $$, 'a long Google Maps link is accepted');
select throws_ok($$ update public.salons set maps_url = 'https://example.com/maps/abc'
  where id = 'a0000000-0000-4000-8000-000000000001' $$, '23514', null, 'other websites are rejected');
reset role;

select * from finish();
rollback;
