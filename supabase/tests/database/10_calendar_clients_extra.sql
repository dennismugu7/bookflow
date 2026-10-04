begin;
select plan(24);

create temp table d as select ((now() at time zone 'Africa/Nairobi')::date + 2) as day;
grant select on d to public;

insert into auth.users (id, email) values
  ('d0000000-0000-4000-8000-000000000071', 'owner-71@example.test'),
  ('d0000000-0000-4000-8000-000000000072', 'staff-72@example.test'),
  ('d0000000-0000-4000-8000-000000000073', 'owner-73@example.test'),
  ('d0000000-0000-4000-8000-000000000074', 'client-74@example.test');
insert into public.salons (id, slug, name, is_published, timezone) values
  ('a0000000-0000-4000-8000-000000000071', 'salon-71', 'Salon 71', true, 'Africa/Nairobi'),
  ('a0000000-0000-4000-8000-000000000073', 'salon-73', 'Salon 73', true, 'Africa/Nairobi');
insert into public.staff (id, salon_id, display_name, sort_order, is_active) values
  ('b0000000-0000-4000-8000-000000000071', 'a0000000-0000-4000-8000-000000000071', 'Njeri', 2, true),
  ('b0000000-0000-4000-8000-000000000072', 'a0000000-0000-4000-8000-000000000071', 'Salome', 1, true),
  ('b0000000-0000-4000-8000-000000000073', 'a0000000-0000-4000-8000-000000000071', 'Old', 3, false);
insert into public.salon_members (salon_id, user_id, role, staff_id) values
  ('a0000000-0000-4000-8000-000000000071', 'd0000000-0000-4000-8000-000000000071', 'owner', null),
  ('a0000000-0000-4000-8000-000000000071', 'd0000000-0000-4000-8000-000000000072', 'staff',
   'b0000000-0000-4000-8000-000000000072'),
  ('a0000000-0000-4000-8000-000000000073', 'd0000000-0000-4000-8000-000000000073', 'owner', null);
-- Open every day except the weekday of d.day; two windows on the others.
insert into public.opening_hours (salon_id, weekday, opens, closes)
  select 'a0000000-0000-4000-8000-000000000071', w, t.opens, t.closes
    from generate_series(1, 7) as w,
         (values (time '14:00', time '18:00'), (time '09:00', time '13:00')) as t (opens, closes)
   where w <> extract(isodow from (select day from d));
insert into public.clients (id, salon_id, full_name, phone, user_id) values
  ('e0000000-0000-4000-8000-000000000071', 'a0000000-0000-4000-8000-000000000071', 'Zawadi Mwangi', '+254700000071',
   'd0000000-0000-4000-8000-000000000074'),
  ('e0000000-0000-4000-8000-000000000072', 'a0000000-0000-4000-8000-000000000071', 'Kevin 50%_off', null, null),
  ('e0000000-0000-4000-8000-000000000073', 'a0000000-0000-4000-8000-000000000071', 'Joy Atieno', '+254700000073', null),
  ('e0000000-0000-4000-8000-000000000079', 'a0000000-0000-4000-8000-000000000073', 'Other Salon', null, null);
-- Zawadi: visits every 50 days, last one 90 days ago: lapsed only past max(60, 100) = 100 days.
-- Joy: visits every 10 days, last one 70 days ago: lapsed (70 > max(60, 20)).
insert into public.bookings (salon_id, staff_id, client_id, status, period, total_kes, source)
select 'a0000000-0000-4000-8000-000000000071', 'b0000000-0000-4000-8000-000000000071', c, s,
       tstzrange(now() - g, now() - g + interval '30 minutes'), k, 'owner'
from (values
  ('e0000000-0000-4000-8000-000000000071'::uuid, 'completed'::public.booking_status, interval '190 days', 1500),
  ('e0000000-0000-4000-8000-000000000071', 'completed', interval '140 days', 1500),
  ('e0000000-0000-4000-8000-000000000071', 'completed', interval '90 days', 2000),
  ('e0000000-0000-4000-8000-000000000071', 'cancelled', interval '80 days', 9999),
  ('e0000000-0000-4000-8000-000000000073', 'completed', interval '80 days', 500),
  ('e0000000-0000-4000-8000-000000000073', 'completed', interval '70 days', 500)) as v (c, s, g, k);
insert into public.time_off (salon_id, staff_id, period, reason) values
  ('a0000000-0000-4000-8000-000000000071', 'b0000000-0000-4000-8000-000000000071',
   tstzrange(((select day from d) - 1 + time '20:00') at time zone 'Africa/Nairobi',
             ((select day from d) + time '12:00') at time zone 'Africa/Nairobi'), null);

set local role authenticated;
set local request.jwt.claims = '{"sub":"d0000000-0000-4000-8000-000000000071","role":"authenticated"}';

-- get_range_agenda
select throws_ok($$ select public.get_range_agenda('a0000000-0000-4000-8000-000000000071',
  (select day from d), (select day from d) - 1) $$, 'BF400', null, 'a backwards range is refused');
select throws_ok($$ select public.get_range_agenda('a0000000-0000-4000-8000-000000000071', null, null) $$,
  'BF400', null, 'a range needs dates');
select is((select array_agg(s ->> 'name' order by ord) from jsonb_array_elements(
  public.get_range_agenda('a0000000-0000-4000-8000-000000000071', (select day from d), (select day from d)) -> 'staff')
  with ordinality as x (s, ord)), array['Salome', 'Njeri', 'Old'], 'staff come in sort order, inactive included');
select is((select s ->> 'active' from jsonb_array_elements(
  public.get_range_agenda('a0000000-0000-4000-8000-000000000071', (select day from d), (select day from d)) -> 'staff') s
  where s ->> 'name' = 'Old'), 'false', 'inactive staff are flagged');
select is(public.get_range_agenda('a0000000-0000-4000-8000-000000000071', (select day from d), (select day from d))
  -> 'days' -> 0 -> 'open', '[]'::jsonb, 'a day without opening hours is closed');
select is(public.get_range_agenda('a0000000-0000-4000-8000-000000000071', (select day from d) + 1, (select day from d) + 1)
  -> 'days' -> 0 -> 'open',
  '[{"opens":"09:00","closes":"13:00"},{"opens":"14:00","closes":"18:00"}]'::jsonb, 'open windows come in time order');
select is((select array_agg(x ->> 'date' order by ord) from jsonb_array_elements(
  public.get_range_agenda('a0000000-0000-4000-8000-000000000071', (select day from d), (select day from d) + 2) -> 'days')
  with ordinality as y (x, ord)),
  array[(select day from d)::text, ((select day from d) + 1)::text, ((select day from d) + 2)::text], 'days come in date order');
select is(jsonb_array_length(public.get_range_agenda('a0000000-0000-4000-8000-000000000071',
  (select day from d) - 1, (select day from d) - 1) -> 'days' -> 0 -> 'time_off'), 1,
  'time off that starts the evening before shows on that day too');
select is(public.get_range_agenda('a0000000-0000-4000-8000-000000000071', (select day from d), (select day from d))
  -> 'days' -> 0 -> 'time_off' -> 0 -> 'reason', 'null'::jsonb, 'time off without a reason has a null reason');

-- get_clients
select throws_ok($$ select public.get_clients('a0000000-0000-4000-8000-000000000071', null, 'vip') $$,
  'BF400', null, 'unknown segments are refused');
select is((public.get_clients('a0000000-0000-4000-8000-000000000071', 'nobody', 'regular') -> 'counts' ->> 'all')::int, 3,
  'counts ignore the search and segment');
select is((public.get_clients('a0000000-0000-4000-8000-000000000071') -> 'counts' ->> 'lapsed')::int, 1,
  'lapsing waits for twice the usual gap');
select is(public.get_clients('a0000000-0000-4000-8000-000000000071', null, 'lapsed') -> 'clients' -> 0 ->> 'full_name',
  'Joy Atieno', 'the lapsed segment lists the lapsed client');
select is(public.get_clients('a0000000-0000-4000-8000-000000000071', '0700 000 073') -> 'clients' -> 0 ->> 'full_name',
  'Joy Atieno', 'search finds clients by phone as typed locally');
select is(jsonb_array_length(public.get_clients('a0000000-0000-4000-8000-000000000071', '%') -> 'clients'), 1,
  'a percent sign is matched literally');
select is((select array_agg(c ->> 'full_name' order by ord) from jsonb_array_elements(
  public.get_clients('a0000000-0000-4000-8000-000000000071') -> 'clients') with ordinality as x (c, ord)),
  array['Joy Atieno', 'Zawadi Mwangi', 'Kevin 50%_off'], 'clients sort by latest visit, then name');
select is((public.get_clients('a0000000-0000-4000-8000-000000000071', 'zawadi') -> 'clients' -> 0 ->> 'avg_gap_days')::numeric,
  50.0, 'the usual gap averages the gaps between visits');

-- get_client_profile
select is(public.get_client_profile('e0000000-0000-4000-8000-000000000071') -> 'client' -> 'has_account', 'true'::jsonb,
  'the profile says when the client has an account');
select is((public.get_client_profile('e0000000-0000-4000-8000-000000000071') -> 'stats' ->> 'spent_kes')::int, 5000,
  'cancelled bookings are not spent');
select is(public.get_client_profile('e0000000-0000-4000-8000-000000000071') -> 'upcoming', 'null'::jsonb,
  'no upcoming booking is null');
select is((public.get_client_profile('e0000000-0000-4000-8000-000000000071') -> 'past' -> 0 ->> 'total_kes')::int, 2000,
  'past visits are newest first');
select throws_ok($$ select public.get_client_profile('e0000000-0000-4000-8000-000000000079') $$,
  'BF404', null, 'another salon''s client is not found');

-- Notes
select throws_ok($$ update public.clients set notes = repeat('x', 1001)
  where id = 'e0000000-0000-4000-8000-000000000073' $$, '23514', null, 'notes are at most 1,000 characters');
reset role;

-- Staff members can read the calendar and clients too.
set local role authenticated;
set local request.jwt.claims = '{"sub":"d0000000-0000-4000-8000-000000000072","role":"authenticated"}';
select is((public.get_clients('a0000000-0000-4000-8000-000000000071') -> 'counts' ->> 'all')::int, 3,
  'staff can list the salon''s clients');
reset role;

select * from finish();
rollback;
