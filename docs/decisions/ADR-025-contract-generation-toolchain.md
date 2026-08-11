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

## Amendments

**2026-08-11 — openapi-generator runs as a container, and the client is
post-processed into the app package.**

Two implementation details this ADR did not settle, recorded here rather than
left to be rediscovered. Neither reverses the decision above: the generator,
the `dart-dio` generator and the output path are all unchanged.

**1. The generator runs through its Docker image, not a local JDK.**
openapi-generator is a Java program, and this ADR names the tool without saying
how to invoke it. ADR-022 already requires Docker Desktop for the Supabase
stack, so a container costs nothing new; installing a JDK would add a language
runtime nothing else in the project needs, plus a second version to keep
aligned between the development machine and CI. The image is pinned
(`openapitools/openapi-generator-cli:v7.16.0`) for the same reason the Supabase
CLI and the Flutter version are pinned.

Consequence: contract generation cannot run without Docker. That is already
true of the integration tests, so it adds no new prerequisite — but it does
mean `npm run contracts:generate` is not available on a machine with Docker
stopped, and the error will be Docker's rather than something friendlier.

**2. The generated client is relocated into the app package, with its import
prefix rewritten.** `dart-dio` emits a standalone Dart *package* — its own
pubspec, its own `lib/`, and imports of the form `package:bookflow_api/src/…`.
This ADR puts the client at `apps/mobile/lib/api/generated/`, inside the app's
own package, where those imports do not resolve.

`scripts/generate-dart-client.mjs` therefore copies the generated `lib/` into
place and rewrites exactly one thing: the package prefix. The generator's
pubspec, README and test scaffolding are discarded, and the runtime
dependencies it declares are mirrored into `apps/mobile/pubspec.yaml` by hand —
that pubspec is the one hand-maintained artifact in this pipeline, and a
generator upgrade that changes its dependencies will not update it
automatically.

The rewrite is mechanical, total, and re-run on every generation, and CI's
drift check covers its output. It is not a hand edit of a model: no human
writes or repairs a line of the client, and any attempt would be overwritten by
the next generation and caught by the drift check before merge.

`dart-dio` also requires `build_runner` to emit the `.g.dart` half of every
`built_value` model. That run is part of generation rather than a separate step,
because the client does not compile without it.
