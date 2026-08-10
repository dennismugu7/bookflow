# ADR-005 — Target market

**Status:** Accepted

## Context

The two design docs disagree about where this product is sold. The native doc uses KES
throughout and a Kenyan phone number (0701408727). The web doc uses Greek addresses
("Delfon 8, Peristeri."), Greek and Arabic team member names, a "€9" price sitting beside
a "KES 400" summary bar, and gives explicit RTL rendering instructions for the bilingual
name pattern.

This single unanswered question is upstream of four others: currency, timezone, payment
channel, and script support. Left open, each of those has to be built for the general
case — which means a currency column, a per-business timezone, a two-part name field, and
bidirectional text handling, none of which any real v1 user needs.

## Decision

**Kenya only for v1.**

- **Currency** is KES. Not configurable.
- **Timezone** is Africa/Nairobi, which observes no DST. Not stored per business.
- **Script** is Latin only. Team member names are a single field.
- **Phone validation** assumes Kenyan format.

The Greek and Arabic names and the € price in `DD-Bookflow-Web.md` are mockup artifacts,
not requirements.

## Consequences

- Timezone becomes an application constant rather than stored data. A second market later
  is a migration — this is the deliberate trade, taken because Africa/Nairobi has no DST
  and a fixed offset removes an entire class of correctness bug from v1.
- No currency column on any money value. Adding one later is additive, but every existing
  row must be backfilled as KES.
- The web app's RTL and bilingual-name requirements are dropped from scope. If they return,
  the name field must be split — and the second script was never captured, so owners
  re-enter their rosters.
- Language is not fully settled by this ADR. Kenya is English and Swahili, both Latin
  script; whether v1 UI copy is English-only remains open (J3).
- M-Pesa becomes the realistic deposit channel, though this ADR does not choose it (B2).

## Items resolved

J1 (target market), J2 (name one field or two), D1 (what carries a timezone),
D3 (DST), D6 (whose "today"), C1 (currency configurable), C4 (multi-currency),
J4 (RTL in owner app), J6 (validation locale).

## Items created

None.
