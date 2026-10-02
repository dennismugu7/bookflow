# Phase 1b — Booking engine: availability, holds, confirmation, booking actions

**Goal:** all booking logic lives in Postgres functions that the web and owner apps call. A slot can't be double-booked, held twice, or abused by bots, and staff can change bookings only through allowed actions.

**Branch:** `feat/booking-engine` → PR. Include the lead's updated `docs/portfolio/build-journal.md` and this spec.

## 0. Error codes (used by every function; add as a typed map in `@bookflow/shared`)
| SQLSTATE | Meaning |
| --- | --- |
| `BF400` | Invalid input (token format, name, etc.) |
| `BF401` | Signed-in user has no verified phone |
| `BF403` | Not allowed by a business rule (e.g. removing the last owner) |
| `BF404` | Not found (salon, service, staff, active hold), also used when the caller may not know whether it exists |
| `BF409` | Slot not available (taken, outside hours, or a race lost on the exclusion constraint) |
| `BF410` | Hold expired |
| `BF422` | Status change not allowed |
| `BF429` | Too many holds from this address |

`42501` stays the code for role or ownership problems (e.g. staff acting on someone else's booking).

## 1. Schema changes (new migration)
- `bookings.hold_token_hash text` = `encode(sha256(token::bytea), 'hex')`. Never store the raw token.
- `private.hold_log (ip text not null, created_at timestamptz not null default now())` with an index on `(ip, created_at)`.
- **Bookings update policy:** replace `"bookings: owners or own staff update"` with an **owners-only** update policy. Staff change bookings only through `update_booking_status`. Update your own 1a tests accordingly (not the lead's).
- **Last owner protection:** trigger on `salon_members` (before delete, and before update of `role`) raising `BF403` if the change would leave a salon with no owner. Allow it when the salon itself is being deleted (the salon row no longer exists during the cascade).

## 2. Functions
All `security definer`, `set search_path = ''`, using the salon's `timezone`. Constants live in one place (e.g. `private.booking_settings()`): **slot step 15 min, lead time 30 min, horizon 60 days, hold 10 min, rate limit 10 holds per IP per hour.**

### `public.get_availability(p_salon_slug text, p_service_ids uuid[], p_date date, p_staff_id uuid default null)`
Returns `table (staff_id uuid, starts_at timestamptz, ends_at timestamptz)`, ordered by `starts_at`, then staff `sort_order`. `stable`. Execute: `anon, authenticated`.
- The salon must exist and be published, else `BF404`. The array must be non-empty and every service must belong to the salon and be bookable, else `BF404`. If `p_staff_id` is given, it must be an active staff member of the salon, else `BF404`.
- Candidate staff: active staff who offer **all** requested services (and equal `p_staff_id` when given). Duration = sum of the services' durations.
- If `p_date` is before today or after today + 60 days (in the salon's timezone), return no rows.
- Working windows for `p_date`: the staff member's `staff_hours` rows for that ISO weekday if any exist, otherwise the salon's `opening_hours` for that weekday. Convert with `(p_date + time) at time zone salon.timezone`.
- Start times step 15 minutes from each window's start. Keep a start if `start + duration <= window end`, `start >= now() + 30 min`, and `[start, start + duration)` overlaps none of that staff member's bookings with status `confirmed`, `completed` or `no_show`, or `held` with `hold_expires_at > now()`, nor any of their `time_off`.

### `public.create_hold(p_salon_slug text, p_service_ids uuid[], p_starts_at timestamptz, p_staff_id uuid, p_hold_token text)`
Returns `table (hold_id uuid, staff_id uuid, expires_at timestamptz)`. `volatile`. Execute: `anon, authenticated`. A null `p_staff_id` means any professional.
1. Token length must be 20–128, else `BF400`.
2. Client IP = the first entry of `x-forwarded-for` in `current_setting('request.headers', true)` (fallback `'unknown'`). If `hold_log` has 10 or more rows for that IP in the last hour → `BF429`. Opportunistically delete `hold_log` rows older than 1 day.
3. Mark this token's active holds `expired` (one active hold per visitor).
4. The slot must appear in `get_availability(slug, services, (p_starts_at at time zone tz)::date, p_staff_id)` with `starts_at = p_starts_at`. With no staff given, pick the first matching row by staff `sort_order`, then `id`. Otherwise → `BF409`.
5. Mark the chosen staff member's overlapping **expired** holds (`held` with `hold_expires_at <= now()`) as `expired`, so the exclusion constraint doesn't trip on them.
6. Insert the booking (`held`, `source 'web'`, `hold_expires_at = now() + 10 min`, `hold_token_hash`, `total_kes` = sum of prices). Insert `booking_services` snapshots (name, duration, price, position = array order), a `booking_events` row of type `held`, and a `hold_log` row. If the insert hits `exclusion_violation`, raise `BF409`.

### `public.release_hold(p_hold_token text) returns void`
Execute: `anon, authenticated`. The token's active hold → `expired`, with event `released`. No active hold → `BF404`.

### `public.confirm_booking(p_hold_token text, p_full_name text) returns uuid`
Execute: `authenticated` only (revoke from `public, anon`).
- Phone = `auth.users.phone` of `auth.uid()`, normalised to E.164 by adding `+` if missing. Null or empty → `BF401`. Name trimmed to 1–80 chars, else `BF400`.
- Find the `held` booking with this token hash. None → `BF404`. If `hold_expires_at <= now()`, mark it `expired` and raise `BF410`.
- Upsert the client on `(salon_id, phone)`: set `user_id` if null; set `full_name` only when creating the client (an owner may have edited it).
- Booking → `confirmed`, `client_id` set, `hold_token_hash` cleared. Event `confirmed`. Return the booking id.

### `public.update_booking_status(p_booking_id uuid, p_status public.booking_status, p_reason text default null) returns void`
Execute: `authenticated` only.
- The booking must exist in a salon the caller belongs to, else `BF404`.
- Allowed transitions: `confirmed → completed | no_show | cancelled`. Anything else → `BF422`.
- Owners may make any allowed transition. Staff may only move **their own** bookings (`staff_id = private.my_staff_id(salon_id)`) to `completed` or `no_show`; anything else → `42501`.
- `cancelled` stores `cancel_reason`. Log event `status_changed` with `data = {"from": ..., "to": ..., "reason": ...}` and `actor_id = auth.uid()`.

## 3. Types and docs
Regenerate `database.types.ts`. Add the error-code map to `@bookflow/shared` with a unit test. Add a short `docs/booking-engine.md` explaining the hold → confirm flow (for the portfolio).

## 4. Acceptance tests (lead-owned: copy verbatim into `supabase/tests/acceptance/`)
Dates are relative to `current_date`, so the tests never go stale. Every weekday has opening hours, so the weekday doesn't matter.

### `06_availability.sql`
```sql
begin;
select plan(14);

insert into public.salons (id, slug, name, is_published, timezone) values
  ('a0000000-0000-4000-8000-000000000001', 'salon-a', 'Salon A', true, 'Africa/Nairobi'),
  ('a0000000-0000-4000-8000-000000000002', 'salon-b', 'Salon B', false, 'Africa/Nairobi');
insert into public.opening_hours (salon_id, weekday, opens, closes)
  select 'a0000000-0000-4000-8000-000000000001', w, '10:00', '18:00' from generate_series(1, 7) as w;
insert into public.staff (id, salon_id, display_name, sort_order) values
  ('b0000000-0000-4000-8000-000000000001', 'a0000000-0000-4000-8000-000000000001', 'Njeri', 1),
  ('b0000000-0000-4000-8000-000000000002', 'a0000000-0000-4000-8000-000000000001', 'Amina', 2);
insert into public.services (id, salon_id, name, duration_min, price_kes) values
  ('c0000000-0000-4000-8000-000000000001', 'a0000000-0000-4000-8000-000000000001', 'Trim', 30, 1000),
  ('c0000000-0000-4000-8000-000000000002', 'a0000000-0000-4000-8000-000000000001', 'Braids', 60, 2500),
  ('c0000000-0000-4000-8000-000000000003', 'a0000000-0000-4000-8000-000000000002', 'Hidden', 30, 500);
insert into public.staff_services (salon_id, staff_id, service_id) values
  ('a0000000-0000-4000-8000-000000000001', 'b0000000-0000-4000-8000-000000000001', 'c0000000-0000-4000-8000-000000000001'),
  ('a0000000-0000-4000-8000-000000000001', 'b0000000-0000-4000-8000-000000000001', 'c0000000-0000-4000-8000-000000000002'),
  ('a0000000-0000-4000-8000-000000000001', 'b0000000-0000-4000-8000-000000000002', 'c0000000-0000-4000-8000-000000000001');

-- Day +8: Njeri booked 12:00-13:00
insert into public.bookings (salon_id, staff_id, status, period) values
  ('a0000000-0000-4000-8000-000000000001', 'b0000000-0000-4000-8000-000000000001', 'confirmed',
   tstzrange(((current_date + 8) + time '12:00') at time zone 'Africa/Nairobi',
             ((current_date + 8) + time '13:00') at time zone 'Africa/Nairobi'));
-- Day +9: Amina off all day
insert into public.time_off (salon_id, staff_id, period) values
  ('a0000000-0000-4000-8000-000000000001', 'b0000000-0000-4000-8000-000000000002',
   tstzrange(((current_date + 9) + time '00:00') at time zone 'Africa/Nairobi',
             ((current_date + 10) + time '00:00') at time zone 'Africa/Nairobi'));
-- Day +10's weekday: Njeri works 14:00-16:00 only
insert into public.staff_hours (salon_id, staff_id, weekday, starts, ends) values
  ('a0000000-0000-4000-8000-000000000001', 'b0000000-0000-4000-8000-000000000001',
   extract(isodow from current_date + 10)::smallint, '14:00', '16:00');
-- Day +11: an expired hold; day +12: an active hold (Njeri 10:00-11:00)
insert into public.bookings (salon_id, staff_id, status, period, hold_expires_at) values
  ('a0000000-0000-4000-8000-000000000001', 'b0000000-0000-4000-8000-000000000001', 'held',
   tstzrange(((current_date + 11) + time '10:00') at time zone 'Africa/Nairobi',
             ((current_date + 11) + time '11:00') at time zone 'Africa/Nairobi'), now() - interval '1 minute'),
  ('a0000000-0000-4000-8000-000000000001', 'b0000000-0000-4000-8000-000000000001', 'held',
   tstzrange(((current_date + 12) + time '10:00') at time zone 'Africa/Nairobi',
             ((current_date + 12) + time '11:00') at time zone 'Africa/Nairobi'), now() + interval '5 minutes');

set local role anon;
set local request.jwt.claims = '{"role":"anon"}';

select is((select count(*)::int from public.get_availability('salon-a',
  array['c0000000-0000-4000-8000-000000000001']::uuid[], current_date + 7)
  where staff_id = 'b0000000-0000-4000-8000-000000000001'),
  31, 'a 30-minute service has 31 start times in a 10:00-18:00 day');

select is((select count(distinct staff_id)::int from public.get_availability('salon-a',
  array['c0000000-0000-4000-8000-000000000002']::uuid[], current_date + 7)),
  1, 'only staff who offer the service are offered');

select is((select count(*)::int from public.get_availability('salon-a',
  array['c0000000-0000-4000-8000-000000000002']::uuid[], current_date + 7)),
  29, 'a 60-minute service has 29 start times');

select is((select count(*)::int from public.get_availability('salon-a',
  array['c0000000-0000-4000-8000-000000000001', 'c0000000-0000-4000-8000-000000000002']::uuid[], current_date + 7)),
  27, 'combined services need one staff member offering all of them, for the total duration');

select is((select count(*)::int from public.get_availability('salon-a',
  array['c0000000-0000-4000-8000-000000000001']::uuid[], current_date + 7, 'b0000000-0000-4000-8000-000000000002')),
  31, 'choosing a professional returns only their times');

select is((select count(*)::int from public.get_availability('salon-a',
  array['c0000000-0000-4000-8000-000000000001']::uuid[], current_date + 8)
  where staff_id = 'b0000000-0000-4000-8000-000000000001'),
  26, 'times overlapping a confirmed booking are removed');

select is((select count(*)::int from public.get_availability('salon-a',
  array['c0000000-0000-4000-8000-000000000001']::uuid[], current_date + 9)
  where staff_id = 'b0000000-0000-4000-8000-000000000002'),
  0, 'staff on time off have no times');

select is((select count(*)::int from public.get_availability('salon-a',
  array['c0000000-0000-4000-8000-000000000001']::uuid[], current_date + 10)
  where staff_id = 'b0000000-0000-4000-8000-000000000001'),
  7, 'staff working hours replace the salon''s hours');

select is((select count(*)::int from public.get_availability('salon-a',
  array['c0000000-0000-4000-8000-000000000001']::uuid[], current_date + 11)
  where staff_id = 'b0000000-0000-4000-8000-000000000001'),
  31, 'an expired hold does not block');

select is((select count(*)::int from public.get_availability('salon-a',
  array['c0000000-0000-4000-8000-000000000001']::uuid[], current_date + 12)
  where staff_id = 'b0000000-0000-4000-8000-000000000001'),
  27, 'an active hold blocks its time');

select is((select count(*)::int from public.get_availability('salon-a',
  array['c0000000-0000-4000-8000-000000000001']::uuid[], current_date - 1)),
  0, 'past days have no times');

select is((select count(*)::int from public.get_availability('salon-a',
  array['c0000000-0000-4000-8000-000000000001']::uuid[], current_date + 90)),
  0, 'days beyond the 60-day horizon have no times');

select throws_ok($$ select * from public.get_availability('salon-b',
  array['c0000000-0000-4000-8000-000000000003']::uuid[], current_date + 7) $$,
  'BF404', null, 'an unpublished salon is not found');

select throws_ok($$ select * from public.get_availability('salon-a',
  array['c0000000-0000-4000-8000-000000000003']::uuid[], current_date + 7) $$,
  'BF404', null, 'another salon''s service is not found');

reset role;
select * from finish();
rollback;
```

### `07_holds.sql`
```sql
begin;
select plan(15);

insert into public.salons (id, slug, name, is_published, timezone)
values ('a0000000-0000-4000-8000-000000000001', 'salon-a', 'Salon A', true, 'Africa/Nairobi');
insert into public.opening_hours (salon_id, weekday, opens, closes)
  select 'a0000000-0000-4000-8000-000000000001', w, '10:00', '18:00' from generate_series(1, 7) as w;
insert into public.staff (id, salon_id, display_name, sort_order) values
  ('b0000000-0000-4000-8000-000000000001', 'a0000000-0000-4000-8000-000000000001', 'Njeri', 1),
  ('b0000000-0000-4000-8000-000000000002', 'a0000000-0000-4000-8000-000000000001', 'Amina', 2);
insert into public.services (id, salon_id, name, duration_min, price_kes)
values ('c0000000-0000-4000-8000-000000000001', 'a0000000-0000-4000-8000-000000000001', 'Trim', 30, 1000);
insert into public.staff_services (salon_id, staff_id, service_id) values
  ('a0000000-0000-4000-8000-000000000001', 'b0000000-0000-4000-8000-000000000001', 'c0000000-0000-4000-8000-000000000001'),
  ('a0000000-0000-4000-8000-000000000001', 'b0000000-0000-4000-8000-000000000002', 'c0000000-0000-4000-8000-000000000001');

set local role anon;
set local request.jwt.claims = '{"role":"anon"}';
set local request.headers = '{"x-forwarded-for":"203.0.113.9, 10.0.0.1"}';

select lives_ok($$ select * from public.create_hold('salon-a', array['c0000000-0000-4000-8000-000000000001']::uuid[],
  ((current_date + 7) + time '10:00') at time zone 'Africa/Nairobi',
  'b0000000-0000-4000-8000-000000000001', 'test-token-0000000001') $$,
  'a visitor can hold a free slot');

select throws_ok($$ select * from public.create_hold('salon-a', array['c0000000-0000-4000-8000-000000000001']::uuid[],
  ((current_date + 7) + time '10:00') at time zone 'Africa/Nairobi',
  'b0000000-0000-4000-8000-000000000001', 'test-token-0000000002') $$,
  'BF409', null, 'a held slot cannot be held again');

select is((select h.staff_id from public.create_hold('salon-a', array['c0000000-0000-4000-8000-000000000001']::uuid[],
  ((current_date + 7) + time '10:00') at time zone 'Africa/Nairobi',
  null, 'test-token-0000000003') as h),
  'b0000000-0000-4000-8000-000000000002'::uuid, 'any professional picks the next free staff member');

select throws_ok($$ select * from public.create_hold('salon-a', array['c0000000-0000-4000-8000-000000000001']::uuid[],
  ((current_date + 7) + time '09:00') at time zone 'Africa/Nairobi',
  'b0000000-0000-4000-8000-000000000001', 'test-token-0000000004') $$,
  'BF409', null, 'a time outside working hours cannot be held');

select throws_ok($$ select * from public.create_hold('salon-a', array['c0000000-0000-4000-8000-000000000001']::uuid[],
  ((current_date + 7) + time '15:00') at time zone 'Africa/Nairobi',
  'b0000000-0000-4000-8000-000000000001', 'short') $$,
  'BF400', null, 'a short hold token is rejected');

select lives_ok($$ select * from public.create_hold('salon-a', array['c0000000-0000-4000-8000-000000000001']::uuid[],
  ((current_date + 7) + time '14:00') at time zone 'Africa/Nairobi',
  'b0000000-0000-4000-8000-000000000001', 'test-token-0000000001') $$,
  'the same visitor can pick a different time');

reset role;

select is((select count(*)::int from public.bookings
  where status = 'held' and hold_token_hash = encode(sha256('test-token-0000000001'::bytea), 'hex')),
  1, 'a visitor keeps at most one active hold');

select is((select hold_expires_at from public.bookings
  where status = 'held' and hold_token_hash = encode(sha256('test-token-0000000001'::bytea), 'hex')),
  now() + interval '10 minutes', 'holds last 10 minutes');

select is((select total_kes from public.bookings
  where hold_token_hash = encode(sha256('test-token-0000000003'::bytea), 'hex')),
  1000, 'the hold records the total price');

select is((select count(*)::int from public.booking_services bs join public.bookings b on b.id = bs.booking_id
  where b.hold_token_hash = encode(sha256('test-token-0000000003'::bytea), 'hex') and bs.price_kes = 1000),
  1, 'the hold snapshots each service and its price');

set local role anon;
set local request.jwt.claims = '{"role":"anon"}';

select throws_ok($$ select public.release_hold('unknown-token-000000000') $$,
  'BF404', null, 'releasing an unknown hold is not found');

select lives_ok($$ select public.release_hold('test-token-0000000003') $$,
  'a visitor can release their hold');

reset role;

select is((select status::text from public.bookings
  where hold_token_hash = encode(sha256('test-token-0000000003'::bytea), 'hex')),
  'expired', 'a released hold no longer blocks');

set local role anon;
set local request.jwt.claims = '{"role":"anon"}';
set local request.headers = '{"x-forwarded-for":"198.51.100.7"}';

select is((select count(*)::int
  from generate_series(0, 9) as i,
  lateral public.create_hold('salon-a', array['c0000000-0000-4000-8000-000000000001']::uuid[],
    (((current_date + 8) + time '10:00') at time zone 'Africa/Nairobi') + i * interval '30 minutes',
    'b0000000-0000-4000-8000-000000000001', 'rate-limit-token-00000' || lpad(i::text, 2, '0'))),
  10, 'ten holds from one address within an hour are allowed');

select throws_ok($$ select * from public.create_hold('salon-a', array['c0000000-0000-4000-8000-000000000001']::uuid[],
  ((current_date + 8) + time '16:00') at time zone 'Africa/Nairobi',
  'b0000000-0000-4000-8000-000000000001', 'rate-limit-token-0000099') $$,
  'BF429', null, 'the eleventh hold from one address within an hour is refused');

reset role;
select * from finish();
rollback;
```

### `08_confirm.sql`
```sql
begin;
select plan(10);

insert into auth.users (id, email, phone) values
  ('d0000000-0000-4000-8000-000000000011', 'client@example.test', '254700000011'),
  ('d0000000-0000-4000-8000-000000000012', 'nophone@example.test', null);

insert into public.salons (id, slug, name, is_published, timezone)
values ('a0000000-0000-4000-8000-000000000001', 'salon-a', 'Salon A', true, 'Africa/Nairobi');
insert into public.staff (id, salon_id, display_name)
values ('b0000000-0000-4000-8000-000000000001', 'a0000000-0000-4000-8000-000000000001', 'Njeri');

insert into public.bookings (id, salon_id, staff_id, status, period, hold_expires_at, hold_token_hash, total_kes, source) values
  ('f0000000-0000-4000-8000-000000000001', 'a0000000-0000-4000-8000-000000000001', 'b0000000-0000-4000-8000-000000000001', 'held',
   tstzrange(((current_date + 7) + time '10:00') at time zone 'Africa/Nairobi', ((current_date + 7) + time '10:30') at time zone 'Africa/Nairobi'),
   now() + interval '10 minutes', encode(sha256('confirm-token-00000001'::bytea), 'hex'), 1000, 'web'),
  ('f0000000-0000-4000-8000-000000000002', 'a0000000-0000-4000-8000-000000000001', 'b0000000-0000-4000-8000-000000000001', 'held',
   tstzrange(((current_date + 7) + time '11:00') at time zone 'Africa/Nairobi', ((current_date + 7) + time '11:30') at time zone 'Africa/Nairobi'),
   now() - interval '1 minute', encode(sha256('confirm-token-00000002'::bytea), 'hex'), 1000, 'web'),
  ('f0000000-0000-4000-8000-000000000003', 'a0000000-0000-4000-8000-000000000001', 'b0000000-0000-4000-8000-000000000001', 'held',
   tstzrange(((current_date + 7) + time '12:00') at time zone 'Africa/Nairobi', ((current_date + 7) + time '12:30') at time zone 'Africa/Nairobi'),
   now() + interval '10 minutes', encode(sha256('confirm-token-00000003'::bytea), 'hex'), 1000, 'web');

set local role authenticated;
set local request.jwt.claims = '{"sub":"d0000000-0000-4000-8000-000000000011","role":"authenticated"}';

select throws_ok($$ select public.confirm_booking('unknown-token-000000000', 'Wanjiru Otieno') $$,
  'BF404', null, 'an unknown hold cannot be confirmed');
select throws_ok($$ select public.confirm_booking('confirm-token-00000002', 'Wanjiru Otieno') $$,
  'BF410', null, 'an expired hold cannot be confirmed');
select lives_ok($$ select public.confirm_booking('confirm-token-00000001', 'Wanjiru Otieno') $$,
  'a signed-in client can confirm their hold');
select throws_ok($$ select public.confirm_booking('confirm-token-00000001', 'Wanjiru Otieno') $$,
  'BF404', null, 'a hold cannot be confirmed twice');
reset role;

select is((select status::text from public.bookings where id = 'f0000000-0000-4000-8000-000000000001'),
  'confirmed', 'the booking is confirmed');
select is((select c.phone from public.clients c join public.bookings b on b.client_id = c.id
  where b.id = 'f0000000-0000-4000-8000-000000000001'),
  '+254700000011', 'the client is recorded with an E.164 phone');
select is((select c.user_id from public.clients c join public.bookings b on b.client_id = c.id
  where b.id = 'f0000000-0000-4000-8000-000000000001'),
  'd0000000-0000-4000-8000-000000000011'::uuid, 'the client is linked to the signed-in user');
select is((select count(*)::int from public.booking_events
  where booking_id = 'f0000000-0000-4000-8000-000000000001' and type = 'confirmed'),
  1, 'the confirmation is logged');

set local role authenticated;
set local request.jwt.claims = '{"sub":"d0000000-0000-4000-8000-000000000012","role":"authenticated"}';
select throws_ok($$ select public.confirm_booking('confirm-token-00000003', 'No Phone') $$,
  'BF401', null, 'a user without a verified phone cannot confirm');
reset role;

set local role anon;
set local request.jwt.claims = '{"role":"anon"}';
select throws_ok($$ select public.confirm_booking('confirm-token-00000003', 'Anon') $$,
  '42501', null, 'anonymous visitors cannot confirm');
reset role;

select * from finish();
rollback;
```

### `09_booking_actions.sql`
```sql
begin;
select plan(11);

insert into auth.users (id, email) values
  ('d0000000-0000-4000-8000-000000000001', 'owner@example.test'),
  ('d0000000-0000-4000-8000-000000000002', 'staff@example.test'),
  ('d0000000-0000-4000-8000-000000000003', 'co-owner@example.test');

insert into public.salons (id, slug, name, is_published)
values ('a0000000-0000-4000-8000-000000000001', 'salon-a', 'Salon A', true);
insert into public.staff (id, salon_id, display_name) values
  ('b0000000-0000-4000-8000-000000000001', 'a0000000-0000-4000-8000-000000000001', 'Njeri'),
  ('b0000000-0000-4000-8000-000000000002', 'a0000000-0000-4000-8000-000000000001', 'Amina');
insert into public.salon_members (salon_id, user_id, role, staff_id) values
  ('a0000000-0000-4000-8000-000000000001', 'd0000000-0000-4000-8000-000000000001', 'owner', null),
  ('a0000000-0000-4000-8000-000000000001', 'd0000000-0000-4000-8000-000000000002', 'staff', 'b0000000-0000-4000-8000-000000000001');
insert into public.bookings (id, salon_id, staff_id, status, period, total_kes) values
  ('f0000000-0000-4000-8000-000000000001', 'a0000000-0000-4000-8000-000000000001', 'b0000000-0000-4000-8000-000000000001', 'confirmed',
   tstzrange('2026-11-10 10:00+03', '2026-11-10 10:30+03'), 1000),
  ('f0000000-0000-4000-8000-000000000002', 'a0000000-0000-4000-8000-000000000001', 'b0000000-0000-4000-8000-000000000002', 'confirmed',
   tstzrange('2026-11-10 10:00+03', '2026-11-10 10:30+03'), 1000),
  ('f0000000-0000-4000-8000-000000000003', 'a0000000-0000-4000-8000-000000000001', 'b0000000-0000-4000-8000-000000000001', 'confirmed',
   tstzrange('2026-11-10 12:00+03', '2026-11-10 12:30+03'), 1000);

-- Staff member (Njeri)
set local role authenticated;
set local request.jwt.claims = '{"sub":"d0000000-0000-4000-8000-000000000002","role":"authenticated"}';
select lives_ok($$ select public.update_booking_status('f0000000-0000-4000-8000-000000000001', 'completed') $$,
  'staff can check in their own booking');
select throws_ok($$ select public.update_booking_status('f0000000-0000-4000-8000-000000000002', 'completed') $$,
  '42501', null, 'staff cannot change another staff member''s booking');
select throws_ok($$ select public.update_booking_status('f0000000-0000-4000-8000-000000000003', 'cancelled') $$,
  '42501', null, 'staff cannot cancel bookings');
select results_eq($$ with u as (update public.bookings set total_kes = 1
  where id = 'f0000000-0000-4000-8000-000000000003' returning 1) select count(*)::int from u $$,
  $$ values (0) $$, 'staff cannot edit bookings directly');
reset role;

-- Owner
set local role authenticated;
set local request.jwt.claims = '{"sub":"d0000000-0000-4000-8000-000000000001","role":"authenticated"}';
select lives_ok($$ select public.update_booking_status('f0000000-0000-4000-8000-000000000003', 'cancelled', 'Client requested') $$,
  'an owner can cancel a booking');
select throws_ok($$ select public.update_booking_status('f0000000-0000-4000-8000-000000000003', 'completed') $$,
  'BF422', null, 'a cancelled booking is final');
select throws_ok($$ select public.update_booking_status('f0000000-0000-4000-8000-000000000002', 'held') $$,
  'BF422', null, 'a booking cannot go back to held');
reset role;

select is((select status::text from public.bookings where id = 'f0000000-0000-4000-8000-000000000001'),
  'completed', 'the staff check-in was saved');
select is((select data ->> 'reason' from public.booking_events
  where booking_id = 'f0000000-0000-4000-8000-000000000003' and type = 'status_changed'),
  'Client requested', 'the cancellation reason is logged');

-- Last owner protection
set local role authenticated;
set local request.jwt.claims = '{"sub":"d0000000-0000-4000-8000-000000000001","role":"authenticated"}';
select throws_ok($$ delete from public.salon_members
  where salon_id = 'a0000000-0000-4000-8000-000000000001' and user_id = 'd0000000-0000-4000-8000-000000000001' $$,
  'BF403', null, 'the last owner cannot leave the salon');
reset role;

insert into public.salon_members (salon_id, user_id, role)
values ('a0000000-0000-4000-8000-000000000001', 'd0000000-0000-4000-8000-000000000003', 'owner');

set local role authenticated;
set local request.jwt.claims = '{"sub":"d0000000-0000-4000-8000-000000000001","role":"authenticated"}';
select lives_ok($$ delete from public.salon_members
  where salon_id = 'a0000000-0000-4000-8000-000000000001' and user_id = 'd0000000-0000-4000-8000-000000000001' $$,
  'an owner can leave when another owner remains');
reset role;

select * from finish();
rollback;
```

## Acceptance criteria
- [ ] All nine acceptance files (01–09) pass unmodified locally and in CI, plus your own tests. Add some for the lead-time rule, a 24:00 closing time, and concurrent holds if you can simulate them.
- [ ] `pnpm check` green; types regenerated; error-code map exported and tested.
- [ ] After merge, the DB deploy applies the new migration; report the run link.
- [ ] If any lead test looks wrong (a Supabase assumption, a miscount), stop and report. Don't edit it.

## Out of scope
SMS / phone login (Phase 1c), UI, payments, notifications, scheduled cleanup jobs.
