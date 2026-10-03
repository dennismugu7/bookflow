-- Builder-owned tests for salons.maps_url (fix 2b-2).
begin;
select plan(6);

insert into public.salons (id, slug, name) values ('a0000000-0000-4000-8000-000000000001', 'salon-a', 'Salon A');

select lives_ok($$ update public.salons set maps_url = 'https://goo.gl/maps/abc' where slug = 'salon-a' $$,
  'goo.gl/maps links are accepted');
select lives_ok($$ update public.salons set maps_url = 'https://google.co.ke/maps/place/X' where slug = 'salon-a' $$,
  'country Google domains are accepted');
select lives_ok($$ update public.salons set maps_url = null where slug = 'salon-a' $$,
  'the link can be cleared');
select throws_ok($$ update public.salons set maps_url = 'http://maps.app.goo.gl/abc' where slug = 'salon-a' $$,
  '23514', null, 'plain http is rejected');
select throws_ok($$ update public.salons set maps_url = 'https://www.google.com.evil.example/maps' where slug = 'salon-a' $$,
  '23514', null, 'look-alike hosts are rejected');
select throws_ok($$ update public.salons set maps_url = 'https://maps.app.goo.gl/' || repeat('a', 2000) where slug = 'salon-a' $$,
  '23514', null, 'very long links are rejected');

select * from finish();
rollback;
