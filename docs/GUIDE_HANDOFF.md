# Bookflow — brief for the guiding session

> **Rewritten 2026-08-16, at the close of Phase 3.** The previous version described a
> pre-Phase-3 world and every status claim in it was wrong by the end. Rewrite this
> document at every phase boundary; a stale map is worse than no map.
>
> **Amended 2026-08-17, at the close of Phase 4's Phase 0.** Phase 3 is **still open** — the
> 2026-08-16 header said it closed at PR #14 and it has not merged. What changed since is the
> merge blocker becoming specific rather than "waiting on minutes", four new verification
> lessons, and a fourth branch in the queue. Amended rather than rewritten: the parts still
> true are still here.

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
- **A confident, coherent, well-argued report can be entirely wrong from one misread commit
  subject.** On 2026-08-17 a report concluded the e2e red proof *"was never observed"*, added
  *"I am not going to soften this"*, and was wrong: `541d195` had been given `de366ff`'s
  subject, so the commit that fixed the emulator was read as the commit that reverted the
  break. **The force of an assertion carries no information about its truth.** What caught it
  was a second report contradicting the first on one detail — so when something is asserted
  strongly, ask for the one fact underneath it, not for the argument again.
- **Verify the instrument in both directions.** A grep returning zero needs a positive control
  on the same target; a diff reporting no differences needs a deliberately broken copy beside
  it. **Five zeros from a mistyped path look exactly like five zeros from a clean file**, and
  an empty diff looks the same whether the files match or the path does not exist.
- **When a check fails, ask whether the CHECK was wrong before concluding the artefact is.**
  Twice on 2026-08-17 a stop was correct against the letter of a criterion that contradicted
  itself: once where "must be byte-identical" contradicted the stat prediction in the same
  instruction, once where `wc -c` could not possibly match because `jq` appends a newline to
  everything it prints. Both times the stop was right and the criterion was the thing to fix.
- **A mechanical sweep against an external checklist finds what careful reading of your own
  document cannot.** §3 of the business-setup frame asserted for a day that decision 4 had
  settled which surface renaming lives on. It had not, and no amount of re-reading the decision
  surfaced that — **listing the slice's screens against `DEFINITION_OF_DONE.md` line 32 did**,
  because the checklist asks a question the document was not written to answer.
- **The contradicting evidence may already be in the repository, green and unread.** On
  2026-08-17 a partial unique index was added because **nothing enforced ADR-003's
  one-business-per-account rule** — no trigger, no policy, no check, no code.
  `schema.integration.test.ts` had asserted the opposite six days earlier, in plain words: *"The
  constraint is on the pair, not on user_id alone. ADR-003 makes one business per account a
  product rule, not a schema one."* **It passed the whole time.** Three documents and two
  sessions asserted the rule was enforced, and nobody searched the test suite for what it already
  claimed. **Before asserting what a schema or an invariant guarantees, grep the tests for what
  they already say about it** — a passing test is a claim somebody verified, and it outranks a
  document that merely asserts.
- **A shell does what it is told, not what was meant.** A commit message containing backticks was
  executed as command substitution — it re-invoked the CLI and mangled the `git add` beside it.
  Nothing was damaged only because state was checked before retrying. **Write any message
  containing backticks, `$` or quotes to a file and use `git commit -F`.** Same family as
  `git add -A` sweeping four golden-diff PNGs into a commit that legitimately updated one golden,
  and as scripted text replacement exiting zero on no match: **the tool did exactly what it was
  asked, and what it was asked was not what was meant.**

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

## 4. Where the project stands — 2026-08-17

**Phases 0, 1 and 2 of the project manual are complete. Phase 3 is not — it closes at the
moment PR 4c merges, and it has not merged.** The work is built, and the owner's review
pass is now **on the PR as an artefact** rather than a memory of one. What remains is
procedural and blocked; see the blocker below.

**PR #14 now carries three comments**, all attributed to `dennismugu7` because the session
posts through his `gh` credential — which is why each states its provenance in its first line:

| id | What it is |
|---|---|
| `5306568691` | The session's **reviewer's brief**, written before the review. Disclaims being a review record and satisfies no gate. |
| `5311554684` | **Dennis's owner review record.** This is what ADR-040 §2 condition 4 requires, and it approves ADR-040. One clause was amended before posting and the amendment is declared in the comment's first line. |
| `5311582150` | The session's **independent verification findings**. Not the owner's review; satisfies no gate. |

**THE MERGE BLOCKER IS NOW SPECIFIC, and it is not only the minutes.** Head commit
`607f03b1de07952b24f39d5a42aa9e7abc3e584c` **has never been built.** The green run
`31936130639` is against `5a73007`, **one commit behind the head**; the only run against the
head itself is `31936920827` — refused, two seconds, zero steps. A docs-only commit sits
between them, so the risk is low, but **low risk is not a green run** and
`DEFINITION_OF_DONE.md` asks for one.

**The merge sequence therefore gains a step:**

1. A **genuine green on the head commit** — not on `5a73007`. Needs minutes.
2. Flip ADR-040 from *Proposed* to *Accepted*, dated, citing comment `5311554684`.
3. Merge. Phase 3 closes at that commit.

**The e2e red proof is genuine, and this was contested before it was settled.** Run
`31902883567`, against commit `541d195ea8010129ef9347b2e5a179f62f30464c` — which still carried
the broken field, the revert being the *next* commit. Verified by reading the job log: a
`TestFailure` at `_pumpUntil`, `integration_test/profile_e2e_test.dart:288`, after the APK
built and Supabase init completed.

**One residual, recorded and not gated:** the bounded-hang path has never run with the break
present. `de366ff` both reverts the break and adds the `ci.yml` timeout wrapper, so the two have
never coexisted in any run.

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
- **39 ADRs** in `docs/decisions/` **on `main`**, an append-only register. **Two more exist on
  unmerged branches**: ADR-040 on `feat/phase3-e2e`, ADR-041 on `feat/business-setup-frame`, so
  it is **41 once both merge**. The directory listing is the count; do not trust a number
  written anywhere, including here. All foundation-level (F) triage items are closed.

**Read these to orient** (he can attach them or paste sections). **The `branch` column
matters: most of these are not on `main`** — they are on the unmerged branches in §5, so
asking for them by path on `main` gets "no such file", which is not a problem to debug. Two
are subtler than that: `BUILD_LOG.md` and `09-phase3-close.md` **do** exist on `main`, but
without §8 and reading *Status: OPEN* respectively — so a session reading them on `main` gets
a file, and the wrong content, which is worse than an error.

| File | On | What it is |
|---|---|---|
| `CLAUDE.md` | `main` | The governing rules, loaded into every Claude Code session. §7 carries the editing and reporting rules. |
| `DEFINITION_OF_DONE.md` | `main` | The gates. Binary by design. |
| `docs/ENVIRONMENT.md` | `main` | World-state — what exists, what is provisioned, what is exhausted. Mutable by design. |
| `docs/analysis/05-triage.md` | `main` | Every unresolved item, classified F / S / D. |
| `docs/BUILD_LOG.md` | **`ci/ios-build-cadence`** | Phase history. **§8 is the merge queue** waiting on CI minutes, and §8 exists only on that branch. |
| `docs/analysis/09-phase3-close.md` | **`feat/phase3-e2e`** | Phase 3's close-out. §7 is the close itself. On `main` this file exists but still reads *Status: OPEN*, which is correct there. |
| `docs/decisions/ADR-040-*.md` | **`feat/phase3-e2e`** | When a phase may close with unsatisfiable items. Read this before ever waiving a gate. Its Status still reads *Proposed* and must be flipped as part of the merge. |
| `docs/decisions/ADR-041-*.md` | **`feat/business-setup-frame`** | The created-condition test — when descoping resolves an `S` triage item and when it does not. Read its **Amendments** section too; the rule failed twice within a day of being written. |
| `docs/features/01-business-setup/00-frame.md` | **`feat/business-setup-frame`** | Phase 4's Phase 0 frame. §4 is the nine decisions, §5 the caught `S` items, **§5.1–§5.3 the three outstanding obligations**, §6 unknowns, §7 metrics. |
| `docs/features/01-business-setup/01-acceptance-criteria.md` | **`feat/business-setup-frame`** | 47 acceptance criteria, **append-only and never renumbered** — the rule is stated in the file. Its "Deliberately not covered" and "Blocked" lists matter as much as the criteria. |

## 5. The immediate queue — four branches

Nothing can merge until Actions minutes reset (~2026-08-31). Re-derived from `git branch -r`
on 2026-08-17; all four are pushed and **none has a PR open**, deliberately — see §6.

1. **PR #14 (4c), branch `feat/phase3-e2e`** — the only one with a PR. The review record is
   posted (`5311554684`). What remains: **a genuine green on the head commit `607f03b`**, then
   flip ADR-040 to *Accepted* citing that comment id, then merge. Phase 3 closes there. See §4
   for why the existing green does not count. **The steps are unchanged; how you verify them is
   not — do not confirm that green with `gh run list`, which is 404ing. §6 gives the command that
   works.**
2. **`ci/ios-build-cadence`** — moves `ios-build` to a weekly schedule plus `workflow_dispatch`.
   Will need `main` refreshed after #14. Also carries `BUILD_LOG.md` §8 and a fix folding a
   stray ADR-024 amendment back into the real file. **Conflicts with #14 on `ci.yml` and on
   `docs/ENVIRONMENT.md`** — both confirmed by test-merge, not assumed.
3. **`feat/business-setup-frame`** — Phase 4's Phase 0. Ten commits: the frame, the 47
   acceptance criteria, ADR-041 and its amendment. **Documents only, no code.** Branches from
   `main` and touches only new files under `docs/features/` plus one new ADR, so it conflicts
   with nothing.
4. **`docs/guide-handoff-refresh`** — this document. Branches from `main`, one file.
   **It conflicts with branch 2**, which also rewrites this file. That is not optional to
   resolve: whichever merges second gets a conflict in `docs/GUIDE_HANDOFF.md`.

**`BUILD_LOG.md` §8 lists only the first two and is now two items short.** It was written on
branch 2 before branches 3 and 4 existed. **Whoever merges #14 owns the reconciliation.**
Neither list is authoritative over the other — **if they disagree, the open branches on the
remote are the truth: `git branch -r`.** That rule has now paid for itself twice.

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
- **A push to a non-`main` branch triggers nothing and costs nothing. Opening a PR against
  `main` does.** The workflow's triggers are `push: branches: [main]`, `pull_request:
  branches: [main]`, and `workflow_dispatch` — so a push to a feature branch cannot start a
  run, and a PR against `main` immediately does. **This is why work is pushed but PRs are not
  opened during the outage**: pushing gets the work off the one machine that holds it, at zero
  cost, while opening the PR is deferred to the moment a green can actually be produced.
  Verified 2026-08-17 by pushing repeatedly and checking the runs for each branch — zero every
  time. **Use the command in the next bullet to check, not `gh run list`.**
- **`gh run list` is broken for this repository, and its failure looks exactly like "no runs".**
  It queries `/actions/runs`, which returns **HTTP 404** while every other Actions endpoint
  answers normally — diagnosed 2026-08-17: `actions/permissions` returns `enabled:true`,
  `actions/workflows` returns `1`, the **per-workflow** runs collection returns `76`, an
  individual run reads back intact, and cache usage answers. **A 404 from `gh run list` is
  therefore not evidence of anything.** Use instead:
  `gh api "repos/dennismugu7/bookflow/actions/workflows/331331404/runs?branch=<branch>" --jq '.total_count'`
  — or fetch a run by its id. **Always pair a zero with a control**: the same query against
  `feat/phase3-e2e` returns `8`, and a zero beside a non-zero from the same query is a verified
  zero where a zero alone is not.
  **It may be transient** — it had failed on four consecutive attempts over several minutes when
  diagnosed. **Retry `gh run list` before assuming the workaround is still needed.**
  **Ruled out with evidence, not by assumption:** Actions being disabled (`permissions` says
  enabled), token scope (the token holds `repo` and `workflow` and the same token reads five
  other Actions endpoints), and exhausted-minutes-as-such — **exhaustion would not spare the
  per-workflow route.**
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
| **ADR-041** | **The created-condition test.** Descoping resolves an `S` triage item *only* where the slice cannot produce the state that item asks about; where the slice does create it, the item must be answered in Phase 0 or waived on the record. Its **2026-08-16 amendment** adds the negative half — a placement, a limit, a format or a build strategy is not a state and can never be caught — and records the two ways the rule was misapplied within a day of being written. On `feat/business-setup-frame`. |
| **Frame §5.1** | **Deferred:** K27 and K47 must move to Resolved in `05-triage.md`. Held back only because PR #14 also edits that file and touching it now guarantees a conflict. **Do it the moment #14 merges** — K27's obligation on the publishing slice travels on it, and is lost if it does not happen. |
| **Frame §5.2** | **Owed:** no `PROBLEM_TYPES` entry covers a conflict, and decision 8 refuses a second business with one. Appending a slug is a change to ADR-014's error contract that both clients branch on, not a line in a route. |
| **Frame §5.3** | **Owed:** the rename surface has no screen. Decision 4 implies one exists — an owner who mistypes the name must be able to fix it — but no design names which. A Phase 1 decision, and until it is made the loading and error criteria for that screen cannot be written. |
| **Publishing precondition** | **A new cross-slice dependency.** A business may not be published until it has **at least one service** — that is how K27 was answered, by making the empty-salon state unreachable. **The publishing slice must enforce it**, and nothing in the business-setup slice does. Its only carrier is the §5.1 triage update. |
| **A governance gap** | `CLAUDE.md` §3 gives an ADR's `## Amendments` section two categories — a fact that has moved on, and not-a-reversal — and **has no category for an amendment that SHARPENS an under-specified rule.** ADR-041's amendment is exactly that: the decision did not change, it was found to be missing half of itself. It was filed as an amendment for want of anywhere better. Worth a ruling before the next one. |

## 8. What is next

**Phase 4 is under way. The slice was chosen — BUSINESS SETUP — and its Phase 0 is
COMPLETE**, on branch `feat/business-setup-frame`, entirely without CI.

What Phase 0 produced, against the feature manual's own checklist:

- **Problem statement and user story** — an owner can create an account and then do nothing
  with it; every signed-in user is routed to the "finish setting up" stub, permanently.
- **Non-goals** — twelve, plus nineteen coverage exclusions in the criteria file.
- **Nine decisions**, including: name only, no migration; the row written at the end of step
  one; a name-only business *is* a real business; renaming in scope; names not unique; a second
  business refused with a conflict; names stored trimmed.
- **Two caught `S` items answered** — K27 and K47, caught by ADR-041's test.
- **47 acceptance criteria**, append-only.
- **Unknowns: none**, argued rather than asserted — the slice writes one row to a table that
  already exists through a pattern already in production.
- **Success metrics: unavailable**, argued — there is no production and no users, so there is
  nothing to look at after release. What stands in is named instead.

**A correction to what this section previously said.** It described Phase 0 as *"acceptance
criteria, data model, API contract, task order"*. **That is wrong, and it matters because it
would have produced design work a phase early.** `docs/source/Manual-Feature-Scaffolding.md`
lines 10–28 asks for six things and ends at the sixth: the problem statement; the user story;
the acceptance criteria; explicit non-goals; unknowns and spikes; and *"Decide success metrics.
if it's a product feature — what you'll look at after release to know it worked."* **Data model
and API contract are Phase 1**, not Phase 0. Quote the manual; do not reconstruct it.

**Next is Phase 1 — technical design.** Its first job is the one Phase 0 could not do:
**naming the rename surface** (frame §5.3). After that, the data model and the API contract,
which is authored as code that generates the spec (`CLAUDE.md` §7, ADR-014).

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