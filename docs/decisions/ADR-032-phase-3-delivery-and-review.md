# ADR-032 — Phase 3 delivery and review protocol

**Status:** Accepted

## Context

`DEFINITION_OF_DONE.md` is written per slice, and `docs/BUILD_LOG.md` §6 says one vertical slice
at a time. Phase 3 delivers six layers — data, auth, API middleware, client shell, one page,
deploy — which is either one very large slice or several, and nothing said which.

Its human gate requires every Do-Not-Vibe surface to be "reviewed line by line by a human, and
that review recorded on the PR". There is one contributor. `main` is unprotected because branch
protection is unavailable on this plan, so nothing mechanical enforces any of it.

The manual also asks for "one true page — often account/settings or a trivial dashboard — wired
end-to-end through every layer above". It does not pick one, and `docs/BUILD_LOG.md` §5 records
that several candidate screens have no design at all.

Tracked as **K64** (which page), **K65** (one DoD pass or several), **K66** (whether a sole owner
satisfies the human gate) and the UI half of **I10**.

## Decision

### The one true page: My Profile Details, screen #20

It is **fully designed** in `DD-Bookflow-Native.md`, it **reads the authenticated user's own
record** end to end through every layer, and it **requires no business to exist**.

**A signed-up user with no membership sees a stubbed "finish setting up" screen** — a truthful
holding state, not the real onboarding, which is its own slice later.

### Delivery: four sequential pull requests

Each leaves the application runnable.

1. **Data layer** — the three tables of ADR-031, migrations applying cleanly.
2. **Auth end to end** — sign-up, verification, login, token issuance, the membership scoping
   rule in the repository layer, and one protected route that rejects an unauthenticated
   request.
3. **Client** — Flutter shell per ADR-028, routing, generated-client wiring, screen #20, and the
   zero-membership stub.
4. **Deploy** — the pipeline to staging per ADR-024 and ADR-034.

**Intermediate PRs satisfy the automated gates and the self-review section.** The **full
`DEFINITION_OF_DONE.md` pass — including the e2e test and the staging smoke test — applies when
the slice is whole**, at PR 4.

### The human gate, with one contributor

The diff is reviewed **in GitHub's UI, not the editor**, in a **separate sitting from writing
it**, against a **written checklist naming every Do-Not-Vibe surface that PR touches**, and the
**review is recorded as a PR comment**.

## Rationale

**On #20 over the alternatives.** The obvious candidate was the zero-membership state, and it is
disqualified by `docs/BUILD_LOG.md` §5: it has no design, so building it means designing it
first, inside the phase that is supposed to be proving infrastructure. A dashboard needs
bookings. Settings is mostly navigation. #20 is the only fully-designed screen that reads real
per-user data and depends on nothing that does not exist yet — which is exactly the shape of a
page whose job is to prove the wiring rather than the product.

**On four PRs rather than one.** A single PR containing schema, auth, a client shell and a
deploy pipeline is unreviewable, and the human gate is the one control this project has. Four
PRs also fail in useful places: if auth is wrong, that is a red PR 2, not a rejected
everything. The cost is that `DEFINITION_OF_DONE.md` cannot be satisfied per-PR — an e2e test
of a journey whose client does not exist yet is not a test — which is why the full pass is
explicitly deferred to the point where the slice is whole rather than pretended at each step.

**On the human gate, stated plainly.** **This is weaker than a second reviewer and it is not
close.** A second reviewer brings a mental model that has not already convinced itself the code
is correct; self-review cannot, whatever the process around it. The author knows what they
meant, so they read what they meant rather than what is there. No checklist fixes that.

It is nonetheless **the honest maximum available**. There is one contributor, and the
alternatives are worse: pretending the gate is satisfied by writing the code carefully, or
blocking the project until a second person exists. The three constraints are chosen because each
attacks a specific failure of self-review — the **GitHub UI** because a diff reads differently
from the editor the code was written in and unfamiliarity is the point; the **separate sitting**
because the author's memory of intent is what substitutes for reading, and it fades; the
**written checklist** because "review the diff" against Do-Not-Vibe surfaces is a task
self-review reliably skips when it feels confident.

**ADR-026's trigger stands:** when a second person commits, this is replaced by real review, not
supplemented by it.

## Consequences

- **Four PRs, four cycles of CI**, and the branch flow ADR-026 specifies exercised four times
  before the phase is done.
- **`DEFINITION_OF_DONE.md` is satisfied once**, at PR 4, for the whole slice. Anyone auditing
  PRs 1–3 against it will find boxes unticked; that is intended and recorded here so it does not
  read as a lapse.
- **The zero-membership stub is deliberate debt.** It will look unfinished because it is
  unfinished, and it is replaced by the onboarding slice.
- **Screen #20 may need fields the design assumes and the schema must supply** — ADR-031's
  `user_profiles` is sized for it, and any gap surfaces in PR 3 after the schema is frozen in
  PR 1. That ordering risk is real and is the price of doing schema first.
- **The review protocol is unenforced.** Nothing checks that the sitting was separate or that
  the checklist was written. It is discipline, recorded so that it is at least legible
  discipline.

## Items resolved

**K64** (which screen is the one true page). Screen #20, My Profile Details.
**K65** (one `DEFINITION_OF_DONE.md` pass or several). Four PRs, one full pass at the end.
**K66** (whether the sole owner self-reviewing satisfies the human gate). Yes, under the three
named constraints, and explicitly weaker than a second reviewer.
**I10**, UI half (what a zero-membership user sees). A stubbed "finish setting up" screen.

## Items created

None.
