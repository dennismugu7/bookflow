# Phase 0a — Monorepo scaffold (no external accounts)

**Goal:** a clean, checked monorepo that both apps and all later phases build on. Nothing here needs Supabase, Vercel, Expo or Sentry accounts — those are Phase 0b.

**Branch:** `feat/scaffold` → PR to `main` (do not merge).

## Build
1. **Workspace**
   - pnpm workspaces + Turborepo. Root `package.json` scripts: `dev:web`, `dev:owner`, `lint`, `typecheck`, `test`, `build`, and `check` (= lint + typecheck + test, via turbo).
   - `.npmrc` with `node-linker=hoisted` (React Native/Expo compatibility in a pnpm monorepo).
   - `.nvmrc` / `engines` pinned to the installed Node major; `packageManager` field set to the installed pnpm.
   - Shared configs in `packages/config`: base `tsconfig` (strict, `noUncheckedIndexedAccess`), ESLint (flat config), Prettier.
2. **`apps/web`** — Next.js, current stable, App Router, TypeScript strict, Tailwind.
   - One placeholder page at `/` showing "Bookflow" and a placeholder salon route `/s/[slug]` that renders the slug.
   - Playwright set up with one smoke test that loads `/` and `/s/demo-salon`.
3. **`apps/owner`** — Expo, current stable SDK, expo-router, TypeScript strict, Android only (`platforms: ["android"]`).
   - One placeholder screen showing "Bookflow Owner".
   - App id / package: `com.mugulabs.bookflow` (placeholder; confirm with lead before first store build).
4. **`packages/shared`** — TypeScript library consumed by both apps.
   - Vitest set up. Add `formatKes(amount: number): string` → `"KES 1,200"` with tests (0, 400, 1200, 1000000; reject negatives and non-integers).
   - Import and render `formatKes(400)` in both placeholder screens to prove the package wiring works.
5. **`supabase/`** — run `npx supabase init` only (no login, no link). Commit the generated config.
6. **Env handling**
   - Each app has a Zod env schema (`apps/web/src/env.ts`, `apps/owner/src/env.ts`) that fails fast with a clear message naming the missing key.
   - `.env.example` in each app listing keys with empty values: web → `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`; owner → `EXPO_PUBLIC_SUPABASE_URL`, `EXPO_PUBLIC_SUPABASE_ANON_KEY`. Placeholders must not crash `pnpm check` (schema validation runs at app start, not in unit tests).
7. **CI** — `.github/workflows/ci.yml` on pull requests and pushes to `main`: pnpm install with cache → `pnpm check` → `pnpm --filter web build`. Use `concurrency` to cancel superseded runs (saves free minutes). Playwright is **not** in CI yet.
8. **Docs** — root `README.md`: what Bookflow is (2 lines), repo layout, commands. Keep it short; the portfolio README comes later.

## Acceptance criteria
- [ ] `pnpm install` then `pnpm check` passes from a clean clone.
- [ ] `pnpm dev:web` serves `/` and `/s/demo-salon`, both showing `KES 400`.
- [ ] `pnpm dev:owner` starts Metro without errors (Dennis can't test this yet — that's fine).
- [ ] Playwright smoke test passes locally.
- [ ] CI is green on the PR.
- [ ] No `.env` files committed; `.env.example` files present.

## Out of scope
Supabase project, auth, database schema, Vercel/EAS/Sentry setup, any real UI. Don't add libraries beyond what's listed without asking.
