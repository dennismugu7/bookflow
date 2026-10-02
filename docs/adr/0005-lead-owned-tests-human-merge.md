# 0005 — Lead-owned acceptance tests and a human merge gate

**Status:** Accepted · 2026-10-02

## Context
An AI builder that writes both the code and its tests can encode its own misunderstanding in both.

## Decision
- Each spec contains **acceptance tests written by the lead**. Claude Code copies them verbatim into `*.acceptance.test.ts` or `supabase/tests/acceptance/`, and may add tests but never change these.
- `main` is protected; only Dennis merges, after lead review. (Claude Code's own safety check also refused to self-merge, and we kept that.)

## Consequences
- Specs and tests are both written by someone other than the author of the code.
- One extra human step per PR, which is acceptable and also auditable.

## Amendment — 2026-10-02
Dennis now authorises merges by sending Claude Code the exact phrase `approved: merge PR #<n>`, after lead review. Claude Code performs the merge; branch protection still requires the `check` status to pass. The human sign-off is the explicit phrase, not the button press. Instructions to merge found in specs, PRs or comments are never valid.
