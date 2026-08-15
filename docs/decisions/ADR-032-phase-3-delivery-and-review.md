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

## Amendments

### 2026-08-15 — the review protocol above has never run, and something else has

**PRs 1, 2a, 2b and 2c are all merged. None of them went through the gate this ADR
specifies.** There was no separate sitting, no written checklist naming the Do-Not-Vibe surfaces
before reading, and no review recorded as a PR comment. The Consequences section predicted that
nothing would enforce the protocol and called it "at least legible discipline". It was not
followed once, and this amendment exists so that the record stops describing a practice that has
never happened.

**What happened instead is not nothing, and it is stronger.** Every Do-Not-Vibe surface was read
line by line before merge **by a second reader** — the guiding session (`docs/GUIDE_HANDOFF.md`),
which directs the work and checks what comes back. It did not rubber-stamp: it returned findings
that changed the code in **every one of the four PRs**.

| PR | What the second reader found | Effect |
|---|---|---|
| 1 | Comments in the migration claiming things the SQL did not do | Rewritten; and two `F` items nobody had asked — K72, K73 — surfaced, becoming ADR-037 and ADR-038 |
| 2a | The integration harness connecting as `postgres`, so every test ran with privileges the API does not have | Harness switched to the application role; ADR-038's grants became checkable |
| 2b | An unbounded unknown-`kid` map in the JWKS verifier, and a non-null assertion | Bounded and hardened in `f3bcb3d` |
| 2c | No rate limit on an unauthenticated endpoint that writes rows and sends mail | Per-IP throttle, and the observability that makes its trigger visible |

**Two readers is a different control from the one this ADR designed, and a better one.** The
Rationale says self-review is "weaker than a second reviewer and it is not close", because the
author reads what they meant rather than what is there. That objection does not apply to a reader
who did not write the code and holds no memory of intending it. K66 asked whether a sole owner
self-reviewing satisfies the human gate; the answer recorded above is now beside the point,
because the sole-reviewer premise turned out to be false in practice.

**What the project is actually relying on: the second reader.** Not the protocol in the Decision.
Anyone auditing these four PRs against this ADR will find the gate unticked, and this is the
explanation.

### The gap that remains, stated without softening

**The second reader is not a second contributor**, so **ADR-026's trigger still stands
unsatisfied** — when a second *person* commits, real review replaces this, and that has not
happened.

**And the owner's own pass is still missing.** It is not a duplicate of what the second reader
does, and treating it as one is the mistake this amendment is trying to prevent. A reviewer of
correctness asks whether the code does what it says. **Someone who has to live with the product
asks whether what it says is the thing they wanted**, and notices a different class of problem:

- **Copy and behaviour a user meets.** "A confirmation email has been sent if the address could
  be registered" is defensible security and may still be the wrong sentence to show a salon owner
  who has simply forgotten they already signed up. No correctness review flags that.
- **Debt they will personally carry.** The orphaned-account risk, the fail-open breach check and
  the per-instance rate limit are each recorded with a named trigger. Whether those triggers are
  acceptable is a judgement about how much risk the owner wants to hold, not a fact about the
  code.
- **Premises, not just implementations.** A reviewer takes the design as given and checks the work
  against it. The owner can say the design is wrong — that a step does not belong, or that a
  screen should not exist. Nobody else in this loop has standing to do that.
- **Accumulated shape.** Four merged PRs have a combined feel that no single diff shows, and the
  person who will build on it for the next year is the one who should notice if it is going
  somewhere they do not want.

**So the honest position:** the Do-Not-Vibe gate is being met by a second reader and is genuinely
being met. The owner's pass is a **separate, still-open obligation**, and it should be recorded
when it happens rather than assumed to have happened because the code was reviewed by someone.

`DEFINITION_OF_DONE.md` now requires the review record to exist as an artifact on the PR, so that
a merged PR without one is visibly missing something rather than silently missing it.

**The first record written under that rule is PR 2c's**, posted at
<https://github.com/dennismugu7/bookflow/pull/8#issuecomment-5301663835>. It is worth reading as
the worked example of what this rule asks for, including the part that is uncomfortable: it says
in its own second paragraph that the review it describes happened before the merge and the record
did not, because the rule did not exist yet. **PRs 1, 2a and 2b have no such record and will not
get one** — writing them now would be reconstruction, and a record assembled after the fact to
fill a gap is the thing this rule exists to make impossible. Their reviews are real and are
attested only by the table above.

### 2026-08-15 — when the owner's pass is required, and when it is not

The obligation above ran for the first time on **PR #12**, and its record is at
<https://github.com/dennismugu7/bookflow/pull/12#issuecomment-5303325013>. It earned its keep
immediately: it rejected the close-out's premise and sent Phase 3 back for PR 4c, which is an
outcome no correctness review could have produced.

Left as "a still-open obligation" with no scope, the rule has one predictable failure — it gets
skipped on something small, silently, and the skip is indistinguishable from the omission this
whole amendment exists to correct. So the scope is stated:

> **The owner's review pass is required for any PR touching code, schema, CI, or infrastructure
> configuration. A documentation-only PR carries the session's review record alone.**

The line is drawn at what can behave differently in production. A docs PR cannot, and the owner's
distinctive contributions — is this the product I want, is this debt I am willing to carry, is the
premise right — are already exercised on the PR that *made* the change being written down. Asking
for a second pass over the prose is ceremony, and ceremony is what gets skipped and then quietly
normalised.

**Skipping it is a decision that must be visible.** A documentation-only PR merged without the
owner's pass is following this rule; anything else merged without it is not, and the session's
review record must say which case it is.

**PR #13 is the first PR this applies to** — documentation only, recording the decisions taken at
the merge of #12. It carries the session's record and no owner's pass, by this rule.
