# ADR-025 — Contract generation toolchain

**Status:** Accepted · **Implements:** ADR-014

## Context

ADR-014 decided that the OpenAPI spec is generated from code and the Dart client generated
from that spec, and prohibited hand-written Dart request/response models. It named no tools.

`DEFINITION_OF_DONE.md` then made "OpenAPI spec regenerated; no uncommitted diff" and "Dart
client regenerated; no uncommitted diff" hard gates — two checks that cannot be run without
knowing which commands produce those artifacts.

The rule exists because TypeScript and Dart share no type system. Nothing checks at compile
time that the server's response shape matches what the client parses, so generation is the
only mechanism that prevents silent drift.

## Decision

**Route schemas are declared with Zod.** `fastify-type-provider-zod` and `@fastify/swagger`
emit **OpenAPI 3.1 directly from those schemas.**

**The spec is written to `packages/contracts/openapi.json` and committed.**

**The Dart client is generated from it with `openapi-generator`, `dart-dio` generator, into
`apps/mobile/lib/api/generated/`, and committed.**

**Editing any generated file by hand is prohibited. CI regenerates both and fails on any
diff.**

## Consequences

- One declaration serves three purposes: runtime request validation, TypeScript types, and
  the published contract. A route cannot validate one shape while documenting another,
  because there is only one shape.
- Committing generated output means a reviewer sees the contract change in the diff of the PR
  that causes it. An API change that alters the client is visible as such, rather than
  appearing at build time in a later branch.
- The CI drift check is the enforcement. Without it, "prohibited" is a convention someone
  eventually breaks under time pressure; with it, the build stops.
- `dart-dio` brings Dio as the HTTP client for the Flutter app. That is a dependency chosen by
  this decision rather than on its own merits, and worth naming as such.
- Generated directories are excluded from lint and format rules — they are build output that
  happens to be committed, and holding them to hand-written standards would produce noise
  nobody may fix.
- Regeneration must be runnable locally, not only in CI, or the gate becomes something
  discovered after pushing rather than before.

## Items resolved

None additional. K4 was resolved by ADR-014; this supplies the toolchain that makes it
executable and closes the handoff gap where the gates named no commands.

## Items created

None.
