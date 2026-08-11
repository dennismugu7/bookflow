# ADR-028 — Flutter client architecture

**Status:** Accepted · **Extends:** ADR-015

## Context

ADR-015 chose Flutter and stopped there. It settled the framework and named the cost — no
shared types with the TypeScript backend — but decided nothing about how the client is
organised inside that framework.

`CLAUDE.md` §4 fixes the module boundaries for `apps/api` in detail: vertical modules, a
service that holds all business logic, a repository that knows the database, routes that know
only HTTP. It says nothing at all about `apps/mobile`. That asymmetry was invisible for as long
as `apps/mobile` was an empty skeleton, and became blocking the moment Phase 3 proposed to
build the shell every later screen sits inside.

Tracked as **K61**, classified `F`: routing, state management and dependency injection are
module boundaries for the entire client, and changing them afterwards is not a refactor of one
screen.

## Decision

**Routing: `go_router`.** Declarative routes, and the auth-aware redirect between the
logged-out and logged-in shells expressed as a `redirect` on the router rather than as
navigation scattered through widgets. One place decides whether an unauthenticated user may be
where they are.

**State and dependency injection: Riverpod.** One concept, not two — a provider is both the
unit of state and the unit of injection, so there is no separate container to keep in step with
it. **No service locator.** Nothing reaches into a global registry to find a dependency;
dependencies arrive through provider composition, which means the dependency graph is
statically visible and a test overrides it by overriding a provider.

**All asynchronous UI state flows through `AsyncValue`, handled exhaustively.** Every screen
that awaits anything renders loading, error and data explicitly. No `if (isLoading)` flags, no
nullable-data-means-loading conventions.

**Screens never import `packages/bookflow_api` directly.** Each feature wraps the generated
client in a thin repository, and the repository is what the feature's providers depend on.

## Rationale

**On exhaustive `AsyncValue` handling.** `docs/source/Manual-Feature-Scaffolding.md` names
loading, empty and error as the three states "where junior work falls apart", and
`DEFINITION_OF_DONE.md` already requires every new screen to implement all three. A convention
alone does not enforce that — a reviewer has to notice the missing branch. Pattern-matching an
`AsyncValue` exhaustively makes an omitted state a **compile error instead of an oversight**,
which moves the guarantee from discipline to the toolchain. Empty is not an `AsyncValue` case
and remains the screen's own responsibility inside the data branch.

**On the generated-client rule — the one that matters most here.**
`packages/bookflow_api` is regenerated **wholesale** on every schema change (ADR-025), and CI
fails on any diff. A screen that imports a generated model is coupled to the generator's naming,
its null handling, its `built_value` builders and its choice of enum representation. When the
API adds a field, renames a response type, or the generator itself is upgraded, that coupling
surfaces in every screen at once. A thin repository per feature gives exactly one file per
feature that a regeneration can break, and it is the file whose job is to know about the wire
format. This is the same argument `CLAUDE.md` §4 already makes for the API's repository layer,
applied to the other side of the boundary.

**On Riverpod over the alternatives.** The deciding property is that it collapses state and
injection into one mechanism. A `Provider`/`get_it` split, or BLoC plus a separate locator,
means two graphs to keep aligned and two things to override in a test. It also composes with
`AsyncValue` natively, which is what makes the rule above cheap rather than ceremonial.

## Module layout for `apps/mobile`

Vertical feature folders, not horizontal layers — the same shape `CLAUDE.md` §4 mandates for
`apps/api`, so that a feature is one folder on both sides of the wire.

```
apps/mobile/lib/
├─ features/<feature>/
│  ├─ <feature>_repository.dart   wraps packages/bookflow_api; the only file that imports it
│  ├─ <feature>_providers.dart    Riverpod providers; state, and injection of the repository
│  ├─ <feature>_screen.dart       widgets; renders AsyncValue exhaustively
│  └─ <feature>_models.dart       view models, only where the generated model is a poor fit
├─ platform/                      api client construction · auth · storage · config · router
└─ app.dart                       MaterialApp, router wiring, top-level providers
```

How it maps to the API's layout, term by term:

| `apps/api` (`CLAUDE.md` §4) | `apps/mobile` | Same job |
|---|---|---|
| `<name>.repository.ts` | `<feature>_repository.dart` | Knows the data source and nothing else. On the API that is the database; on the client it is the generated HTTP client. |
| `<name>.service.ts` | `<feature>_providers.dart` | Holds the logic. On the client that is state derivation and orchestration, not business rules — those live server-side. |
| `<name>.routes.ts` | `<feature>_screen.dart` | Knows the delivery mechanism. Routes know HTTP; screens know widgets. Neither holds logic. |
| `platform/` | `platform/` | Cross-cutting infrastructure. No feature imports another feature's internals through it. |

The prohibition transfers in both directions: **screens hold no logic, repositories hold no
rules, providers know nothing about widgets.** A feature adds a folder under `features/`. It
does not add a file to four different top-level directories.

## Consequences

- **Three dependencies enter the client** — `go_router`, `flutter_riverpod`, and Riverpod's
  code generation if used. Each is a long-lived commitment; replacing any of them later is a
  rewrite of the shell, which is precisely why this is an `F` decision rather than a preference.
- **The repository-per-feature rule costs a file per feature** that does nothing but translate.
  Accepted deliberately: that file is the blast radius of a regeneration.
- **Riverpod has a learning curve**, and its provider-scoping rules are easy to get subtly
  wrong. The mitigation is that the shell built in Phase 3 is the worked example every later
  feature copies — which is what the manual's Phase 3 is for.
- **`CLAUDE.md` §4 now covers both apps**, and §5 gains the two rules that a reviewer has to be
  able to check without reading this ADR.
- **Nothing here decides testing conventions for providers.** `flutter_test` and
  `ProviderContainer` overrides are the obvious path, but the pattern is set by Phase 3's shell
  rather than by this decision.

## Items resolved

**K61** (Flutter client architecture — routing, state management, dependency injection, and the
loading / empty / error conventions every screen inherits). It was `F`.

## Items created

None.
