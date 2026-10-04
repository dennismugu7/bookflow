# Phase 4b/4c — Owner app: Calendar and Clients

**Goal:** the owner sees any day or week at a glance (per team member, with time off and closed days) and has a client book: search, segments, profile, private notes and one-tap rebooking.

**Branch:** `feat/owner-calendar-clients` → PR. Include the lead's uncommitted files: this spec, `docs/design/owner-v4/` and the screen-map update.

**Designs (approved by Dennis, 2026-10-04):** `docs/design/owner-v4/01`–`05`, adapted from originals 25–28 with no deposits and no ratings. ADR 0009: copy the mockups; the tab bar and top bar stay as they are now. It ships over the air (no new native modules).

## 1. Database (new migration; all functions `security definer`, `stable`, `set search_path = ''`, execute for `authenticated` only; members of the salon only, others get `42501`)

### `public.get_range_agenda(p_salon_id uuid, p_from date, p_to date) returns jsonb`
- `p_to < p_from`, or a range longer than 7 days → `BF400`.
- Shape:
  ```json
  {"staff":[{"id","name","photo_path","sort_order","active"}],
   "days":[{"date":"2026-10-04","open":[{"opens":"09:00","closes":"18:00"}],
            "bookings":[ /* same item shape as get_day_agenda.bookings */ ],
            "time_off":[{"staff_id","starts_at","ends_at","reason"}]}]}
  ```
- Days are in the salon's timezone, one entry per date in the range, in order. A date with no `open` windows is closed.
- Reuse the booking-item logic from `get_day_agenda`; don't duplicate it. Factor it into a private helper if needed, and keep `get_day_agenda`'s output and tests unchanged.

### `public.get_clients(p_salon_id uuid, p_search text default null, p_segment text default 'all') returns jsonb`
- `{"counts":{"all","new","regular","lapsed"},"clients":[…]}`.
  - `counts` always cover the whole salon, whatever the search or segment.
  - `clients` are filtered by `p_search` (a case-insensitive name match, or a phone match on digits) and by `p_segment` (`all`, `new`, `regular` or `lapsed`; anything else → `BF400`).
  - Sorted by next booking soonest, then last visit most recent, then name. At most 200.
- **Client item:** `id`, `full_name`, `phone`, `phone_verified`, `visits`, `last_visit`, `next_booking`, `avg_gap_days`, `segments` (array).
- **Definitions** (one per client, at query time):
  - `visits` = the number of **completed** bookings.
  - `avg_gap_days` = the average number of days between consecutive completed visits (null with fewer than 2).
  - **new**: the client's earliest non-cancelled booking starts within the last 30 days (or in the future).
  - **regular**: `visits >= 3`.
  - **lapsed**: `visits >= 1`, no upcoming confirmed booking, and the days since the last completed visit are more than `greatest(60, 2 * avg_gap_days)`.

### `public.get_client_profile(p_client_id uuid) returns jsonb`
- The client must belong to a salon the caller is a member of; otherwise `BF404` (don't reveal it exists).
- Shape: `{"client":{id, full_name, phone, phone_verified, notes, user_id is not null as has_account}, "stats":{"visits","spent_kes","avg_gap_days","no_shows"}, "upcoming":{…booking item…}|null, "past":[…booking items, completed or no_show, newest first, at most 50…]}`.
  - `spent_kes` = the sum of `total_kes` over completed bookings.

### Notes and adding clients
- Notes are saved with a direct update to `clients.notes` (the owner update policy already allows it); maximum 1,000 characters (add a check constraint).
- **Add a client** inserts directly (the owner insert policy exists): name required, phone optional and normalised with the shared `normalizeKenyanPhone`. A duplicate phone (`23505`) → "That number already belongs to <name>" with a link to that client.

## 2. Owner app
- **Calendar (`01`, `02`):** the header has ‹ › arrows and a date label (tap it to open a date picker), then a **List · Day · Week** switch, remembered between visits.
  - **Day (`01`):**
    - one column per active team member, with avatar and name at the top (the columns scroll sideways beyond 3);
    - a time scale from the earliest opening to the latest closing, with bookings as blocks coloured by state (green completed, amber next, blue upcoming, grey no-show);
    - time off hatched with its label, and a red now-line on today.
    - **Taps:** a block opens the same booking card as Today, as a bottom sheet with the same actions; empty space opens New booking prefilled with that staff member and the nearest 15-minute time; **+** opens New booking.
  - **Week (`02`):** seven day columns (Monday first), with staff filter chips ("Everyone" plus each person) and closed days greyed. Tap a day → Day view for that date.
  - **List:** the Today list layout for the chosen date.
  - Swipe left/right changes the day or week. Live updates the same way as Today.
- **Clients (`03`–`05`):**
  - **Empty (`03`):** the illustration and text, **Add a client** and Share your booking link.
  - **List (`04`):**
    - search with a 300 ms debounce, and segment chips with counts;
    - rows with initials (a colour fixed per client), name and badges (New, Lapsed);
    - a sub-line: "Upcoming <date> · N visits", or "Last visit <date> · N visits", or "Walk-in · no phone".
    - **+** at top right → Add a client (name and optional phone).
  - **Profile (`05`):**
    - top bar with ← and ⋯ (Edit name/phone, Delete client — only if they have no bookings);
    - the phone with the "Phone not verified" badge when relevant;
    - **Call**, **WhatsApp** and **Book** (opens New booking with this client preselected);
    - the three stats (visits, spent shown compact, usual gap "~5 wks" or "—");
    - an Upcoming card (tap to open the booking);
    - **Notes**, auto-saved when typing pauses (showing "Saved");
    - Past visits, with No-show pills.
  - **Today and Calendar → client:** tapping the client's name inside an opened booking card opens their profile.

## 3. Acceptance tests (lead-owned: copy verbatim)

### `supabase/tests/acceptance/16_calendar_clients.sql`
```sql
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
```

### `packages/shared/src/gap.acceptance.test.ts`
```ts
import { describe, expect, it } from "vitest";

import { formatUsualGap } from "./index";

describe("formatUsualGap", () => {
  it("shows the usual gap between visits in weeks or days", () => {
    expect(formatUsualGap(35)).toBe("~5 wks");
    expect(formatUsualGap(10)).toBe("~10 days");
    expect(formatUsualGap(7)).toBe("~1 wk");
    expect(formatUsualGap(null)).toBe("—");
  });
});
```

## Acceptance criteria
- [ ] All acceptance tests (SQL 01–16, all TS) pass unmodified; `pnpm check`, CI and `expo-doctor` green; types regenerated.
- [ ] Side-by-sides for `01`–`05` (mockup | live) and the differences table (ADR 0009).
- [ ] Manual or automated run on fake data covering:
  - Day view with 3 staff and time off; tapping a block opens the card;
  - tapping empty space or + creates a booking;
  - Week view filter → tap a day;
  - the client segments and search;
  - Book from a profile; notes saved and still there after a reload;
  - a duplicate phone on Add a client.
- [ ] Don't merge.

## Out of scope
Drag-to-reschedule, reassign, edit services or price (later), staff-limited views (2c), push notifications (0.5.0).
