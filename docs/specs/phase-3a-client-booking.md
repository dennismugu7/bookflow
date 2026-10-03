# Phase 3a — Client booking web app: from the shared link to a confirmed booking

**Goal:** a client opens `https://bookflow-web-pearl.vercel.app/s/<slug>` on their phone, sees the salon, picks services, a professional and a time, signs in with Google or an email code, enters name and phone, and gets a confirmed booking that appears in the database. This is the core value of Bookflow.

**Branch:** `feat/client-booking` → PR. Include the lead's uncommitted docs (this spec, `docs/adr/0008-server-only-holds.md`, `docs/portfolio/build-journal.md`, the revised `supabase/tests/acceptance/07_holds.sql`).

**Designs:** the original client booking screens (the same original UI set you used for the owner screens), restyled with `docs/design/bookflow-design-system.png`; the sign-in, code and details steps follow `docs/design/bookflow-client-signin.png`. Mobile first (360–430 px wide); on desktop, centre the content at most 560 px wide. Use Tailwind (already installed) with the design-system tokens as CSS variables. Plus Jakarta Sans via `next/font/google`.

## Decisions (lead)
- **Holds are created only by our server (ADR 0008).** `create_hold` stops being callable by `anon`/`authenticated`. A Next.js route handler verifies a **Cloudflare Turnstile** token, takes the client IP from Vercel's own headers, and calls the database with the **secret key**. This closes the spoofable `x-forwarded-for` rate limit found in Phase 1b.
- **The hold token never reaches JavaScript.** The route generates it and stores it in an `httpOnly`, `Secure`, `SameSite=Lax` cookie `bf_hold` (path `/`, max-age 600). Confirming reads it on the server.
- **No reviews or portfolio yet** (they don't exist in the database; Phase 5). **No payments:** clients pay at the salon; say so on the summary.
- **Client cancel and "my bookings" are Phase 3b.**

## 1. Database (new migration)

### `create_hold` becomes server-only
- Drop `public.create_hold(text, uuid[], timestamptz, uuid, text)` and create `public.create_hold(p_salon_slug text, p_service_ids uuid[], p_starts_at timestamptz, p_staff_id uuid, p_hold_token text, p_client_ip text)` with the same behaviour and return type, except that the rate limit uses `p_client_ip` (normalised with `host(p_client_ip::inet)`), not request headers. An invalid or empty IP raises `BF400`.
- `revoke execute … from public, anon, authenticated; grant execute … to service_role`.
- `release_hold` and `get_availability` keep their grants.
- Update your own tests (`supabase/tests/database/02_…`, `03_concurrent_holds.sql`) to the new signature. The lead has revised acceptance file **07** (below); copy it verbatim, replacing the old one.

### `public.get_my_booking(p_booking_id uuid) returns jsonb`
- For the signed-in client: returns the booking only when its `client_id` belongs to a `clients` row whose `user_id = auth.uid()`; otherwise (including unknown ids) `BF404`, so it never reveals whether a booking exists.
- Shape:
  ```json
  {"id": "…", "status": "confirmed", "starts_at": "…", "ends_at": "…", "total_kes": 1000,
   "staff_name": "Njeri",
   "salon": {"name": "…", "slug": "…", "address": "…", "maps_url": "…", "timezone": "Africa/Nairobi"},
   "services": [{"name": "Trim", "duration_min": 30, "price_kes": 1000}]}
  ```
  `services` are in booking order (`position`).
- `security definer`, `stable`, `set search_path = ''`. Execute: `authenticated` only.

### Auth redirect
- Add `https://bookflow-web-pearl.vercel.app/**` to `additional_redirect_urls` in `supabase/config.toml` (the auth-config workflow pushes it on merge). Keep the existing entries.

## 2. Web app (`apps/web`)

### Server-side configuration
- New server-only env (validated with zod in a module that imports `server-only`; that tiny package is the **only** new dependency allowed): `SUPABASE_SECRET_KEY`, `TURNSTILE_SECRET_KEY`. Public: `NEXT_PUBLIC_TURNSTILE_SITE_KEY`.
- If the Turnstile values are missing **outside production**, fall back to Cloudflare's always-pass test keys (site `1x00000000000000000000AA`, secret `1x0000000000000000000000000000000AA`). In production, missing values make the hold route return `503` with a clear log line. Never log the values.
- The secret-key Supabase client lives only in server code and is used only for `create_hold` and `release_hold`.

### Pure helpers in `apps/web/src/lib/holds.ts` (acceptance-tested)
- `clientIpFrom(headers: Headers): string | null`: use `x-real-ip`, else the first entry of `x-vercel-forwarded-for`. **Never** read `x-forwarded-for`. Trim; return `null` unless the value is a valid IPv4 or IPv6 address.
- `newHoldToken(): string`: 32 random bytes (`crypto.getRandomValues`) as base64url, matching `^[A-Za-z0-9_-]{20,128}$`.

### Routes
1. **`/s/[slug]` (server component):** the salon page for a **published** salon; otherwise a friendly 404 "This salon isn't taking bookings yet". Use `generateMetadata` (title, description from tagline, Open Graph image = banner) so the shared link previews nicely on WhatsApp.
   - Banner and logo (`mediaUrl`), name, tagline, about.
   - **Services:** name, duration, `formatKes` price, only bookable ones; each can be selected (more than one allowed). A sticky bottom bar shows the count, total duration and total price, plus **Choose a time**.
   - **Team:** active staff with photo, name and title.
   - **Opening hours:** Monday to Sunday, today highlighted, "Closed" for missing days.
   - **Location:** address; **Get directions** opens `maps_url` (else a Google Maps search for the address). A map preview iframe from `mapsEmbedUrl(query)` where `query` is, in order: `"lat,lng"` if saved, else the place name from `inspectMapsLink(maps_url)` resolved on the server (cache it for a day), else the address, else no map. `loading="lazy"`, a title for accessibility.
   - Revalidate the page every 60 s (`export const revalidate = 60`).
2. **`/s/[slug]/book` (client component):** steps with a back arrow and the summary bar.
   - **Professional:** "Any professional" (default) or one of the staff who offer **all** selected services; hide the step if only one person qualifies.
   - **Date and time:** a horizontal strip of the next 14 days (show "No times" days greyed), then time chips from `get_availability` via the browser Supabase client (anon). Times shown in the salon's timezone, 12-hour format ("10:30 am"). Loading skeletons; an empty state "No free times on this day".
   - The **Turnstile** widget (invisible/managed mode) loads from `https://challenges.cloudflare.com/turnstile/v0/api.js` with no npm package.
   - **Hold:** `POST /api/holds` → on success go to `/s/[slug]/confirm`.
3. **`POST /api/holds`** (route handler, Node runtime):
   - Body (zod): `{ slug, serviceIds: uuid[] (1–10), startsAt: ISO string, staffId: uuid | null, turnstileToken }`.
   - Verify Turnstile (`https://challenges.cloudflare.com/turnstile/v0/siteverify` with `remoteip`); failure → `403 {"code":"BOT_CHECK"}`.
   - IP from `clientIpFrom`; `null` → `400` in production, `127.0.0.1` locally.
   - `newHoldToken()`, call `create_hold` with the secret key, set the `bf_hold` cookie, return `{ holdId, staffId, expiresAt }`.
   - Map errors with the shared error-code map: `BF409` → `409` "That time was just taken. Pick another.", `BF429` → `429` "Too many tries. Wait a while and try again.", `BF404`/`BF400` → `400`. Never return database messages verbatim.
   - **`POST /api/holds/release`:** releases the cookie's hold (ignore `BF404`) and clears the cookie. Called when the client goes back to change the time.
4. **`/s/[slug]/confirm`:**
   - A summary card (services, professional, date, time, total, "Pay at the salon") and a **countdown** to `expiresAt` ("We're holding this time for 9:41"). At zero: "Your hold expired" with **Pick another time**.
   - **Not signed in:** the sign-in step per the design: **Continue with Google** (`signInWithOAuth`, `redirectTo` = `${origin}/auth/callback?next=/s/<slug>/confirm`) or **email → 6-digit code** (`signInWithOtp` with `shouldCreateUser: true`, then `verifyOtp` type `email`), with a resend countdown of 60 s and friendly errors.
   - **Signed in:** the details step: full name (prefilled from the Google profile or the last booking if known), phone (any Kenyan format; validate with `normalizeKenyanPhone` before submitting), the dashed "We'll use this to reach you about your booking" helper. **Confirm booking** → a **server action** that reads `bf_hold` and the user session (`@supabase/ssr`), calls `confirm_booking_contact`, clears the cookie and redirects to `/b/<bookingId>`. Map `BF410` → back to time picking with "Your hold expired", `BF400` → field errors, `BF401` → restart sign-in.
   - Keep the chosen services, staff and time in the URL query or `sessionStorage` (wrapped in try/catch) so a Google round-trip or a refresh doesn't lose them.
5. **`/auth/callback`:** route handler exchanging the PKCE code for a session with `@supabase/ssr`, then redirecting to `next` (only same-origin paths starting with `/`).
6. **`/b/[id]`:** the confirmation page from `get_my_booking`: a success mark, "You're booked", salon, date and time in the salon's timezone, professional, services, total, **Get directions**, and **Add to calendar** (a `.ics` download from `/b/[id]/ics`, built by a pure function you unit-test). Signed-out or someone else's booking → "Sign in to see this booking".
- Replace the placeholder `/` page with a simple landing line ("Bookflow: book your next salon visit") and no salon list.

### Quality
- Every input has a label; tap targets ≥ 44 px; colour contrast per the design system; `prefers-reduced-motion` respected.
- No secrets in client bundles: after a build, check that no file under `.next/static` mentions `SUPABASE_SECRET_KEY` or `TURNSTILE_SECRET_KEY`, and say in the report how you verified it.
- A Playwright smoke test against the local Supabase in CI is welcome if it fits; otherwise say what you tested by hand.

## 3. Acceptance tests (lead-owned: copy verbatim)

### `supabase/tests/acceptance/07_holds.sql` (revised; replaces the old file)
```sql
begin;
select plan(19);

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

-- Holds are created only by the server (ADR 0008).
set local role anon;
set local request.jwt.claims = '{"role":"anon"}';
select throws_ok($$ select * from public.create_hold('salon-a', array['c0000000-0000-4000-8000-000000000001']::uuid[],
  ((current_date + 7) + time '10:00') at time zone 'Africa/Nairobi',
  'b0000000-0000-4000-8000-000000000001', 'test-token-0000000009', '203.0.113.9') $$,
  '42501', null, 'visitors cannot create holds directly');
reset role;

set local role authenticated;
set local request.jwt.claims = '{"sub":"d0000000-0000-4000-8000-000000000001","role":"authenticated"}';
select throws_ok($$ select * from public.create_hold('salon-a', array['c0000000-0000-4000-8000-000000000001']::uuid[],
  ((current_date + 7) + time '10:00') at time zone 'Africa/Nairobi',
  'b0000000-0000-4000-8000-000000000001', 'test-token-0000000009', '203.0.113.9') $$,
  '42501', null, 'signed-in users cannot create holds directly');
reset role;

set local role service_role;
set local request.jwt.claims = '{"role":"service_role"}';

select lives_ok($$ select * from public.create_hold('salon-a', array['c0000000-0000-4000-8000-000000000001']::uuid[],
  ((current_date + 7) + time '10:00') at time zone 'Africa/Nairobi',
  'b0000000-0000-4000-8000-000000000001', 'test-token-0000000001', '203.0.113.9') $$,
  'the server can hold a free slot');

select throws_ok($$ select * from public.create_hold('salon-a', array['c0000000-0000-4000-8000-000000000001']::uuid[],
  ((current_date + 7) + time '10:00') at time zone 'Africa/Nairobi',
  'b0000000-0000-4000-8000-000000000001', 'test-token-0000000002', '203.0.113.9') $$,
  'BF409', null, 'a held slot cannot be held again');

select is((select h.staff_id from public.create_hold('salon-a', array['c0000000-0000-4000-8000-000000000001']::uuid[],
  ((current_date + 7) + time '10:00') at time zone 'Africa/Nairobi',
  null, 'test-token-0000000003', '203.0.113.9') as h),
  'b0000000-0000-4000-8000-000000000002'::uuid, 'any professional picks the next free staff member');

select throws_ok($$ select * from public.create_hold('salon-a', array['c0000000-0000-4000-8000-000000000001']::uuid[],
  ((current_date + 7) + time '09:00') at time zone 'Africa/Nairobi',
  'b0000000-0000-4000-8000-000000000001', 'test-token-0000000004', '203.0.113.9') $$,
  'BF409', null, 'a time outside working hours cannot be held');

select throws_ok($$ select * from public.create_hold('salon-a', array['c0000000-0000-4000-8000-000000000001']::uuid[],
  ((current_date + 7) + time '15:00') at time zone 'Africa/Nairobi',
  'b0000000-0000-4000-8000-000000000001', 'short', '203.0.113.9') $$,
  'BF400', null, 'a short hold token is rejected');

select throws_ok($$ select * from public.create_hold('salon-a', array['c0000000-0000-4000-8000-000000000001']::uuid[],
  ((current_date + 7) + time '15:00') at time zone 'Africa/Nairobi',
  'b0000000-0000-4000-8000-000000000001', 'test-token-0000000005', 'not-an-ip') $$,
  'BF400', null, 'an invalid client address is rejected');

select lives_ok($$ select * from public.create_hold('salon-a', array['c0000000-0000-4000-8000-000000000001']::uuid[],
  ((current_date + 7) + time '14:00') at time zone 'Africa/Nairobi',
  'b0000000-0000-4000-8000-000000000001', 'test-token-0000000001', '203.0.113.9') $$,
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

set local role service_role;
set local request.jwt.claims = '{"role":"service_role"}';

select is((select count(*)::int
  from generate_series(0, 9) as i,
  lateral public.create_hold('salon-a', array['c0000000-0000-4000-8000-000000000001']::uuid[],
    (((current_date + 8) + time '10:00') at time zone 'Africa/Nairobi') + i * interval '30 minutes',
    'b0000000-0000-4000-8000-000000000001', 'rate-limit-token-00000' || lpad(i::text, 2, '0'), '198.51.100.7')),
  10, 'ten holds from one address within an hour are allowed');

select throws_ok($$ select * from public.create_hold('salon-a', array['c0000000-0000-4000-8000-000000000001']::uuid[],
  ((current_date + 8) + time '16:00') at time zone 'Africa/Nairobi',
  'b0000000-0000-4000-8000-000000000001', 'rate-limit-token-0000099', '198.51.100.7') $$,
  'BF429', null, 'the eleventh hold from one address within an hour is refused');

select lives_ok($$ select * from public.create_hold('salon-a', array['c0000000-0000-4000-8000-000000000001']::uuid[],
  ((current_date + 8) + time '16:00') at time zone 'Africa/Nairobi',
  'b0000000-0000-4000-8000-000000000001', 'rate-limit-token-0000100', '198.51.100.8') $$,
  'another address is limited separately');

reset role;
select * from finish();
rollback;
```

### `supabase/tests/acceptance/13_client_booking.sql`
```sql
begin;
select plan(8);

insert into auth.users (id, email) values
  ('d0000000-0000-4000-8000-000000000031', 'client-c@example.test'),
  ('d0000000-0000-4000-8000-000000000032', 'stranger@example.test');
insert into public.salons (id, slug, name, address, is_published, timezone)
values ('a0000000-0000-4000-8000-000000000001', 'salon-a', 'Salon A', 'Galana Plaza, Kilimani', true, 'Africa/Nairobi');
insert into public.staff (id, salon_id, display_name)
values ('b0000000-0000-4000-8000-000000000001', 'a0000000-0000-4000-8000-000000000001', 'Njeri');
insert into public.services (id, salon_id, name, duration_min, price_kes)
values ('c0000000-0000-4000-8000-000000000001', 'a0000000-0000-4000-8000-000000000001', 'Trim', 30, 1000);
insert into public.clients (id, salon_id, full_name, phone, email, user_id)
values ('e0000000-0000-4000-8000-000000000031', 'a0000000-0000-4000-8000-000000000001', 'Wanjiru Otieno',
        '+254700000031', 'client-c@example.test', 'd0000000-0000-4000-8000-000000000031');
insert into public.bookings (id, salon_id, staff_id, client_id, status, period, total_kes, source)
values ('f0000000-0000-4000-8000-000000000031', 'a0000000-0000-4000-8000-000000000001',
        'b0000000-0000-4000-8000-000000000001', 'e0000000-0000-4000-8000-000000000031', 'confirmed',
        tstzrange(((current_date + 7) + time '10:00') at time zone 'Africa/Nairobi',
                  ((current_date + 7) + time '10:30') at time zone 'Africa/Nairobi'), 1000, 'web');
insert into public.booking_services (booking_id, service_id, name, duration_min, price_kes, position)
values ('f0000000-0000-4000-8000-000000000031', 'c0000000-0000-4000-8000-000000000001', 'Trim', 30, 1000, 0);

set local role authenticated;
set local request.jwt.claims = '{"sub":"d0000000-0000-4000-8000-000000000031","role":"authenticated"}';
select is(public.get_my_booking('f0000000-0000-4000-8000-000000000031') ->> 'status', 'confirmed',
  'a client can read their own booking');
select is((public.get_my_booking('f0000000-0000-4000-8000-000000000031') ->> 'total_kes')::int, 1000,
  'the booking shows its total');
select is(public.get_my_booking('f0000000-0000-4000-8000-000000000031') -> 'salon' ->> 'slug', 'salon-a',
  'the booking shows its salon');
select is(public.get_my_booking('f0000000-0000-4000-8000-000000000031') ->> 'staff_name', 'Njeri',
  'the booking shows the professional');
select is(jsonb_array_length(public.get_my_booking('f0000000-0000-4000-8000-000000000031') -> 'services'), 1,
  'the booking lists its services');
select throws_ok($$ select public.get_my_booking('f0000000-0000-4000-8000-000000000099') $$,
  'BF404', null, 'an unknown booking is not found');
reset role;

set local role authenticated;
set local request.jwt.claims = '{"sub":"d0000000-0000-4000-8000-000000000032","role":"authenticated"}';
select throws_ok($$ select public.get_my_booking('f0000000-0000-4000-8000-000000000031') $$,
  'BF404', null, 'someone else''s booking looks like it does not exist');
reset role;

set local role anon;
set local request.jwt.claims = '{"role":"anon"}';
select throws_ok($$ select public.get_my_booking('f0000000-0000-4000-8000-000000000031') $$,
  '42501', null, 'visitors cannot read bookings');
reset role;

select * from finish();
rollback;
```

### `apps/web/src/lib/holds.acceptance.test.ts`
```ts
import { describe, expect, it } from "vitest";

import { clientIpFrom, newHoldToken } from "./holds";

describe("clientIpFrom", () => {
  it("uses the address Vercel reports", () => {
    expect(clientIpFrom(new Headers({ "x-real-ip": "203.0.113.9" }))).toBe("203.0.113.9");
    expect(clientIpFrom(new Headers({ "x-vercel-forwarded-for": "198.51.100.7, 10.0.0.1" }))).toBe("198.51.100.7");
    expect(clientIpFrom(new Headers({ "x-real-ip": "2001:db8::1" }))).toBe("2001:db8::1");
  });

  it("never trusts the visitor's own x-forwarded-for header", () => {
    expect(clientIpFrom(new Headers({ "x-forwarded-for": "203.0.113.9" }))).toBeNull();
  });

  it("rejects values that are not addresses", () => {
    expect(clientIpFrom(new Headers({ "x-real-ip": "not-an-ip" }))).toBeNull();
    expect(clientIpFrom(new Headers())).toBeNull();
  });
});

describe("newHoldToken", () => {
  it("creates unguessable tokens the database accepts", () => {
    const a = newHoldToken();
    const b = newHoldToken();
    expect(a).toMatch(/^[A-Za-z0-9_-]{20,128}$/);
    expect(a.length).toBeGreaterThanOrEqual(43);
    expect(a).not.toBe(b);
  });
});
```

## Acceptance criteria
- [ ] All acceptance tests (SQL 01–13 with the revised 07, all TS) pass unmodified; your own tests for the error mapping, time formatting in the salon's timezone, the `.ics` builder and the `next` redirect check; `pnpm check` and CI green; DB types regenerated.
- [ ] The PR's Vercel preview builds. In the report, list the **exact values Dennis must add to Vercel** (names, which environments, Sensitive or not) and **where to get each one**, without the values themselves. Don't block the PR on them: preview works with the Turnstile test keys, but holds need `SUPABASE_SECRET_KEY`.
- [ ] After merge: the DB deploy and the auth-config workflow succeed; production `/api/health` is still `ok`. Report the links.
- [ ] Report the phone test steps for the full flow on the production URL with Dennis's own salon: open the link, book with **email code**, then book a second time with **Google**, and see both bookings in the database (Supabase table editor) with the phone marked unverified.

## Out of scope
Client cancel and "my bookings" (3b); reviews and portfolio (Phase 5); notifications to the owner (Phase 4/5); the owner's calendar showing the booking (Phase 4); WhatsApp verification.
