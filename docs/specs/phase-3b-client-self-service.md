# Phase 3b — Clients manage their bookings

**Goal:** a client can see their bookings, cancel up to 2 hours before, book again, and confirm a repeat booking in one tap. Salons with only a Maps link still show an area line.

**Branch:** `feat/client-self-service` → PR. Include the lead's uncommitted files: this spec, `docs/design/client-v2/` and the screen-map update.

**Designs (approved by Dennis, 2026-10-04):** `docs/design/client-v2/01`–`06`. ADR 0009 applies: copy the mockups, and this spec adds behaviour. The visual language is the existing client web (Urbanist, black pill buttons, select purple `#5B45E0`).

## Decisions (Dennis)
- Clients can cancel **up to 2 hours before** the start time. After that they must call the salon.
- "View booking" takes the black button on "You're all set" (as in original design 21); Get directions moves into the summary line.

## 1. Database (new migration; all functions `security definer`, `set search_path = ''`, execute for `authenticated` only)
- **`public.get_my_bookings() returns jsonb`:** a JSON array of the caller's bookings across all salons (bookings whose client has `user_id = auth.uid()`), excluding `held` and `expired`, ordered by start time, newest first. Each item has the same shape as `get_my_booking` plus `"salon": {…, "phone"}`.
- **`public.cancel_my_booking(p_booking_id uuid, p_reason text default null) returns void`:**
  - Not the caller's booking (or unknown) → `BF404`.
  - Status isn't `confirmed` → `BF422`.
  - `lower(period) <= now() + interval '2 hours'` → `BF422` with the message "Too late to cancel online".
  - Otherwise: set `status = 'cancelled'` and `cancel_reason` (trimmed, max 200 characters), and insert a `booking_events` row of type `status_changed` with `{"from":"confirmed","to":"cancelled","reason":…,"by":"client"}` and `actor_id = auth.uid()`.
  - The time becomes bookable again right away: the exclusion constraint already ignores cancelled bookings.
- **`public.get_my_client_profile(p_salon_slug text) returns jsonb`:** `{"full_name","phone"}` of the caller's client record at that published salon, or SQL `null` if there's none.
- Put the 2-hour cutoff in `private.booking_settings()` as `client_cancel_cutoff interval`, not inline.

## 2. Shared code
- `areaLine(address: string | null, placeName: string | null): string | null` = `shortArea(address) ?? shortArea(placeName)` (acceptance test below). Use it everywhere the area line shows: the salon page, the confirm and booked headers, and My bookings. On the server, `placeName` comes from `inspectMapsLink(maps_url)`, cached for a day, as the map embed already does.

## 3. Web app
- **`/me`, My bookings (`01`, `02`):**
  - Signed out: the existing sign-in step (Google or email code) with `next=/me`.
  - Signed in: two tabs.
    - **Upcoming**: confirmed bookings in the future, soonest first.
    - **Past**: completed, no-show, cancelled and past confirmed bookings, newest first.
  - Cards per the mockup, with status pills (Confirmed, Completed, Cancelled, No-show).
  - On upcoming cards: **Get directions** (`maps_url`, else an address search), **Add to calendar** (the existing `/b/[id]/ics`) and **Cancel**.
  - On past cards: **Book again** → `/s/<slug>/book` with the same services preselected (only those still bookable).
  - Empty states: "No upcoming bookings" with a **Find your salon's link in your messages** hint, and "No past bookings".
- **Cancel sheet (`03`):** optional reason chips ("Change of plans", "Found another time", "Other" → a 200-character text field), a red **Cancel booking**, and **Keep booking**.
  - On success: a toast "Booking cancelled", and the card moves to Past.
  - **Too late (`04`):** if the cutoff has passed (check on the client, and handle `BF422` from the server), show this sheet instead. **Call <salon>** is a `tel:` link, shown only when `salons.phone` is set; otherwise show the text without the button.
- **Returning client (`05`):** on confirm, signed in, if `get_my_client_profile` returns a profile:
  - show "Welcome back, <first name>", plus a summary row (name and the phone in local format `0712 345 678`) with **Change**, and **Confirm booking**;
  - **Change** reveals the existing name and phone fields, prefilled;
  - confirm uses the same `confirm_booking_contact` call.
- **You're all set (`06`):** Add to calendar (outline) plus **View booking** (black, → `/me`); "Get directions" is a link at the end of the summary line.
- **Footer:** a small "My bookings" link at the bottom of every client page (salon, book, confirm, booked).
- Remove the matching items from "Approved deviations" in `docs/design/screen-map.md` (the Get directions slot and the returning-clients footnote), and add the client-v2 rows.

## 4. Acceptance tests (lead-owned: copy verbatim)

### `supabase/tests/acceptance/14_client_self_service.sql`
```sql
begin;
select plan(12);

insert into auth.users (id, email) values
  ('d0000000-0000-4000-8000-000000000041', 'client-41@example.test'),
  ('d0000000-0000-4000-8000-000000000042', 'client-42@example.test'),
  ('d0000000-0000-4000-8000-000000000043', 'newcomer@example.test');
insert into public.salons (id, slug, name, phone, is_published, timezone)
values ('a0000000-0000-4000-8000-000000000001', 'salon-a', 'Salon A', '+254700000099', true, 'Africa/Nairobi');
insert into public.staff (id, salon_id, display_name)
values ('b0000000-0000-4000-8000-000000000001', 'a0000000-0000-4000-8000-000000000001', 'Njeri');
insert into public.services (id, salon_id, name, duration_min, price_kes)
values ('c0000000-0000-4000-8000-000000000001', 'a0000000-0000-4000-8000-000000000001', 'Trim', 30, 1000);
insert into public.clients (id, salon_id, full_name, phone, email, user_id) values
  ('e0000000-0000-4000-8000-000000000041', 'a0000000-0000-4000-8000-000000000001', 'Wanjiru Otieno', '+254700000041',
   'client-41@example.test', 'd0000000-0000-4000-8000-000000000041'),
  ('e0000000-0000-4000-8000-000000000042', 'a0000000-0000-4000-8000-000000000001', 'Brian Kip', '+254700000042',
   'client-42@example.test', 'd0000000-0000-4000-8000-000000000042');
insert into public.bookings (id, salon_id, staff_id, client_id, status, period, total_kes, source) values
  ('f0000000-0000-4000-8000-000000000041', 'a0000000-0000-4000-8000-000000000001', 'b0000000-0000-4000-8000-000000000001',
   'e0000000-0000-4000-8000-000000000041', 'confirmed',
   tstzrange(now() + interval '7 days', now() + interval '7 days 30 minutes'), 1000, 'web'),
  ('f0000000-0000-4000-8000-000000000042', 'a0000000-0000-4000-8000-000000000001', 'b0000000-0000-4000-8000-000000000001',
   'e0000000-0000-4000-8000-000000000041', 'confirmed',
   tstzrange(now() + interval '1 hour', now() + interval '90 minutes'), 1000, 'web'),
  ('f0000000-0000-4000-8000-000000000043', 'a0000000-0000-4000-8000-000000000001', 'b0000000-0000-4000-8000-000000000001',
   'e0000000-0000-4000-8000-000000000041', 'completed',
   tstzrange(now() - interval '3 days', now() - interval '3 days' + interval '30 minutes'), 1000, 'web'),
  ('f0000000-0000-4000-8000-000000000044', 'a0000000-0000-4000-8000-000000000001', 'b0000000-0000-4000-8000-000000000001',
   'e0000000-0000-4000-8000-000000000041', 'cancelled',
   tstzrange(now() + interval '5 days', now() + interval '5 days 30 minutes'), 1000, 'web'),
  ('f0000000-0000-4000-8000-000000000045', 'a0000000-0000-4000-8000-000000000001', 'b0000000-0000-4000-8000-000000000001',
   'e0000000-0000-4000-8000-000000000042', 'confirmed',
   tstzrange(now() + interval '8 days', now() + interval '8 days 30 minutes'), 1000, 'web');

set local role authenticated;
set local request.jwt.claims = '{"sub":"d0000000-0000-4000-8000-000000000041","role":"authenticated"}';
select is(jsonb_array_length(public.get_my_bookings()), 4, 'a client sees all four of their bookings');
select is((select count(*)::int from jsonb_array_elements(public.get_my_bookings()) b
  where b ->> 'id' = 'f0000000-0000-4000-8000-000000000045'), 0, 'a client never sees someone else''s booking');
select lives_ok($$ select public.cancel_my_booking('f0000000-0000-4000-8000-000000000041', 'Change of plans') $$,
  'a client can cancel a booking more than 2 hours ahead');
select throws_ok($$ select public.cancel_my_booking('f0000000-0000-4000-8000-000000000042', null) $$,
  'BF422', null, 'a booking starting within 2 hours cannot be cancelled online');
select throws_ok($$ select public.cancel_my_booking('f0000000-0000-4000-8000-000000000043', null) $$,
  'BF422', null, 'a completed booking cannot be cancelled');
select is(public.get_my_client_profile('salon-a') ->> 'full_name', 'Wanjiru Otieno',
  'a returning client gets their saved name');
reset role;

select is((select status::text || '|' || cancel_reason from public.bookings where id = 'f0000000-0000-4000-8000-000000000041'),
  'cancelled|Change of plans', 'the booking is cancelled with its reason');
select is((select count(*)::int from public.booking_events
  where booking_id = 'f0000000-0000-4000-8000-000000000041' and type = 'status_changed' and data ->> 'by' = 'client'),
  1, 'the cancellation is recorded as done by the client');
select lives_ok($$ insert into public.bookings (salon_id, staff_id, status, period, total_kes, source)
  values ('a0000000-0000-4000-8000-000000000001', 'b0000000-0000-4000-8000-000000000001', 'confirmed',
          (select period from public.bookings where id = 'f0000000-0000-4000-8000-000000000041'), 1000, 'owner') $$,
  'the cancelled time can be booked again');

set local role authenticated;
set local request.jwt.claims = '{"sub":"d0000000-0000-4000-8000-000000000042","role":"authenticated"}';
select throws_ok($$ select public.cancel_my_booking('f0000000-0000-4000-8000-000000000042', null) $$,
  'BF404', null, 'nobody can cancel someone else''s booking');
reset role;

set local role authenticated;
set local request.jwt.claims = '{"sub":"d0000000-0000-4000-8000-000000000043","role":"authenticated"}';
select is(public.get_my_client_profile('salon-a') is null, true, 'a first-time client has no saved profile');
reset role;

set local role anon;
set local request.jwt.claims = '{"role":"anon"}';
select throws_ok($$ select public.get_my_bookings() $$, '42501', null, 'visitors cannot list bookings');
reset role;

select * from finish();
rollback;
```

### `packages/shared/src/area.acceptance.test.ts`
```ts
import { describe, expect, it } from "vitest";

import { areaLine } from "./index";

describe("areaLine", () => {
  it("prefers the address", () => {
    expect(areaLine("2nd floor, Galana Plaza, Kilimani, Nairobi", "Somewhere Else, Mombasa")).toBe("Kilimani, Nairobi");
  });
  it("falls back to the place name from the Maps link", () => {
    expect(areaLine(null, "Galito's Lusaka Road, Lusaka Road, Oil Libya, Nairobi")).toBe("Oil Libya, Nairobi");
    expect(areaLine("  ", "Westlands")).toBe("Westlands");
  });
  it("returns null when there is nothing to show", () => {
    expect(areaLine(null, null)).toBeNull();
  });
});
```

## Acceptance criteria
- [ ] All acceptance tests (SQL 01–14, all TS) pass unmodified; `pnpm check`, CI and the Vercel preview are green; types regenerated.
- [ ] Side-by-sides for `01`–`06` (mockup | live) in `design-ref/compare/client2-*`, plus the differences table in the PR (ADR 0009).
- [ ] Playwright: sign in → book → `/me` shows it → cancel → it moves to Past and the time is offered again. Also: a returning client confirms in one tap.
- [ ] Lighthouse mobile Accessibility ≥ 95 on `/me`.
- [ ] Don't merge.

## Out of scope
Notifying the salon about cancellations (notifications phase), owner-side views (Phase 4), rescheduling by the client.
