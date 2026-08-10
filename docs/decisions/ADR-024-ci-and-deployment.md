# ADR-024 — CI and deployment

**Status:** Accepted

## Context

K53 asked which cloud CI provider builds and signs iOS, and how signing credentials are
managed given no local macOS. It was created by ADR-015 (Flutter on a Windows development
machine) and classified S, blocking Phase 2 — the project manual stands CI up before feature
work, not after.

The broader CI provider was never chosen either, and `DEFINITION_OF_DONE.md` already makes
"CI is green end to end" and "regenerated client shows no uncommitted diff" hard gates. Those
gates need somewhere to run.

## Decision

**GitHub Actions. One CI system for everything.**

**On every push:** install → lint → type-check → unit tests → integration tests against a
Postgres service container → contract regeneration drift check → build. **A drift in the
regenerated OpenAPI spec or Dart client fails the build.**

**Flutter job:** `flutter analyze`, `flutter test`, Android build.

**iOS:** a **macOS runner**, with signing credentials supplied as encrypted secrets and
imported at build time.

**Deployment target is Fly.io.** The API and the worker are **two processes from one image**,
per ADR-013. **Staging deploys automatically on merge to `main`; production deploys on a tag.**

## Consequences

- **CI is the only mechanism by which an iOS artifact can exist.** The development machine is
  Windows; there is no local fallback, no "just build it manually" path, and a broken iOS job
  means no iOS build at all rather than a slower one.
- **macOS runner minutes are billable on private repositories** and cost several times what
  Linux minutes do. The iOS job should not run on every push to every branch; that scoping is
  a Phase 2 implementation detail, but the cost is a standing constraint, not a surprise.
- Signing credentials in encrypted secrets means the certificate and provisioning profile
  exist in exactly one place, and rotating them is a secrets change rather than a machine
  visit.
- The drift check is what makes ADR-014's "hand-written Dart models are prohibited"
  enforceable. Without it the prohibition is a convention; with it, it is a build failure.
- Integration tests against a service container rather than a shared database means CI runs
  are isolated and parallel-safe.
- One image with two processes keeps the worker and the API on identical code, which is what
  ADR-013 requires when the worker shares the service layer.
- Deploy-on-tag for production means releases are deliberate acts, and the tag is the record
  of what shipped.

## Items resolved

K53 (iOS CI provider and signing credential management). It was S, and it was the only item
blocking Phase 2.

## Items created

None.
