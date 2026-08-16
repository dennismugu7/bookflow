# Business setup — Phase 0 frame

## 1. Problem statement

**A Kenyan salon or barbershop owner can create an account and then cannot do anything with it.**

Today an owner can sign up (`POST /v1/auth/signup`), sign in, and view their own profile
(`GET /v1/me`, screen #20). That is the whole product surface. There is no path — through any
screen, any endpoint, or any manual step — by which they come to have a business.

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
- **Editing or deleting a business after creation** (K12). Creation only.
- **A second business, a second member, or any role but `owner`.** ADR-003 is one business per
  account; `uq_memberships_user_business` and `ck_memberships_role check (role in ('owner'))`
  already hold that line. I9's role vocabulary stays closed.
- **The multi-step sheet flow itself** — back-navigation between onboarding steps and
  preservation of partially-entered data across them (screen #5, interaction A).
- **The dashboard (#12)** beyond whatever routing past the setup stub requires.
- **Profile editing (K75)**, which is already deferred and separate.

## 4. Open questions — product decisions for Dennis

Listed, not answered.

1. **Is business name alone enough to create a business?** Screen #5 collects four fields, one
   required. Shipping name-only is the smallest honest slice; shipping all four means new
   columns and the upload path, and drags F2 and ADR-011 in with it.
2. **When is the business row actually written — at the end of step one, or at the end of the
   four-step onboarding?** The design presents #5→#8 as sequential sheets and says "nothing has
   been published yet at this point". The data model permits committing after step one.
3. **What is a half-finished owner?** If someone abandons onboarding after entering a name, is a
   name-only business a real business, or must onboarding complete before the row exists? This
   decides what I10's "no membership" state means from now on.
4. **Can the owner change the business name after creating it** — in this slice, or later (K12)?
5. **Is a salon category collected at creation?** K16 asks where category, address text and the
   owner's public contact email are collected, and none has a home yet.
6. **What is behind screen #5's back arrow for a brand-new owner?** It returns to "the previous
   onboarding step", and for a user arriving straight from sign-up there is not obviously one.
