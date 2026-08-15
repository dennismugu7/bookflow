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
| 2 | `Styles-Reference.md` §2: the CTA green is "roughly **#3DD68C–#4CD98F**". | **#2DE27E.** | Measured from `native-01`, where it is **63.4%** of the button's pixels — a flat fill, not an antialiasing artefact. The drawn colour is brighter and more saturated than either end of the documented range. The screenshot is the artefact; the prose is written about it. | PR 3a |
| 3 | §2: the hero gradient moves between a deep blue-violet and "a brighter periwinkle-violet (roughly **#5A3FD1–#6C4FE0**)". | **A two-stop gradient inside the deep range only: #231973 → #3D2C8F.** | **The periwinkle end is not in either hero screen.** Sampled across `native-00` (splash) and `native-01` (welcome), the gradient runs from #1D1066 to #3D2C8F and no further. A search of all 28 native screenshots for a pixel within 30 of #5A3FD1 found matches in only three — `native-16`, `native-20` and `native-24` — and none of those is a hero background. Building the documented range would produce a gradient no screenshot shows. | PR 3a |
| 4 | §2: primary text is "near-black charcoal (**#1A1A1A–#222222**)". | **#3A3A3A.** | Measured as the dominant glyph fill on `native-02`, `native-03` and `native-04` — thousands of pixels each, so it is the fill and not an edge. Materially lighter than documented, consistently, across every screen sampled. | PR 3a |
| 5 | §2: body text is a distinct "medium gray (#6B7280–#8A8F98)", separate from heading charcoal. | **The token exists at #6B7280, but the screens do not use a separate body tone** — they set body copy in the same #3A3A3A as headings. | Recorded as a deviation in the honest direction: the token is kept because a secondary tone is genuinely needed (helper text, captions) and the darker end is the only one that clears WCAG AA on white for small text. But **no screenshot corroborates it**, and a reviewer should know the two-tier text ramp is documented rather than drawn. | PR 3a |
| 6 | §2: borders are "pale gray-blue (#D6E0F0–#E2E8F0), thin (1px) hairlines". | **Input borders at #8BBEFD**; card hairlines keep the documented #E2E8F0. | The resting border of the verification input in `native-03` is a distinctly blue #8BBEFD/#8FC1FE, far more saturated than the documented pale gray-blue. Card borders could not be sampled honestly — they are sub-pixel at this resolution — so those keep the documented value and are marked unverified in `tokens.dart`. | PR 3a |
| 7 | §3: the wordmark is "a rounded, geometric, extra-bold sans-serif … similar in spirit to **Poppins ExtraBold or Baloo**". | **The platform default font**, at weight 800. | The app ships no font assets. Meeting this means licensing and bundling a face, which is a decision with a size cost and a licence attached, not an implementation detail. It is a real visible difference on the splash and welcome screens — the two that are pure brand. **Open**: revisit before any public release. | PR 3a |

## The design corpus contradicts itself, and that is not a deviation

Entries 2–7 are all cases where `Styles-Reference.md` and the screenshots disagree, and the
screenshot wins. There is a **separate** problem, recorded here because it is where a reader will
look for it, and it is not a deviation because nothing has been built against it yet.

**Screens 23–27 are drawn in a different visual language from screens 00–22.** `native-24`
(Change password) has a **black** pill submit button, **violet** links and a **violet** input
focus border. `Styles-Reference.md` §2 and §4 are unambiguous that the primary functional button
is blue, that links are blue, and that focus intensifies to blue. Both cannot be the system.

This is not resolved here. Whoever builds the settings, change-password and delete-account
screens has to decide whether those five screenshots are a newer direction that supersedes the
style reference, or a stray generation to be ignored — and that is a decision with an ADR behind
it, not something to infer from whichever file was opened first. **PR 3a builds none of those
screens**, so nothing was decided by default.

## How to add an entry

Only when an ADR has decided the deviation. State what the design says, what is built instead,
and the reason — in that order, so a reader who knows only the design can find themselves in the
first column. If the reason is "the platform cannot do it", say which platform and what it does
instead; if it is "the design contradicts itself", cite both places.
