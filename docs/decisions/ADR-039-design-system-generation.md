# ADR-039 — The design system generation

**Status:** Accepted

## Context

`docs/designs/native/` holds 28 screenshots and `docs/source/Styles-Reference.md` describes the
visual language across them. PR 3a compiled that language into design tokens, and in doing so
found that **the screenshots do not all belong to the same visual language.**

Two incompatible systems are present. One uses a blue interactive colour, a green hero CTA, an
indigo gradient for brand moments and green initials avatars — exactly what the Styles Reference
describes. The other uses violet accents, black pill buttons, a pink avatar and pure black text,
and matches nothing written down anywhere.

This was not a question anyone had asked, because until a screen was built there was nothing to
be inconsistent with. It became blocking immediately: **ADR-032 makes screen #20, My Profile
Details, Phase 3's "one true page"**, and screen #20 is in the second group. Building it as drawn
would either contradict the tokens PR 3a just derived or force those tokens to be re-derived from
a design nobody specified.

## Decision

**Generation A is Bookflow's design system. Generation B is not.**

**Generation A** — blue actions (`#0278FF`), green CTA (`#2DE27E`), indigo hero gradient, green
initials avatars. Screens **`native-00` through `native-11`**: splash, the auth gateway, sign-up,
email verification, all four onboarding steps, login, both password-reset steps, and the
dashboard.

**Generation B** — violet accents (`~#5A40D8`), black pill buttons, a pink avatar (`#EC407A`),
pure black text. Screens **`native-16`, `native-19`, `native-20`, `native-23`, `native-24`,
`native-25`, `native-26`, `native-27`**: the profile and account menu, log-out confirmation, my
profile details, settings, change password, and the three account-deletion screens.

**Eight screens are unclassified** — `native-12`, `native-13`, `native-14`, `native-15`,
`native-17`, `native-18`, `native-21`, `native-22`. They carry no coloured action, so neither
discriminator fires. **They are classified when each is built, not now.**

**The eight Generation B screenshots remain structural references.** Layout, hierarchy, copy and
content stand. Colour and treatment come from the tokens.

## Rationale

**The deciding reason: Generation A is the only one with a written specification.**
`Styles-Reference.md` states a *system* — what the blue is for, why the green is rare, how radii
scale with element size, which tone carries which job. A screenshot shows an *instance*. When a
system and an instance disagree, the system is the thing that can be extended to the screens
nobody has drawn yet, and this project has more undrawn screens than drawn ones
(`docs/BUILD_LOG.md` §5). **Generation B is described nowhere.** Adopting it would mean deriving
a system from eight images by inference and then writing the specification afterwards, which is
how a design system becomes a collection of one-off screens.

**Secondarily, coverage.** Generation A is twelve screens and holds the entire acquisition path —
splash, sign-up, verification, onboarding, login, password reset, dashboard. Generation B is
eight screens, all inside the account area, reached only after a user is signed in and set up. If
one of the two has to be re-treated, re-treating the account area is the smaller loss.

**Note what this does not claim.** Generation B is not worse. It is more current-looking, and a
reasonable person could prefer it. This decision is not about taste — it is that only one of the
two comes with the rules needed to extend it, and a design system is the rules rather than the
pictures.

### The evidence

**Two discriminators**, counted across all 28 PNGs by decoding them and counting pixels:

1. **Action blue `#0278FF`** (tolerance 40). Styles-Reference §2 makes one blue do three jobs —
   primary buttons on white screens, input focus outlines, and every inline text link. A screen
   with actions and no blue is not describable by that document.
2. **Violet accent `~#5A3FD1`** (tolerance 40) and **large near-black fills** (`#0A0A0A`,
   tolerance 14), which are Generation B's button and link treatment.

Counts are from sampling every second pixel on both axes, so they are roughly a quarter of the
true pixel count; the ratios are what matter.

| Screen | blue | violet | black | Generation |
|---|---:|---:|---:|---|
| `native-00` splash | 0 | 0 | 0 | **A** — hero only; indigo gradient, no functional element |
| `native-01` welcome | 0 | 10 | 0 | **A** — indigo hero + `#2DE27E` CTA |
| `native-02` sign-up | 26,596 | 0 | 0 | **A** |
| `native-03` verification | 27,438 | 0 | 0 | **A** |
| `native-04` branding onboarding | 9,095 | 0 | 6 | **A** |
| `native-05` team onboarding | 9,095 | 0 | 3 | **A** |
| `native-06` portfolio onboarding | 9,095 | 0 | 7 | **A** |
| `native-07` hours onboarding | 9,365 | 0 | 0 | **A** |
| `native-08` login | 26,970 | 0 | 0 | **A** |
| `native-09` verify identity | 27,438 | 0 | 0 | **A** |
| `native-10` reset password | 8,917 | 0 | 0 | **A** |
| `native-11` dashboard | 15,734 | 0 | 569 | **A** |
| `native-12` bookings collapsed | 0 | 0 | 383 | unclassified |
| `native-13` bookings expanded | 338 | 0 | 349 | unclassified |
| `native-14` contacts | 0 | 0 | 357 | unclassified |
| `native-15` calendar | 0 | 0 | 443 | unclassified |
| `native-16` profile & account menu | 0 | **14,305** | 557 | **B** |
| `native-17` support (top) | 0 | 0 | 517 | unclassified |
| `native-18` support form | 0 | 0 | 369 | unclassified |
| `native-19` log-out modal | 0 | 0 | **15,132** | **B** |
| `native-20` **my profile details** | **0** | 22 | **2,890** | **B** |
| `native-21` services empty | 0 | 0 | 90 | unclassified |
| `native-22` services populated | 0 | 0 | 98 | unclassified |
| `native-23` settings | 0 | 0 | **2,198** | **B** |
| `native-24` change password | 0 | **1,418** | **29,309** | **B** |
| `native-25` delete account survey | 0 | 0 | **23,311** | **B** |
| `native-26` delete confirmation | 0 | 0 | **1,498** | **B** |
| `native-27` deletion success | 0 | 0 | **33,153** | **B** |

**Four independent signals put `native-20` — screen #20 — on the B side.** It is named in
`docs/analysis/01-screen-inventory.md:28` as Screen 12: My Profile Details, ADR-032's one true
page:

| Element | `native-20` | Styles Reference |
|---|---|---|
| "Edit" link | `#5A40D8` violet | §2: all inline links are blue |
| Heading | `#000000` pure black | §2: `#1A1A1A–#222222`; measured elsewhere at `#3A3A3A` |
| Avatar | `#EC407A` pink, 17,626 px, one lowercase initial | §2 and §7: "saturated grass/lime green", **two-letter** initials |
| Action blue | **0 px** | §2: the interactive colour on white |

The pink avatar appears in **no other screenshot** — 17,626 pixels in `native-20` and nothing
above noise anywhere else in the corpus.

### The document was written about a profile screen the corpus does not contain

This belongs in the record because it is the strongest evidence that the corpus is assembled from
more than one design pass, and it is not an inference from colour counts.

`Styles-Reference.md` describes the profile screen **three times**, and none of the three matches
`native-20`:

- **§2**, on the primary brand colour: it is used on "the splash screen, the entry/auth landing
  screen, and **the profile banner**". `native-20` has no banner; it is white to the edges.
- **§7**, on avatars: circles with "a solid green fill and bold white **two-letter** initials …
  and **enlarged on the profile page**". `native-20`'s avatar is pink, with one lowercase letter.
- **§8**, on imagery: the violet gradient texture sits behind "splash, landing, **profile
  banner**", and "the profile banner even integrates faint circuit-line/bubble motifs" — a detail
  specific enough that its author was looking at a real screen.

**So a profile screen with an indigo banner and an enlarged green avatar existed when that
document was written, and it is not in `docs/designs/native/`.** The document is not describing
`native-20` inaccurately; it is describing a different screen. That makes Generation B a later or
parallel pass whose screenshots displaced an earlier profile design, rather than a stray file —
and it means the Styles Reference is evidence about a design that the corpus has lost, not a
flawed reading of the one it has.

## Consequences

- **Screen #20 is built in Generation A.** A **blue** Edit link, a **green** initials avatar,
  `#3A3A3A` text. Its layout, its field order, its read-only-with-Edit-toggle behaviour and its
  copy come from `native-20`; none of its colour does. PR 3b implements this.
- **The eight Generation B screenshots are structural references only**, permanently. Anyone
  building settings, change password, log out, or the deletion flow takes layout, hierarchy and
  content from them and colour from the tokens. This is not a per-screen judgement to be remade.
- **The eight unclassified screens are left unclassified deliberately.** They carry no coloured
  action, so both discriminators are silent, and guessing now would be recording a conclusion
  drawn from absence. Each is classified when it is built — which is also when someone will be
  looking at it closely enough to tell.
- **The tokens in `apps/mobile/lib/theme/tokens.dart` are unaffected.** They were derived from
  Generation A screens, which this ADR confirms as correct. Deviations 2–7 in
  `docs/analysis/08-design-deviations.md` stand unchanged.
- **`native-20` will look wrong next to its own screenshot**, and that is expected rather than a
  bug to be reported. The deviations file records it so a reviewer comparing the built screen to
  the design does not raise it as a defect.
- **The lost profile design is not recoverable** and nobody should go looking for it. The banner
  treatment §2 and §8 describe is a design decision to be remade if wanted, and it is out of scope
  for Phase 3 — screen #20's job there is to prove the wiring, not to establish the profile's
  brand treatment.
- **If Generation B is later preferred**, that is a new ADR superseding this one, and its cost is
  re-deriving every token plus revisiting every screen built in the meantime. Recorded so the
  decision is made deliberately rather than by someone building one screen from a B screenshot
  and setting a precedent.

## Items resolved

**The Generation A/B contradiction**, raised by PR 3a and previously recorded only as an open note
in `docs/analysis/08-design-deviations.md`. That note understated the split — it said "screens
23–27", which omitted `native-16`, `native-19` and, critically, `native-20`. The file now cites
this ADR.

## Items created

None tracked. Two obligations are named above: classify the eight unclassified screens as they are
built, and treat any move to Generation B as a new ADR.
