# ADR-011 — Asset storage and access

**Status:** Accepted

## Context

The native doc infers a storage requirement rather than specifying one: assets "need to
land in storage that the client webapp can read directly and quickly — typically a public
CDN-backed bucket rather than private storage, since unauthenticated visitors need to
load this banner" (`DD-Bookflow-Native.md:228`).

That reasoning is applied uniformly, and it is wrong for one asset. The client-uploaded
proof-of-payment file is the only private object in the system — a financial document
belonging to a client, readable only by one salon owner — and the document discusses it
in the same breath as the business banner, with no distinction in access rules.

Separately, the portfolio's multiplicity was never settled. The onboarding screen shows a
single compact upload button with no thumbnail grid, no "+", and no counter, while the web
app renders a nine-image grid with a count badge.

## Decision

**Two buckets.**

A **public, CDN-fronted bucket** with content-hashed immutable paths holds brand assets:
business banner, team member photos, portfolio images, owner avatar. Replacing an asset
writes a new object; nothing is mutated in place, so cache invalidation is never required.

A **private bucket with no public read** holds client-uploaded payment proofs. They are
reachable only through an endpoint that applies the ADR-003 membership scoping rule and
verifies the booking belongs to the requesting business, returning a short-lived signed
URL. No payment proof is ever served from a guessable path.

The **portfolio is a child table of images with an explicit sort order**, not a single
column on the business.

## Consequences

- Immutable paths mean a URL, once emitted into the client webapp or an email, stays
  valid and correct forever. It also means replaced objects are never overwritten and
  accumulate until something removes them.
- The two buckets have genuinely different threat models, which is why they are two
  buckets rather than one with a prefix convention that a future careless write could
  ignore.
- Serving payment proofs through an authorizing endpoint makes them the one asset class
  that cannot be fetched without going through the ADR-003 scoping rule — so I3b's
  enforcement point now also governs file access, not just data access.
- The signed URL needs a lifetime. Too long and it is a bearer token for a financial
  document; too short and a slow connection fails to load it.
- The portfolio child table gives F6 (reorder) a data operation to hang off, though the
  management screen still does not exist anywhere.

## Items resolved

F1 (storage provider and URL model), F3 (payment-proof access rule),
F7 (portfolio one image or many). All three were F.

## Items created

F11 — the signed URL's lifetime for payment proofs. Classified S.
F12 — cleanup of objects orphaned when an asset is replaced, given immutable paths never
overwrite. Classified D.
