# Business setup — Phase 6 close

> Derived record. What the quality gates found, what was changed, and what was deliberately not.

Phase 6 is the feature manual's *"Quality gates"* (`Manual-Feature-Scaffolding.md:144-154`), whose
framing is *"Before anyone else looks at it, clean it up"*. Four bullets, all local. **It is the
last phase completable before the Actions reset** — Phase 7 opens with *"Open a pull request"*,
and everything in it is gated.

## 1. The manual's four bullets

| Bullet | Verdict | Evidence |
|---|---|---|
| **Lint and format** — *"Zero warnings."* | **MET** | `eslint .` clean; `prettier --check .` — *"All matched files use Prettier code style!"*; `dart format --set-exit-if-changed` — 38 files, 0 changed |
| **Type-check** — *"full type pass green"* | **MET** | `tsc --noEmit` clean; `flutter analyze` — *"No issues found!"* |
| **Self-review** — *"read your own diff top to bottom as if it were someone else's"* | **MET**, with its scope stated in §5 | Four mechanical sweeps, each with a control; then a read by area. Five findings, all fixed in `9e342dc` |
| **Update docs and comments** — *"explaining **why** (not what)"* | **MET** | Two headers rewritten to describe what their files now hold; the extracted widget documents why it exists in `ui/` and what it deliberately does not do |

## 2. The mechanical sweeps — every zero has a control

A zero from a search that matched nothing looks identical to a zero from a clean file, so each
sweep was paired with a positive control on the same target.

| Sweep | Result | Control |
|---|---|---|
| `TODO` / `FIXME` / `XXX` / `HACK` | **0** | the same pipeline finds `DO-NOT-VIBE` **3×** |
| debug output — `console.log`, `debugPrint`, `print(`, `dd(` | **0** | finds `expect(` **268×** |
| commented-out code | **0** | the heuristic's 6 hits were all prose containing "returns", "constraint", "constant", "final", or ending in a semicolon; the first filter sees **1,630** comment lines |
| dead code — unreferenced exports, files, branches | **0 dead** | one **over-export**, `BUSINESS_NAME_MAX_LENGTH`; control: `createMyBusiness` found in 4 files by the same method |

Stray logger calls: none. Seven added lines mention a logger — three are the deliberate
`business.*` events, four pass `request.log` into them.

## 3. The five findings, and their fixes

| # | Finding | Fix |
|---|---|---|
| 1 | `business_providers.dart` read *"instead of instead of the page"* — the only doubled-word hit in 10,528 added lines | corrected |
| 2 | `businesses.routes.integration.test.ts` opened *"The pierce's API layer"* and had grown to **1,035 lines** holding six `describe` blocks | header rewritten to list what is there |
| 3 | `businesses.conflict.test.ts` and `businesses.conflict-branch.test.ts` — near-identical names for different questions | `git mv` to `…conflict-predicate` and `…conflict-service`; both headers name their half and their pair; every stale path reference updated |
| 4 | `BUSINESS_NAME_MAX_LENGTH` exported with no consumer outside its file | un-exported, with the reason recorded so nobody "fixes" the tests to import it |
| 5 | the initials avatar assembled **three times** — screens #12, #17 and #20, three commits, two days | extracted to `lib/ui/initials_avatar.dart` |

**Finding 5 was the one judgement call, and it was Dennis's.** It touches three screens, which is
more than tidying, so it was raised rather than taken: extract into `ui/`, or defer. He chose to
extract, and bounded it — *"take only what genuinely differs between the three call sites … a
widget with more knobs than call sites is the next thing someone has to read."* So it takes
`initials` and `diameter`, with `textStyle` optional for #20's larger badge, and nothing else.

**Nothing decided the triplication.** The record covers where the avatar *navigates* (decision 12,
§C.9) and that it reuses `OwnerProfile.initials` — the data, not the widget. `ui/` already existed
as the home for shared widgets and this did not go there.

## 4. What the self-review examined and did NOT change

**A review that records only its changes reads as though nothing else was looked at.** Every
duplication candidate below was checked against the record first, because undoing a recorded
decision as cleanup is worse than the duplication.

| Candidate | Left alone, because |
|---|---|
| Two schema ids for create and rename | §B.2: *"Two schema ids rather than one, because they are separate operations in the generated Dart client and **a shared id would couple them the first time they diverge**."* |
| `findBusinessOwnedBy` mirroring `findBusinessForUser` | the repository states it: *"The traversal is the same `user → membership → business`; it is the **starting point** that differs."* §A.3 maps them to different queries, Q4 and Q5 |
| The two submission controllers | the code says *"Same shape as the rename controller and for the same reason"*, and they genuinely differ — create invalidates `membershipStatusProvider` too, because the redirect depends on it. Generalising would couple routing to a form |
| The 404-as-data mapping | **not duplicated at all.** `membership_repository.dart` delegates: *"Reimplementing that mapping here would be a second place for it to drift, and a divergence would show up as the router sending an owner to `/unavailable` instead of `/setup` — a bug two layers from its cause."* |

**Also examined and not a finding:** tests spell `200` out rather than importing the constant.
That is the stronger choice — a boundary test that imports the constant still passes when the
constant is changed wrongly.

**A hypothesis that was disconfirmed, recorded because a disconfirmed hypothesis is a result.**
The shortest added comments were sampled expecting "what" comments; they are continuation
fragments of multi-line "why" explanations. No comment restating its code was found.

## 5. The golden proof — this phase's strongest artefact

**A refactor across three screens, with pixel-exact evidence it changed nothing.** Proven in both
directions:

- **Nothing was regenerated inside the refactor.** `git diff --stat 9e342dc~1 9e342dc --
  docs/designs/` produces **no output** — no file under `docs/designs/` appears in that commit.
- **Regenerating afterwards produces byte-identical output.** The golden test renders screen #20
  and compares; it passes, and `git status --porcelain -- docs/designs/` afterwards is **empty**.

**The order is what makes it evidence.** A refactor that altered rendering and regenerated the
golden in the same commit would leave a green suite and a changed image, and the first check is
what forecloses that. `grep` for `BookflowColors.avatarGreen` under `lib/` now returns exactly one
site where it returned three.

**No criterion-named test changed its name.** `git diff 9e342dc~1 9e342dc` contains zero added or
removed lines matching `it(` or `testWidgets(` — the renames moved files, not test names, which is
what keeps the mapping honest across a `git mv`.

## 6. Scope, honestly

`git diff origin/main...HEAD` is **79 files, 10,528 insertions, 113 deletions**. About 3,378 lines
are documentation and 1,590 are generated (`packages/bookflow_api`, `openapi.json`). **The
hand-written surface is ~5,560 lines across 39 files.**

**This was ONE PASS, not a line-by-line audit of 5,560 lines.** The API and mobile source were
read properly, the tests structurally, the documents sampled. **The four-way split for a deeper
pass is recorded here so anyone wanting it knows what it is rather than inventing it:**

1. `apps/api/src/modules/businesses` plus `platform/problem.ts`
2. `apps/mobile/lib`
3. the tests, both stacks
4. `docs/`

## 7. What Phase 6 did NOT satisfy

**`DEFINITION_OF_DONE.md` asks for more than the manual does here:** *"The full diff has been read
top to bottom **in the review UI**, not only in the editor."* A review UI means a pull request,
which is Phase 7, which is gated on the reset. **The manual's Phase 6 asks only that you read your
own diff, and that was done** — `git diff origin/main...HEAD`, in the editor.

Recorded as a difference between two standards rather than a miss against one.

## 8. The count, as a command

```
grep -rhoE "'criterion [0-9]+(, [0-9]+)*" apps/api/src apps/api/test apps/mobile/test \
  | grep -oE "[0-9]+" | sort -n | uniq
```

The denominator is the highest number in `01-acceptance-criteria.md`. **Unmapped: 48 and 49**, for
the harness reason recorded there. **Re-run it after any `git mv`** — a rename that moved a test
name would break the mapping silently, and that check is the one that was nearly missed here.

## 9. What remains

**Phase 6 is the last phase completable before the reset.** Phase 7 opens *"Open a pull
request"*, and every artefact in it is gated: the PR itself, CI green end to end, the
Do-Not-Vibe review comment naming who read the migration and the membership-scoping surfaces,
and the owner's own review record.

Still open, unchanged by this phase: frame §5.1 and §5.5 (PR #14), §5.4 (`migrate-staging` and
minutes), the seam closing at `e2e-staging` by default, Phase 5's e2e and manual-QA layers, and
the two queued items in `04-phase3-close.md` §8.
