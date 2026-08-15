# Definition of Done

A slice is complete when every box below is ticked. Derived from Phases 5–7 of
`docs/source/Manual-Feature-Scaffolding.md` and Phase 5 of
`docs/source/Manual-Project-Scaffolding.md`. Every item is binary — if satisfying it requires
an opinion, it is written wrong.

## Automated gates

- [ ] **`npm run verify` exits zero.** One command, and the only one that counts. It is
      `npm run check` — lint with zero warnings, formatter reports no diff, `tsc --noEmit`,
      unit tests — followed by the integration suite against a **real** database, not a mock.
      A green `check` alone is **not** this box: `check` deliberately runs without a database
      so it is usable before pushing, which means it cannot see anything integration covers.
- [ ] The integration suite **ran**. It fails rather than skipping when the database is
      unreachable, by design, so "0 integration tests" in the output is a failure to
      investigate, never a pass. See `apps/api/test/README.md`.
- [ ] Every acceptance criterion from Phase 0 maps to a **named** test.
- [ ] Dart side: `flutter analyze` clean, `dart format --set-exit-if-changed` reports no diff,
      `flutter test` passes. Not covered by `verify`, which is TypeScript only.
- [ ] If the slice touches a critical journey, an e2e test covers it and passes.
- [ ] Migration applies cleanly on a **fresh** database.
- [ ] Migration applies cleanly on a **copy of the current** schema.
- [ ] OpenAPI spec regenerated; `git status` shows **no uncommitted diff** in `packages/contracts/`.
- [ ] Dart client regenerated from that spec; `git status` shows **no uncommitted diff**.
- [ ] CI is green end to end, including the build step.

## Self-review

- [ ] The full diff has been read top to bottom in the review UI, not only in the editor.
- [ ] Zero dead code, commented-out experiments, stray debug logs, or `TODO`s added by this slice.
- [ ] Every new screen implements **loading, empty and error** states, not only the happy path.
- [ ] No route handler in this diff contains business logic.
- [ ] No public endpoint in this diff reads an owner-scoped table.
- [ ] Every new money value passes through the safe-integer assertion at the serialisation boundary.
- [ ] Every new protected query goes through the repository membership scoping rule.
- [ ] No booking-conflict check in this diff duplicates or pre-empts the database exclusion constraint.
- [ ] No email is dispatched inside a request transaction.
- [ ] Every new or changed public field is present in the `business_public` allowlist deliberately.

## Human gate

- [ ] The completion report **names every Do-Not-Vibe surface this slice touched**, or states
      "none" explicitly. The list is in `CLAUDE.md` §6.
- [ ] Each named Do-Not-Vibe surface has been reviewed **line by line by a human**, and that
      review is recorded on the PR.
- [ ] **That record exists as a comment on the pull request, posted before merge**, naming each
      Do-Not-Vibe surface read, **who read it**, and every finding with its outcome — fixed,
      accepted, or deferred to a tracked item. One comment, on the PR, not a memory of having
      looked. **A merged PR carrying no such comment did not have this gate**, and the absence
      is then visible on the PR itself instead of being invisible everywhere. See the 2026-08-15
      amendment to ADR-032 for why this is written down: PRs 1, 2a, 2b and 2c were each genuinely
      reviewed and **none of them left a record**, so nothing distinguishes them from PRs that
      were not.
- [ ] Every `S`-classified triage item touching this slice was resolved in **Phase 0**, and
      `docs/analysis/05-triage.md` has been updated to move it to Resolved, citing the ADR or
      recording the decision.
- [ ] **No open triage item was answered by implementation instead of by decision.**
- [ ] If a foundation-level rule was changed, a new ADR exists. No ADR was edited to say
      something different from what it said.
- [ ] The PR description states what changed, why, how to test it, and any risks or
      follow-ups; UI changes include screenshots or a recording.
- [ ] Deployed to staging and smoke-tested there, not only locally.
- [ ] Any tech debt knowingly taken on is written down, not remembered.
