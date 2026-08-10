# ADR-004 — Publication gate

**Status:** Accepted

## Context

The design-doc author raised this directly on the Business Branding screen
(`DD-Bookflow-Native.md:240`): "Worth clarifying whether this data becomes visible on the
client webapp immediately upon save, or only once the full onboarding flow (all steps) is
completed and the salon 'goes live' — an owner may not want a half-finished profile (no
team members yet, no services yet) visible to real clients mid-setup."

The onboarding wizard makes this concrete. Three of its four content steps carry a Skip
action, and the author's own open questions establish that an owner can reach the
dashboard with zero team members, zero portfolio images and zero services. A salon in
that state is not a salon a client should be able to find, let alone book.

Every subsequent screen's "success" case in the source docs is qualified with the same
hedge — "subject to whether the salon's overall profile has gone live yet" — against a
gate that does not exist.

## Decision

Business data is private until the owner explicitly publishes.

A `published` flag on the business. Every public read filters on it. An unpublished
business is not reachable from the client web app at all — not by share link, not by
direct URL.

## Consequences

- A publish action and an unpublished state on the dashboard are **required, and are
  present in no design**. The owner needs somewhere to publish from and some indication
  of which state they are in.
- The filter is row-level and must be applied at the read boundary, not per-screen, or
  it will be missed somewhere.
- The zero-content empty states (K27) narrow: they now describe a salon that published
  with empty sections, which is a smaller and more deliberate case than an owner who
  simply has not finished.
- The share link can be generated before publication, which means it can be distributed
  before it resolves to anything. What it does in that window needs defining.

## Items resolved

K11 (is onboarding data public on save, or only once the salon goes live).

## Items created

K47 — what the publish action is, where it lives, and what the dashboard shows while
unpublished. Classified S.
K48 — whether a published business can be unpublished, and what happens to its live
share link and outstanding bookings when it is. Classified S.
