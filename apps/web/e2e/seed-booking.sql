-- Fixture for e2e/booking-flow.spec.ts (local Supabase only). Safe to run repeatedly.
delete from public.booking_events where booking_id in
  (select id from public.bookings where salon_id = 'a0000000-0000-4000-8000-0000000000e2');
delete from public.booking_services where booking_id in
  (select id from public.bookings where salon_id = 'a0000000-0000-4000-8000-0000000000e2');
delete from public.bookings where salon_id = 'a0000000-0000-4000-8000-0000000000e2';
delete from public.clients where salon_id = 'a0000000-0000-4000-8000-0000000000e2';
delete from public.salons where id = 'a0000000-0000-4000-8000-0000000000e2';
delete from private.hold_log;

insert into public.salons (id, slug, name, tagline, address, is_published, timezone)
values ('a0000000-0000-4000-8000-0000000000e2', 'e2e-salon', 'E2E Salon', 'Braids and trims',
        'Galana Plaza, Kilimani, Nairobi', true, 'Africa/Nairobi');
insert into public.opening_hours (salon_id, weekday, opens, closes)
  select 'a0000000-0000-4000-8000-0000000000e2', w, '00:00', '24:00' from generate_series(1, 7) as w;
insert into public.staff (id, salon_id, display_name, title)
values ('b0000000-0000-4000-8000-0000000000e2', 'a0000000-0000-4000-8000-0000000000e2', 'Njeri', 'Stylist');
insert into public.services (id, salon_id, name, duration_min, price_kes)
values ('c0000000-0000-4000-8000-0000000000e2', 'a0000000-0000-4000-8000-0000000000e2', 'Trim', 30, 1000);
insert into public.staff_services (salon_id, staff_id, service_id)
values ('a0000000-0000-4000-8000-0000000000e2', 'b0000000-0000-4000-8000-0000000000e2', 'c0000000-0000-4000-8000-0000000000e2');
