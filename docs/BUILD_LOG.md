# Build log

State and process. No rationale — that lives in `docs/decisions/`, linked below.

## 1. Where we are

Against `docs/source/Manual-Project-Scaffolding.md`:

| Phase | Status |
|---|---|
| 0 — Frame the app | **complete** — product framed, v1 boundary set, unknowns spiked |
| 1 — Foundational design | **complete** — domain, boundaries, API style, auth model, Do-Not-Vibe surface all decided |
| 2 — Repo, environment, tooling | **not started** ← next |
| 3 — Vertical slice | not started |
| 4 — Harden | not started |
| 5 — Quality gates | not started |
| 6 — Release the foundation | not started |

**No application code exists.** The repository contains documentation only.

## 2. What has been produced

| Path | What it is |
|---|---|
| `CLAUDE.md` | Rules. Loaded every session. Cites ADRs, does not restate them. |
| `DEFINITION_OF_DONE.md` | Binary completion checklist for a slice. |
| `docs/source/` | **Read-only and authoritative.** The original manuals, style reference and design docs. Never edited. |
| `docs/designs/` | 28 native + 16 web screenshots, document order. Filenames are hints; the doc is authoritative. |
| `docs/analysis/` | Derived. 01 screen inventory · 02 backend capabilities · 03 flagged ambiguities · 04 unstated assumptions · 05 triage. |
| `docs/decisions/` | 21 ADRs. The only place a decision is recorded. |
| `docs/spikes/` | Executed spike write-ups. Code deleted, verdicts kept. |

## 3. Decisions so far

| ADR | Summary |
|---|---|
| 001 | Build order: backend → native owner app → client web app |
| 002 | Client reaches their booking by emailed magic link; no client accounts |
| 003 | One business per account, one seat, via a membership table |
| 004 | Business data is private until explicitly published |
| 005 | Kenya only; KES; Africa/Nairobi; Latin script |
| 006 | Bookings snapshot service values, carry line items and one named team member |
| 007 | Two schedule layers; DB exclusion constraint; unverified bookings expire |
| 008 | Contact is a first-class record keyed on normalised phone |
| 009 | Money is bigint minor units with one formatting helper |
| 010 | timestamptz instants vs day-of-week wall-clock, never interchanged |
| 011 | Public immutable asset bucket; private proofs behind an authorizing endpoint |
| 012 | Email only via transactional outbox, delivered by a worker |
| 013 | Postgres on Supabase behind a Fastify API; authz in the repository layer |
| 014 | REST/JSON `/v1`; OpenAPI generated from code; Dart client generated in CI |
| 015 | Flutter for the owner app; iOS builds require cloud CI |
| 016 | UUID primary keys; money asserted at the serialisation boundary |
| 017 | One-hour ES256 access tokens; refresh revoked on logout; no denylist |
| 018 | Social login links only on a provider-asserted verified email |
| 019 | Booking tokens are opaque stored values with time-gated capabilities |
| 020 | Public reads only from the `business_public` allowlist projection |
| 021 | Owner-chosen salon handle; retired handles redirect and are never reassigned |

## 4. Open work

`docs/analysis/05-triage.md` — **F: 0 · S: 58 · D: 44 · RESOLVED: 46.**

**Rule: an `S` item is resolved during its slice's Phase 0, never during implementation.**
If a slice hits an unresolved `S` item mid-build, stop and decide it — do not infer an answer.

**Blocking Phase 2 specifically: K53** — which cloud CI provider builds and signs iOS, and how
signing credentials are managed given no local macOS (ADR-015). Phase 2 stands up CI, so this
is decided there.

**First to bite in Phase 3: E1** (email provider, sender identity, domain) and **E2** (its
deliverability spike) — the first vertical slice is auth, and auth cannot activate an account
without email.

## 5. Screens that must be designed before they can be built

Referenced in the source docs but never specified (`docs/analysis/01-screen-inventory.md`):

- **Add/Edit Service form sheet** — reached from My Services; fields only guessed at.
- **Contact detail view** (`/contacts/:contact_id`) — "appointment history, total spent, notes".
- **Calendar booking detail** — the popover behind a tapped calendar block.
- **Reinstate confirmation** — the guard before re-activating a cancelled booking.

Created by decisions since:

- **Publish / unpublish surface, and the unpublished dashboard state** — ADR-004 (K47, K48).
- **Per-team-member schedule screen** — ADR-007 (K50); onboarding collects salon hours only.
- **Handle field in Business Branding onboarding, with live availability** — ADR-021 (K54).
- **Client booking page with cancel action** — ADR-002; a whole web page with no design.
- **Web "Select services" as multi-select** — ADR-006 (K49); the design specifies single-select.
- **Refused social-link state** on the sign-up and login sheets — ADR-018 (K56).
- **Zero-membership state** between sign-up and business creation — ADR-003 (I10).
- **Portfolio management** (replace, remove, reorder) — F6; onboarding is the only entry point.
- **Post-onboarding editing** for profile, team, portfolio and hours — K12; none exists.

## 6. How work proceeds

- **One vertical slice at a time.** Phase 3 of the feature manual: one folder under
  `apps/api/src/modules/`, pierced end to end, then thickened.
- **Phase 0 first**, including resolving that slice's `S` items and naming the Do-Not-Vibe
  surfaces it touches.
- **The plan is approved before implementation begins.**
- **`DEFINITION_OF_DONE.md` is satisfied before a slice is complete** — every box, including
  the human gate.
- **Do-Not-Vibe surfaces are named explicitly in the completion report**, or "none" is stated.
- **Context is cleared between slices.** The repository artifacts carry state, not the
  conversation. If something matters, it is in a file — an ADR, the triage, or this log.
  Nothing is remembered.

## 7. Next action

Begin Phase 2: initialise the npm workspace (`apps/api`, `packages/contracts`) and the Flutter
project in `apps/mobile`, wire lint/format/type-check, stand up CI including the iOS signing
decision (K53), and get an empty migration applying cleanly to a fresh Supabase database.
