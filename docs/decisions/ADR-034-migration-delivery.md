# ADR-034 — Migration delivery, and Phase 3's budget position

**Status:** Accepted

## Context

ADR-022 makes migrations plain SQL run by the Supabase CLI. ADR-023 forbids production
credentials on a development machine and names staging as the environment used for debugging.
ADR-024 deploys staging on merge to `main` and production on a tag. **None of them says how a
migration reaches a hosted database, or which credential runs it.**

Migrations and production secrets are both Do-Not-Vibe surfaces, and this sits on both.

Separately, `docs/BUILD_LOG.md` §7 lists infrastructure Phase 3 needs that costs money, and no
document records whether a spend will be made.

Tracked as **K67** (how migrations reach staging and production) and **K68** (the budget
position).

## Decision

### Migration delivery

**Migrations are applied by CI, on merge to `main`, before the deploy step**, using a **scoped
credential held in GitHub Actions secrets**.

**Never from a development machine.** No developer applies a migration to any hosted
environment, staging included.

**Production, when it exists, gets a manual approval gate before its migration step.** The
deploy is triggered by a tag per ADR-024; the migration within it waits for a human.

### Budget

**Phase 3 runs on free tiers only.**

- **Fly.io** — free allowance.
- **Staging Supabase** — free tier, subject to the per-organisation project limit recorded in
  `docs/ENVIRONMENT.md` §4, which must be confirmed before the project is created.
- **Email** — Supabase's built-in SMTP, per ADR-027.

**The first real cost is the custom SMTP cutover**, triggered before real owners sign up
(ADR-027, ADR-023 amendment).

## Rationale

**On CI rather than a developer machine.** ADR-023's rule that no production credential touches
a development machine is only meaningful if nothing requires one to be there. If a human applies
migrations, the credential has to exist locally, and the rule becomes a convention someone
breaks the first time a deploy is urgent. Putting the credential in Actions secrets and the
command in the pipeline means the rule is enforced by there being no other path.

It also makes migration and deploy **ordered by construction**. Code that expects a column
cannot ship before the column exists, because the same job runs both, in that order.

**On migrating before deploying.** The alternative — deploy first, migrate second — means the
new code briefly runs against the old schema. For an additive migration either order survives;
for anything else the deploy-first ordering is a guaranteed window of errors. Migrate-first
inverts the constraint: **migrations must be backward-compatible with the currently-running
code**, which is a discipline worth having anyway and which this ordering enforces rather than
requests.

**On the manual gate for production and not for staging.** Staging exists to be broken; the
whole point of ADR-023's three environments is that staging absorbs the mistakes. Production
migrations are irreversible in a way deploys are not — a bad deploy rolls back, a bad migration
has already rewritten data. A human confirming the specific migration about to run is cheap
insurance against a tag pushed carelessly. It also gives the sole-contributor review protocol of
ADR-032 one more place to catch something.

**On free tiers.** Phase 3 proves the foundation works; it has no users, no data and no
availability requirement. Paying for capacity to prove a pipeline is spending money to learn
nothing. The trigger for the first real cost is tied to a real event — someone outside the
project receiving an email — rather than to a phase boundary, because that is when the free
tier's limits stop being acceptable rather than merely visible.

## Consequences

- **A scoped database credential now exists in GitHub Actions secrets**, and it is powerful:
  something that can run DDL against staging. It is a genuine widening of what a compromised
  Actions workflow could do, accepted because the alternative is that credential living on a
  laptop.
- **A migration cannot be applied out-of-band.** Fixing a broken staging schema means a commit
  and a merge, not a psql session. That is slower on purpose, and it will be irritating at least
  once.
- **The workflow does not do any of this yet.** ADR-024's amendment records that CI has no
  deploy job at all; this ADR says what it must do when PR 4 of ADR-032's sequence adds it.
- **Backward-compatible migrations become a requirement**, not a preference, and nothing checks
  it. It joins the reviewed-by-a-human list rather than the automated one.
- **The free-tier position has a hard dependency**: `docs/ENVIRONMENT.md` §4 records that one of
  the two free Supabase project slots is already taken by an unrelated project. If the allowance
  is two per organisation, staging fits and production later does not — and that becomes a spend
  decision at production time, not now.
- **Production's approval gate is specified before production exists.** It is written down now
  because the moment it is needed is the moment it is least likely to be added.

## Items resolved

**K67** (how migrations reach staging and production, and under which credential). It was `S`.
**K68** for Phase 3 (the budget position). It was `S`. Phase 3 is free-tier only; the residual
question of what is spent at the custom-SMTP cutover and at production moves to those slices.

## Items created

None.
