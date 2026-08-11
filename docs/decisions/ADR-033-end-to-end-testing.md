# ADR-033 — End-to-end testing

**Status:** Accepted

## Context

`DEFINITION_OF_DONE.md` requires that "if the slice touches a critical journey, an e2e test
covers it and passes". It defines neither "critical journey" nor what an e2e test is here, and
no e2e tooling exists anywhere in the repository — a gap found by a cold-start check rather than
by anyone reaching for it.

The project has two clients. Unit and integration layers already exist for the API (ADR-022),
and the integration harness runs against a real Supabase Postgres. Neither layer touches a
screen, so neither can tell whether a user can actually sign up.

Tracked as **K62**.

## Decision

**A critical journey is one whose failure prevents an owner from taking a booking, or a client
from making one.**

By that test, in scope: **sign-up, email verification and login** — an owner who cannot get in
takes no bookings. Later: **the client booking flow**, and the owner's confirm and cancel
actions.

Not critical by that test: settings, the Help Center, account deletion, portfolio management.
They matter, and unit and integration tests cover them; their failure does not stop a booking.

**Flutter's `integration_test` is the harness, driving a real build against staging.**

**`DEFINITION_OF_DONE.md`'s e2e requirement is satisfied by that and nothing else.** An API
integration test is not an e2e test, however end-to-end it feels.

**Phase 3's e2e covers: sign-up, verification, login, and reaching screen #20 as an
authenticated user.**

## Rationale

**On the definition.** "Critical" needs a test a person can apply to a new journey without
asking anyone, or it becomes "whatever felt important". Tying it to the product's single
revenue-bearing act — a booking happening — gives that. It is deliberately narrow: a definition
that catches everything licenses e2e tests for everything, and a suite that slow and that broad
gets disabled the first time it is flaky on an unrelated change.

**On `integration_test` over a web driver or an API-level harness.** The journey being tested
crosses the client, and the client is Flutter. `integration_test` drives a real build on a real
device or emulator, exercising the generated client, the Riverpod graph and the router that
ADR-028 establishes — the layers most likely to break in ways unit tests cannot see. A
Playwright-style tool has no purchase on a Flutter app, and an API-level test would re-prove
what the API integration suite already proves.

**On running against staging rather than a local stack.** The point of an e2e test is that it
exercises the deployed system, including the deploy itself, the hosted database and GoTrue's
real email path. A local run would skip exactly the failures this layer exists to catch. ADR-023
already names staging as the environment used for debugging, and `DEFINITION_OF_DONE.md` already
requires a staging smoke test; this makes the two the same activity.

**On the exclusivity clause.** Without it, "e2e" quietly becomes whatever the cheapest passing
test is, and the box gets ticked by an integration test with a longer call stack. Naming the
harness is what stops that.

## Consequences

- **Verification requires reading a real email in an automated test.** This is the hard part and
  it is not solved here. Options are a GoTrue test-user affordance, a mailbox API, or a fixed
  test account with a fetchable inbox — chosen in PR 2 or PR 3 of ADR-032's sequence when the
  auth path exists to test against. **It may prove to be the most expensive single piece of
  Phase 3**, and it is better to know that now.
- **The e2e suite needs a device or emulator in CI**, which the current `mobile` job does not
  have — it builds an APK and runs widget tests only. An Android emulator on the Linux runner is
  the cheap path; macOS is billable and reserved for the iOS build.
- **e2e runs against staging, so it needs staging to exist** — ADR-034's pipeline is a
  prerequisite, which is why ADR-032 puts deploy last and the full DoD pass at PR 4.
- **A failing e2e can mean the deploy broke, not the code.** That is a feature, since it is the
  only layer that can tell us so, but it makes the signal noisier than a unit test's and the
  suite must not be treated as a code-quality gate.
- **Test users accumulate in staging.** Nothing here cleans them up, and unlike the integration
  harness there is no transaction to roll back. A cleanup approach is needed before the suite
  grows.

## Items resolved

**K62** (what counts as a critical journey, and what tooling runs e2e tests). It was `S`.

## Items created

None new in the triage. Two implementation questions are named above — automating email
verification, and emulator provisioning in CI — and both belong to the PRs that hit them rather
than to Phase 0.
