# Definition of Done

A slice is complete when every box below is ticked. Derived from Phases 5–7 of
`docs/source/Manual-Feature-Scaffolding.md` and Phase 5 of
`docs/source/Manual-Project-Scaffolding.md`. Every item is binary — if satisfying it requires
an opinion, it is written wrong.

## Automated gates

- [ ] Linter exits zero with **zero warnings** (`eslint`, `dart analyze`).
- [ ] Formatter reports **no diff** (`prettier --check`, `dart format --set-exit-if-changed`).
- [ ] Type-check exits zero (`tsc --noEmit`).
- [ ] Unit tests pass; every acceptance criterion from Phase 0 maps to a **named** test.
- [ ] Integration tests pass against a **real** test database, not a mock.
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
