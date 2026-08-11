> Derived record, not source. `docs/source/` is authoritative on intent; this file records where
> the build deliberately departs from it, and why.

# Design deviations

Places where what gets built differs from what `docs/source/DD-Bookflow-Native.md` or
`DD-Bookflow-Web.md` specifies.

**Every entry is deliberate and cites the ADR that decided it.** This file records deviations;
it does not create them. A difference that is not listed here is a bug or an oversight, not a
decision — which is the whole point of keeping the list.

**It is not a list of gaps.** Screens the design never specified are tracked in
`docs/BUILD_LOG.md` §5, and open questions in `docs/analysis/05-triage.md`. This file is only
for cases where the design *does* say something and the build does something else.

| # | Design says | Build does | Why | Decided by |
|---|---|---|---|---|
| 1 | The Email Verification screen shows an **eight-digit** code. | **Six digits.** The screen shows six input boxes. | GoTrue issues six, and its OTP length is a configured range rather than an arbitrary one — eight would mean replacing the mechanism ADR-027 just decided not to own. The design document's own author also questioned eight at `DD-Bookflow-Native.md:122`, as more error-prone to transcribe than a typical four-to-six-digit OTP. The platform and the document's own reservation agree. | ADR-030 |

## How to add an entry

Only when an ADR has decided the deviation. State what the design says, what is built instead,
and the reason — in that order, so a reader who knows only the design can find themselves in the
first column. If the reason is "the platform cannot do it", say which platform and what it does
instead; if it is "the design contradicts itself", cite both places.
