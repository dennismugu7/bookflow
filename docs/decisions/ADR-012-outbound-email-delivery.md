# ADR-012 — Outbound email delivery

**Status:** Accepted

## Context

The design docs describe a status change and its email as one action. Confirming a booking
is specified as "API call updating the booking record's status to confirmed" followed by
"Triggers an outbound confirmation email to the client", and the failure case collapses
both into a single line: "Inline error/toast if the status update **or** email dispatch
fails" (`DD-Bookflow-Native.md:713`).

That sentence hides the whole question. If the two are one transaction, a slow or
unreachable mail provider rolls back a booking change the owner legitimately made. If they
are two independent steps, a failed send leaves the client believing a cancelled booking
is still live, with nothing to retry it.

ADR-002 raised the stakes: the client's only route back into their own booking is a link
inside one of these emails. A dropped send is now a dropped access path, not just a
missing notification.

## Decision

Email is dispatched through a **transactional outbox**.

A booking status change writes **both the status and an outbox row inside the same
database transaction**. A **separate worker** delivers and retries.

The mail provider is **never called inside a request transaction**.

## Consequences

- The status change commits or does not, on its own merits. Provider latency and provider
  outages stop being able to fail a booking operation.
- Every email becomes durable and retryable by construction, including the ADR-002 magic
  link — the client's access path survives a provider outage rather than being lost with
  the request.
- A worker runtime now exists that did not before. Something has to run it, on some
  schedule, somewhere — which is a second infrastructure requirement on the platform
  choice, alongside ADR-007's booking-expiry mechanism (K51).
- Delivery becomes asynchronous, so the UI cannot honestly report "email sent" at the
  moment of the status change. What it reports instead is unspecified.
- Retry implies a failure ceiling. Without a dead-letter policy, a permanently
  undeliverable address retries forever and nothing surfaces it to anyone.
- Swapping mail providers is now contained to the worker, which narrows E1 from an
  architectural choice to a configuration one.

## Items resolved

E3 (email dispatch inside the transaction, or through an outbox). It was F.

## Items created

E11 — what runs the outbox worker, on what schedule, and in what runtime. Classified F,
since it constrains K1.
E12 — retry policy, backoff, failure ceiling and dead-letter handling. Classified S.
E13 — whether ADR-007's booking-expiry mechanism (K51) shares this worker or runs
separately. Classified S, downstream of E11 and K51.
