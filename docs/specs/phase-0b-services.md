# Phase 0b — Wire up Supabase, Vercel and Expo

**Goal:** the web app talks to Supabase in production; every push builds the right things; Dennis can install the owner app on his phone and receive instant updates.

**Branch:** `feat/services` → PR to `main`. Dennis merges after lead review.

**Known values (not secret):**
- Expo account/owner: `mugulabs`
- Expo project ID: `78a8a0b2-77d1-48fe-8c16-2299fb26526c` (slug `bookflow-owner`)
- Production web: `https://bookflow-web-pearl.vercel.app`
- Vercel already has `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` for all environments. GitHub has the repo secret `EXPO_TOKEN`.

## Build
1. **Include the lead's docs** in this PR: `docs/portfolio/`, `docs/adr/`, and this spec.
2. **Web ↔ Supabase**
   - Add `@supabase/supabase-js` and `@supabase/ssr` to `apps/web`.
   - `src/lib/supabase/server.ts` and `src/lib/supabase/client.ts`, both reading keys only through `getEnv()`.
   - Route handler `GET /api/health` (dynamic, never cached) returns JSON:
     `{ "status": "ok", "supabase": "ok" | "error", "commit": "<first 7 chars of VERCEL_GIT_COMMIT_SHA or 'local'>" }`.
     It checks Supabase with `GET ${URL}/auth/v1/health` using the `apikey` header and a 3-second timeout. HTTP 200 when Supabase is ok, 503 otherwise. Never include keys or error details from Supabase in the response.
   - Add Vitest to `apps/web` (wired into `pnpm check`).
3. **Vercel build skipping:** `apps/web/vercel.json` with `"ignoreCommand": "npx turbo-ignore"`, so owner-only changes don't trigger web builds.
4. **Expo / EAS** (`apps/owner`)
   - `npx expo install expo-updates expo-dev-client`.
   - `app.json`: add `"owner": "mugulabs"`, `"runtimeVersion": { "policy": "appVersion" }`, `"updates": { "url": "https://u.expo.dev/78a8a0b2-77d1-48fe-8c16-2299fb26526c" }`, and `"extra": { "eas": { "projectId": "78a8a0b2-77d1-48fe-8c16-2299fb26526c" } }`.
   - `eas.json`: `cli.appVersionSource: "remote"`; build profiles:
     - `development`: `developmentClient: true`, `distribution: "internal"`, `android.buildType: "apk"`, `channel: "development"`
     - `preview`: `distribution: "internal"`, `android.buildType: "apk"`, `channel: "preview"`
     - `production`: `android.buildType: "app-bundle"`, `channel: "production"`, `autoIncrement: true`
   - Home screen shows, under "Bookflow Owner" and `KES 400`, a small build-info line: channel (`Updates.channel` or "dev") and the first 8 characters of `Updates.updateId` (or "embedded"). This tells Dennis which update he is running.
5. **GitHub Actions for Expo** (use `expo/expo-github-action`, current major; pnpm setup as in `ci.yml`; `working-directory: apps/owner`; token from `secrets.EXPO_TOKEN`)
   - `.github/workflows/eas-build.yml`: manual (`workflow_dispatch`) with a `profile` choice (`development`, `preview`). Runs `eas build --platform android --profile <profile> --non-interactive --no-wait`.
   - `.github/workflows/eas-update.yml`:
     - on push to `main` touching `apps/owner/**` or `packages/shared/**`: `eas update --channel preview --message "<commit subject>" --non-interactive`
     - on pull requests touching the same paths: the action's `preview` sub-action with `eas update --auto --branch pr-<number>`, commenting a QR code on the PR (`permissions: pull-requests: write`). Skip when `EXPO_TOKEN` is unavailable (fork PRs).
   - Keep runs cheap: `concurrency` with cancel-in-progress, path filters as above.

## Acceptance tests (lead-owned — copy verbatim, do not edit)

`apps/web/src/env.acceptance.test.ts`
```ts
import { afterEach, describe, expect, it, vi } from "vitest";

describe("getEnv (web)", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.resetModules();
  });

  it("returns both values when they are set", async () => {
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "https://abc.supabase.co");
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY", "anon-key");
    const { getEnv } = await import("./env");
    expect(getEnv()).toEqual({
      NEXT_PUBLIC_SUPABASE_URL: "https://abc.supabase.co",
      NEXT_PUBLIC_SUPABASE_ANON_KEY: "anon-key",
    });
  });

  it("names every missing key", async () => {
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "");
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY", "");
    const { getEnv } = await import("./env");
    expect(() => getEnv()).toThrow(/NEXT_PUBLIC_SUPABASE_URL/);
    expect(() => getEnv()).toThrow(/NEXT_PUBLIC_SUPABASE_ANON_KEY/);
  });

  it("rejects a URL that is not a URL", async () => {
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "not-a-url");
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY", "anon-key");
    const { getEnv } = await import("./env");
    expect(() => getEnv()).toThrow(/NEXT_PUBLIC_SUPABASE_URL/);
  });
});
```

`apps/owner/src/env.acceptance.test.ts` — same three cases with `EXPO_PUBLIC_SUPABASE_URL` / `EXPO_PUBLIC_SUPABASE_ANON_KEY` and the describe title `getEnv (owner)`. Add Vitest to `apps/owner` if needed (node environment; these tests must not import React Native).

## Acceptance criteria
- [ ] `pnpm check` passes locally and in CI; the acceptance tests above pass unmodified.
- [ ] The PR's Vercel preview returns `{"status":"ok","supabase":"ok",...}` at `/api/health` (check with `curl` against the preview URL; if it is behind Vercel login, say so and the lead will verify after merge).
- [ ] `eas.json` validates (`npx eas-cli@latest build:inspect` is not required; a JSON schema check or `eas config` dry run is enough if no login is available locally).
- [ ] The PR shows the Expo preview comment, or the workflow log explains why it was skipped.
- [ ] No secrets in code; no `.env` files committed.

## Out of scope
Sentry, Resend, Turnstile, database migrations, auth. Don't run `eas build` — Dennis triggers the first build after merge.
