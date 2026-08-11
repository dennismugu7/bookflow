# ADR-035 — Language scope

**Status:** Accepted

## Context

ADR-005 narrowed v1 to Kenya, KES and Africa/Nairobi, and ruled RTL and non-Latin script out of
scope. It did not say whether the interface is English only or English and Swahili — both are
widely used in Kenya, and Swahili is a co-official language.

The question became blocking because Phase 3 builds the Flutter shell (ADR-028). Routing,
layout and every widget the shell establishes are the things internationalisation threads
through, and retrofitting it afterwards is materially more expensive than allowing for it now.

Tracked as **J3**.

## Decision

**English only for v1.**

**No internationalisation wiring, no resource extraction, no locale files.** Strings live where
they are used. No `AppLocalizations`, no ARB files, no `intl` message extraction, no
`Localizations` delegate beyond what Flutter provides by default.

## Rationale

**Every string in both design documents is English.** The native document and the web document
were written by the product's author, for this market, and neither contains a Swahili string or
a note that one is expected. Building a translation mechanism for a translation nobody has asked
for and nobody has written is building for a hypothesis.

**This is the same trade ADR-005 already made**, applied consistently: buy what cannot be
retrofitted, defer what cannot be validated. ADR-005 bought a single currency and a single
timezone because a second market would force a migration and a backfill — structural changes to
stored data. It deferred multi-currency because the need was speculative. Language sits on the
deferrable side of that line: **no stored data changes when a second language is added.** The
cost is entirely in the presentation layer.

**And the deferred cost is real, not zero** — see the accepted risk below. This is not a claim
that i18n is cheap later; it is a judgement that paying now, for a language nobody has
specified, against a market nobody has tested, is worse than paying more later against a real
demand signal.

## Consequences

- **Accepted risk, stated plainly: adding Swahili later means threading internationalisation
  through a shell that has already been built.** Every screen's strings have to be extracted,
  every widget that hardcodes text has to be found, and the layout has to survive strings of a
  different length. That is expensive, it touches every screen, and it is exactly the work this
  decision declines to do now. **The trigger for revisiting is demand from real owners** — an
  owner who cannot use the app in English, or asks — **not speculation** and not a competitor
  doing it.
- **Email templates are English too**, on both paths ADR-027 establishes. K69's
  branding-consistency question inherits this: one language, two template systems.
- **Nothing prevents a Swahili string appearing by accident** — no lint rule, no extraction step
  that would flag it. Consistency is a review matter.
- **ADR-005's Latin-script constraint is unaffected and still load-bearing.** Swahili is written
  in Latin script, so a future second language does not reopen J2's one-name-field decision or
  J4's no-RTL decision. The deferred work is presentation only, which is what makes deferring it
  defensible.
- **J5** (whether UI strings and email templates are translated) is answered for v1 by the same
  reasoning and stays `D` for what comes after.

## Items resolved

**J3** (English-only, or English and Swahili). It was `S`. English only.

## Items created

None.
