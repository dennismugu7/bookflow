# ADR-021 — Public salon handle

**Status:** Accepted

## Context

The native doc's share action copies "the unique string" to the clipboard and leaves the call
that produces it blank (`DD-Bookflow-Native.md:617`). The web doc never shows a route for the
salon profile page at all — only two speculative sub-routes below `/salon/{id}` — and notes
the page is "likely reached via direct link/QR code" (`Web:41`).

So the identifier that every salon distributes on WhatsApp and Instagram, and prints on a QR
code, was never specified. It was classified F because changing it later breaks every link
already shared and every code already printed.

ADR-016 narrowed it without closing it: primary keys are UUIDs, which are non-enumerable and
would serve — but a primary key cannot be rotated, and rotation is exactly what a public
identifier eventually needs. A salon renames. A salon shares a link and regrets it.

## Decision

Each business has an **owner-chosen public handle** used in its booking link.

- Lowercase `a–z`, digits, and hyphens.
- Three to thirty characters.
- May not start or end with a hyphen.
- Uniqueness is **case-insensitive**.
- A **reserved-word list** blocks route names and abuse-prone terms.

The handle is **not a primary key**; `business.id` remains a UUID per ADR-016.

Handles live in **their own table with a `current` flag**, so a rename inserts a new current
row and retires the old one.

**Retired handles redirect permanently to the current handle and are never reassignable to
another business.**

## Consequences

- Never reassigning is the load-bearing rule. A released handle claimed by a competitor turns
  every previously shared link, every printed QR code and every Instagram bio into traffic for
  someone else — a redirect the original owner cannot revoke and did not consent to.
- Permanent redirects mean old links keep working forever, so a rename costs the owner
  nothing and there is no reason to avoid one.
- Handles accumulate and are never garbage-collected. That is the accepted cost of never
  reassigning, and it is small.
- Reserving route names prevents a salon claiming a handle that collides with an application
  path, which would otherwise be discovered the first time someone adds a route.
- Case-insensitive uniqueness prevents two salons differing only by capitalisation — a
  phishing vector when the identifier appears in a shared link.
- The handle is public and human-readable, so it must not be derived from anything private.
  Owner-chosen rather than generated from the business name avoids leaking a name the owner
  later changes.

**Consequence for the designs:** the Business Branding onboarding step gains a handle field
with live availability checking. **No design specifies this** — the step currently collects
business name, tagline, about and banner, and nothing else.

## Items resolved

I4 (the salon's public identifier, and whether it can be rotated). It was F.

## Items created

K54 — the handle field on the Business Branding onboarding step, its live availability check,
and the contents of the reserved-word list. Classified S.
