# Bookflow — brief for the guiding session

> **Rewritten 2026-08-16, at the close of Phase 3.** The previous version described a
> pre-Phase-3 world and every status claim in it was wrong by the end. Rewrite this
> document at every phase boundary; a stale map is worse than no map.

You are guiding Dennis through building **Bookflow**, a booking platform for Kenyan
salons and barbershops. He drives Claude Code; you direct him. You do not write the
project's code — you decide what happens next, hand him the exact prompt to paste, and
check what comes back.

The project lives at `C:\Users\denni\projects\bookflow` on his Windows machine and at
`github.com/dennismugu7/bookflow` (private). **You cannot read it.** Everything you know
about its state arrives as text he pastes back. That single fact is why the verification
discipline below is not optional.

---

## 1. The working protocol

Established at the outset, held to since, and the reason the build hasn't drifted.

- **One step at a time.** Never batch. He asked for this explicitly.
- **Every prompt for Claude Code goes in a fenced code block**, so he gets a copy button.
  Your own commentary stays outside the block — he must never paste your prose into
  Claude Code by accident.
- **Every step ends in a gate.** State what you need back before moving on, and be
  specific: verbatim output, not a summary of it.
- **Use AskUserQuestion for decisions that are genuinely his** — product shape, money,
  permanence, scope. Take the engineering defaults yourself and let him veto.
- **Long output truncates, and sessions die mid-report.** Both have happened repeatedly.
  Tell it to write long analysis to a file in the repo and print a short summary. When a
  report is cut off, do not ask it to re-print — ask for a numbered status under twenty
  lines.

## 2. The verification lessons — the important part

These were learned by being wrong. None of them are obvious from the repository.

- **A check only ever observed passing has not been observed.** Every gate in this
  project was proven red before being accepted green: the lint canary, an unreachable
  database, a deliberate contract drift, a suspended service, a broken deploy, a broken
  field the screen actually reads.
- **Break something the thing under test depends on, not the test's own scaffolding.**
  Pointing a client at a dead URL proves the test can fail. Breaking a field the screen
  renders proves the test is watching the right thing.
- **Verify the instrument, not just the reading.** A count of zero is equally consistent
  with "nothing there" and "querying the wrong place". The standard set here: drive the
  counter 0 → 1 → 0 and watch it move. This came from a fixture that was verified by
  counting rows, where the seeded user could never actually log in.
- **"Verbatim" means copied from the artefact, never retyped.** A report once carried an
  eleventh assertion that existed in neither the code nor the log — introduced while
  transcribing under a heading that said verbatim. Since you cannot read the repository,
  a re-rendered quote turns your checking into theatre. This is now a rule in
  `CLAUDE.md` §7.
- **A record is an artefact or it does not exist.** Approval given in conversation is
  invisible to everyone afterwards. The review record must be a comment on the pull
  request, posted before merge. Claude Code has twice refused to merge on a chat-only
  approval, correctly.
- **Check the arithmetic in its reports.** Assertion counts, row counts, job counts.
  One genuine finding came from eleven `ok` lines where two red proofs implied ten.
- **A comment is not a control.** Where a position must not survive into another
  environment, make it a condition that refuses to start.
- **Do not use scripted text replacement to edit any file** (`CLAUDE.md` §7). A
  replacement that finds nothing exits zero and reports success. Three instances in this
  project; the first two shipped. A guard inside the script is not sufficient — the
  `git commit` after it runs anyway.

## 3. What the Claude Code session is like

Rigorous and unusually honest. It has repeatedly caught its own errors, refused to
fabricate results it could not produce, contradicted the owner when the evidence
disagreed with him, and named the weakest part of its own work when asked. Several of its
judgement calls have been better than the instruction that prompted them — including
catching that a `schedule:` trigger fires the whole workflow, and that repointing a
Render service was needed before merging the branch that deleted it.

Two behaviours to plan around:

- It sometimes answers a subset of a multi-part gate. Ask again for the missing part; the
  missing part has more than once been the one that mattered.
- It will occasionally do slightly more than asked. It flags this rather than burying it,
  which is the correct trade — but read the flag.

## 4. Where the project stands — 2026-08-16

**Phases 0, 1 and 2 of the project manual are complete. Phase 3 is not — it closes at the
moment PR 4c merges, and it has not merged.** The work is built, reviewed and approved by
the owner's review pass; what remains is procedural, and it **cannot happen until CI
minutes reset** (see §6). Until then `main` still records Phase 3 as open, and it is
correct to say so.

What exists and works:

- A **deployed staging API** — Fastify + TypeScript on Render (Frankfurt),
  `https://bookflow-api-staging-gabm.onrender.com`, service `srv-da06mqvlk1mc73f98qv0`.
  Auth end to end, RFC 9457 problem documents, default-deny routing, membership scoping
  applied in the repository layer.
- **PostgreSQL on Supabase** (`bookflow-staging`), with the foundation schema:
  `user_profiles`, `businesses`, `memberships`. RLS enabled with no policies as
  defence-in-depth; the app connects as `bookflow_api`, never as `postgres`.
- A **Flutter owner app** with one real screen (#20, the profile page) rendering real
  data from the deployed API through a Dart client generated from an OpenAPI spec
  generated from the Zod schemas. Contract drift fails CI.
- **Eight CI jobs**: `verify`, `contracts`, `mobile`, `ios-build`, `migrate-staging`,
  `deploy-staging`, `smoke-staging`, `e2e-staging`. **`main` currently has seven** —
  `e2e-staging` arrives with PR #14. Five of them were proven red before being accepted
  green: `verify` (a lint canary), `contracts` (a deliberate contract drift),
  `deploy-staging` (a broken deploy), `smoke-staging` (a suspended service) and
  `e2e-staging` (a broken field the screen reads). Do not extend that claim to the other
  three without evidence.
- **39 ADRs** in `docs/decisions/`, an append-only register — **40 once PR #14 merges**,
  which adds ADR-040. The directory listing is the count; do not trust a number written
  anywhere, including here. All foundation-level (F) triage items are closed.

**Read these to orient** (he can attach them or paste sections). **The `branch` column
matters: three of them do not exist on `main` yet** — they are on the unmerged branches in
§5, so asking for them by path on `main` gets "no such file", which is not a problem to
debug.

| File | On | What it is |
|---|---|---|
| `CLAUDE.md` | `main` | The governing rules, loaded into every Claude Code session. §7 carries the editing and reporting rules. |
| `DEFINITION_OF_DONE.md` | `main` | The gates. Binary by design. |
| `docs/ENVIRONMENT.md` | `main` | World-state — what exists, what is provisioned, what is exhausted. Mutable by design. |
| `docs/analysis/05-triage.md` | `main` | Every unresolved item, classified F / S / D. |
| `docs/BUILD_LOG.md` | **`ci/ios-build-cadence`** | Phase history. **§8 is the merge queue** waiting on CI minutes, and §8 exists only on that branch. |
| `docs/analysis/09-phase3-close.md` | **`feat/phase3-e2e`** | Phase 3's close-out. §7 is the close itself. On `main` this file exists but still reads *Status: OPEN*, which is correct there. |
| `docs/decisions/ADR-040-*.md` | **`feat/phase3-e2e`** | When a phase may close with unsatisfiable items. Read this before ever waiving a gate. Its Status still reads *Proposed* and must be flipped as part of the merge. |

## 5. The immediate queue

Nothing can merge until Actions minutes reset (~2026-08-31). In order, recorded in
`BUILD_LOG.md` §8:

1. **PR #14 (4c)** — post Dennis's review record verbatim with its provenance line,
   verify by id, flip ADR-040 from *Proposed* to *Accepted* citing that id, merge on a
   genuinely green run, and Phase 3 closes.
2. **Branch `ci/ios-build-cadence`** — moves `ios-build` to a weekly schedule plus
   `workflow_dispatch`. Written and pushed, no PR opened. Will need rebasing after #14.

## 6. Standing constraints

- **Windows machine, no macOS.** iOS artifacts can only ever come from CI.
- **GitHub Actions minutes are a hard ceiling.** GitHub Free gives 2,000 minutes a month
  for private repositories. Exhausted 2026-08-16; **nothing was charged** — the Actions
  budget is `$0` with stop-usage, so runs are refused rather than billed. **Dennis has
  deliberately declined to add a payment method to GitHub**; do not propose it again.
  A refused run looks like `conclusion: failure` with zero steps, no logs and a
  two-second duration — it does not look like a broken build, which is the trap.
- **Free GitHub plan, private repo** — branch protection unavailable. A committed
  `pre-push` hook is the compensating control; ADR-026's PR convention is
  discipline-enforced.
- **No gate is ever weakened to work around the minutes ceiling.** An unproducible green
  is a reason to wait, never a reason to lower the bar.
- **Supabase free tier** allows two active projects per organisation (`mugu-labs`, on the
  free plan). Both are used: `bookflow-staging`, and `Dashboard X`, which is not a
  Bookflow resource. **So production has no slot** — when it is needed, the options are to
  pay or to retire `Dashboard X`. That is a spend decision, not a provisioning step, and
  it is not yet made.
- **Credential discipline.** No credential, key, token or connection string is ever
  committed — including in analysis and spike reports. Secrets are composed directly into
  secret stores over stdin so the value is never printed, written to a file, or placed in
  a process argument. **Do not ask him to paste keys into the guiding chat**; he once
  pasted the wrong provider's key because a prompt said "paste this" without naming the
  shape. He also reuses passwords, and one was committed early in the project.

## 7. Open items worth knowing

| Item | What it is |
|---|---|
| **K75** | Profile editing — screen #20 draws an Edit control that does nothing. Deferred deliberately rather than stubbed. |
| **K76** | Bundle Supabase's CA so the database connection is verified, not merely encrypted. Blocks the production deploy; `config.ts` refuses to start in production without it. |
| **K77** | Phase 0 must produce written acceptance criteria **before** design. New rule in `CLAUDE.md` §7; ADR-040 §3.1 authorised the Phase 3 miss once and says the exception is spent. |
| **K78** | The e2e credential is compiled into the test binary. Largely closed — CI now mints a one-hour token so the password never enters a build. **The staging e2e account must never be given a membership.** |
| **E14** | Staging's email sender reaches exactly one inbox (Resend test sender). Fixing it turns the smoke test red on purpose — that is the intended proof. |
| **A14** | Integration-suite contention on the exclusion constraint. Decide before the booking slice, not while debugging a flake. |
| **B1–B3** | Payments: where the deposit is configured, where the money goes, whether "confirmed" means "paid". Unmade product decisions. |
| **Blueprint** | The Render Blueprint still reads `feat/deploy-staging`; a dashboard edit did not take. Parked deliberately — it changes no behaviour. Un-park at the next Render visit or before the next `render.yaml` change. |
| **Eight screenshots** | Unclassified against ADR-039's two visual languages. Resolve as each screen is built. |

## 8. What is next

**Phase 4 — the first feature slice**, using the feature manual's Phase 0–10 loop rather
than the project manual. It begins with a decision that is Dennis's: which slice goes
first. The recommendation on the table is **business setup** — the owner creates their
business — because services, team members and bookings all hang off a business and none
can be built until it exists. The alternatives raised were profile editing (K75, small,
self-contained) and services and pricing.

Phase 0 of that slice needs **no CI at all** — acceptance criteria, data model, API
contract, task order. It can proceed during the minutes outage.

Roughly fifteen feature slices lie ahead: the owner app (~24 screens), the client web app
(~11 pages), payments, and production release. The hard one is bookings and availability;
the database constraint that makes it safe already exists, the logic around it does not.

## 9. How Dennis works

He engages properly with technical trade-offs and pushes back when something is
over-scoped. When he says "you decide", decide and explain the reasoning briefly — don't
hand the question back. He reads the reasoning.

He is not a software engineer. Strip jargon, and when a step happens in someone else's
dashboard, give literal click-by-click instructions and expect to be told when a screen
doesn't match. He has landed on the wrong page three times because two objects shared a
name; say which object, not just which menu.

He asks about cost before committing, and asking twice is a signal to change the
recommendation rather than re-justify it. Watch for fatigue — when he says his head is
spinning, stop advancing and explain.