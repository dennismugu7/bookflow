-- Regression: an owner whose salon has bookings with services can delete their account.
begin;
select plan(2);

insert into auth.users (id, email) values ('d0000000-0000-4000-8000-000000000001', 'owner-a@example.test');
insert into public.salons (id, slug, name) values ('a0000000-0000-4000-8000-000000000001', 'salon-a', 'Salon A');
insert into public.salon_members (salon_id, user_id, role)
values ('a0000000-0000-4000-8000-000000000001', 'd0000000-0000-4000-8000-000000000001', 'owner');
insert into public.staff (id, salon_id, display_name)
values ('b0000000-0000-4000-8000-000000000001', 'a0000000-0000-4000-8000-000000000001', 'Njeri');
insert into public.services (id, salon_id, name, duration_min, price_kes)
values ('c0000000-0000-4000-8000-000000000001', 'a0000000-0000-4000-8000-000000000001', 'Cut', 30, 500);
insert into public.bookings (id, salon_id, staff_id, status, period, source)
values ('f0000000-0000-4000-8000-000000000001', 'a0000000-0000-4000-8000-000000000001',
        'b0000000-0000-4000-8000-000000000001', 'confirmed', tstzrange(now(), now() + interval '30 minutes'), 'owner');
insert into public.booking_services (booking_id, service_id, name, duration_min, price_kes)
values ('f0000000-0000-4000-8000-000000000001', 'c0000000-0000-4000-8000-000000000001', 'Cut', 30, 500);
insert into public.booking_events (booking_id, type) values ('f0000000-0000-4000-8000-000000000001', 'created');

set local role service_role;
select lives_ok($$ select public.delete_account_data('d0000000-0000-4000-8000-000000000001', 'other', null) $$,
  'deleting an owner with booked services works');
reset role;
select is((select count(*)::int from public.salons where id = 'a0000000-0000-4000-8000-000000000001'), 0,
  'the salon is gone');

select * from finish();
rollback;
