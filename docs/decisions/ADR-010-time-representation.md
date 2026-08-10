# ADR-010 — Time representation

**Status:** Accepted

## Context

Neither document names a date or time type. Both render time only as display strings, and
they disagree even about that — "July 22, 2026. 10 AM" in the native app against
"Sat, 8 Aug 2026 at 20:56" and "10:00 - 24:00" in the web app.

The system holds two things that both look like "time" and are not the same kind of
value. A booking happens at a moment. Opening hours do not — "we open at 10" is a rule
that produces a different moment on every date it is applied to.

ADR-007 sharpened this: the exclusion constraint operates on a booking's time range, so
its type is load-bearing rather than cosmetic, and per-team-member schedules add a second
population of recurring wall-clock values.

## Decision

Two distinct kinds of time, stored differently and never interchanged.

**Instants** — booking start and end, `created_at`, expiry timestamps — stored as
`timestamptz` in UTC.

**Recurring wall-clock** — business opening hours, team member schedules — stored as
day-of-week plus a plain time value, interpreted in the business's timezone, which
ADR-005 fixes to Africa/Nairobi.

A **single formatting helper owns all display**, per ADR-005's Kenya-only rendering.

## Consequences

- "We open at 10" survives being asked about any date, which a stored timestamp would
  not.
- The exclusion constraint in ADR-007 operates over a `timestamptz` range — a native range
  type, not a pair of loose columns.
- Because ADR-005 makes the timezone an application constant rather than a per-business
  column, "the business's timezone" is a single configured value. A second market means
  adding that column and backfilling it, which is the trade ADR-005 already named.
- Africa/Nairobi has no DST, so the conversion between the two representations is a fixed
  offset in v1. That is what makes this split cheap now and is exactly what stops being
  true if the market changes.
- A schedule row that crosses midnight has no representation under day-of-week plus plain
  time. A10 now has to answer that explicitly rather than leaving it implied.
- An omitted day is literally an absent row, which gives A6 a concrete shape to decide
  against.

## Items resolved

D2 (storage format for instants versus recurring wall-clock hours). It was F.

## Items created

None. A10 (midnight-crossing rows) and A6 (omitted days) both narrow to concrete
questions about this representation, and both remain S.
