# Bookflow

> **This file is not self-sufficient.** It states rules; it does not carry state, reasoning,
> or the open-questions list. Read it together with:
>
> | File | Supplies |
> |---|---|
> | `docs/BUILD_LOG.md` | Where the project stands — phases complete, what exists, what is next, how work proceeds |
> | `docs/decisions/` | Why every rule below is the rule — 26 ADRs, cited here by number only |
> | `docs/analysis/05-triage.md` | What is still undecided — the `S` and `D` items, and which slice each blocks |
| `docs/ENVIRONMENT.md` | What exists outside the repo — installed tools, remotes, hosted projects, deploy targets |
>
> A session holding only this file knows the rules but not the situation, and will not know
> what it is forbidden from inventing.

## 1. What this is

Bookflow is one backend serving two clients: a Flutter app where a salon or barber **owner
produces** their business data, and a web app where a **client consumes** it to book an
appointment. Everything on the public booking page — hours, services, team, portfolio —
originates in the owner's app. Build order is shared backend → native owner app → client web
app (ADR-001); the web app is not started until a real salon can be fully configured through
the native app against the real backend.

## 2. Stack

| Layer | Choice | ADR |
|---|---|---|
| Database | PostgreSQL on Supabase (managed Postgres, Auth, Storage, Realtime) | ADR-013 |
| API | Fastify, TypeScript. Clients never talk to PostgREST. | ADR-013 |
| Worker | Node process in the API repo, shares the service layer. Outbox + booking expiry. | ADR-013 |
| Owner app | Flutter (Dart). iOS builds require cloud CI — the dev machine is Windows. | ADR-015 |

## 3. Repository layout — **target state**

**Most of this does not exist yet.** Only `CLAUDE.md`, `DEFINITION_OF_DONE.md` and `docs/`
are present; Phase 2 creates the rest. `✗` marks what has not been created. Update these
marks as Phase 2 creates each directory.

```
bookflow/
├─ CLAUDE.md                      ✓
├─ DEFINITION_OF_DONE.md          ✓
├─ docs/            source · analysis · decisions · spikes  (read-only history)   ✓
│  └─ ENVIRONMENT.md  the one mutable doc — state of the world outside the repo    ✓
├─ apps/                          ✗
│  ├─ api/          Fastify service and the outbox/expiry worker                  ✗
│  └─ mobile/       Flutter owner app                                             ✗
├─ packages/                      ✗
│  └─ contracts/    OpenAPI spec and generated Dart/TypeScript clients            ✗
├─ supabase/                      ✗
│  ├─ migrations/   plain SQL, Supabase CLI (ADR-022)                             ✗
│  └─ seed.sql      one demo salon, bookings in every status (ADR-026)            ✗
└─ apps/web/        client booking site — built last                              ✗
```

- `docs/` — history. Never edited to reflect new decisions; new decisions get a new ADR.
  The sole exception is `docs/ENVIRONMENT.md`, which records current state and is revised in
  place, in the same commit as the change it records.
- `docs/decisions/` — **append-only, not frozen.** The protection is on the *decision*, not on
  the file:
  - **Context, Decision and Consequences are never rewritten.** That is where the reasoning
    lives, and a reader must be able to see what was known and believed at the time.
  - An ADR **may** carry an **`## Amendments`** section at the end — dated entries recording
    what has changed since. Appending one is not a violation of immutability; it is how an ADR
    stays honest without losing its history.
  - An amendment records a fact that has moved on. It does **not** reverse a decision. A
    reversal is a new ADR that supersedes the old one.
  - The same convention applies to `docs/spikes/` — the verdicts stand as written, and an
    amendment may note what has changed beneath them.
- `apps/api/` — all business logic and both processes. No client-facing rendering.
- `apps/mobile/` — Flutter only. No hand-written API models; they are generated.
- `packages/contracts/` — generated output plus the spec. Nothing hand-authored is committed here.
- `supabase/migrations/` — schema only. No seed data, no application logic.
- `apps/web/` — does not exist. Do not create it before the owner app is usable.

npm workspaces cover `apps/api` and `packages/contracts`. Flutter sits outside the workspace
and has its own toolchain.

## 4. Module layout inside apps/api

Vertical modules, not horizontal layers.

```
src/
├─ modules/<domain>/   <name>.repository.ts · <name>.service.ts · <name>.routes.ts · <name>.schema.ts
├─ platform/           db · auth · storage · mailer · outbox
└─ app.ts
```

A feature **adds a folder under `modules/`**. It does not add a file to four different
top-level directories.

- **Service** — business logic. All of it.
- **Repository** — knows the database. Applies the membership scoping rule.
- **Routes** — knows HTTP. Parses, validates shape, calls the service, serialises.

Never the reverse: routes hold no logic, repositories hold no rules, services know nothing
about HTTP.

## 5. Non-negotiables

- Money is `bigint` minor units, KES, never float or decimal string. A single formatting
  helper owns all display. (ADR-009)
- Any money value is asserted within the JS safe-integer range at the serialisation boundary
  and fails loudly rather than truncating. (ADR-016, spike 001/C2)
- Primary keys are UUIDs, never bigint sequences. (ADR-016)
- Instants — booking start/end, timestamps, expiries — are `timestamptz` in UTC. Recurring
  wall-clock — opening hours, staff schedules — is day-of-week plus a plain local time. The
  two are never interchanged. (ADR-010)
- Timezone is Africa/Nairobi as an application constant, not a stored column. (ADR-005)
- A booking snapshots the service name, duration and price as they were at booking time.
  `service_id` is nullable and for reporting only, never for display. (ADR-006)
- Every booking names a concrete team member — non-null FK plus a name snapshot. "Any
  professional" resolves at booking time and is never stored as null. (ADR-006)
- Booking conflicts are enforced by the database exclusion constraint over (team member, time
  range, occupying status). Never re-implemented or pre-checked as the authority in
  application code. (ADR-007, spike 001/C1)
- Every protected read and write is scoped `user → membership → business`, applied in the
  **repository layer**. RLS is defence-in-depth only — the API's credential bypasses it.
  (ADR-003, ADR-013, spike 001/C7)
- Public unauthenticated reads come only from the `business_public` allowlist projection.
  Public endpoints never read owner-scoped tables. Allowlist, never denylist. (ADR-020)
- Email is written to the transactional outbox inside the same transaction as the state
  change it reports. The mail provider is never called inside a request. (ADR-012)
- The OpenAPI 3.1 spec is generated from code, never hand-written. The Dart client is
  generated from that spec in CI. Hand-written Dart request/response models are prohibited.
  (ADR-014)
- Brand assets go to the public content-hashed immutable bucket; payment proofs go to the
  private bucket and are served only through an authorizing endpoint returning a short-lived
  signed URL. (ADR-011)
- Booking tokens are opaque stored values, not JWTs — one per booking, time-gated cancel and
  review capabilities. Entirely separate from Supabase Auth, which authenticates owners only.
  (ADR-019)
- Business data is private until explicitly published; every public read filters on
  `published`. (ADR-004)
- Salon handles are never reassigned. A rename retires the old handle, which redirects
  permanently. (ADR-021)
- Anything created, installed, provisioned or destroyed **outside** the repository — a tool, a
  git remote, a hosted project, a deploy target, a secret — is recorded in
  `docs/ENVIRONMENT.md` **in the same commit as the change**. A stale entry there is a defect,
  not untidiness.
- No credential, key, token or connection string is ever committed — including in analysis,
  spike reports and examples, where "it is only a throwaway" is exactly how it happens.
  `.env.example` carries variable names and shapes only, never a value. (ADR-023)

## 6. Do-Not-Vibe

Universal, from both manuals: **payment math · webhooks · migrations · auth and password
reset · production secrets.**

Bookflow-specific:

- The availability predicate and the exclusion constraint
- Booking status transitions
- The membership scoping rule
- The public projection allowlist
- Booking token minting and validation
- The payment-proof access path
- Handle assignment and retirement
- The outbox transaction boundary

**Operationally this means:** these are written deliberately, reviewed line by line by a
human, and are **never accepted from a generated diff on faith**. If a change touches one,
say so before writing it and name it in the completion report.

## 7. The per-feature loop

Every feature follows **`docs/source/Manual-Feature-Scaffolding.md`, Phases 0–7.** That file
is the process; it is not restated here. Project-specific deviations and additions:

- **Phase 0** — any `S`-classified triage item touching this slice is resolved *here*, before
  design. Not during implementation. Record the answer.
- **Phase 1** — the API contract is authored as code that generates the spec. The
  Project-Scaffolding manual's Phase 4 "API documentation scaffolding" is promoted to a
  Phase 2 requirement: the generation pipeline exists before the first endpoint. (ADR-014)
- **Phase 1** — name every Do-Not-Vibe surface the slice touches, at design time.
- **Phase 3** — the vertical slice is one folder under `modules/`, pierced end to end.
- **Phase 5** — iOS builds and signing run only in cloud CI; they cannot run locally.
  (ADR-015)
- **Phase 7** — completion is governed by `DEFINITION_OF_DONE.md`.

## 8. Where to look things up

| Question | Location |
|---|---|
| Why is it this way? | `docs/decisions/` — 26 ADRs, numbered, each stating what it resolves |
| What tools do I actually run? | ADR-022 (toolchain) · ADR-024 (CI) · ADR-025 (contract generation) · ADR-026 (conventions) |
| What do the design docs actually say? | `docs/source/` — read-only, authoritative on intent |
| What did they fail to say? | `docs/analysis/` — 01 screens, 02 backend capabilities, 03 flagged ambiguities, 04 unstated assumptions |
| What is still undecided? | `docs/analysis/05-triage.md` |
| Was the platform actually verified? | `docs/spikes/001-platform.md` — seven executed verdicts |
| What exists outside the repo right now — tools, remotes, hosted projects, deploy targets? | `docs/ENVIRONMENT.md` — **the one mutable file**; every claim carries the command that verifies it |

`05-triage.md` classifies open items `S` (blocks a slice) or `D` (deferrable). **An
`S` item must be resolved during its slice's Phase 0, not during implementation.** There are
no `F` items left; the foundation is settled.

## 9. What not to do

- Do not hand-write Dart request/response models. Generate them. (ADR-014)
- Do not put business logic in a route handler. It goes in the service.
- Do not enforce booking conflicts in TypeScript. The database constraint is the authority.
- Do not read owner-scoped tables from a public endpoint. Use the projection. (ADR-020)
- Do not call the mail provider inside a request. Write an outbox row. (ADR-012)
- Do not invent an answer to an open triage item. Raise it and get a decision.
- Do not edit `docs/source/` or `docs/analysis/` to reflect a new decision. Write an ADR.
- Do not create `apps/web/` before the owner app can configure a real salon. (ADR-001)
- Do not add a currency column, a per-business timezone, or a second name field. v1 is
  Kenya, KES, Africa/Nairobi, Latin script. (ADR-005)
- Do not maintain a token denylist to make logout instant. Exposure is bounded at one hour
  by design. (ADR-017)
