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
- **An obligation attributed to a document must be QUOTED from it, or it is not an obligation.**
  Three instances on 2026-08-17, all in one slice, all by the same session. **ADR-003** was said
  to be enforced by `uq_memberships_user_business` — that constraint forbids a repeat join to the
  *same* business and enforces nothing about the rule; **nothing enforced it**, and a partial
  unique index had to be added. **ADR-014** was said to enumerate the problem-type slugs, making
  an addition a contract change needing an amendment — it enumerates none, states a property, and
  `problem.ts` is the registry, which sanctions addition explicitly. **ADR-039** was said to leave
  screens #5, #12 and #17 unclassified — it classifies all three by name. **Each was settled in
  about a minute by reading the Decision section**; none needed research, a spike, or a judgement
  call. The propagation is the part that matters: all three reached documents the guiding session
  relies on, and two shaped work — the ADR-014 misreading made a routine slug addition look like
  an ADR-level event for a day, and the ADR-039 one deferred a live constraint behind a step that
  did not exist. **A false obligation is more expensive than a missed one, because nobody audits
  work that looks careful.**
- **An affordance can be held in place by a framework default rather than by a decision, and a
  test that never drives it will not notice when the default stops applying.** Screen #17's back
  arrow was real and undeclared: `AppBar.automaticallyImplyLeading` supplies one whenever the
  route can pop, so it existed only because `/account` was reached by `push`. Routing it with `go`
  would have removed the only way back to the dashboard **with nothing failing**. **Third instance
  of one family** — the orphaned screen #20 and screen #5's missing exit were the first two. Those
  were **absences**; this was an **unchosen presence**, which is the harder kind to find, because
  asking "what is missing?" answers no. What found it was asking a question about a screen rather
  than reading what had been written about it, and what settled it was a probe that counted
  (`onAccount=1 backButtons=1 arrowIcons=1`) rather than an argument about Flutter.
- **A gate whose RESULT never reached you is a gate that did not run**, and it fails in two ways.
  **First, the result is never produced.** On 2026-08-18 a batch of work landed and was pushed
  while one of its four checks — re-deriving the criteria mapping after a `git mv` — had never
  been run; the renames moved files rather than test names, so the mapping held, which is **luck
  rather than process**. It surfaced only because a later session died and forced a status
  recovery. **Second, and harder to see, the result IS produced — into a channel you cannot
  read.** Three artefacts were "printed" on the same day and never arrived: `STAT` and `LOG` into
  fenced blocks that came out empty, and two sections asked for verbatim that were shown through
  the editing tool's own display panel. **The operator sees those panels; you do not.** The
  session had no signal anything was missing, which is what makes it worse than silence — it
  feels like reporting.
  **The mechanism is not the panel.** It is that **every channel between you and that session is
  lossy, and length is what breaks it** — long reports truncate (§3 records this), pastes get
  duplicated or clipped, and a rendered artefact is not text in a message. **So: results that must
  cross the gap are reported SHORT — a count, a sha, an exit code, one line each — and long
  artefacts are CITED BY PATH AND COMMIT rather than transcribed.** *"See
  `docs/features/01-business-setup/07-pull-request.md` §Rebase risk at `ce4437d`"* survives the
  crossing; two hundred pasted lines may not. **This is the other half of the verbatim rule
  above:** copied *from* the artefact, and copied *into* the report, where the reader is.
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
- **39 ADRs** in `docs/decisions/` **on `main`**, an append-only register. **Three more exist on
  unmerged branches**: ADR-040 on `feat/phase3-e2e`, and **ADR-041 and ADR-042** on
  `feat/business-setup-frame`, so it is **42 once both merge**. *(Was "41 once both merge" —
  ADR-042 landed after that was written. Counted 2026-08-18 with
  `git ls-tree -r --name-only origin/<branch> docs/decisions/ | wc -l`, which is the only reason
  to believe any of these numbers.)* The directory listing is the count; do not trust a number
  written anywhere, including here. All foundation-level (F) triage items are closed.
- **ADR-042 — two levels of navigation.** Shell selection is computed from state and enforced by
  the router's redirect (ADR-028, unchanged); movement *within* the signed-in shell is by push,
  from a tap. The boundary is a question rather than a list: *"A destination is a shell if the
  answer to 'why am I here?' is a fact about the user's account that the app computed. It is a
  pushed screen if the answer is 'because I tapped something.'"* It supersedes nothing — ADR-028
  was silent on within-shell navigation, not wrong about it.

### Phase 4's business-setup slice — built, unmerged, and never once built by CI

**Phases 0 through 4 are complete against the feature manual**, on
`feat/business-setup-frame`. **Phase 5's unit and integration layers are done; its end-to-end and
manual-QA layers are gated** — e2e needs Actions minutes and a staging account that does not yet
exist, and manual QA needs a device this machine does not have.

**The branch is 42 commits ahead of `main` and has had ZERO CI runs.** Not one commit on it has
ever been built by GitHub Actions. Verified 2026-08-18 with the per-workflow query in §6, paired
with its control: this branch returns `0` and `feat/phase3-e2e` returns `8`. **Everything below
is therefore proved locally and only locally.**

What it now contains beyond documents — **this branch is no longer documents-only**: a migration
(`uq_memberships_one_owner_per_user`, a partial unique index, and the reason `memberships` now
carries four migrations where every other branch carries three), a `modules/businesses/` API
vertical with three new routes, a `features/business/` Flutter feature, and screens #5, #12 and
#17 built with #20 widened.

**Six documents under `docs/features/01-business-setup/`**, and they are the slice:

| File | What it is |
|---|---|
| `00-frame.md` | Phase 0. §4 is **twelve** decisions, §5 the two caught `S` items, **§5.1–§5.5 the obligations** — 5.2 and 5.3 discharged, three still open |
| `01-acceptance-criteria.md` | The acceptance criteria, **append-only and never renumbered**, with the naming rule that makes coverage a `grep` |
| `02-design.md` | Phase 1. §A data model, §B the API contract, §C the UI, §D risk, §E the task order |
| `03-environment.md` | Phase 2. The green baseline, and the local hazards — including the shared database |
| `04-phase3-close.md` | Phase 3's close. §8 is the pending-lessons queue this pass drained |
| `05-phase4-close.md` | Phase 4's close, against the manual's seven requirements rather than against §E |

**The criteria coverage is a COMMAND, not a number, and this is the one place that matters.**
Every count written down in this project has gone stale — one of them within hours of being
written. Run it:

```
grep -rhoE "'criterion [0-9]+(, [0-9]+)*" apps/api/src apps/api/test apps/mobile/test \
  | grep -oE "[0-9]+" | sort -n | uniq
```

The denominator is the highest number in `01-acceptance-criteria.md`. **Two criteria are
deliberately unmapped and both are named in that file** — see §7.

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
| `docs/features/01-business-setup/00-frame.md` | **`feat/business-setup-frame`** | Phase 4's Phase 0 frame. §4 is **twelve** decisions, §5 the caught `S` items, **§5.1–§5.5 the obligations — three still open**, §6 unknowns, §7 metrics. |
| `docs/features/01-business-setup/01-acceptance-criteria.md` | **`feat/business-setup-frame`** | The acceptance criteria, **append-only and never renumbered** — the rule is stated in the file. **It said 47 here and that was true when written**; criteria have been appended five times since, which is exactly why the count is a command now and not a number. Its "Deliberately not covered" and "Blocked" lists matter as much as the criteria. |
| `docs/features/01-business-setup/05-phase4-close.md` | **`feat/business-setup-frame`** | Phase 4's close. The manual's seven requirements with evidence, what is not proved and why, the deviations by register entry, and the open obligations. **Start here** for the slice's current state. |
| `docs/decisions/ADR-042-*.md` | **`feat/business-setup-frame`** | Two levels of navigation — shell selection by redirect, movement within a shell by push. Read before changing `platform/router.dart`. |

## 5. The immediate queue — four branches

Nothing can merge until Actions minutes reset (~2026-08-31). **Re-derived from `git branch -r`
again on 2026-08-18, not carried forward from the text below it:** the remote holds `main` plus
`ci/ios-build-cadence`, `docs/guide-handoff-refresh`, `feat/business-setup-frame` and
`feat/phase3-e2e` — **still four, unchanged, and only #14 has a PR open**, deliberately (see §6).

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
3. **`feat/business-setup-frame`** — **Phase 4 entire, not Phase 0.** **42 commits**, and the
   description this line carried until 2026-08-18 — *"Ten commits … documents only, no code"* —
   is now wrong in both halves. It carries a **migration**, the `modules/businesses/` API
   vertical, the `features/business/` Flutter feature, three new screens, ADR-041 **and ADR-042**,
   and six documents under `docs/features/01-business-setup/`. It branches from `main` and still
   touches only new paths plus files no other branch edits, **so it conflicts with nothing** —
   test that assumption again before merging it, because it was true when the branch was
   documents and is now a claim about a much larger diff. **It is the fourth migration that
   matters most at merge time:** see §6's shared-database constraint.
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
- **The local database is shared across branches; `supabase/migrations/` is not.** Switching to a
  branch with a different migration set leaves the schema from wherever you were, so its suite
  fails through the pre-push hook — **correctly, and it will look like a defect in that branch
  rather than an artefact of the machine.** The remedy is `npm run db:reset` on the branch you
  are on; **never `--no-verify`**, which would push code whose tests never ran against its own
  schema. **This bites during the 2026-08-31 merge sequence**: three of the four queued branches
  carry three migrations and `feat/business-setup-frame` carries four.
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
| **Frame §5.2** | **DISCHARGED 2026-08-17.** `business-already-exists`, status 409, is in `PROBLEM_TYPES`. **And the reason recorded here was wrong**: appending a slug is *not* a change to ADR-014's contract — ADR-014 enumerates no slugs, and `problem.ts` sanctions addition in terms. See §2's quote-it-or-it-is-not-an-obligation lesson; this is one of its three instances. |
| **Frame §5.3** | **DISCHARGED 2026-08-17** by frame decision 11. The rename surface is **screen #20**, widened to the "Personal/Business Information Management page" its own routing text already names. Criteria 52–54 are the loading, section and error criteria that could not be written until it had a name. |
| **Frame §5.4** | **OPEN.** Decision 10's partial unique index exists and is applied to the **local** database; it has **never been applied to staging**, and ADR-034 forbids applying migrations from a development machine. Waits on Actions minutes and `migrate-staging`. A green local suite says nothing about staging's schema. |
| **Frame §5.5** | **OPEN.** `docs/ENVIRONMENT.md` §4 still lists `supabase/seed.sql` under "Blocks Phase 2" and says it is not writable. The file exists, is 144 lines, and is covered by a test that signs the seeded owner in against real GoTrue. Held with §5.1 for the same reason: PR #14 also edits that file. |
| **R3 — the staging account** | **OPEN, and now on the critical path.** Criteria 41 and 42 are about an account *acquiring* a membership, and **K78 forbids giving the staging e2e account one** — so they cannot be demonstrated on it. E14 compounds it: staging's sender reaches one inbox, so a replacement must be admin-created with `email_confirmed_at` set, as the existing one was. **It became critical when the seam decision landed** (below): the seam's only remaining route runs through `e2e-staging`, which is the one gate this account cannot satisfy. It costs nothing to decide today and blocks the gate if left. |
| **The seam** | **A DEFAULT, NOT A PREFERENCE, and recorded as such** in `05-phase4-close.md` §5.1. Every layer of the slice passes its own gate and **the two halves have never met in a running process** — the Flutter widgets are proved against stubbed repositories, and the generated Dio client, the base URL, the auth interceptor and the JSON actually deserialising have been exercised by nothing. Three routes would close it. **Two were local and needed no minutes** — a USB Android phone against a LAN-reachable API, and an emulator at `10.0.2.2` — **and neither was taken**, so it closes at `e2e-staging` after the reset. Either local route remains available to anyone who wants it closed sooner. |
| **Design deviations 10–19** | `docs/analysis/08-design-deviations.md` gained ten entries from this slice. **10–16 are the seven it decided**; **17–19 are three differences the reconciliation FOUND, decided by nobody until they were ruled on the next day.** Two of the seven — screen #5's sign-out control and screen #12's omitted tabs — had lived only in a Dart source comment, so a count taken from the documents was short by two and looked complete. **Nobody reviewing the design against the build opens a widget to find out what was deliberate.** |
| **Criteria 48 and 49** | **Unprovable in this harness, which is a finding rather than work nobody did.** 48's concurrent half needs a second connection and the harness gives one transaction per test; 49's second clause cannot be observed at all — every arrangement that lets you look has already destroyed the evidence. The property holds by construction: both inserts are a single statement. They become provable when the harness gains a second connection, **which is the same capability A14 needs for the booking slice.** Do not read them as an outstanding task. |
| **Publishing precondition** | **A new cross-slice dependency.** A business may not be published until it has **at least one service** — that is how K27 was answered, by making the empty-salon state unreachable. **The publishing slice must enforce it**, and nothing in the business-setup slice does. Its only carrier is the §5.1 triage update. |
| **A governance gap** | `CLAUDE.md` §3 gives an ADR's `## Amendments` section two categories — a fact that has moved on, and not-a-reversal — and **has no category for an amendment that SHARPENS an under-specified rule.** ADR-041's amendment is exactly that: the decision did not change, it was found to be missing half of itself. It was filed as an amendment for want of anywhere better. Worth a ruling before the next one. |

## 8. What is next

**This section previously said Phase 0 was complete and Phase 1 was next. Phases 0 through 4 are
now complete**, on `feat/business-setup-frame`, **entirely without CI** — 42 commits, zero runs.
The manual's Phase 4 close is `05-phase4-close.md`; read it rather than this summary if the two
ever disagree.

**Phase 5 is where the slice stands, and it splits cleanly in two.**

**Done, and local:** the unit layer and the integration layer. Both run against the real local
Supabase stack, both are green, and the integration suite fails rather than skips when the
database is unreachable.

**Gated, and not by anything that can be worked around:**

- **End-to-end.** ADR-033 reserves the term for Flutter `integration_test` driving a real build;
  an API integration test is not one, *"however end-to-end it feels."* The precedent is
  `integration_test/profile_e2e_test.dart` **on `feat/phase3-e2e`**, so writing this slice's
  journey here would fork a file PR #14 introduces and guarantee a conflict in the one file that
  defines the critical journey. **The order is: #14 merges, then extend that file.** Running it
  needs minutes and R3's account.
- **Manual QA.** The manual asks someone to *"actually use the feature … try to break it. Test on
  the real target devices/browsers."* There is no emulator and no device on this machine and iOS
  is impossible on Windows (ADR-015). **This is the seam wearing the manual's vocabulary**, and
  both local routes that would have unblocked it were offered and declined — §7.

**So the three things that unblock the most, in order of what they cost:**

1. **Decide R3's staging account.** Costs nothing today, blocks the e2e gate if left, and is now
   on the critical path because the seam runs through `e2e-staging` and nowhere else.
2. **Merge PR #14 when a green on its head commit is possible.** It unblocks frame §5.1 and §5.5,
   the log-level triage item, and the e2e file this slice needs to extend.
3. **Apply frame §5.4's migration to staging** through `migrate-staging`, which is the same wall.

**Then Phase 6 and 7** — quality gates, review, and the Do-Not-Vibe record. **That record is a
comment on the PR, posted before merge, naming who read what.** This slice touches two surfaces:
**migrations** (the partial unique index) and **the membership scoping rule** (the repository's
scoping, and one deliberately unscoped read that exists so a log can record a distinction the
response hides — `businessExistsUnscoped`, constrained by a test that reads the source tree).

Roughly fifteen feature slices lie ahead: the owner app (~24 screens), the client web app
(~11 pages), payments, and production release. The hard one is bookings and availability;
the database constraint that makes it safe already exists, the logic around it does not.

**A note on how this section keeps going wrong.** It has now been corrected twice — once for
describing Phase 0 as including the data model and API contract (they are Phase 1), and once for
saying Phase 0 was the current state when four phases were done. **Both times the section was
written from memory of the work rather than from the manual and the branch.** Quote the manual;
count the branch; do not reconstruct either.

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