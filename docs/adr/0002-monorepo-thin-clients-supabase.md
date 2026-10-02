# 0002 — Monorepo, thin clients, business rules in Postgres

**Status:** Accepted · 2026-10-02

## Context
Two apps (owner and client) work on the same bookings. The worst failure for a booking product is a double booking or one salon seeing another's data.

## Decision
- One pnpm + Turborepo monorepo: `apps/web` (Next.js), `apps/owner` (Expo), `packages/shared`, `supabase/`.
- Supabase backend. **Postgres enforces the rules:** row-level security per salon and role, an exclusion constraint against overlapping bookings per staff member, and server-side functions for holds and payments.
- App types are generated from the database schema and shared by both apps.

## Consequences
- A bug in either app can't create a double booking or leak data across salons.
- Database tests (pgTAP) carry most of the correctness burden, so they run in CI against a fresh local Supabase.
