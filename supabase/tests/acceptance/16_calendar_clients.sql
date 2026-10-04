begin;
select plan(14);

create temp table d as select ((now() at time zone 'Africa/Nairobi')::date + 1) as day;
grant select on d to public;

insert into auth.users (id, email) values
  ('d0000000-0000-4000-8000-000000000001', 'owner-a@example.test'),
  ('d0000000-0000-4000-8000-000000000004', 'outsider@example.test');
insert into public.salons (id, slug, name, is_published, timezone)
values ('a0000000-0000-4000-8000-000000000001', 'salon-a', 'Salon A', true, 'Africa/Nairobi');
insert into public.salon_members (salon_id, user_id, role)
values ('a0000000-0000-4000-8000-000000000001', 'd0000000-0000-4000-8000-000000000001', 'owner');
insert into public.opening_hours (salon_id, weekday, opens, closes)
  select 'a0000000-0000-4000-8000-000000000001', w, '09:00', '18:00' from generate_series(1, 7) as w;
insert into public.staff (id, salon_id, display_name)
values ('b0000000-0000-4000-8000-000000000001', 'a0000000-0000-4000-8000-000000000001', 'Njeri');
insert into public.clients (id, salon_id, full_name, phone) values
  ('e0000000-0000-4000-8000-000000000061', 'a0000000-0000-4000-8000-000000000001', 'Wanjiru Otieno', '+254700000061'),
  ('e0000000-0000-4000-8000-000000000062', 'a0000000-0000-4000-8000-000000000001', 'Brian Kip', '+254700000062'),
  ('e0000000-0000-4000-8000-000000000063', 'a0000000-0000-4000-8000-000000000001', 'Aisha Kimani', '+254700000063'),
  ('e0000000-0000-4000-8000-000000000064', 'a0000000-0000-4000-8000-000000000001', 'Faith Njoroge', null);
insert into public.bookings (salon_id, staff_id, client_id, status, period, total_kes, source)
select 'a0000000-0000-4000-8000-000000000001', 'b0000000-0000-4000-8000-000000000001', c, s,
       tstzrange(now() - g, now() - g + interval '30 minutes'), 1000, 'owner'
from (values
  ('e0000000-0000-4000-8000-000000000061'::uuid, 'completed'::public.booking_status, interval '110 days'),
  ('e0000000-0000-4000-8000-000000000061', 'completed', interval '75 days'),
  ('e0000000-0000-4000-8000-000000000061', 'completed', interval '40 days'),
  ('e0000000-0000-4000-8000-000000000062', 'no_show', interval '120 days'),
  ('e0000000-0000-4000-8000-000000000062', 'completed', interval '100 days'),
  ('e0000000-0000-4000-8000-000000000063', 'completed', interval '5 days')) as v (c, s, g);
insert into public.bookings (salon_id, staff_id, client_id, status, period, total_kes, source) values
  ('a0000000-0000-4000-8000-000000000001', 'b0000000-0000-4000-8000-000000000001', 'e0000000-0000-4000-8000-000000000061',
   'confirmed', tstzrange(((select day from d) + time '10:00') at time zone 'Africa/Nairobi',
                          ((select day from d) + time '10:30') at time zone 'Africa/Nairobi'), 1000, 'web');
insert into public.time_off (salon_id, staff_id, period, reason) values
  ('a0000000-0000-4000-8000-000000000001', 'b0000000-0000-4000-8000-000000000001',
   tstzrange(((select day from d) + time '14:00') at time zone 'Africa/Nairobi',
             ((select day from d) + time '16:00') at time zone 'Africa/Nairobi'), 'Training');

set local role authenticated;
set local request.jwt.claims = '{"sub":"d0000000-0000-4000-8000-000000000001","role":"authenticated"}';
select is(jsonb_array_length(public.get_range_agenda('a0000000-0000-4000-8000-000000000001',
  (select day from d), (select day from d) + 6) -> 'days'), 7, 'a week has seven days');
select throws_ok($$ select public.get_range_agenda('a0000000-0000-4000-8000-000000000001',
  (select day from d), (select day from d) + 7) $$, 'BF400', null, 'ranges longer than a week are refused');
select is((select jsonb_array_length(x -> 'bookings') from jsonb_array_elements(public.get_range_agenda(
  'a0000000-0000-4000-8000-000000000001', (select day from d), (select day from d)) -> 'days') x),
  1, 'the day shows its booking');
select is((select jsonb_array_length(x -> 'time_off') from jsonb_array_elements(public.get_range_agenda(
  'a0000000-0000-4000-8000-000000000001', (select day from d), (select day from d)) -> 'days') x),
  1, 'the day shows time off');
select is((public.get_clients('a0000000-0000-4000-8000-000000000001') -> 'counts' ->> 'all')::int, 4, 'all clients are counted');
select is((public.get_clients('a0000000-0000-4000-8000-000000000001') -> 'counts' ->> 'regular')::int, 1, 'three visits make a regular');
select is((public.get_clients('a0000000-0000-4000-8000-000000000001') -> 'counts' ->> 'lapsed')::int, 1, 'a client gone quiet is lapsed');
select is((public.get_clients('a0000000-0000-4000-8000-000000000001') -> 'counts' ->> 'new')::int, 1, 'a first visit this month is new');
select is(jsonb_array_length(public.get_clients('a0000000-0000-4000-8000-000000000001', 'wanj') -> 'clients'),
  1, 'search finds clients by name');
select is((public.get_client_profile('e0000000-0000-4000-8000-000000000061') -> 'stats' ->> 'spent_kes')::int,
  3000, 'the profile adds up completed visits');
select is(public.get_client_profile('e0000000-0000-4000-8000-000000000061') -> 'upcoming' is not null, true,
  'the profile shows the next booking');
select is((select count(*)::int from jsonb_array_elements(public.get_client_profile('e0000000-0000-4000-8000-000000000062') -> 'past') p
  where p ->> 'status' = 'no_show'), 1, 'past visits include no-shows');
reset role;

set local role authenticated;
set local request.jwt.claims = '{"sub":"d0000000-0000-4000-8000-000000000004","role":"authenticated"}';
select throws_ok($$ select public.get_clients('a0000000-0000-4000-8000-000000000001') $$,
  '42501', null, 'outsiders cannot list a salon''s clients');
select throws_ok($$ select public.get_client_profile('e0000000-0000-4000-8000-000000000061') $$,
  'BF404', null, 'outsiders cannot open a client');
reset role;

select * from finish();
rollback;
