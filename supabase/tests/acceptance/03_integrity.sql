begin;
select plan(9);

insert into public.salons (id, slug, name) values
  ('a0000000-0000-4000-8000-000000000001', 'salon-a', 'Salon A'),
  ('a0000000-0000-4000-8000-000000000002', 'salon-b', 'Salon B');
insert into public.staff (id, salon_id, display_name)
values ('b0000000-0000-4000-8000-000000000001', 'a0000000-0000-4000-8000-000000000001', 'Njeri');
insert into public.services (id, salon_id, name, duration_min, price_kes) values
  ('c0000000-0000-4000-8000-000000000001', 'a0000000-0000-4000-8000-000000000002', 'Braids', 60, 2500),
  ('c0000000-0000-4000-8000-000000000002', 'a0000000-0000-4000-8000-000000000001', 'Trim', 15, 1000);

select throws_ok($$
  insert into public.staff_services (salon_id, staff_id, service_id)
  values ('a0000000-0000-4000-8000-000000000001', 'b0000000-0000-4000-8000-000000000001', 'c0000000-0000-4000-8000-000000000001')
$$, '23503', null, 'staff cannot offer another salon''s service');

select lives_ok($$
  insert into public.staff_services (salon_id, staff_id, service_id)
  values ('a0000000-0000-4000-8000-000000000001', 'b0000000-0000-4000-8000-000000000001', 'c0000000-0000-4000-8000-000000000002')
$$, 'staff can offer their own salon''s service');

select throws_ok($$
  insert into public.bookings (salon_id, staff_id, status, period)
  values ('a0000000-0000-4000-8000-000000000002', 'b0000000-0000-4000-8000-000000000001', 'confirmed',
          tstzrange('2026-11-10 09:00+03', '2026-11-10 10:00+03'))
$$, '23503', null, 'a booking cannot use another salon''s staff member');

select throws_ok($$
  insert into public.services (salon_id, name, duration_min, price_kes)
  values ('a0000000-0000-4000-8000-000000000001', 'Negative', 30, -1)
$$, '23514', null, 'prices cannot be negative');

select throws_ok($$
  insert into public.services (salon_id, name, duration_min, price_kes)
  values ('a0000000-0000-4000-8000-000000000001', 'Odd', 7, 100)
$$, '23514', null, 'durations must be multiples of 5 minutes');

select throws_ok($$
  insert into public.services (salon_id, name, duration_min, price_kes)
  values ('a0000000-0000-4000-8000-000000000001', 'Zero', 0, 100)
$$, '23514', null, 'durations must be at least 5 minutes');

select throws_ok($$
  insert into public.salons (slug, name) values ('Salon C', 'Salon C')
$$, '23514', null, 'slugs must be lowercase words joined by hyphens');

select throws_ok($$
  insert into public.clients (salon_id, full_name, phone)
  values ('a0000000-0000-4000-8000-000000000001', 'Test Client', '0712345678')
$$, '23514', null, 'client phones must be in E.164 format');

select lives_ok($$
  insert into public.clients (salon_id, full_name, phone)
  values ('a0000000-0000-4000-8000-000000000001', 'Test Client', '+254700000001')
$$, 'an E.164 phone is accepted');

select * from finish();
rollback;
