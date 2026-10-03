begin;
select plan(8);

insert into auth.users (id, email) values
  ('d0000000-0000-4000-8000-000000000031', 'client-c@example.test'),
  ('d0000000-0000-4000-8000-000000000032', 'stranger@example.test');
insert into public.salons (id, slug, name, address, is_published, timezone)
values ('a0000000-0000-4000-8000-000000000001', 'salon-a', 'Salon A', 'Galana Plaza, Kilimani', true, 'Africa/Nairobi');
insert into public.staff (id, salon_id, display_name)
values ('b0000000-0000-4000-8000-000000000001', 'a0000000-0000-4000-8000-000000000001', 'Njeri');
insert into public.services (id, salon_id, name, duration_min, price_kes)
values ('c0000000-0000-4000-8000-000000000001', 'a0000000-0000-4000-8000-000000000001', 'Trim', 30, 1000);
insert into public.clients (id, salon_id, full_name, phone, email, user_id)
values ('e0000000-0000-4000-8000-000000000031', 'a0000000-0000-4000-8000-000000000001', 'Wanjiru Otieno',
        '+254700000031', 'client-c@example.test', 'd0000000-0000-4000-8000-000000000031');
insert into public.bookings (id, salon_id, staff_id, client_id, status, period, total_kes, source)
values ('f0000000-0000-4000-8000-000000000031', 'a0000000-0000-4000-8000-000000000001',
        'b0000000-0000-4000-8000-000000000001', 'e0000000-0000-4000-8000-000000000031', 'confirmed',
        tstzrange(((current_date + 7) + time '10:00') at time zone 'Africa/Nairobi',
                  ((current_date + 7) + time '10:30') at time zone 'Africa/Nairobi'), 1000, 'web');
insert into public.booking_services (booking_id, service_id, name, duration_min, price_kes, position)
values ('f0000000-0000-4000-8000-000000000031', 'c0000000-0000-4000-8000-000000000001', 'Trim', 30, 1000, 0);

set local role authenticated;
set local request.jwt.claims = '{"sub":"d0000000-0000-4000-8000-000000000031","role":"authenticated"}';
select is(public.get_my_booking('f0000000-0000-4000-8000-000000000031') ->> 'status', 'confirmed',
  'a client can read their own booking');
select is((public.get_my_booking('f0000000-0000-4000-8000-000000000031') ->> 'total_kes')::int, 1000,
  'the booking shows its total');
select is(public.get_my_booking('f0000000-0000-4000-8000-000000000031') -> 'salon' ->> 'slug', 'salon-a',
  'the booking shows its salon');
select is(public.get_my_booking('f0000000-0000-4000-8000-000000000031') ->> 'staff_name', 'Njeri',
  'the booking shows the professional');
select is(jsonb_array_length(public.get_my_booking('f0000000-0000-4000-8000-000000000031') -> 'services'), 1,
  'the booking lists its services');
select throws_ok($$ select public.get_my_booking('f0000000-0000-4000-8000-000000000099') $$,
  'BF404', null, 'an unknown booking is not found');
reset role;

set local role authenticated;
set local request.jwt.claims = '{"sub":"d0000000-0000-4000-8000-000000000032","role":"authenticated"}';
select throws_ok($$ select public.get_my_booking('f0000000-0000-4000-8000-000000000031') $$,
  'BF404', null, 'someone else''s booking looks like it does not exist');
reset role;

set local role anon;
set local request.jwt.claims = '{"role":"anon"}';
select throws_ok($$ select public.get_my_booking('f0000000-0000-4000-8000-000000000031') $$,
  '42501', null, 'visitors cannot read bookings');
reset role;

select * from finish();
rollback;
