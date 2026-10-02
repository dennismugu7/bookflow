begin;
select plan(8);

insert into public.salons (id, slug, name)
values ('a0000000-0000-4000-8000-000000000001', 'salon-a', 'Salon A');
insert into public.staff (id, salon_id, display_name) values
  ('b0000000-0000-4000-8000-000000000001', 'a0000000-0000-4000-8000-000000000001', 'Njeri'),
  ('b0000000-0000-4000-8000-000000000002', 'a0000000-0000-4000-8000-000000000001', 'Amina');

select lives_ok($$
  insert into public.bookings (salon_id, staff_id, status, period)
  values ('a0000000-0000-4000-8000-000000000001', 'b0000000-0000-4000-8000-000000000001', 'confirmed',
          tstzrange('2026-11-10 09:00+03', '2026-11-10 10:00+03'))
$$, 'a first booking is accepted');

select throws_ok($$
  insert into public.bookings (salon_id, staff_id, status, period)
  values ('a0000000-0000-4000-8000-000000000001', 'b0000000-0000-4000-8000-000000000001', 'confirmed',
          tstzrange('2026-11-10 09:30+03', '2026-11-10 10:30+03'))
$$, '23P01', null, 'an overlapping booking for the same staff member is rejected');

select lives_ok($$
  insert into public.bookings (salon_id, staff_id, status, period)
  values ('a0000000-0000-4000-8000-000000000001', 'b0000000-0000-4000-8000-000000000001', 'confirmed',
          tstzrange('2026-11-10 10:00+03', '2026-11-10 11:00+03'))
$$, 'a back-to-back booking is allowed');

select lives_ok($$
  insert into public.bookings (salon_id, staff_id, status, period)
  values ('a0000000-0000-4000-8000-000000000001', 'b0000000-0000-4000-8000-000000000002', 'confirmed',
          tstzrange('2026-11-10 09:00+03', '2026-11-10 10:00+03'))
$$, 'a different staff member can take the same time');

select lives_ok($$
  insert into public.bookings (salon_id, staff_id, status, period)
  values ('a0000000-0000-4000-8000-000000000001', 'b0000000-0000-4000-8000-000000000001', 'cancelled',
          tstzrange('2026-11-10 09:00+03', '2026-11-10 10:00+03'))
$$, 'a cancelled booking never blocks the time');

select throws_ok($$
  insert into public.bookings (salon_id, staff_id, status, period, hold_expires_at)
  values ('a0000000-0000-4000-8000-000000000001', 'b0000000-0000-4000-8000-000000000001', 'held',
          tstzrange('2026-11-10 09:15+03', '2026-11-10 09:45+03'), '2026-11-10 08:00+03')
$$, '23P01', null, 'a hold cannot overlap a confirmed booking');

select throws_ok($$
  insert into public.bookings (salon_id, staff_id, status, period)
  values ('a0000000-0000-4000-8000-000000000001', 'b0000000-0000-4000-8000-000000000001', 'held',
          tstzrange('2026-11-11 09:00+03', '2026-11-11 10:00+03'))
$$, '23514', null, 'a hold must have an expiry time');

select throws_ok($$
  insert into public.bookings (salon_id, staff_id, status, period)
  values ('a0000000-0000-4000-8000-000000000001', 'b0000000-0000-4000-8000-000000000001', 'confirmed',
          tstzrange('2026-11-12 09:00+03', '2026-11-12 09:00+03'))
$$, '23514', null, 'an empty time range is rejected');

select * from finish();
rollback;
