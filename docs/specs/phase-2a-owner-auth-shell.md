# Phase 2a — Owner app: sign-in, app shell, create your salon, share link

**Goal:** on his phone, Dennis signs in to the owner app with an email code, creates his salon and shares its booking link. Everything later in Phase 2 builds on this shell.

**Branch:** `feat/owner-shell` → PR. Include the lead's uncommitted files (`docs/design/*.png`, `docs/portfolio/*`, `docs/adr/0007-client-identity.md`) and this spec.

**Designs:** `docs/design/bookflow-design-system.png` (tokens and components) and the original UI set for the screen layouts. Where they differ, the design-system PNG wins.

## Decisions (lead)
- **Owners and staff sign in with a 6-digit email code. No passwords.** This replaces the password, reset-password and 8-digit-code screens in the original designs. It means fewer screens and nothing to leak or reset, and it uses the same email sender clients already use. Google sign-in for owners comes later (Phase 2c), because native Google sign-in needs extra Android setup.
- The code email currently says "confirm your booking". Make its wording generic: **"Enter this code to sign in to Bookflow:"**. Both templates live in `supabase/templates/`, and the auth-config workflow redeploys them on merge.
- **Booking link format:** `https://bookflow-web-pearl.vercel.app/s/<slug>`. The base URL is a single constant in `@bookflow/shared` (`WEB_BASE_URL`).

## 1. Shared code (`@bookflow/shared`)
- `toSalonSlug(name: string): string | null`: lower-case; strip accents; drop apostrophes; every other run of non-alphanumeric characters becomes one `-`; trim `-` from both ends; cut to 40 characters without a trailing `-`; return `null` if the result is shorter than 3. The output must satisfy the DB check `^[a-z0-9]+(-[a-z0-9]+)*$`.
- `bookingLink(slug: string): string`.
- `WEB_BASE_URL` constant.

## 2. Owner app (`apps/owner`)
- **Theme:** `src/theme.ts` holding the design-system tokens (colours, type scale, radius 12, spacing on a 4 px grid). Load **Plus Jakarta Sans** with `expo-font` / `@expo-google-fonts/plus-jakarta-sans`.
- **Base components** in `src/ui/`: `Button` (primary black, secondary outline, brand, danger), `TextField` (label, error, 52 px), `Badge` (status variants from the design system), `Card`, `Screen` (safe-area wrapper), `CodeInput` (6 boxes, paste-friendly, numeric keypad, auto-submit when complete). Every touch target ≥ 44 px; every input and icon button has an accessibility label.
- **Supabase client:** `@supabase/supabase-js` with the session persisted in `expo-secure-store` (chunk values over 2 KB, which SecureStore can't hold in one item), `autoRefreshToken`, and refresh paused/resumed on `AppState` changes.
- **Auth flow (expo-router groups):**
  - `(auth)/sign-in`: email field → `signInWithOtp({ email, options: { shouldCreateUser: true } })`; friendly errors (invalid email, rate limit "Wait a minute before asking for another code").
  - `(auth)/code`: `CodeInput` → `verifyOtp({ email, token, type: 'email' })`; "Resend code" with a 60 s countdown; "Use a different email".
  - Signed-in users never see `(auth)`; signed-out users never see the app. Gate this in the root layout.
- **Onboarding:** after sign-in, query `salon_members` for the user (RLS already limits it to their own rows).
  - **No salon:** `(onboarding)/create-salon` with fields Salon name, plus Booking link shown live as `bookflow-web-pearl.vercel.app/s/<slug>` with the slug editable. Call `create_salon`. Map `23505` to "That link is taken, try another" and `23514` to "Use letters, numbers and hyphens".
  - **Has a salon:** go to tabs.
- **Tabs** (`(app)/(tabs)`): **Today, Calendar, Clients, Account**, with icons as in the original designs.
  - Today shows the original "No bookings yet" empty state with a **Share your booking link** button, which opens the native share sheet with `bookingLink(slug)`, and a **Copy link** action.
  - Calendar and Clients are placeholders ("Coming soon").
  - Account shows the signed-in email, salon name and a **Log out** button with a confirmation, per the original design.
- **Config:** read `EXPO_PUBLIC_SUPABASE_URL` and `EXPO_PUBLIC_SUPABASE_ANON_KEY` through the existing `getEnv()`. Builds and updates get them from **EAS environment variables**. Add a manual workflow `eas-env-sync.yml` that writes both into the EAS `preview` and `development` environments (`eas env:create … --visibility plaintext --force --non-interactive`) from GitHub **repository variables** `SUPABASE_URL` and `SUPABASE_ANON_KEY` (variables, not secrets: these are public client values). Update `eas-build.yml` and `eas-update.yml` to pass `--environment preview` (or the profile's environment). If either variable is missing, fail with a clear message. Dennis will add the variables.
- **New native modules** (secure-store, fonts) mean a new APK is needed. Say so in the report.

## 3. Acceptance tests (lead-owned: copy verbatim)

`packages/shared/src/slug.acceptance.test.ts`
```ts
import { describe, expect, it } from "vitest";

import { WEB_BASE_URL, bookingLink, toSalonSlug } from "./index";

describe("toSalonSlug", () => {
  it.each([
    ["Salome Salon", "salome-salon"],
    ["Njeri's Beauty & Spa", "njeris-beauty-spa"],
    ["  Glow   Studio!! ", "glow-studio"],
    ["Café Crème", "cafe-creme"],
    ["Kinyozi 254", "kinyozi-254"],
  ])("turns %s into %s", (name, slug) => {
    expect(toSalonSlug(name)).toBe(slug);
  });

  it.each(["", "AB", "!!", "  -  "])("returns null for %j", (name) => {
    expect(toSalonSlug(name)).toBeNull();
  });

  it("keeps long names within 40 characters without a trailing hyphen", () => {
    const slug = toSalonSlug("The Very Long Name Of A Beautiful Salon In Kilimani Nairobi");
    expect(slug).not.toBeNull();
    expect(slug!.length).toBeLessThanOrEqual(40);
    expect(slug).toMatch(/^[a-z0-9]+(-[a-z0-9]+)*$/);
  });
});

describe("bookingLink", () => {
  it("builds the public booking link", () => {
    expect(WEB_BASE_URL).toBe("https://bookflow-web-pearl.vercel.app");
    expect(bookingLink("salome-salon")).toBe("https://bookflow-web-pearl.vercel.app/s/salome-salon");
  });
});
```

## Acceptance criteria
- [ ] The acceptance test passes unmodified; `pnpm check` and CI green; add your own unit tests for pure logic (auth error mapping, chunked storage).
- [ ] `expo-doctor` passes.
- [ ] The report lists the exact manual test steps for Dennis on the phone, and states that a new preview APK is required.
- [ ] No secrets committed. The two Supabase values arrive only through the EAS env sync.

## Out of scope
Services, team, hours, brand, location, portfolio (Phase 2b); Google sign-in for owners (2c); the calendar and clients screens (Phase 4).
