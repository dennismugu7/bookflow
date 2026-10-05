begin;
select plan(13);

insert into auth.users (id, email) values
  ('d0000000-0000-4000-8000-000000000001', 'owner-a@example.test'),
  ('d0000000-0000-4000-8000-000000000002', 'owner-b@example.test'),
  ('d0000000-0000-4000-8000-000000000041', 'client-41@example.test');
insert into public.salons (id, slug, name, is_published, timezone) values
  ('a0000000-0000-4000-8000-000000000001', 'salon-a', 'Salon A', true, 'Africa/Nairobi'),
  ('a0000000-0000-4000-8000-000000000003', 'salon-c', 'Salon C', true, 'Africa/Nairobi');
insert into public.salon_members (salon_id, user_id, role) values
  ('a0000000-0000-4000-8000-000000000001', 'd0000000-0000-4000-8000-000000000001', 'owner'),
  ('a0000000-0000-4000-8000-000000000003', 'd0000000-0000-4000-8000-000000000001', 'owner'),
  ('a0000000-0000-4000-8000-000000000003', 'd0000000-0000-4000-8000-000000000002', 'owner');
insert into public.staff (id, salon_id, display_name)
values ('b0000000-0000-4000-8000-000000000001', 'a0000000-0000-4000-8000-000000000001', 'Njeri');
insert into public.clients (id, salon_id, full_name, phone, email, user_id) values
  ('e0000000-0000-4000-8000-000000000041', 'a0000000-0000-4000-8000-000000000001', 'Wanjiru Otieno', '+254700000041', 'client-41@example.test',
   'd0000000-0000-4000-8000-000000000041'),
  ('e0000000-0000-4000-8000-000000000042', 'a0000000-0000-4000-8000-000000000003', 'Wanjiru Otieno', '+254700000041', 'client-41@example.test',
   'd0000000-0000-4000-8000-000000000041');
insert into public.bookings (salon_id, staff_id, client_id, status, period, total_kes, source)
select 'a0000000-0000-4000-8000-000000000001', 'b0000000-0000-4000-8000-000000000001', 'e0000000-0000-4000-8000-000000000041', 'confirmed',
       tstzrange(now() + g, now() + g + interval '30 minutes'), 1000, 'web'
  from (values (interval '1 day'), (interval '2 days'), (interval '-2 days')) as v (g);

-- What the confirm screen shows.
set local role authenticated;
set local request.jwt.claims = '{"sub":"d0000000-0000-4000-8000-000000000001","role":"authenticated"}';
select is(jsonb_array_length(public.get_account_deletion_summary() -> 'salons'), 1,
  'only salons the person owns alone are deleted with them');
select is((public.get_account_deletion_summary() -> 'salons' -> 0 ->> 'upcoming')::int, 2,
  'the summary counts upcoming bookings');
select throws_ok($$ select public.delete_account_data('d0000000-0000-4000-8000-000000000001', 'other', null) $$,
  '42501', null, 'people cannot run the deletion themselves; only the server can');
reset role;

set local role service_role;
select throws_ok($$ select public.delete_account_data('d0000000-0000-4000-8000-000000000001', 'bored', null) $$,
  'BF400', null, 'only the listed reasons are accepted');
select throws_ok($$ select public.delete_account_data('d0000000-0000-4000-8000-000000000001', 'other', repeat('a', 301)) $$,
  'BF400', null, 'details are at most 300 characters');
select lives_ok($$ select public.delete_account_data('d0000000-0000-4000-8000-000000000001', 'other', 'Moving to a new town') $$,
  'the server deletes an owner''s data');
reset role;
delete from auth.users where id = 'd0000000-0000-4000-8000-000000000001';

select is((select count(*)::int from public.salons where id = 'a0000000-0000-4000-8000-000000000001'), 0, 'the salon owned alone is gone');
select is((select count(*)::int from public.bookings where salon_id = 'a0000000-0000-4000-8000-000000000001'), 0, 'with its bookings');
select is((select count(*)::int from public.salon_members where salon_id = 'a0000000-0000-4000-8000-000000000003'), 1,
  'a shared salon stays with its other owner');
select is((select reason || ' | ' || details from private.deletion_feedback), 'other | Moving to a new town',
  'the reason is kept');
select hasnt_column('private', 'deletion_feedback', 'user_id', 'without saying who gave it');

set local role service_role;
select public.delete_account_data('d0000000-0000-4000-8000-000000000041', 'accident', null);
reset role;
delete from auth.users where id = 'd0000000-0000-4000-8000-000000000041';
select is((select count(*)::int from public.clients where id = 'e0000000-0000-4000-8000-000000000042'), 1,
  'a deleted client''s visit record stays with the salon');
select is((select coalesce(email, '') || coalesce(user_id::text, '') from public.clients
  where id = 'e0000000-0000-4000-8000-000000000042'), '', 'but without their email or account');

select * from finish();
rollback;
