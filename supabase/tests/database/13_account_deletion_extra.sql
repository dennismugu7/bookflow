begin;
select plan(11);

insert into auth.users (id, email) values
  ('d1300000-0000-4000-8000-000000000001', 'owner-q@example.test'),
  ('d1300000-0000-4000-8000-000000000002', 'staff-q@example.test'),
  ('d1300000-0000-4000-8000-000000000003', 'client-q@example.test');
insert into public.salons (id, slug, name, is_published, timezone)
values ('a1300000-0000-4000-8000-000000000001', 'salon-q', 'Salon Q', false, 'Africa/Nairobi');
insert into public.salon_members (salon_id, user_id, role) values
  ('a1300000-0000-4000-8000-000000000001', 'd1300000-0000-4000-8000-000000000001', 'owner'),
  ('a1300000-0000-4000-8000-000000000001', 'd1300000-0000-4000-8000-000000000002', 'staff');
insert into public.staff (id, salon_id, display_name)
values ('b1300000-0000-4000-8000-000000000001', 'a1300000-0000-4000-8000-000000000001', 'Akinyi');
insert into public.clients (id, salon_id, full_name, phone)
values ('e1300000-0000-4000-8000-000000000001', 'a1300000-0000-4000-8000-000000000001', 'Achieng Mwangi', '+254700000051');
insert into public.bookings (id, salon_id, staff_id, client_id, status, period, total_kes, source)
values ('f1300000-0000-4000-8000-000000000001', 'a1300000-0000-4000-8000-000000000001', 'b1300000-0000-4000-8000-000000000001',
        'e1300000-0000-4000-8000-000000000001', 'cancelled',
        tstzrange(now() + interval '1 day', now() + interval '1 day 30 minutes'), 1000, 'web');
insert into public.booking_events (booking_id, type)
values ('f1300000-0000-4000-8000-000000000001', 'cancelled');
insert into public.salon_photos (salon_id, path, position)
values ('a1300000-0000-4000-8000-000000000001', 'a1300000-0000-4000-8000-000000000001/banner/a.jpg', 0);

set local role authenticated;
set local request.jwt.claims = '{"sub":"d1300000-0000-4000-8000-000000000001","role":"authenticated"}';
select is(public.get_account_deletion_summary(),
  '{"email": "owner-q@example.test", "salons": [{"id": "a1300000-0000-4000-8000-000000000001", "name": "Salon Q", "upcoming": 0}]}'::jsonb,
  'the summary has the email, and cancelled bookings are not upcoming');
select throws_ok($$ select count(*) from private.deletion_feedback $$, '42501', null,
  'nobody signed in can read the feedback');
reset role;

set local role authenticated;
set local request.jwt.claims = '{"sub":"d1300000-0000-4000-8000-000000000002","role":"authenticated"}';
select is(public.get_account_deletion_summary() -> 'salons', '[]'::jsonb, 'staff delete no salon');
reset role;

set local role anon;
select throws_ok($$ select public.get_account_deletion_summary() $$, '42501', null, 'anon has no summary');
reset role;

set local role service_role;
select throws_ok($$ select public.delete_account_data('d1300000-0000-4000-8000-000000000001', null, null) $$,
  'BF400', null, 'a reason is required');
select lives_ok($$ select public.delete_account_data('d1300000-0000-4000-8000-000000000002', 'other_app', '   ') $$,
  'staff can delete their account');
select lives_ok($$ select public.delete_account_data('d1300000-0000-4000-8000-000000000001', 'too_complicated', null) $$,
  'a salon with booking history and photos can be deleted');
select lives_ok($$ select public.delete_account_data('d1300000-0000-4000-8000-000000000003', 'accident', null) $$,
  'a person with no salon and no visits can delete');
reset role;

select is((select count(*)::int from public.booking_events where booking_id = 'f1300000-0000-4000-8000-000000000001'), 0,
  'the salon''s audit trail goes with it');
select is((select count(*)::int from public.salon_photos where salon_id = 'a1300000-0000-4000-8000-000000000001'), 0,
  'and its photo rows');
select results_eq(
  $$ select reason, details, role from private.deletion_feedback order by reason $$,
  $$ values ('accident', null::text, 'client'), ('other_app', null, 'owner'), ('too_complicated', null, 'owner') $$,
  'empty details become null; staff count as owners');

select * from finish();
rollback;
