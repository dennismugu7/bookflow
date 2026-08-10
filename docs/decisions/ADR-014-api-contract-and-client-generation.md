# ADR-014 — API contract and client generation

**Status:** Accepted

## Context

The Project-Scaffolding manual names the API contract as a Phase 1 decide-once item, so that
"every endpoint any feature ever adds should look like it was written by the same person."
Neither design document specifies a response envelope, an error format, a pagination
convention, or a versioning approach.

ADR-013 puts a TypeScript API in front of the database and ADR-015 puts Flutter in front of
that. Those two languages share no type system, so nothing checks at compile time that the
server's response shape matches what the client expects to parse. That is the actual risk
this ADR exists to close — a JSON contract between two independently typed codebases drifts
silently until it fails at runtime, on a user's phone.

Spike 001's C2 finding is also a contract concern rather than a database one: `bigint` is
exact in Postgres and over the Postgres driver, but loses precision above 2⁵³ when serialised
as a JSON number. Where that boundary is crossed is an API decision.

## Decision

**REST over JSON.** URL-prefixed versioning at `/v1`.

**Cursor-based pagination.**

**Errors as RFC 9457 `application/problem+json`**, each carrying a stable machine-readable
`type` slug.

**Envelope:** collections return `{data, meta}`; single resources return the resource itself.

**The OpenAPI 3.1 spec is generated from the code, never hand-written.** The Dart client for
the Flutter app is generated from that spec in CI. **Hand-written Dart request/response models
are prohibited.**

## Consequences

- Generation is the only mechanism that prevents drift across a boundary no compiler spans.
  A hand-written Dart model is a second source of truth, and second sources of truth diverge.
- This promotes the Project-Scaffolding manual's Phase 4 "API documentation scaffolding" into
  a **Phase 2 requirement**: the generation pipeline has to exist before the first endpoint,
  because retrofitting it means reconciling hand-written models that have already drifted.
- A stable error `type` slug means the Flutter client branches on a machine value rather than
  on a human-readable message, so error copy can change without breaking clients.
- Cursor pagination rules out offset-based list endpoints from the start, including for the
  bookings list and the contacts directory.
- CI gains a job that regenerates the client and fails on uncommitted diff — the mechanism
  that makes "prohibited" enforceable rather than aspirational.
- Per spike C2, money and any other value that could exceed 2⁵³ must be handled explicitly at
  this boundary; ADR-016 sets that rule.

## Items resolved

K4 (API contract style — envelope, error format, pagination, versioning). It was F.

## Items created

None.
