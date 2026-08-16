# Business setup — Phase 0 frame

## 1. Problem statement

**A Kenyan salon or barbershop owner can create an account and then cannot do anything with it.**

Today an owner can sign up (`POST /v1/auth/signup`), sign in — against **GoTrue directly**, via
`supabase_flutter`; our API serves no login route, and never has (`auth_gateway.dart`, ADR-017,
ADR-037) — and view their own profile (`GET /v1/me`, screen #20). Those three things are the
whole of what an owner can do. There is no path — through any screen or any endpoint — by which
they come to have a business.

The app already models this state honestly rather than hiding it.
`apps/mobile/lib/features/membership/membership_repository.dart` returns `MembershipStatus.none`
for every signed-in user, and says in terms why that is the *correct* answer and not a
placeholder: "There is no way for an owner to acquire a business: business creation is the
onboarding slice, which does not exist." Every owner who signs up is routed to
`setup_required_screen.dart` — the stubbed "finish setting up" screen (I10, ADR-032) — and stays
there permanently.

**Why that is the whole product, not one missing screen.** `public.businesses` is the row every
later thing hangs off, and `public.memberships` is the only thing that ties an owner to it —
ADR-003 models ownership as a join, so a business with no membership row belongs to nobody and a
user with no membership row owns nothing. Services, team members, portfolio, opening hours and
bookings are all children of a business that does not exist. So does the client-facing booking
page. **Until a business row exists, the owner cannot take a single booking through Bookflow**,
and no subsequent slice has anything to attach itself to.

**How we would know it is solved.** The code names the signal itself: the membership repository
"becomes a lie the moment business creation ships". Solved means an owner who signs up can reach
a state where `memberships` holds their row, and the router carries them past the setup stub on
their own credential — observed against staging, not asserted from a fixture.

## 2. User story

As a *salon or barbershop owner in Kenya*, I can *create my business in the app after signing
up*, so that *I have something to attach my services, team and bookings to, instead of being
returned to the "finish setting up" screen every time I open the app*.

## 3. Non-goals

Deliberately excluded. Each is a slice of its own or an already-tracked item.

- **Screen #5's three optional fields — Business Tagline, About, and the business banner
  image.** `public.businesses` today has `id`, `name`, `published`, `created_at`, `updated_at`
  and nothing else. These are new columns plus, for the banner, an upload path.
- **Any image upload at all**, and therefore ADR-011's bucket choice and F2's formats and size
  limits.
- **The salon handle (ADR-021).** The foundation migration excluded its table on purpose. K54
  notes the field exists in no design.
- **Publishing (ADR-004).** `businesses.published` defaults `false` and stays `false` for the
  whole slice. K47 — what the publish action is and where it lives — is untouched.
- **The `business_public` projection (ADR-020) and every public or unauthenticated read.** K55
  and K71 stay open. Nothing in this slice is reachable without a token.
- **The other three onboarding steps** — team members (#6), portfolio (#7), opening hours and
  location (#8).
- **Services and pricing** (#21, #22).
- **Editing any field other than the name, and deleting a business at all** (K12). Renaming
  **is** in scope — decision 4 — so **this slice partially opens K12** rather than leaving it
  untouched: it settles that the business name is editable and on which surface, and leaves the
  team-roster, portfolio, opening-hours and handle editing surfaces open.
- **A second business, a second member, or any role but `owner`.** ADR-003 is one business per
  account; `uq_memberships_user_business` and `ck_memberships_role check (role in ('owner'))`
  already hold that line. I9's role vocabulary stays closed.
- **The multi-step sheet flow itself** — back-navigation between onboarding steps and
  preservation of partially-entered data across them (screen #5, interaction A).
- **The dashboard (#12)** beyond whatever routing past the setup stub requires.
- **Profile editing (K75)**, which is already deferred and separate.

## 4. Decisions

All six questions this frame raised are answered. Each carries its reason.

1. **Which fields does creation collect? — NAME ONLY.** Tagline, About and the banner image stay
   non-goals, so `public.businesses` needs no new column and **this slice ships no migration**.
   *Decided by Dennis, 2026-08-16, guiding session.*
2. **When is the business row written? — AT THE END OF STEP ONE.** Not a free choice: screens
   #6–#8 are non-goals, so there is no later onboarding step left to defer the write to.
   *Decided by Dennis, 2026-08-16, guiding session.*
3. **Is a name-only business a real business? — YES.** Forced by decision 2: if the row is
   written at the end of step one, a business holding nothing but a name is the ordinary
   outcome of onboarding, not an abandoned half-state.
   *Decided by Dennis, 2026-08-16, guiding session.*
4. **Can the owner rename the business? — YES, IN THIS SLICE.** The name field only: no other
   field is editable and there is no delete. This is what partially opens K12.
   *Decided by Dennis, 2026-08-16, guiding session.*
5. **Is a salon category collected at creation? — NO.** K16 stays open, and category acquires a
   home in the slice that needs it.
   *Decided by Dennis, 2026-08-16, guiding session.*
6. **What is behind screen #5's back arrow? — THERE IS NO BACK ARROW** for an owner arriving
   from sign-up, there being no previous onboarding step to return to.
   *Engineering default taken by the session, 2026-08-16; open to Dennis's veto.*
7. **Must a business name be unique? — NO.** Real salon names repeat, and refusing a name
   because a stranger already used it would be a defect, not a safeguard. ADR-021's handle is
   the identifier intended to be unique, and it arrives in a later slice; nothing public is
   reachable here, so a collision has no visible consequence today.
   **This is the schema's status quo, not a change to it** — `ck_businesses_name_present`
   constrains length only (1–200 characters after trimming) and there is no unique index on
   `businesses.name`. Recording it is what makes it a decision rather than an accident: it was
   previously true because nobody had asked, which is the state in which a later slice adds a
   unique index without noticing it is reversing something.
   *Decided by Dennis, 2026-08-16, guiding session.*

### Consequence — the design and the build now disagree, on purpose

Screen #5 draws **four** fields (`DD-Bookflow-Native.md:181-189`); decision 1 ships **one**.
Anyone reading the design against the running app will find three specified fields absent, and
the back arrow of decision 6 missing as well.

**This is a recorded deviation, not an oversight.** It belongs in
`docs/analysis/08-design-deviations.md` — the same register that carries the deferred profile
Edit control as deviation 9 — written in the slice that ships the code, not here.

**What closes it:** the later branding slice that adds Tagline, About and the business banner.
That is a migration for the two text columns, plus ADR-011's bucket choice and F2's formats and
size limits for the banner upload. Nothing in this slice closes it, and nothing in this slice
should.
