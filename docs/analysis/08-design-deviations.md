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

## The design corpus contains two visual languages — resolved by ADR-039

Entries 2–7 are cases where `Styles-Reference.md` and the screenshots disagree, and the screenshot
wins. Entry 8 is a different kind of thing: a case where **two screenshots disagree with each
other.**

**ADR-039 decides it. Generation A is Bookflow's design system; Generation B is not.**

| | Screens | Treatment |
|---|---|---|
| **Generation A** — the system | `native-00`–`native-11`: splash, auth gateway, sign-up, verification, all four onboarding steps, login, both password-reset steps, dashboard | Blue actions `#0278FF`, green CTA `#2DE27E`, indigo hero, green initials avatars. **This is what the tokens are derived from.** |
| **Generation B** — structural reference only | `native-16`, `native-19`, **`native-20`**, `native-23`, `native-24`, `native-25`, `native-26`, `native-27`: profile & account menu, log-out modal, **my profile details**, settings, change password, the three deletion screens | Violet accents `~#5A40D8`, black pill buttons, pink avatar `#EC407A`, pure black text. **Layout, hierarchy and content stand; colour and treatment come from the tokens.** |
| **Unclassified** | `native-12`–`native-15`, `native-17`, `native-18`, `native-21`, `native-22` | No coloured action, so neither discriminator fires. Classified when each is built, not guessed at now. |

**An earlier version of this section said "screens 23–27".** That was drawn from one opened
screenshot and a colour search, and it was wrong in the way that mattered: it omitted `native-16`,
`native-19` and above all **`native-20` — which is screen #20, ADR-032's one true page and PR 3b's
entire job.** ADR-039 carries the per-screen measurements.

**Why Generation A wins:** it is the only one with a written specification. `Styles-Reference.md`
states a system — what the blue is for, why the green stays rare, how radii scale. Generation B is
described nowhere, so adopting it would mean inferring a system from eight images and writing the
rules afterwards. ADR-039 also records the strongest evidence that the corpus was assembled from
more than one design pass: §2, §7 and §8 all describe a profile screen with an **indigo banner**
and an **enlarged green avatar**, which `native-20` is not — so the document was written about a
profile screen the corpus no longer contains.

| # | Design says | Build does | Why | Decided by |
|---|---|---|---|---|
| 8 | `native-20` (screen #20, My Profile Details) shows a **violet** "Edit" link, a **pink** avatar with one lowercase initial, and **pure black** headings. | **A green `#5FBF3F` avatar with two-letter initials and `#3A3A3A` text.** Layout, field order, the divider, the centred avatar above the name, and the copy are taken from the screenshot unchanged. | `native-20` is Generation B, which ADR-039 rules is not the design system. Four independent signals place it there: zero pixels of action blue, a `#5A40D8` link, a `#000000` heading, and a `#EC407A` avatar that appears in no other screenshot in the corpus. **The built screen will not match its own screenshot, and that is expected** — a reviewer comparing the two should not raise it as a defect. `docs/designs/built/native-20-profile.png` is the built screen, rendered, for that comparison. | ADR-039 |
| 9 | `native-20` shows an **"Edit" link** in the card's top-right and a **pencil badge** on the avatar. | **Neither is rendered.** The screen is read-only. | There is no `PATCH /v1/me` and no avatar-upload endpoint, so nothing either control could do exists. **A visible control that does nothing is worse than an absent one** — it is a promise the app does not keep, and it costs a support conversation rather than a missing feature. Deferred to the profile-editing slice with the endpoints it needs; tracked as **K75**. Note this is a deviation of a *different kind* from the rest of this file: not "the design says X and we build Y", but "the design says X and we build nothing yet". | PR 3b |

## The business-setup slice — ten entries, and where each was recorded before this

**Ten, in two groups.** Entries **10–16** are the seven the slice had already decided, reconciled
from the documents and the code below. Entries **17–19**, in the section after them, are three
differences the reconciliation *found* — real, visible, and decided by nobody — which were ruled
on the following day. **The second group is the argument for the first:** counting produced three
decisions that would otherwise have gone on being defaults.

Entries 10–16 are the business-setup slice's, added by task T11. **They were reconciled before
they were written, and the reconciliation is the part worth keeping**: five of the seven were
recorded in the slice's Phase 0 and Phase 1 documents, which is where the count of "five" came
from. **The other two were decided at the code and recorded only in a Dart source comment** —
`create_business_screen.dart` calls itself "the sixth recorded design deviation" and
`dashboard_screen.dart` "the seventh", and no document knew either existed. A source comment is
better than a conversation and worse than this file: nobody reviewing the design against the build
opens a widget to find out what was deliberate.

**The slice's own ordinals are preserved here so those comments stay findable**: this slice's
first through seventh are entries **10 through 16**, in that order.

| # | Design says | Build does | Why | Decided by |
|---|---|---|---|---|
| 10 | `native-04`, `DD-Bookflow-Native.md:181-189` — screen #5 draws **four form fields**: Business name (required), Business Tagline (optional), About (optional), and a Business banner upload (optional). | **One field: Business name.** | Decision 1 ships name only. `public.businesses` holds `id`, `name`, `published`, `created_at`, `updated_at` and nothing else, so Tagline and About are a migration, and the banner is a migration **plus** ADR-011's bucket choice and F2's formats and size limits. All three are the later branding slice's work, which `00-frame.md` §4 names as what closes this entry. **Anyone reading the design against the running app will find three specified fields absent, and that is expected rather than a defect.** | `00-frame.md` decision 1 |
| 11 | `:173` — "**Navigation:** Back arrow icon (←) at the top-left corner", whose action is "Returns to the previous onboarding step, dismissing this sheet" (`:203`). | **No back arrow.** | Decision 6: screens #6–#8 are non-goals, so an owner arriving from sign-up has no previous onboarding step — the control's only specified action has nowhere to go. Criterion 29 pins the absence. Flutter draws a leading widget only when there is something to pop, so nothing supplies one by default and the omission is not load-bearing on a `leading: null`. | `00-frame.md` decision 6 |
| 12 | `:587-596` — the dashboard has **one** empty state, keyed on the bookings array: "No Bookings yet", *"Share your booking link on WhatsApp or Instagram, and appointments will land here automatically"*, and a full-width "Share your booking link ›" bottom action bar. | **A second empty state, keyed on setup completeness.** While the business is unpublished the dashboard shows a setup-continuation state — where the owner is in setup and what remains — and shows neither the share-link prompt nor the button. | For a business with no services and nothing published **both designed statements are false**: nothing will land automatically, and the link leads to a page with nothing bookable. This slice creates exactly that business and routes the owner to that screen, which is why ADR-041's created-condition test made K47's what-is-shown-while-unpublished clause this slice's question rather than the dashboard slice's. Criteria 26, 27, 28 and 47. | `00-frame.md` §5's K47 answer · ADR-041 |
| 13 | `native-20` is drawn as one card of personal fields with a single "Edit" affordance. The design calls its destination the "Personal/Business Information Management page" (`:962`) but draws no Business half. | **A Business section beneath the personal card**, carrying the business name and a **working** edit affordance — on a screen whose personal fields have no working one (entry 9). | Decision 4 makes the name renameable, and an API-only rename does not satisfy its reason: an owner does not hold a token. Decision 11 puts the surface here because #20 is the only built screen and the design's own routing text already names Business as living there — #17 is a menu with no business section to extend, and #23 is app-level by content. **The cost is recorded rather than glossed:** this ships a screen whose business section is editable and whose personal section is not, which is odd to look at and is the strongest argument against the decision. K75 is not fixed here — profile editing needs a `PATCH /v1/me` that does not exist. The section is visually subordinate, under its own heading, so the working control reads as belonging to the business block rather than as an inconsistency inside one card. Criteria 52–54. | `00-frame.md` decision 11 |
| 14 | `:945-952` — screen #17 draws **five rows**: Profile, My services, Settings and Support in a grouped card, and Log out in a standalone card. | **Two rows: Profile and Log out.** | My services (#21/#22), Settings (#23) and Support (#18) do not exist. **This is entry 9's lesson applied before the mistake rather than after** — a visible control that does nothing is a promise the app does not keep — and drawing all five would make that promise three times on one screen. Rows arrive with the screens they lead to. Criterion 56 pins that no row has a destination that does not exist. | `00-frame.md` decision 12 |
| 15 | Screen #5's only specified exit is the back arrow (`:173`, `:203`). With that arrow gone by entry 11, the design leaves the screen with **no exit at all**. | **A "Sign out" control at the foot of the form.** | `/setup` is the only destination the redirect allows an owner with no business, so a screen with no exit is an app with no exit **for that owner**. The stub this screen replaces carried the only sign-out they could reach, and removing it silently would have been a regression nothing tested for — criterion 57 covers only an owner *with* a business. **Criterion 61 was appended for exactly this half**, and pins it. | Business setup, T6 — until now recorded only in `create_business_screen.dart` |
| 16 | `:581-586` — the dashboard's top navigation bar is a **pill segmented control** — "Bookings" (selected), "Contacts", "Calendar" — with the profile avatar on the far right. | **The avatar only**, under an app bar titled "Bookflow". | All three tabs lead to dashboard views this slice excludes, so decision 12's rule for screen #17's rows applies unchanged: a control whose destination does not exist is omitted, not drawn inert. It would be entry 14's promise three times over, on a different screen, for the same reason. **No criterion pins this one** — it is asserted by the test named *"the seventh deviation — no Bookings, Contacts or Calendar tabs"* in `dashboard_account_test.dart`, and that test name is the only thing standing between this and an oversight. | Business setup, T7+T8 — until now recorded only in `dashboard_screen.dart` |

### Three more, found in the same pass and ruled on the next day

**These three were found while reconciling the seven above, and for one day they sat in this file
as named-but-not-entered**, because no ADR, document or source comment decided any of them and
entering an undecided difference as a deviation invents the decision this register exists to
catch. **Dennis ruled on all three on 2026-08-18**, and they are entries 17–19. The paragraph
above is kept rather than replaced by the answers, because the interval is the record: a
difference can be real, visible in the build, and decided by nobody, and the only reason these
three are not still in that state is that somebody counted.

**One of them could not be ruled on as asked, and that is where criterion 62 came from.** Entry
19's reason is that the app bar's back affordance makes the design's Home button redundant — a
reason that rests on the back path existing. **It did exist and nothing held it there:** screen
#17 declared no `leading:`, and the arrow came from `AppBar.automaticallyImplyLeading`, which
supplies one only while the route can pop. A probe confirmed it was rendering
(`onAccount=1 backButtons=1 arrowIcons=1`, the first count being the control). The affordance is
now explicit in `account_menu_screen.dart` and pinned by **criterion 62**, so entry 19's reason is
now a property something asserts rather than a framework default nobody had noticed.

| # | Design says | Build does | Why | Decided by |
|---|---|---|---|---|
| 17 | `:172` — screen #5 is a *"**Sheet Interface:** Slide-up bottom sheet with a grab handle indicator centered at the top"*, whose back arrow *"Returns to the previous onboarding step, **dismissing this sheet**"* (`:203`). | **A full-screen route** at `/setup`, with an app bar titled "Your business" — a title the design does not contain — and no grab handle. | **A sheet is presented over something, and there is nothing behind this one.** An owner arriving from sign-up has no previous onboarding step: entry 11 removed the back arrow for that reason, and the same fact removes the surface the sheet would slide up over. ADR-042 settles what `/setup` is — a **shell**, selected by the redirect because the account has no membership, not a thing pushed over a screen the owner was looking at. A sheet over an empty backdrop is a full screen wearing a grab handle. **This becomes reviewable again when screens #6–#8 exist**: with a multi-step flow there is a sheet stack to belong to, and the presentation is worth revisiting then rather than now. | Dennis, 2026-08-18 · ADR-042 |
| 18 | `:980` — Log out *"Shows a confirmation alert/dialog (e.g., 'Are you sure you want to log out?'). Upon confirmation, clears local storage/tokens and redirects to Screen 2"*, and `native-19` is a whole screenshot of that modal. | **Sign-out on tap, with no confirmation.** | **DEFERRED, NOT REJECTED — and the distinction is the entry.** Sign-out has never been confirmed in this app: before this slice it was screen #20's back arrow, which signed out immediately and said so in a comment. **So nothing regresses here** — the control moved to the row the design puts it on, and kept the behaviour it already had. The confirmation is a screen of its own (`native-19`) and belongs with the slice that builds #17's other three rows, where it is one modal among several rather than a modal built for one row. **What makes this safe to defer is that sign-out is not destructive**: it ends a session, and the owner signs back in. It would not be deferrable on `native-25`–`27`, the deletion screens. | Dennis, 2026-08-18 |
| 19 | `:953-954` — screen #17 carries a *"**Bottom Global Navigation:** Home Icon Button: Centered navigation icon labeled **'Home'**"*. | **No bottom navigation.** The app bar's back affordance returns to the dashboard. | **Home and back go to the same place, so the second control is redundant rather than missing.** #17 is reached by pushing from #12 (decision 12), so back *is* the way home; a Home button beside it would be two controls with one destination, on a menu whose whole design principle in this slice is that no control is drawn twice or drawn dead (entries 14 and 16). **The reason depends on the back path, so the back path is now declared and pinned** — `Key('account-back')` calling `context.pop()`, asserted by criterion 62, which also asserts the *arrival* on #12 rather than merely the tap. **A bottom global navigation bar becomes a real question when there is more than one destination to put in it**, which is the dashboard slice's problem, not this one's. | Dennis, 2026-08-18 · criterion 62 |

## How to add an entry

Only when an ADR has decided the deviation. State what the design says, what is built instead,
and the reason — in that order, so a reader who knows only the design can find themselves in the
first column. If the reason is "the platform cannot do it", say which platform and what it does
instead; if it is "the design contradicts itself", cite both places.
