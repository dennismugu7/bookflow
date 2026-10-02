# Bookflow — instructions for Claude Code

Bookflow is a salon booking SaaS. Salon owners and their staff manage the salon in an Android app; clients book through a web link the salon shares on social media.

Roles on this project: **Lead** (Claude in Cowork) writes specs in `docs/specs/` and reviews code. **You (Claude Code)** build. **Dennis** (product owner) relays prompts from his phone over remote control and tests preview links and the app. Keep replies short: Dennis reads them on a phone.

## Stack
- Monorepo: pnpm workspaces + Turborepo
- `apps/web` — client booking web app: Next.js (App Router), TypeScript, Tailwind
- `apps/owner` — owner/staff app: Expo (React Native), expo-router, TypeScript, Android only
- `packages/shared` — Zod schemas, generated DB types, domain logic, formatting
- `supabase/` — migrations, SQL tests, seed, Edge Functions
- Backend: Supabase (Postgres + RLS, Auth, Storage, Edge Functions). Hosting: Vercel (web), EAS (app)
- Free tiers only. Never add a paid service or paid plan.

## Rules
1. **Follow the spec.** Each task has a spec in `docs/specs/`. If the spec is unclear or wrong, stop and ask — do not guess on domain rules.
2. **Tests first** for any logic (slots, holds, prices, permissions). UI work needs at least a smoke test.
3. **`pnpm check` must pass** (lint + typecheck + tests) before you report a task as done.
4. **Branch per task**: `feat/<short-name>` or `fix/<short-name>`. Open a PR with `gh pr create`. Do not merge to `main` — the lead approves merges.
5. **Commits**: Conventional Commits (`feat:`, `fix:`, `chore:`, `test:`, `docs:`).
6. **Secrets**: never read, print or commit `.env*` files or secret values. Add new keys to the matching `.env.example` and the env schema; Dennis sets real values in dashboards.
7. **The database enforces business rules** (RLS, constraints, exclusion constraints). Apps never trust the client for prices, availability or permissions.
8. Prefer small, boring, well-known libraries. Ask before adding a dependency that isn't in a spec.

## Domain conventions
- Money: integer amounts in KES (no decimals), column suffix `_kes`. Display as `KES 1,200`.
- Time: store `timestamptz` (UTC). Each salon has a `timezone` (default `Africa/Nairobi`); compute and display in the salon's zone.
- Phone numbers: E.164 (`+2547XXXXXXXX`).
- IDs: UUID v4.

## Report format (end of every task)
```
Status: done | blocked
Branch/PR: <link>
What changed: 3–5 bullets
Checks: pnpm check ✅/❌
Test this: <preview link or steps for Dennis>
Questions: <if any>
```
