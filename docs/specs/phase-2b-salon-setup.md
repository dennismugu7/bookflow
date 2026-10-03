# Phase 2b — Owner app: set up the salon and go live

**Goal:** from the owner app, Dennis sets up a complete salon (brand, services, team, opening hours, location) and **publishes** it. A published salon is what the client web app (Phase 3) will show and take bookings for.

**Branch:** `feat/salon-setup` → PR. Include the lead's uncommitted docs and this spec.

**Designs:** original owner screens 44–59 (My brand, My services, Add a service, My team, Add a team member, Opening hours, Location) restyled with `docs/design/bookflow-design-system.png`. The "app access / invite" part of Add a team member is **not** in this phase (2c).

## 1. Database (new migration)

### Publishing is validated by the database
- `public.salon_setup_status(p_salon_id uuid) returns jsonb`: `{"services": bool, "team": bool, "hours": bool}`.
  - `services`: at least one bookable service.
  - `team`: at least one active staff member offering at least one bookable service.
  - `hours`: at least one `opening_hours` row.
  - Members only; others get `42501`. `security definer`, `stable`, `set search_path = ''`. Execute: `authenticated`.
- `public.set_salon_published(p_salon_id uuid, p_published boolean) returns void`. Owners only, else `42501`. Publishing requires all three status flags, else `BF422` with a message listing what's missing. Unpublishing is always allowed. Execute: `authenticated`.
- **Guard:** app roles (`anon`, `authenticated`) can't change `salons.is_published` directly. A trigger raises `BF403` ("Use set_salon_published"), so the owners-update policy can't bypass validation.

### Media storage
- Public bucket `salon-media` (create it in the migration). Paths: `<salon_id>/<kind>/<uuid>.jpg` with `kind` in `logo | banner | staff | portfolio`.
- `storage.objects` policies for that bucket: insert, update and delete only when the first folder equals a salon id where the caller is **owner**. Compare as text, so a malformed folder name never raises an error. Reads are public (bucket public).
- Columns `salons.logo_path`, `salons.banner_path` and `staff.photo_path` store the **object path**, not a full URL.

## 2. Shared code (`@bookflow/shared`)
- `parseGoogleMapsLink(url: string): { lat: number; lng: number } | null` handles `…/@-1.2921,36.8219,15z…` and `…?q=-1.2921,36.8219…` (also `query=` and `ll=`). Anything else, including short `maps.app.goo.gl` links, returns `null`. Latitude must be in −90…90 and longitude in −180…180.
- `mediaUrl(supabaseUrl: string, path: string): string` → `${supabaseUrl}/storage/v1/object/public/salon-media/${path}`.

## 3. Owner app
- **Account tab → Business profile** (per the original Account design): My brand · My services · My team · Opening hours · Location.
- **My brand:** name, tagline, about, logo and banner. Pick with `expo-image-picker`, then resize with `expo-image-manipulator` (logo max 512 px, banner max 1600 px wide, JPEG 0.8) and upload to the path above. Show the empty state from the design when nothing is set.
- **My services:** list and add/edit/delete per designs 47–49. Name; duration chips 15/20/30/45/60/90 plus Custom (multiple of 5, 5–600); price in KES (whole shillings); **Bookable by clients** toggle; a live "how it'll appear" preview card. Validate on the client too, but rely on DB constraints, mapping `23514` to friendly messages.
- **My team:** list and add/edit/deactivate. Name, title, about, photo, **services offered** (chips; must pick at least one to be bookable). An **"Add me as a team member"** shortcut creates a staff row for the owner and links it in `salon_members.staff_id` (most salons are one person). No invites yet.
- **Opening hours:** per weekday, one or more open–close ranges, or Closed (design 56–57). `24:00` allowed as a closing time.
- **Location:** address text plus an optional "Paste your Google Maps link" field; if `parseGoogleMapsLink` finds coordinates, save `latitude`/`longitude` and show "Pin found ✓"; otherwise save just the address and say "We couldn't read a pin from that link, the address will still show".
- **Today tab while unpublished:** a **"Get ready to take bookings"** checklist card with Services, Team and Opening hours (ticks from `salon_setup_status`), each row opening its screen, and a **Publish salon** button enabled only when all three are ticked. Once published: the existing share card, plus a small "Live" badge. **Account** gets an "Unpublish salon" action with a confirmation.
- Share link actions while unpublished: show "Publish your salon first so clients can book".
- **New native modules → bump the app version to 0.3.0** (same reason as 0.2.0) and say a new APK is needed.

## 4. Acceptance tests (lead-owned: copy verbatim)

### `supabase/tests/acceptance/11_publish_and_media.sql`
```sql
begin;
select plan(14);

insert into auth.users (id, email) values
  ('d0000000-0000-4000-8000-000000000001', 'owner-a@example.test'),
  ('d0000000-0000-4000-8000-000000000003', 'owner-b@example.test'),
  ('d0000000-0000-4000-8000-000000000004', 'outsider@example.test');
insert into public.salons (id, slug, name) values
  ('a0000000-0000-4000-8000-000000000001', 'salon-a', 'Salon A'),
  ('a0000000-0000-4000-8000-000000000002', 'salon-b', 'Salon B');
insert into public.salon_members (salon_id, user_id, role) values
  ('a0000000-0000-4000-8000-000000000001', 'd0000000-0000-4000-8000-000000000001', 'owner'),
  ('a0000000-0000-4000-8000-000000000002', 'd0000000-0000-4000-8000-000000000003', 'owner');

set local role authenticated;
set local request.jwt.claims = '{"sub":"d0000000-0000-4000-8000-000000000001","role":"authenticated"}';

select throws_ok($$ select public.set_salon_published('a0000000-0000-4000-8000-000000000001', true) $$,
  'BF422', null, 'an empty salon cannot be published');
select is(public.salon_setup_status('a0000000-0000-4000-8000-000000000001') ->> 'services', 'false',
  'setup status reports missing services');
select lives_ok($$ insert into public.services (id, salon_id, name, duration_min, price_kes)
  values ('c0000000-0000-4000-8000-000000000001', 'a0000000-0000-4000-8000-000000000001', 'Trim', 30, 1000) $$,
  'the owner adds a service');
select throws_ok($$ select public.set_salon_published('a0000000-0000-4000-8000-000000000001', true) $$,
  'BF422', null, 'a salon with services but no team or hours cannot be published');

insert into public.staff (id, salon_id, display_name)
values ('b0000000-0000-4000-8000-000000000001', 'a0000000-0000-4000-8000-000000000001', 'Njeri');
insert into public.staff_services (salon_id, staff_id, service_id)
values ('a0000000-0000-4000-8000-000000000001', 'b0000000-0000-4000-8000-000000000001', 'c0000000-0000-4000-8000-000000000001');
insert into public.opening_hours (salon_id, weekday, opens, closes)
values ('a0000000-0000-4000-8000-000000000001', 1, '10:00', '18:00');

select is(public.salon_setup_status('a0000000-0000-4000-8000-000000000001'),
  '{"services": true, "team": true, "hours": true}'::jsonb, 'setup status is complete');
select throws_ok($$ update public.salons set is_published = true where id = 'a0000000-0000-4000-8000-000000000001' $$,
  'BF403', null, 'publishing cannot bypass the checks with a direct update');
select lives_ok($$ select public.set_salon_published('a0000000-0000-4000-8000-000000000001', true) $$,
  'a complete salon can be published');
reset role;

select is((select is_published from public.salons where id = 'a0000000-0000-4000-8000-000000000001'),
  true, 'the salon is published');

set local role authenticated;
set local request.jwt.claims = '{"sub":"d0000000-0000-4000-8000-000000000004","role":"authenticated"}';
select throws_ok($$ select public.set_salon_published('a0000000-0000-4000-8000-000000000001', false) $$,
  '42501', null, 'only an owner can unpublish');
reset role;

set local role authenticated;
set local request.jwt.claims = '{"sub":"d0000000-0000-4000-8000-000000000001","role":"authenticated"}';
select lives_ok($$ select public.set_salon_published('a0000000-0000-4000-8000-000000000001', false) $$,
  'an owner can unpublish at any time');
select lives_ok($$ insert into storage.objects (bucket_id, name)
  values ('salon-media', 'a0000000-0000-4000-8000-000000000001/logo/logo-1.jpg') $$,
  'an owner can upload into their salon''s folder');
select throws_ok($$ insert into storage.objects (bucket_id, name)
  values ('salon-media', 'a0000000-0000-4000-8000-000000000002/logo/logo-1.jpg') $$,
  '42501', null, 'an owner cannot upload into another salon''s folder');
reset role;

select is((select is_published from public.salons where id = 'a0000000-0000-4000-8000-000000000001'),
  false, 'the salon is unpublished');

set local role authenticated;
set local request.jwt.claims = '{"sub":"d0000000-0000-4000-8000-000000000004","role":"authenticated"}';
select throws_ok($$ insert into storage.objects (bucket_id, name)
  values ('salon-media', 'a0000000-0000-4000-8000-000000000001/banner/banner-1.jpg') $$,
  '42501', null, 'an outsider cannot upload into a salon''s folder');
reset role;

select * from finish();
rollback;
```

### `packages/shared/src/maps.acceptance.test.ts`
```ts
import { describe, expect, it } from "vitest";

import { mediaUrl, parseGoogleMapsLink } from "./index";

describe("parseGoogleMapsLink", () => {
  it.each([
    ["https://www.google.com/maps/place/Kilimani/@-1.2921,36.7819,15z", { lat: -1.2921, lng: 36.7819 }],
    ["https://maps.google.com/?q=-1.2921,36.7819", { lat: -1.2921, lng: 36.7819 }],
    ["https://www.google.com/maps/search/?api=1&query=-1.30,36.80", { lat: -1.3, lng: 36.8 }],
    ["https://maps.google.com/maps?ll=-1.2921,36.7819&z=16", { lat: -1.2921, lng: 36.7819 }],
  ])("reads the pin from %s", (url, expected) => {
    expect(parseGoogleMapsLink(url)).toEqual(expected);
  });

  it.each([
    "https://maps.app.goo.gl/abc123",
    "Kilimani, Nairobi",
    "https://www.google.com/maps/@-95.0,36.0,15z",
    "",
  ])("returns null for %j", (url) => {
    expect(parseGoogleMapsLink(url)).toBeNull();
  });
});

describe("mediaUrl", () => {
  it("builds a public media URL", () => {
    expect(mediaUrl("https://abc.supabase.co", "salon-1/logo/x.jpg")).toBe(
      "https://abc.supabase.co/storage/v1/object/public/salon-media/salon-1/logo/x.jpg",
    );
  });
});
```

## Acceptance criteria
- [ ] Acceptance files 01–11 and both TS acceptance tests pass unmodified; your own tests for form validation and image-size logic.
- [ ] `pnpm check`, CI and `expo-doctor` green; DB types regenerated.
- [ ] Report: exact phone test steps, and confirmation that a new APK (0.3.0) is needed.
- [ ] After merge: the DB deploy applies the migration (bucket and policies included); report the link.

## Out of scope
Team invites and staff logins, staff hours and time off screens, portfolio, Google sign-in for owners (2c). Calendar and clients (Phase 4).
