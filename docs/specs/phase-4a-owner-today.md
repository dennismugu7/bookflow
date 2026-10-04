# Phase 4a — Owner app: Today with real bookings

**Goal:** the owner sees today's bookings as they come in, contacts clients, marks bookings done, no-show or cancelled, and adds walk-in or phone bookings into free time.

**Branch:** `feat/owner-today` → PR. Include the lead's uncommitted files: this spec, `docs/design/owner-v3/` and the screen-map update.

**Designs (approved by Dennis, 2026-10-04):** `docs/design/owner-v3/01`–`05`, adapted from originals 13–19 with deposits removed. ADR 0009: copy the mockups; the tab bar and top bar stay as they are now. It ships over the air (no new native modules; check that, and say so if not).

## 1. Database (new migration)

### Walk-ins may have no phone
- `alter table public.clients alter column phone drop not null;` The unique `(salon_id, phone)` constraint still applies when a phone is present. Check the existing client functions still behave, and that `confirm_booking_contact` still always sets a phone.

### `public.get_day_agenda(p_salon_id uuid, p_date date) returns jsonb`
- **Members only;** others get `42501`. `security definer`, `stable`, `set search_path = ''`.
- Times are interpreted in the salon's timezone.
- Shape:
  ```json
  {"date":"2026-10-03",
   "stats":{"booked":5,"expected_kes":9300,"free_min":150},
   "bookings":[{"id":"…","status":"confirmed","starts_at":"…","ends_at":"…","source":"web","is_new":true,
                "staff_id":"…","staff_name":"Njeri","total_kes":1500,
                "client":{"id":"…","full_name":"Wanjiru Otieno","phone":"+2547…","phone_verified":false,"visit_number":3},
                "services":[{"name":"Silk press","duration_min":30,"price_kes":1500}]}],
   "gaps":[{"starts_at":"…","ends_at":"…","minutes":120}]}
  ```
- **`bookings`:** status `confirmed`, `completed` or `no_show` (not held, expired or cancelled), ordered by start time.
  - `is_new` = `source = 'web'` and created in the last 24 hours.
  - `visit_number` = the client's non-cancelled, non-no-show bookings at this salon starting at or before this one.
- **`stats`:**
  - `booked` = the count of `confirmed` plus `completed`.
  - `expected_kes` = the sum of their `total_kes`.
  - `free_min` = the sum of the gap minutes.
- **`gaps`:**
  - Within that weekday's `opening_hours` windows, the times when **no** confirmed, completed, no-show or active held booking exists for any staff member in the salon.
  - Keep only gaps of 30 minutes or more.
  - For today, gaps start no earlier than now, rounded up to the next 5 minutes.
  - (Salon-wide quiet time is a deliberate simplification for v1. Per-staff free time comes with the Calendar in 4b.)

### `public.owner_create_booking(p_salon_id uuid, p_staff_id uuid, p_service_ids uuid[], p_starts_at timestamptz, p_client_id uuid default null, p_client_name text default null, p_client_phone text default null) returns uuid`
- **Who:** salon owners only; anyone else gets `42501`.
- **Client:** either `p_client_id` (it must belong to this salon, else `BF404`), or `p_client_name` (1–80 characters) to create a new client. Neither → `BF400`.
  - An optional phone is normalised with `private.normalize_kenyan_phone`; invalid → `BF400`.
  - If that phone already belongs to a client at this salon, reuse that client instead of creating a duplicate.
- **Services and staff:** the services must be bookable at this salon, and the staff member must be active and offer **all** of them, else `BF422`.
- **The booking:** duration and total come from the services; status `confirmed`, `source 'owner'`.
  - Insert the `booking_services` snapshots and a `booking_events` row (`type 'created'`, `{"by":"owner"}`).
  - An overlap → `BF409` (catch the exclusion violation).
  - Opening hours aren't enforced: owners may book outside them, but the app warns first.

### Realtime
- Add `public.bookings` to the `supabase_realtime` publication, so Today updates when a client books or cancels. RLS still decides who receives what.

### Existing actions
- **Mark done, No-show and Cancel** use the existing `update_booking_status`.
- The app only offers No-show and Mark done **after the start time**; Cancel is available before then.
- Don't change `update_booking_status`.

## 2. Owner app
- **Today (`01`):**
  - Salon name and date, then three tiles: **Booked**, **Expected KES** (compact, `9.3k`) and **Free** (`2h 30m`).
  - "Next up": every booking in time order, with gap rows in their places.
  - Badges:
    - **Done** (completed);
    - **Next** (the first confirmed booking not yet ended);
    - **New · web** (`is_new`);
    - **No-show** (greyed card);
    - **Phone not verified** (dashed amber, from the design system), when `phone_verified` is false.
  - A gap row shows "+ Fill this slot" and opens New booking, prefilled.
  - Pull to refresh; refresh when the screen gains focus; listen to realtime changes for this salon and refetch.
  - **No bookings at all today:** the current empty state (option A). Free gaps still show under it, if any.
  - The **Share your booking link** pill stays at the end of the list.
- **Booking opened (`02`):** tapping a card expands it in place, one card open at a time.
  - **Call** (`tel:`) and **WhatsApp** (`https://wa.me/<number without +>`), disabled when there's no phone.
  - The services with prices, "Total · pay at the salon", the visit line ("1st visit" / "3rd visit" · "booked online" or "added by you") and the phone in local format.
  - The actions follow the timing rules above, plus ⋯ → **Cancel booking**.
- **Cancel (`03`) and No-show (`04`):** sheets as in the mockups. Call `update_booking_status` with the reason ("Client asked", "I'm unavailable" or free text for "Other"). Show friendly errors.
- **New booking (`05`):** a screen with the TopBar, opened from the + button (time: the next free 15-minute slot) or from a gap (time: the gap's start).
  - **Client:** a search box over this salon's clients (name or phone, the first 20 matches). Picking one sets `p_client_id`; typing a new name creates one.
  - **Phone** is optional.
  - **Services:** chips. **With:** only the staff who offer all the selected services; skip the step if there's only one.
  - **When:** date and time pickers in 15-minute steps.
  - A bottom bar with the total and **Save booking**.
  - `BF409` → "That time is taken. Pick another." Outside opening hours → a confirm dialog before saving.
- Times are shown in the salon's timezone, in the 24-hour format the mockups use.

## 3. Acceptance tests (lead-owned: copy verbatim)

### `supabase/tests/acceptance/15_owner_day.sql`
```sql
begin;
select plan(12);

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
insert into public.staff (id, salon_id, display_name) values
  ('b0000000-0000-4000-8000-000000000001', 'a0000000-0000-4000-8000-000000000001', 'Njeri'),
  ('b0000000-0000-4000-8000-000000000002', 'a0000000-0000-4000-8000-000000000001', 'Amina');
insert into public.services (id, salon_id, name, duration_min, price_kes) values
  ('c0000000-0000-4000-8000-000000000001', 'a0000000-0000-4000-8000-000000000001', 'Trim', 30, 1000),
  ('c0000000-0000-4000-8000-000000000002', 'a0000000-0000-4000-8000-000000000001', 'Silk press', 60, 2000);
insert into public.staff_services (salon_id, staff_id, service_id) values
  ('a0000000-0000-4000-8000-000000000001', 'b0000000-0000-4000-8000-000000000001', 'c0000000-0000-4000-8000-000000000001'),
  ('a0000000-0000-4000-8000-000000000001', 'b0000000-0000-4000-8000-000000000001', 'c0000000-0000-4000-8000-000000000002');
insert into public.clients (id, salon_id, full_name, phone) values
  ('e0000000-0000-4000-8000-000000000051', 'a0000000-0000-4000-8000-000000000001', 'Wanjiru Otieno', '+254700000051');
insert into public.bookings (salon_id, staff_id, client_id, status, period, total_kes, source) values
  ('a0000000-0000-4000-8000-000000000001', 'b0000000-0000-4000-8000-000000000001', 'e0000000-0000-4000-8000-000000000051',
   'confirmed', tstzrange(((select day from d) + time '10:00') at time zone 'Africa/Nairobi',
                          ((select day from d) + time '10:30') at time zone 'Africa/Nairobi'), 1000, 'web'),
  ('a0000000-0000-4000-8000-000000000001', 'b0000000-0000-4000-8000-000000000001', 'e0000000-0000-4000-8000-000000000051',
   'confirmed', tstzrange(((select day from d) + time '13:00') at time zone 'Africa/Nairobi',
                          ((select day from d) + time '14:00') at time zone 'Africa/Nairobi'), 2000, 'owner'),
  ('a0000000-0000-4000-8000-000000000001', 'b0000000-0000-4000-8000-000000000001', 'e0000000-0000-4000-8000-000000000051',
   'cancelled', tstzrange(((select day from d) + time '15:00') at time zone 'Africa/Nairobi',
                          ((select day from d) + time '15:30') at time zone 'Africa/Nairobi'), 1000, 'web');

set local role authenticated;
set local request.jwt.claims = '{"sub":"d0000000-0000-4000-8000-000000000001","role":"authenticated"}';
select is((public.get_day_agenda('a0000000-0000-4000-8000-000000000001', (select day from d)) -> 'stats' ->> 'booked')::int,
  2, 'cancelled bookings are not counted');
select is((public.get_day_agenda('a0000000-0000-4000-8000-000000000001', (select day from d)) -> 'stats' ->> 'expected_kes')::int,
  3000, 'expected takings add up the active bookings');
select is((public.get_day_agenda('a0000000-0000-4000-8000-000000000001', (select day from d)) -> 'stats' ->> 'free_min')::int,
  450, 'free time is the open hours not taken by bookings');
select is(jsonb_array_length(public.get_day_agenda('a0000000-0000-4000-8000-000000000001', (select day from d)) -> 'gaps'),
  3, 'the day has three free gaps');
select lives_ok($$ select public.owner_create_booking('a0000000-0000-4000-8000-000000000001',
  'b0000000-0000-4000-8000-000000000001', array['c0000000-0000-4000-8000-000000000001']::uuid[],
  ((select day from d) + time '11:00') at time zone 'Africa/Nairobi', null, 'Mary Wambui', null) $$,
  'an owner can add a walk-in without a phone');
select throws_ok($$ select public.owner_create_booking('a0000000-0000-4000-8000-000000000001',
  'b0000000-0000-4000-8000-000000000001', array['c0000000-0000-4000-8000-000000000001']::uuid[],
  ((select day from d) + time '10:15') at time zone 'Africa/Nairobi', 'e0000000-0000-4000-8000-000000000051', null, null) $$,
  'BF409', null, 'a booking cannot overlap another');
select throws_ok($$ select public.owner_create_booking('a0000000-0000-4000-8000-000000000001',
  'b0000000-0000-4000-8000-000000000002', array['c0000000-0000-4000-8000-000000000001']::uuid[],
  ((select day from d) + time '16:00') at time zone 'Africa/Nairobi', 'e0000000-0000-4000-8000-000000000051', null, null) $$,
  'BF422', null, 'the professional must offer the services');
select is((public.get_day_agenda('a0000000-0000-4000-8000-000000000001', (select day from d)) -> 'stats' ->> 'free_min')::int,
  420, 'the walk-in takes its time out of the free gaps');
reset role;

select is((select status::text || '|' || source || '|' || total_kes from public.bookings b
  join public.clients c on c.id = b.client_id where c.full_name = 'Mary Wambui'),
  'confirmed|owner|1000', 'the walk-in is confirmed with its price');
select is((select count(*)::int from public.clients where full_name = 'Mary Wambui' and phone is null),
  1, 'the walk-in client is saved without a phone');

set local role authenticated;
set local request.jwt.claims = '{"sub":"d0000000-0000-4000-8000-000000000004","role":"authenticated"}';
select throws_ok($$ select public.get_day_agenda('a0000000-0000-4000-8000-000000000001', (select day from d)) $$,
  '42501', null, 'outsiders cannot see a salon''s day');
select throws_ok($$ select public.owner_create_booking('a0000000-0000-4000-8000-000000000001',
  'b0000000-0000-4000-8000-000000000001', array['c0000000-0000-4000-8000-000000000001']::uuid[],
  ((select day from d) + time '16:00') at time zone 'Africa/Nairobi', null, 'Intruder', null) $$,
  '42501', null, 'outsiders cannot add bookings');
reset role;

select * from finish();
rollback;
```

### `packages/shared/src/compact.acceptance.test.ts`
```ts
import { describe, expect, it } from "vitest";

import { compactKes, formatMinutes } from "./index";

describe("compactKes", () => {
  it("keeps small amounts whole and shortens thousands", () => {
    expect(compactKes(800)).toBe("800");
    expect(compactKes(9300)).toBe("9.3k");
    expect(compactKes(23000)).toBe("23k");
    expect(compactKes(1250000)).toBe("1.3M");
  });
});

describe("formatMinutes", () => {
  it("formats durations the way the Today screen shows them", () => {
    expect(formatMinutes(30)).toBe("30m");
    expect(formatMinutes(60)).toBe("1h");
    expect(formatMinutes(150)).toBe("2h 30m");
    expect(formatMinutes(0)).toBe("0m");
  });
});
```

## Acceptance criteria
- [ ] All acceptance tests (SQL 01–15, all TS) pass unmodified; `pnpm check`, CI and `expo-doctor` green; types regenerated.
- [ ] Side-by-sides for `01`–`05` (mockup | live), plus the differences table (ADR 0009).
- [ ] Manual or automated run on fake data:
  - a client books on the web → it appears on Today without a manual refresh;
  - open → Call and WhatsApp links are correct;
  - Mark done after the start time;
  - Cancel → the client's My bookings shows Cancelled;
  - Fill this slot → save → the gap shrinks.
- [ ] Don't merge.

## Out of scope
Calendar (4b), Clients (4c), reschedule, reassign, edit services or price (later), push notifications (next APK), staff-limited views (2c).
