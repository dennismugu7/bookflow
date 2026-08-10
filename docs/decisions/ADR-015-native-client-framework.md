# ADR-015 — Native client framework

**Status:** Accepted

## Context

The native design document mixes framework idioms from three ecosystems as if they coexist:
`navigation.navigate()` and `navigation.goBack()` (React Navigation), `useContacts()` and
`setIsLogOutModalOpen()` (React), Flutter's `BackdropFilter`, and the web's
`navigator.share()`. No framework was ever chosen; the document simply describes behaviour in
whichever vocabulary was to hand.

The choice fixes the module boundaries every one of the 27 screens sits inside, which is why
it was classified F.

The deciding screen is the Calendar tab. It renders a mini month picker above an hourly
week-grid with per-day columns and positioned booking blocks — and after ADR-006 and ADR-007,
those blocks carry a team member, a status, and an expiry state that all need visual
distinction. It is the most rendering-intensive surface in the app, and the designs demand
pixel fidelity against a specific visual language documented in `Styles-Reference.md`.

## Decision

**Flutter** for the owner app.

Accepted cost: **no shared types with the TypeScript backend.** Mitigated by ADR-014's
generated Dart client.

**iOS builds require cloud CI**, since the development machine is Windows.

## Consequences

- Flutter renders through its own engine rather than platform widgets, which is what makes
  pixel-fidelity across iOS and Android achievable for the calendar grid without per-platform
  divergence.
- The type gap is real and permanent. Nothing in the toolchain will tell us the API changed
  under the client; only ADR-014's generation step will, and only if CI enforces it. This ADR
  depends on that one.
- Windows as the development machine means iOS builds and signing never run locally. That is
  a CI requirement from day one, not a pre-release concern — the Project-Scaffolding manual's
  Phase 2 sets up CI before feature work, and this is now part of what it must set up.
- The local toolchain is already in place: spike 001 recorded Flutter 3.44.8 stable with Dart
  3.12.2 on the development machine.
- The design docs' React and web idioms are now confirmed as description, not specification,
  and should not be read as implementation guidance anywhere they appear.

## Items resolved

K3 (which framework for the native owner app). It was F.

## Items created

K53 — which cloud CI provider builds and signs iOS, and how signing credentials are managed
given no local macOS. Classified S.
