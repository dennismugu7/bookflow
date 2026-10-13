# QA report 8663, part 2: reschedule a booking (S-01)

From the lead, 2026-10-13. Source: PrimeTestLab report Nº 8663, suggestion S-01: "Add a
Reschedule or Edit booking action so an owner can move an appointment without cancelling it and
creating a replacement."

**Don't start until Dennis says so**, and not before part 1 (`qa-8663-loading-and-preview.md`) is
merged. Branch `feat/reschedule-booking` from an up-to-date `main`. One PR. Add this spec to the PR.

## Rules (domain decisions; ask before changing any)

1. **Who:** salon owners only. Staff cannot move bookings (same as Cancel and New booking).
2. **Which bookings:** `confirmed` only. Completed, no-show, cancelled, held and expired bookings
   don't move.
3. **What changes:** the start time only. Same professional, same services, same price, same
   client. The length stays exactly what it was.
4. **New time:** must be in the future. May be outside opening hours, with the same
   "Outside opening hours" confirmation New booking uses.
5. **Double bookings:** impossible, by the existing `bookings_no_overlap` exclusion constraint.
   A cancelled booking or a lapsed hold in the new slot does not block the move.
6. **History:** every move adds a `booking_events` row of type `rescheduled`.
7. **Notifications:** none. The salon's own phones get no push (the owner did it), and Bookflow has
   no way to message a client yet. The client's **My bookings** page on the web shows the new time
   by itself. The app must tell the owner to let the client know (copy below).

## Database

One new migration, `supabase/migrations/<timestamp>_reschedule_booking.sql`. Never edit an
existing migration.

`public.reschedule_booking(p_booking_id uuid, p_starts_at timestamptz) returns void`, `plpgsql`,
`volatile`, `security definer`, `set search_path = ''`, written in the style of
`update_booking_status` and `owner_create_booking`:

| Step | Rule | Error |
| --- | --- | --- |
| 1 | `auth.uid()` is null | `42501` "Sign in to change bookings" |
| 2 | Lock the booking (`for update`) where the caller is a member of its salon; not found | `BF404` "Booking not found" |
| 3 | Caller is not an owner of that salon | `42501` "Only owners can move bookings" |
| 4 | Booking status is not `confirmed` | `BF422` "Only confirmed bookings can be moved" |
| 5 | `p_starts_at` is null, or `p_starts_at <= now()` | `BF400` "Pick a time in the future" |
| 6 | `p_starts_at` equals the current start | return; no update, no event |
| 7 | Mark lapsed holds for the same staff that overlap the new period as `expired` (as `owner_create_booking` does) | |
| 8 | Update `period` to `tstzrange(p_starts_at, p_starts_at + (upper(period) - lower(period)))`; on `exclusion_violation` | `BF409` "That time is taken" |
| 9 | Insert `booking_events (booking_id, actor_id, type, data)` with type `rescheduled` and data `{"from": <old start>, "to": <new start>}` | |

- `revoke execute … from public, anon; grant execute … to authenticated;`
- Don't touch `private.queue_booking_push` or its trigger (it fires on `status` only, which is
  what rule 7 wants).
- Run `pnpm db:types` and commit `packages/shared/src/database.types.ts` (CI fails on a diff).
- `bookings` is already in the realtime publication, so Today and Calendar refetch on their own.

## Owner app

**Logic first**, in `apps/owner/src/lib/reschedule.ts` (plain TypeScript, tests first):

- `canReschedule(booking: Pick<AgendaBooking, "status">, viewer: { isOwner: boolean }): boolean`:
  owner and `confirmed`.
- `rescheduleErrorMessage(error)`, using `bookingErrorKind` from `@bookflow/shared`:

  | Kind | Message |
  | --- | --- |
  | `slot_unavailable` | "That time is taken. Pick another." |
  | `invalid_input` | "Pick a time in the future." |
  | `invalid_status_change` | "This booking has already changed. Pull down to refresh." |
  | `not_found` | "This booking is no longer here. Pull down to refresh." |
  | `not_allowed` | "Only the salon owner can move a booking." |
  | anything else | "Couldn't move the booking. Check your connection and try again." |

**UI**

- **Opened booking card** (`ui/today/BookingCard.tsx`; used on Today, in the Calendar's
  `BookingSheet` and on the client profile): an outline **Reschedule** button, shown when
  `canReschedule`.
  - Before the booking starts (today: one full-width "Cancel booking"): one row,
    **Reschedule** on the left and **Cancel booking** on the right, equal widths, the existing
    `Outline` button style and height.
  - After it has started (today: No-show / Mark done / Cancel): keep that row as it is and put
    **Reschedule** on its own full-width outline row underneath.
- **Reschedule sheet** (a `BottomSheet`, `variant="handle"`, closes by dragging like the others):
  - title "Reschedule";
  - a grey line with the current time, as `whenLabel` writes it: "Sat 3 Oct · 12:00 – 13:15";
  - the day chips and time chips of New booking's "When" picker. Move `WhenPicker`'s chips out of
    `app/(app)/booking/new.tsx` into a shared component (for example `src/ui/WhenChips.tsx`) and
    use it in both places; New booking must look and behave exactly as before. Times already past
    today are not offered here;
  - under the chips, grey 13 px: "Let <first name> know the new time." (`firstName` from
    `lib/agenda.ts`; "Let the client know the new time." when there is no client);
  - buttons: "Go back" and a dark/primary **"Move booking"**, in the sheet-button style New
    booking uses. "Move booking" is disabled until the time differs from the current one and
    shows the busy state while saving;
  - outside opening hours: the same "Outside opening hours" sheet as New booking, with
    "Go back" and **"Move anyway"** (`withinOpeningHours` already exists);
  - an error shows inline in red inside the sheet, and the sheet stays open;
  - on success: close the sheet and the opened card, reload, and show the shared toast with
    **"Booking moved"**.
- Wire it through `useBookingActions` (a `reschedule(booking)` action and the sheet rendered by
  `sheets()`), so Today, Calendar and the client profile all get it from one place.
- Opening hours for the warning: load them the way New booking does; don't add a new RPC.

**Design (ADR 0009):** there is no design for this. Reuse the existing components exactly; this
spec is the layout. Add to "Approved deviations (owner app)" in `docs/design/screen-map.md`:

> Reschedule (QA 8663, Dennis 2026-10-13): the opened booking card has a Reschedule button and a
> Reschedule sheet built from New booking's When picker. No design.

## Tests

- Copy the SQL acceptance tests verbatim into `supabase/tests/acceptance/21_reschedule.sql`.
- Copy the TypeScript acceptance tests verbatim into
  `apps/owner/src/lib/reschedule.acceptance.test.ts`.
- **The lead wrote the SQL cases without a database to run them on.** If one fails for a reason
  that isn't your implementation (a typo, a fixture the schema rejects), stop and report the exact
  line and error. Don't change the test.
- Your own tests as usual (the shared When chips' time filtering, anything else in `src/lib`).

### Acceptance tests (SQL, pgTAP)

```sql
begin;
select plan(17);

create temp table d as select ((now() at time zone 'Africa/Nairobi')::date + 1) as day;
grant select on d to public;

insert into auth.users (id, email) values
  ('d0000000-0000-4000-8000-000000000001', 'owner@example.test'),
  ('d0000000-0000-4000-8000-000000000002', 'staff@example.test'),
  ('d0000000-0000-4000-8000-000000000004', 'outsider@example.test');
insert into public.salons (id, slug, name, is_published, timezone)
values ('a0000000-0000-4000-8000-000000000001', 'salon-a', 'Salon A', true, 'Africa/Nairobi');
insert into public.staff (id, salon_id, display_name) values
  ('b0000000-0000-4000-8000-000000000001', 'a0000000-0000-4000-8000-000000000001', 'Njeri'),
  ('b0000000-0000-4000-8000-000000000002', 'a0000000-0000-4000-8000-000000000001', 'Amina');
insert into public.salon_members (salon_id, user_id, role, staff_id) values
  ('a0000000-0000-4000-8000-000000000001', 'd0000000-0000-4000-8000-000000000001', 'owner', null),
  ('a0000000-0000-4000-8000-000000000001', 'd0000000-0000-4000-8000-000000000002', 'staff', 'b0000000-0000-4000-8000-000000000001');

-- Tomorrow in Nairobi. 1: Njeri 10:00–10:30. 2: Njeri 12:00–13:00. 3: Amina 10:00–10:30.
-- 4: Njeri 15:00–15:30, cancelled. 5: Njeri 14:00–14:30, a hold that lapsed a minute ago.
insert into public.bookings (id, salon_id, staff_id, status, period, total_kes, hold_expires_at) values
  ('f0000000-0000-4000-8000-000000000001', 'a0000000-0000-4000-8000-000000000001', 'b0000000-0000-4000-8000-000000000001', 'confirmed',
   tstzrange(((select day from d) + time '10:00') at time zone 'Africa/Nairobi',
             ((select day from d) + time '10:30') at time zone 'Africa/Nairobi'), 1000, null),
  ('f0000000-0000-4000-8000-000000000002', 'a0000000-0000-4000-8000-000000000001', 'b0000000-0000-4000-8000-000000000001', 'confirmed',
   tstzrange(((select day from d) + time '12:00') at time zone 'Africa/Nairobi',
             ((select day from d) + time '13:00') at time zone 'Africa/Nairobi'), 2000, null),
  ('f0000000-0000-4000-8000-000000000003', 'a0000000-0000-4000-8000-000000000001', 'b0000000-0000-4000-8000-000000000002', 'confirmed',
   tstzrange(((select day from d) + time '10:00') at time zone 'Africa/Nairobi',
             ((select day from d) + time '10:30') at time zone 'Africa/Nairobi'), 1000, null),
  ('f0000000-0000-4000-8000-000000000004', 'a0000000-0000-4000-8000-000000000001', 'b0000000-0000-4000-8000-000000000001', 'cancelled',
   tstzrange(((select day from d) + time '15:00') at time zone 'Africa/Nairobi',
             ((select day from d) + time '15:30') at time zone 'Africa/Nairobi'), 1000, null),
  ('f0000000-0000-4000-8000-000000000005', 'a0000000-0000-4000-8000-000000000001', 'b0000000-0000-4000-8000-000000000001', 'held',
   tstzrange(((select day from d) + time '14:00') at time zone 'Africa/Nairobi',
             ((select day from d) + time '14:30') at time zone 'Africa/Nairobi'), 1000, now() - interval '1 minute');

-- Staff member (Njeri)
set local role authenticated;
set local request.jwt.claims = '{"sub":"d0000000-0000-4000-8000-000000000002","role":"authenticated"}';
select throws_ok($$ select public.reschedule_booking('f0000000-0000-4000-8000-000000000001',
  ((select day from d) + time '11:00') at time zone 'Africa/Nairobi') $$,
  '42501', null, 'staff cannot move bookings, even their own');
reset role;

-- Outsider
set local role authenticated;
set local request.jwt.claims = '{"sub":"d0000000-0000-4000-8000-000000000004","role":"authenticated"}';
select throws_ok($$ select public.reschedule_booking('f0000000-0000-4000-8000-000000000001',
  ((select day from d) + time '11:00') at time zone 'Africa/Nairobi') $$,
  'BF404', null, 'outsiders cannot find the booking');
reset role;

-- Owner
set local role authenticated;
set local request.jwt.claims = '{"sub":"d0000000-0000-4000-8000-000000000001","role":"authenticated"}';
select lives_ok($$ select public.reschedule_booking('f0000000-0000-4000-8000-000000000001',
  ((select day from d) + time '11:00') at time zone 'Africa/Nairobi') $$,
  'an owner can move a confirmed booking');
select throws_ok($$ select public.reschedule_booking('f0000000-0000-4000-8000-000000000001',
  ((select day from d) + time '12:30') at time zone 'Africa/Nairobi') $$,
  'BF409', null, 'a booking cannot move onto another booking of the same professional');
select lives_ok($$ select public.reschedule_booking('f0000000-0000-4000-8000-000000000001',
  ((select day from d) + time '15:00') at time zone 'Africa/Nairobi') $$,
  'a cancelled booking does not block the new time');
select lives_ok($$ select public.reschedule_booking('f0000000-0000-4000-8000-000000000002',
  ((select day from d) + time '14:00') at time zone 'Africa/Nairobi') $$,
  'a lapsed hold does not block the new time');
select lives_ok($$ select public.reschedule_booking('f0000000-0000-4000-8000-000000000003',
  ((select day from d) + time '12:15') at time zone 'Africa/Nairobi') $$,
  'another professional''s bookings do not block');
select lives_ok($$ select public.reschedule_booking('f0000000-0000-4000-8000-000000000003',
  ((select day from d) + time '12:15') at time zone 'Africa/Nairobi') $$,
  'moving to the same time is accepted');
select throws_ok($$ select public.reschedule_booking('f0000000-0000-4000-8000-000000000004',
  ((select day from d) + time '16:00') at time zone 'Africa/Nairobi') $$,
  'BF422', null, 'only confirmed bookings move');
select throws_ok($$ select public.reschedule_booking('f0000000-0000-4000-8000-000000000001',
  now() - interval '1 hour') $$,
  'BF400', null, 'a booking cannot move into the past');
select throws_ok($$ select public.reschedule_booking('f0000000-0000-4000-8000-000000000001', null) $$,
  'BF400', null, 'a new time is required');
reset role;

select is((select period from public.bookings where id = 'f0000000-0000-4000-8000-000000000001'),
  tstzrange(((select day from d) + time '15:00') at time zone 'Africa/Nairobi',
            ((select day from d) + time '15:30') at time zone 'Africa/Nairobi'),
  'the 30-minute booking is still 30 minutes, at its new time');
select is((select period from public.bookings where id = 'f0000000-0000-4000-8000-000000000002'),
  tstzrange(((select day from d) + time '14:00') at time zone 'Africa/Nairobi',
            ((select day from d) + time '15:00') at time zone 'Africa/Nairobi'),
  'the 60-minute booking is still 60 minutes, at its new time');
select is((select status::text from public.bookings where id = 'f0000000-0000-4000-8000-000000000005'),
  'expired', 'the lapsed hold in the way is marked expired');
select is((select count(*)::int from public.booking_events
            where booking_id = 'f0000000-0000-4000-8000-000000000001' and type = 'rescheduled'
              and actor_id = 'd0000000-0000-4000-8000-000000000001'),
  2, 'each move is recorded with who made it');
select is((select count(*)::int from public.booking_events
            where booking_id = 'f0000000-0000-4000-8000-000000000003' and type = 'rescheduled'),
  1, 'moving to the same time records nothing');
select is((select count(*)::int from private.push_outbox), 0, 'moving a booking queues no push');

select * from finish();
rollback;
```

### Acceptance tests (TypeScript)

```ts
import { describe, expect, it } from "vitest";

import { canReschedule, rescheduleErrorMessage } from "./reschedule";

describe("canReschedule (QA report 8663, S-01)", () => {
  it("lets an owner move a confirmed booking", () => {
    expect(canReschedule({ status: "confirmed" }, { isOwner: true })).toBe(true);
  });

  it("does not let staff move bookings", () => {
    expect(canReschedule({ status: "confirmed" }, { isOwner: false })).toBe(false);
  });

  it("does not move bookings that are finished", () => {
    expect(canReschedule({ status: "completed" }, { isOwner: true })).toBe(false);
    expect(canReschedule({ status: "no_show" }, { isOwner: true })).toBe(false);
  });
});

describe("rescheduleErrorMessage", () => {
  it("names each failure", () => {
    expect(rescheduleErrorMessage({ code: "BF409" })).toBe("That time is taken. Pick another.");
    expect(rescheduleErrorMessage({ code: "BF400" })).toBe("Pick a time in the future.");
    expect(rescheduleErrorMessage({ code: "BF422" })).toBe(
      "This booking has already changed. Pull down to refresh.",
    );
    expect(rescheduleErrorMessage({ code: "BF404" })).toBe(
      "This booking is no longer here. Pull down to refresh.",
    );
    expect(rescheduleErrorMessage({ code: "42501" })).toBe(
      "Only the salon owner can move a booking.",
    );
  });

  it("falls back to a connection message", () => {
    const fallback = "Couldn't move the booking. Check your connection and try again.";
    expect(rescheduleErrorMessage({ code: "XX000" })).toBe(fallback);
    expect(rescheduleErrorMessage(null)).toBe(fallback);
    expect(rescheduleErrorMessage(undefined)).toBe(fallback);
  });
});
```

## Acceptance criteria

- [ ] `pnpm check`, `pnpm db:test` and CI green (both jobs). Acceptance tests in the PR unchanged.
- [ ] Generated types committed; no existing migration edited.
- [ ] On the debug APK or emulator, as an owner: move a booking from Today, from the Calendar
      sheet and from a client profile. It changes everywhere without a manual refresh; "Booking
      moved" shows; the client's My bookings page on the web shows the new time.
- [ ] Moving onto another booking of the same professional shows "That time is taken. Pick
      another." and nothing changes.
- [ ] A time outside opening hours asks first.
- [ ] Signed in as staff: no Reschedule button anywhere.
- [ ] New booking's When picker looks and behaves exactly as on `main` (side-by-side in the PR).
- [ ] PR has captures of the card (before start, after start) and the sheet at 390×844 with fake
      seed data, and the screen-map line.
- [ ] Don't merge.
