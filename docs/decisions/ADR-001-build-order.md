# ADR-001 — Build order

**Status:** Accepted

## Context

Bookflow is two clients over one backend: a native app used by the salon owner, and a
web app used by their clients. The README states the relationship plainly — the owner
"produces the data", the client "consumes" it. Every element of the client-facing salon
page (name, tagline, about, banner, team, portfolio, opening hours, services) originates
in the owner's app, and the web doc's Data Source Summary tables attribute all of it
back to "the mobile app".

A web app built first would have nothing real to render, and would force stub data whose
shape is a guess at a schema that has not been designed.

## Decision

Build in three phases, in order:

1. **Shared backend** — schema, auth, storage, the API surface both clients call.
2. **Native owner app** — the producer.
3. **Client web app** — the consumer.

The web app is not started until a real salon can be fully configured through the native
app against the real backend.

## Consequences

- The backend's foundation decisions (see `docs/analysis/05-triage.md`, F items) must be
  settled before phase 1 begins. They cannot be deferred into phase 2.
- Phase 2 delivers no client-visible value on its own. Nobody can book anything until
  phase 3 ships. This is accepted.
- Phase 3's seed data is real owner-entered data, not fixtures — which surfaces the
  empty-state and missing-field cases (K27, K16) as real conditions rather than
  hypotheticals.
- Web-only items (most of category G) stay unanswered longest, and that is correct;
  they are the last thing built.

## Items resolved

None. Build order sequences the work; it does not answer any product or technical
question in the triage.

## Items created

None.
