begin;
select plan(5);

-- Release 1.0.0 part 2 (B): a salon open only on some days had bookings on later days while
-- Today said "No bookings yet". get_day_agenda now also returns the next booking after the day.
create temp table d as select (now() at time zone 'Africa/Nairobi')::date as day;
grant select on d to public;

insert into auth.users (id, email) values
  ('d0000000-0000-4000-8000-000000000141', 'owner-141@example.test');
insert into public.salons (id, slug, name, is_published, timezone) values
  ('a0000000-0000-4000-8000-000000000141', 'salon-141', 'Salon 141', true, 'Africa/Nairobi'),
  ('a0000000-0000-4000-8000-000000000142', 'salon-142', 'Salon 142', true, 'Africa/Nairobi');
insert into public.staff (id, salon_id, display_name) values
  ('b0000000-0000-4000-8000-000000000141', 'a0000000-0000-4000-8000-000000000141', 'Njeri'),
  ('b0000000-0000-4000-8000-000000000142', 'a0000000-0000-4000-8000-000000000142', 'Other');
insert into public.salon_members (salon_id, user_id, role, staff_id) values
  ('a0000000-0000-4000-8000-000000000141', 'd0000000-0000-4000-8000-000000000141', 'owner', null);
insert into public.clients (id, salon_id, full_name, phone) values
  ('e0000000-0000-4000-8000-000000000141', 'a0000000-0000-4000-8000-000000000141', 'Achieng Ouma', '+254700000041');

create function pg_temp.at(days int, t time) returns timestamptz language sql as
  $$ select ((select day from d) + days + t) at time zone 'Africa/Nairobi' $$;

-- Nothing today. Later: a cancelled one, a held one, the real next (in 6 days), one after it,
-- and a sooner one in another salon.
insert into public.bookings (id, salon_id, staff_id, client_id, status, period, total_kes, source) values
  ('f0000000-0000-4000-8000-000000000141', 'a0000000-0000-4000-8000-000000000141', 'b0000000-0000-4000-8000-000000000141',
   'e0000000-0000-4000-8000-000000000141', 'cancelled', tstzrange(pg_temp.at(1, '09:00'), pg_temp.at(1, '09:30')), 1000, 'web'),
  ('f0000000-0000-4000-8000-000000000142', 'a0000000-0000-4000-8000-000000000141', 'b0000000-0000-4000-8000-000000000141',
   'e0000000-0000-4000-8000-000000000141', 'confirmed', tstzrange(pg_temp.at(6, '09:30'), pg_temp.at(6, '11:00')), 2500, 'web'),
  ('f0000000-0000-4000-8000-000000000143', 'a0000000-0000-4000-8000-000000000141', 'b0000000-0000-4000-8000-000000000141',
   'e0000000-0000-4000-8000-000000000141', 'confirmed', tstzrange(pg_temp.at(13, '09:30'), pg_temp.at(13, '11:00')), 2500, 'owner'),
  ('f0000000-0000-4000-8000-000000000144', 'a0000000-0000-4000-8000-000000000142', 'b0000000-0000-4000-8000-000000000142',
   null, 'confirmed', tstzrange(pg_temp.at(1, '10:00'), pg_temp.at(1, '10:30')), 900, 'web');
insert into public.bookings (salon_id, staff_id, status, period, hold_expires_at, total_kes, source) values
  ('a0000000-0000-4000-8000-000000000141', 'b0000000-0000-4000-8000-000000000141', 'held',
   tstzrange(pg_temp.at(2, '11:00'), pg_temp.at(2, '11:30')), now() + interval '5 minutes', 1000, 'web');

set local role authenticated;
set local request.jwt.claims = '{"sub":"d0000000-0000-4000-8000-000000000141","role":"authenticated"}';
create temp table agenda as
  select public.get_day_agenda('a0000000-0000-4000-8000-000000000141', (select day from d)) as a;

select is((select jsonb_array_length(a -> 'bookings') from agenda), 0, 'nothing is booked today');
select is((select a -> 'next' ->> 'id' from agenda), 'f0000000-0000-4000-8000-000000000142',
  'next is the soonest confirmed booking after the day, not a cancelled, held or other-salon one');
select is((select a -> 'next' ->> 'staff_name' from agenda), 'Njeri', 'next is a full booking item');
select is((public.get_day_agenda('a0000000-0000-4000-8000-000000000141', (select day + 6 from d)) -> 'next' ->> 'id'),
  'f0000000-0000-4000-8000-000000000143', 'a booking on the day itself is listed, not next');
select is((public.get_day_agenda('a0000000-0000-4000-8000-000000000141', (select day + 13 from d)) -> 'next'),
  'null'::jsonb, 'next is null when nothing comes after the day');

select * from finish();
rollback;
