# Phase 1c — Client identity: Google sign-in or email code (ADR 0007)

**Goal:** a client confirms a hold after signing in with **Google** or a **6-digit email code**, then gives a phone number that is stored as **unverified**. No SMS. The existing phone-verified `confirm_booking` stays for a future "Verify with WhatsApp".

**Branch:** `feat/client-identity` → PR. Include `docs/adr/0007-client-identity.md` (add it to the ADR index), this spec, and the lead's journal update.

## 1. Schema changes (new migration)
- `clients.email text null`; `clients.phone_verified boolean not null default false`.
- Replace `unique (salon_id, phone)` with:
  - a partial unique index on `(salon_id, phone) where phone_verified`, and
  - a partial unique index on `(salon_id, user_id) where user_id is not null`.
  Unverified phones may repeat (two people can type the same number), but an unverified phone never attaches a booking to someone else's client record.
- Update `confirm_booking` (the verified-phone path) to work with the new indexes. If the user already has a client in this salon (by `user_id`), update that row's phone and set `phone_verified = true`. Otherwise upsert on the verified-phone index, setting `phone_verified = true`. The lead's `08_confirm.sql` must still pass unchanged.

## 2. New function `public.confirm_booking_contact(p_hold_token text, p_full_name text, p_phone text) returns uuid`
`security definer`, `set search_path = ''`. Execute: `authenticated` only (revoke from `public, anon`).
Checks, in this order:
1. `auth.uid()` null → `42501`.
2. The user must be **non-anonymous** with a **confirmed email** (`auth.users.email_confirmed_at is not null` and `coalesce(is_anonymous, false) = false`), else `BF401`.
3. Name trimmed, 1–80 chars, else `BF400`.
4. Phone normalisation: strip spaces, dashes and brackets. `0` + 9 digits → `+254` + those 9 digits; `254` + 9 digits → `+254…`; anything starting with `+` is kept. The result must match `^\+[1-9][0-9]{7,14}$`, else `BF400`.
5. Hold lookup exactly as in `confirm_booking`: none → `BF404`; expired → `BF410`.

Client record:
- If a client exists in this salon with `user_id = auth.uid()`, reuse it. Update `phone` only if that row is not `phone_verified`; never change `full_name`. Set `email` if null.
- Otherwise insert a new client (`full_name`, normalised phone, `email` from `auth.users`, `user_id`, `phone_verified = false`).

Then: booking → `confirmed`, `client_id` set, `hold_token_hash` cleared; event `confirmed` with `data = {"method": "contact"}`. Return the booking id.

## 3. Auth configuration as code
- In `supabase/config.toml`:
  - Email sign-in with a **6-digit OTP**: set the magic-link and sign-up email templates to show `{{ .Token }}` and keep the subject short, e.g. "Your Bookflow code". OTP expiry: 600 s.
  - **Google** provider enabled with `client_id = "env(SUPABASE_AUTH_EXTERNAL_GOOGLE_CLIENT_ID)"` and `secret = "env(SUPABASE_AUTH_EXTERNAL_GOOGLE_SECRET)"`.
  - Phone sign-in disabled.
  - Site URL `https://bookflow-web-pearl.vercel.app`; additional redirect URLs for `http://localhost:3000/**` and `https://*-dennismugu7-6048s-projects.vercel.app/**` (preview deployments).
- **Deploy auth config from CI.** In `db-deploy.yml`, add a job (triggered on pushes to `main` that touch `supabase/config.toml`, plus `workflow_dispatch`) that runs `supabase config push` with the two Google values from GitHub secrets. If those secrets are missing, skip the job with a notice rather than pushing an empty Google config. Check that `config push` won't overwrite settings we don't manage; if it would, report back before enabling it.
- Don't create the Google secrets. Dennis will add `SUPABASE_AUTH_EXTERNAL_GOOGLE_CLIENT_ID` and `SUPABASE_AUTH_EXTERNAL_GOOGLE_SECRET` to GitHub after the merge.

## 4. Shared code
- Export a `normalizeKenyanPhone(input: string): string | null` from `@bookflow/shared` with the same rules as the SQL, with unit tests that include the cases below. The web form uses it for instant feedback; the database stays the authority.
- Regenerate DB types.

## 5. Acceptance tests (lead-owned: copy verbatim)

### `supabase/tests/acceptance/10_contact_confirm.sql`
```sql
begin;
select plan(13);

insert into auth.users (id, email, email_confirmed_at, is_anonymous) values
  ('d0000000-0000-4000-8000-000000000021', 'achieng@example.test', now(), false),
  ('d0000000-0000-4000-8000-000000000022', 'unconfirmed@example.test', null, false),
  ('d0000000-0000-4000-8000-000000000023', null, null, true),
  ('d0000000-0000-4000-8000-000000000024', 'other@example.test', now(), false);

insert into public.salons (id, slug, name, is_published, timezone)
values ('a0000000-0000-4000-8000-000000000001', 'salon-a', 'Salon A', true, 'Africa/Nairobi');
insert into public.staff (id, salon_id, display_name)
values ('b0000000-0000-4000-8000-000000000001', 'a0000000-0000-4000-8000-000000000001', 'Njeri');

insert into public.bookings (id, salon_id, staff_id, status, period, hold_expires_at, hold_token_hash, total_kes, source)
select ('f0000000-0000-4000-8000-00000000000' || n)::uuid,
       'a0000000-0000-4000-8000-000000000001', 'b0000000-0000-4000-8000-000000000001', 'held',
       tstzrange(((current_date + 7) + time '09:00' + n * interval '1 hour') at time zone 'Africa/Nairobi',
                 ((current_date + 7) + time '09:30' + n * interval '1 hour') at time zone 'Africa/Nairobi'),
       now() + interval '10 minutes', encode(sha256(('contact-token-0000000' || n)::bytea), 'hex'), 1000, 'web'
  from generate_series(1, 5) as n;

-- Signed in with a confirmed email
set local role authenticated;
set local request.jwt.claims = '{"sub":"d0000000-0000-4000-8000-000000000021","role":"authenticated"}';
select lives_ok($$ select public.confirm_booking_contact('contact-token-00000001', 'Achieng Ouma', '0700 000 021') $$,
  'a client signed in with a confirmed email can confirm with a phone number');
reset role;

select is((select c.phone from public.clients c join public.bookings b on b.client_id = c.id
  where b.id = 'f0000000-0000-4000-8000-000000000001'), '+254700000021', 'a local Kenyan number is stored in E.164');
select is((select c.phone_verified from public.clients c join public.bookings b on b.client_id = c.id
  where b.id = 'f0000000-0000-4000-8000-000000000001'), false, 'the phone is marked unverified');
select is((select c.email from public.clients c join public.bookings b on b.client_id = c.id
  where b.id = 'f0000000-0000-4000-8000-000000000001'), 'achieng@example.test', 'the client''s email is recorded');
select is((select status::text from public.bookings where id = 'f0000000-0000-4000-8000-000000000001'),
  'confirmed', 'the booking is confirmed');

set local role authenticated;
set local request.jwt.claims = '{"sub":"d0000000-0000-4000-8000-000000000021","role":"authenticated"}';
select lives_ok($$ select public.confirm_booking_contact('contact-token-00000002', 'Achieng Ouma', '+254700000022') $$,
  'the same client can book again');
reset role;

select is((select count(*)::int from public.clients
  where salon_id = 'a0000000-0000-4000-8000-000000000001' and user_id = 'd0000000-0000-4000-8000-000000000021'),
  1, 'a returning client keeps one client record');

set local role authenticated;
set local request.jwt.claims = '{"sub":"d0000000-0000-4000-8000-000000000022","role":"authenticated"}';
select throws_ok($$ select public.confirm_booking_contact('contact-token-00000003', 'Unconfirmed', '0700000023') $$,
  'BF401', null, 'an unconfirmed email cannot confirm');
reset role;

set local role authenticated;
set local request.jwt.claims = '{"sub":"d0000000-0000-4000-8000-000000000023","role":"authenticated"}';
select throws_ok($$ select public.confirm_booking_contact('contact-token-00000003', 'Anonymous', '0700000023') $$,
  'BF401', null, 'an anonymous session cannot confirm');
reset role;

set local role authenticated;
set local request.jwt.claims = '{"sub":"d0000000-0000-4000-8000-000000000021","role":"authenticated"}';
select throws_ok($$ select public.confirm_booking_contact('contact-token-00000003', 'Achieng Ouma', '12345') $$,
  'BF400', null, 'an invalid phone number is rejected');
reset role;

set local role authenticated;
set local request.jwt.claims = '{"sub":"d0000000-0000-4000-8000-000000000024","role":"authenticated"}';
select lives_ok($$ select public.confirm_booking_contact('contact-token-00000004', 'Someone Else', '+254700000022') $$,
  'another person may enter a phone number already used by someone else');
reset role;

select is((select count(*)::int from public.clients
  where salon_id = 'a0000000-0000-4000-8000-000000000001' and phone = '+254700000022'),
  2, 'an unverified phone never merges two people into one client record');

set local role anon;
set local request.jwt.claims = '{"role":"anon"}';
select throws_ok($$ select public.confirm_booking_contact('contact-token-00000005', 'Anon', '0700000025') $$,
  '42501', null, 'anonymous visitors cannot confirm');
reset role;

select * from finish();
rollback;
```

### `normalizeKenyanPhone` cases (put in `packages/shared/src/phone.acceptance.test.ts`, verbatim)
```ts
import { describe, expect, it } from "vitest";

import { normalizeKenyanPhone } from "./phone";

describe("normalizeKenyanPhone", () => {
  it.each([
    ["0700 000 021", "+254700000021"],
    ["0110-000-021", "+254110000021"],
    ["254700000021", "+254700000021"],
    ["+254700000021", "+254700000021"],
    ["(0700) 000021", "+254700000021"],
  ])("normalises %s to %s", (input, expected) => {
    expect(normalizeKenyanPhone(input)).toBe(expected);
  });

  it.each(["12345", "", "07000", "phone", "+0700000021"])("rejects %s", (input) => {
    expect(normalizeKenyanPhone(input)).toBeNull();
  });
});
```

## Acceptance criteria
- [ ] Acceptance files 01–10 and the phone test pass unmodified; your own tests updated where the uniqueness change affects them.
- [ ] `pnpm check` and CI green; types regenerated.
- [ ] Report whether `supabase config push` is safe as configured (what it would change on the remote).
- [ ] After merge, the DB deploy applies the migration; report the run link.

## Out of scope
Login UI (Phase 3 web, Phase 2 owner app), custom SMTP for launch, WhatsApp verification, Turnstile.
