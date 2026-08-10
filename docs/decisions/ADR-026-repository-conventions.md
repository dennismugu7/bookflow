# ADR-026 — Repository conventions

**Status:** Accepted

## Context

The project manual's Phase 2 asks for a branching convention, a commit convention, a
feature-flag decision and seed-data tooling, "so nobody has to decide this per-feature." None
of the four existed. Current practice — direct commits to `master` with a specific trailer —
was observable in `git log` and written down nowhere.

The default branch is still `master`, which is the name Git created rather than a name anyone
chose.

## Decision

**Rename the default branch from `master` to `main`.**

**Trunk-based development:** short-lived `feat/`, `fix/` and `chore/` branches, **squash-merged
to `main`**, branch deleted after. **Conventional commit messages.**

**No feature-flag system in v1.** This is a **deliberate deferral, not an oversight** — a solo
pre-launch project has no staged rollouts to gate. **Revisit before the first production
release**, which is when the manual's rationale starts to apply.

**Seed data:** `supabase/seed.sql` plus an `npm run seed` script, provisioning **one demo salon
with services, team members, opening hours, and bookings in every status**. A fresh clone must
reach a working local state in **one command**, per Phase 2 of the project manual.

## Consequences

- The rename is a one-time operation with follow-on work: the remote default, any branch
  protection, and ADR-024's deploy-on-merge-to-`main` trigger all reference it. It has not
  been executed yet and belongs in Phase 2.
- Squash-merging means `main`'s history is one commit per slice, which matches how
  `DEFINITION_OF_DONE.md` defines completion — a slice is the unit that is done or not done.
- Deferring feature flags has a named trigger rather than an open end. The manual's argument
  is about merging incomplete work safely and rolling out gradually; neither applies before
  there are users, and both apply immediately after.
- Seeding "bookings in every status" is deliberate: `Booked`, `Confirmed`, `Cancelled` and
  `expired` (ADR-007) each render differently in the Bookings tab and the calendar, and an
  empty or single-status local database hides exactly the states most likely to be wrong.
- The seed must satisfy the ADR-007 exclusion constraint, so it cannot be careless about
  overlapping times — which makes it a small ongoing test of the constraint itself.
- One-command setup is checkable: a fresh clone either reaches a working state or it does not.

## Items resolved

None in the triage. Settles the repository conventions the project manual's Phase 2 requires.

## Items created

K58 — whether a feature-flag system is needed, to be answered before the first production
release. Classified D, with a named trigger rather than an open end.
