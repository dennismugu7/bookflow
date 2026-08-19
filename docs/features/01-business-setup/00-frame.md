# Business setup — Phase 0 frame

> **Not complete on its own.** The slice's acceptance criteria are in `01-acceptance-criteria.md`, written after this frame pinned the scope and before any design (K77); its Blocked list names what is still undecided.

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
  whole slice. **K47 is no longer untouched** — §5 answers its
  what-is-shown-while-unpublished clause. What stays out is the publish action itself, what it
  is and where it lives, which is a placement question and clear under ADR-041. **Publishing
  also now inherits an obligation from §5's K27 answer:** the publishing slice must refuse to
  publish a business with no services. Nothing here implements it.
- **The `business_public` projection (ADR-020) and every public or unauthenticated read.** K55
  and K71 stay open. Nothing in this slice is reachable without a token.
- **The other three onboarding steps** — team members (#6), portfolio (#7), opening hours and
  location (#8).
- **Services and pricing** (#21, #22).
- **Editing any field other than the name, and deleting a business at all** (K12). Renaming
  **is** in scope — decision 4 — so **this slice partially opens K12** rather than leaving it
  untouched: it settles **that** the business name is editable, and that the surface for editing
  it is owner-facing. It does **not** settle **which screen** that is, and no design document
  names one — see §5.3. It leaves the team-roster, portfolio, opening-hours and handle editing
  surfaces open.
- **A second business, a second member, or any role but `owner`.** ADR-003 is one business per
  account, and I9's role vocabulary stays closed.
  **CORRECTED 2026-08-17.** This bullet previously read *"`uq_memberships_user_business` and
  `ck_memberships_role check (role in ('owner'))` already hold that line."* **Neither does.**
  `ck_memberships_role` constrains the vocabulary, not the count, and
  `uq_memberships_user_business` forbids only a repeat join to the *same* business — a user may
  hold memberships in two different businesses and no constraint objects. **What holds the line
  is decision 10's partial unique index**, which this slice adds; before it, nothing did.
- **The multi-step sheet flow itself** — back-navigation between onboarding steps and
  preservation of partially-entered data across them (screen #5, interaction A).
- **The dashboard (#12)** beyond the minimum §5's K47 answer requires — the setup-continuation
  state an owner sees after creating a business. Bookings, contacts, calendar and the
  share-link surface remain the dashboard slice's work. **This is a larger minimum than
  "whatever routing past the setup stub requires"**, which is what this bullet said before K47
  was answered.
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
8. **What happens when an account that already has a business creates another? — REFUSED WITH A
   CONFLICT.** Not silently satisfied by returning the existing business.
   **Reason — CORRECTED 2026-08-17. The decision was right; its stated reason was wrong.**
   It originally read: *"`uq_memberships_user_business` enforces this in the database regardless,
   so two simultaneous requests hit that constraint whatever the contract says."* **They do not
   hit it.** Two concurrent creations insert `(U, B1)` and `(U, B2)` with different business ids;
   the tuples differ, and that constraint only forbids a repeat join to the *same* business. At
   the time this decision was written **nothing in the schema or the code enforced the rule at
   all**, so the argument rested on a constraint that does not implement it.
   **Decision 10 is what makes the reason true.** With the partial unique index in place, two
   simultaneous requests genuinely do hit a constraint whatever the contract says, and the
   contract must therefore name that failure rather than leave it to surface as an unhandled
   error. The rest of the original reason stands untouched and never depended on the schema:
   returning the existing business would **silently discard a differently-named second attempt**
   — the owner asks for "Vera's Salon", receives "Vera Salon", and nothing tells them their input
   was ignored.
   **OBLIGATION:** no entry in `apps/api/src/platform/problem.ts`'s `PROBLEM_TYPES` covers a
   conflict. One must be appended, which touches **ADR-014's error contract** — that table is
   the contract the Flutter client branches on, and adding a slug is a contract change, not a
   detail of this slice. **Nothing here implements it.** Recorded as outstanding in §5.2.
   *Decided by Dennis, 2026-08-17, guiding session.*
9. **Is a submitted name stored as typed, or trimmed? — STORED TRIMMED** of leading and trailing
   whitespace.
   **Reason:** `ck_businesses_name_present` measures `length(btrim(name))`, but the column
   stores what was submitted. Today that means a padded 200-character name is **stored longer
   than 200**, and two names a person would call identical can differ in the database by
   invisible characters. Trimming makes the stored value match what a person would call the
   name, and makes the 200-character limit mean what it appears to mean.
   *Decided by Dennis, 2026-08-17, guiding session.*
10. **What enforces one business per account? — A PARTIAL UNIQUE INDEX**, added by this slice:
    `memberships (user_id) where role = 'owner'`.
    **Reason:** until today, **nothing enforced ADR-003's rule at all.** No trigger, no RLS
    policy (there are zero policies in the repository), no check constraint, and no application
    code — nothing under `apps/api/src` inserts into `memberships`. The rule rested on a
    read-then-insert that had not been written yet, and `uq_memberships_user_business` was
    widely read as covering it. **It does not:** it forbids the same user joining the same
    business twice, and two concurrent creations produce `(U, B1)` and `(U, B2)` with different
    business ids, so the tuples differ and neither insert is rejected.
    **Why PARTIAL, and this is the load-bearing half.** A plain `unique (user_id)` would cap a
    user at one membership of any kind and **permanently forbid a stylist working at two
    salons**. ADR-003 does not forbid that — it caps businesses per account for v1 and
    anticipates growth in terms: *"Adding a second seat later is a feature that inserts rows;
    it is not an auth rewrite."* Predicating on `role = 'owner'` enforces exactly the rule ADR-003
    states and leaves I9's role vocabulary free to widen, which `ck_memberships_role` is already
    documented as the place to do.
    **OBLIGATION:** this makes the slice's migration count one rather than zero, and puts it on
    the Do-Not-Vibe surface. See §5.4 and `02-design.md` §A.4.
    *Decided by Dennis, 2026-08-17, guiding session.*
11. **Where does renaming live? — SCREEN #20**, widened from "My Profile Details" to what
    `DD-Bookflow-Native.md:973` already calls its destination: **the Personal/Business
    Information Management page.** A business section sits beneath the personal one, carrying the
    business name and its own edit affordance.
    **CITATION CORRECTED 2026-08-18 — the quote is real and the line number is wrong. It is at
    `:962`, not `:973`.** Line 962 is interaction B of screen #17: *"**Frontend Action:**
    Navigates to the Personal/Business Information Management page."* **Line 973 is the Settings
    action** — *"Loads local/remote app configurations (e.g., notification preferences, currency
    settings, timezone, security/2FA settings)"* — which is a different row of the same menu, and
    the one decision 11 explicitly rejected as the rename surface. **The decision is unaffected**:
    it rests on the design naming *Business* as living behind the Profile row, and the design does.
    `business_section.dart` repeated the same `:973` and is corrected with it.
    **Why this is written down rather than quietly fixed.** A wrong line number in a Phase 0 record
    survives precisely because it looks like diligence — a reader who checks the *quote* finds it
    verbatim in the document and stops. The one who follows the *number* lands on an unrelated
    action and has to decide whether the decision was built on it. This slice's standing rule is
    that an obligation attributed to a document must be quoted from it; **this is the same rule
    applied to a pointer, which is the half that rule does not cover.**
    **Reason:** #20 is the only real screen already built, so this adds a **section** rather than
    a screen. The design's own routing text already names *Business* as living there — the
    obligation in §5.3 was that no design named a surface, and this one half-names it.
    **Why not the alternatives:** #17 is a five-row menu (Profile, My services, Settings,
    Support, Log out) with **no business section to extend**; #23 is app-level by content —
    change password, privacy policy, terms, delete account; and the "main business settings
    dashboard" mentioned in passing at `DD-Bookflow-Native.md:1229` **is specified nowhere**, so
    choosing it would be exactly the invention §5.3 refused.
    **COST, recorded rather than glossed.** #20 carries K75's **dead Edit control** — the
    affordance the design draws for the personal fields, deliberately not built because nothing
    it could do exists. **This slice therefore ships a screen whose business section is editable
    and whose personal section is not.** That is odd to look at and it is the strongest argument
    against this decision. **K75 is not fixed here** — profile editing remains a non-goal, and
    widening this slice to fix it would turn one page into a feature, which is the reason K75 was
    deferred in the first place.
    **This is the fourth design deviation** (with the three in the §4 Consequence and §5's K47
    answer), and it belongs in `docs/analysis/08-design-deviations.md` on the same terms: written
    in the slice that ships the code, not here.
    *Decided by Dennis, 2026-08-17, guiding session.*
12. **How does an owner reach screen #20 once #12 is home? — THROUGH SCREEN #17**, which this
    slice builds. Screen #12 gains the profile avatar; the avatar opens the account menu; the
    menu's **Profile** row navigates to #20.
    **Why this and not the avatar going straight to #20.** `DD-Bookflow-Native.md:957` states
    without qualification that #17 is *"Triggered when the top-right profile avatar (XX) is
    clicked on any previous main screen."* Lines 610–611 offer a looser alternative — *"Opens
    user account settings **or** profile drawer/modal"*, *"/settings **or** /profile"* — and the
    two are inconsistent. **Following the unqualified statement over the disjunctive one** also
    keeps screen #20 free of a second deviation: routing the avatar directly at #20 would have
    forced its back affordance to return to #12, which no design says.
    **ROWS FOR SCREENS THAT DO NOT EXIST ARE OMITTED, NOT SHOWN INERT.** #17 ships with
    **Profile** and **Log out** only. **My services**, **Settings** and **Support** arrive when
    #21/#22, #23 and #18 do. **This is K75's lesson applied before the mistake rather than
    after:** a visible control that does nothing is a promise the app does not keep, and shipping
    the full menu would make that promise three times over on one screen.
    **SIGN-OUT MOVES.** Today it is screen #20's back arrow, which `profile_screen.dart` says
    outright *"leads nowhere in this slice … so it signs out instead of pretending to navigate."*
    That reasoning expires here: there is now a screen behind #20. **Sign-out becomes #17's Log
    out row, per the design, and #20's back affordance returns to #17.**
    **COST RECORDED.** This slice now **builds a screen it did not previously touch**, which is
    real scope growth and not a detail. And **#17 shipping two rows instead of five is itself a
    deviation** — the fifth, recorded on the same terms as the other four, for
    `docs/analysis/08-design-deviations.md` when the code ships.
    *Decided by Dennis, 2026-08-17, guiding session.*

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

## 5. S items caught by the created-condition test, and their answers

ADR-041 established the created-condition test, and its **2026-08-16 amendment** fixed the catch
list at **two**: **K27**, and **K47's what-is-shown-while-unpublished clause** — that clause
only, the clauses asking what the publish action is and where it lives being placement questions
and therefore clear. Both are answered here, in Phase 0, as `CLAUDE.md` §7 requires. The other
eight S items touching this slice are clear or, in K12's case, answered by decision 4.

### K47 — the what-is-shown-while-unpublished clause

**ANSWER.** While the business is unpublished, screen #12 shows a **setup-continuation state** —
where the owner is in setup, and what remains — **not** the bookings empty state. The share-link
prompt and the **"Share your booking link ›"** button appear only once there is something to
share.

**REASON.** The designed bookings empty state (`DD-Bookflow-Native.md:587-596`) tells a brand-new
owner that *"appointments will land here automatically"* and offers a *"booking link"* to share.
For a business with no services and nothing published, **both statements are false.** This slice
creates that business and routes the owner to that screen, which is why it owns the question
rather than the dashboard slice.

**OBLIGATION.** The decision is made here; **the full dashboard remains the dashboard slice's
work.** This slice implements only the minimum its own routing requires — enough that an owner
who has just created a business is not told something untrue.

**This is a third design deviation**, alongside the two recorded in §4: the design specifies one
empty state for screen #12, keyed on the bookings array, and this answer introduces a second
keyed on setup completeness. It belongs in `docs/analysis/08-design-deviations.md`, written in
the slice that ships the code, on the same terms as the other two.

*Decided by Dennis, 2026-08-17, guiding session.*

### K27 — what the client webapp shows for a salon with zero services, team or portfolio

**ANSWER.** The state is made **unreachable**. A business may **not be published until it has at
least one service.** The webapp therefore never renders a salon with nothing bookable.

**REASON.** Zero team and zero portfolio already have answers in the design — *"skip 'Select
professional' entirely when the salon has zero configured team members"*
(`DD-Bookflow-Web.md:1011-1013`), and *"hide the gallery section entirely rather than showing a
blank/broken grid"* (`DD-Bookflow-Native.md:408-412`). **Zero services is the only unaddressed
case**, and making it impossible answers it without designing a page whose entire purpose is
absent.

**OBLIGATION — this binds a future slice.** The **publishing slice must enforce the
precondition.** Nothing in this slice implements it: publishing is a non-goal here, and a
business created by this slice has no services at all, so it is unpublishable by construction
until the services slice ships.

**The carrier for this obligation is the `docs/analysis/05-triage.md` update described in §5.1,
and nothing else.** If that update does not happen, **the obligation is lost** — it lives only in
this file, which the publishing slice has no reason ever to open.

*Decided by Dennis, 2026-08-17, guiding session.*

### 5.1 Outstanding obligation — the triage has not been updated

`DEFINITION_OF_DONE.md` requires that every `S` item resolved in Phase 0 be *"move[d] to
Resolved"* in `docs/analysis/05-triage.md`, *"citing the ADR or recording the decision."* **That
edit has not been made. It is deferred deliberately, and it is not done.**

**Why deferred.** PR #14 also edits `05-triage.md`, adding K77 and K78. Editing the same file
here guarantees a merge conflict in the one document whose entire value is that it can be read
accurately.

**When.** Immediately after PR #14 merges. K27 and K47 move to Resolved, citing this document and
ADR-041.

**Status: ~~OUTSTANDING~~ — DISCHARGED 2026-08-19**, the day PR #14 merged. K27 and K47 are in
`05-triage.md`'s Resolved table, each citing this document and ADR-041. **K27's row carries the
publishing slice's at-least-one-service obligation in its own words**, which is what this section
said would be lost if the edit did not happen.

### 5.2 Outstanding obligation — the conflict slug does not exist

Decision 8 refuses a second creation attempt **with a conflict**, and there is no conflict in
`PROBLEM_TYPES`. The nine slugs that exist are `missing-token`, `invalid-token`, `expired-token`,
`not-found`, `validation-failed`, `password-rejected`, `rate-limited`, `auth-unavailable` and
`internal-error`. None means "you already have one".

**Why this is not a detail of this slice.** That table is ADR-014's error contract, and the
Flutter client branches on `type` rather than on a message. The file says a slug *"may be added
to, but an existing slug never changes meaning"* — so appending is the sanctioned move, and it is
still a change to a contract two clients read.

**Status: DISCHARGED 2026-08-17.** `business-already-exists`, status 409, is in `PROBLEM_TYPES`.

**CORRECTED WHILE DISCHARGING IT.** This section said appending a slug is *"a change to ADR-014's
error contract"*. **It is not, and checking rather than assuming is what showed it.** ADR-014
states a property, not a list — *"Errors as RFC 9457 `application/problem+json`, each carrying a
stable machine-readable `type` slug"* — and **enumerates no slugs anywhere.** `problem.ts` holds
the registry and sanctions growth in terms: *"it may be added to, but an existing slug never
changes meaning."* So appending is **ordinary operation**, and no ADR needed amending. What is
true is the weaker claim: it edits a table two clients branch on, which earns review and the full
suite — not that it contradicts a decision.

**It maps no criterion.** Criteria 34 and 35 are about what `POST /v1/businesses` *does* with the
slug, and that route does not exist. **The slug does not even reach the OpenAPI spec yet** —
`contracts:generate` produced no diff, because nothing declares a 409 response. Adding it is a
prerequisite for those criteria, not partial satisfaction of them.

### 5.3 ~~Outstanding obligation~~ — DISCHARGED 2026-08-17 by decision 11

**Settled in Phase 1, which is where it belonged.** The rename surface is **screen #20**, widened
to the Personal/Business Information Management page its own routing text already names; a
business section beneath the personal one. See decision 11 for the reasoning, the rejected
alternatives, and the cost.

**What this unblocks:** criteria 52–54, appended to `01-acceptance-criteria.md` — the loading and
error states `DEFINITION_OF_DONE.md` line 32 requires, which could not be written for a screen
with no identity. Its empty state remains inapplicable, for the same reason screen #5's is.

**Left standing below, unedited**, because the record should show what was owed and how it was
settled, not just the answer. **Still outstanding: §5.1, §5.2 and §5.4.**

---

*Original entry, 2026-08-17:*

**Decision 4's reason is that an owner who mistypes their business name must be able to fix it.
An API-only rename does not satisfy that** — an owner does not hold a token and does not issue
requests. So decision 4 **does** imply an owner-facing rename surface exists in this slice.

**What it does not settle is which screen.** No design document names one: screen #5 is the
onboarding sheet an owner passes through once, screen #17 is the account menu, and K12 records
that the editing screens do not exist at all. Choosing between them is a **Phase 1 design
decision**, and inventing one here would be exactly the invention this frame otherwise refuses.

**What is blocked until it is named.** Criteria 13–16 and 39 are **API-observable only** — they
pin what a rename does, not where an owner performs it. `DEFINITION_OF_DONE.md` line 32 requires
loading and error states for every new screen, and those criteria **cannot be written for a
screen that has no identity**. They are appended when the surface is named; criteria are
append-only, so that costs new numbers and never a renumber.

**How this was found, because the manner matters more than the defect.** It was found by
**listing this slice's screens against the Definition of Done**, not by reading decision 4. The
decision reads as settled — it says renaming is in scope, names the field, and bounds what else
may change — and §3 asserted for a day that it had settled the surface too. Nothing in reading it
surfaced the gap. **A mechanical sweep against an external checklist did**, which is the argument
for running such sweeps rather than trusting a careful reading of one's own document.

**Status: ~~OUTSTANDING~~ — DISCHARGED, see the heading above.**

### 5.4 Outstanding obligation — decision 10's migration must be written and applied

Decision 10 adds the first migration this slice owns. **It is written in Phase 3, not now** —
Phase 1 sketches a migration and Phase 3 scaffolds it (`02-design.md` §A.4 carries the DDL).

**It reaches staging only through CI.** ADR-034 applies migrations from the `migrate-staging`
job on merge to `main`, never from a development machine, so this obligation **cannot be
discharged before Actions minutes reset (~2026-08-31)**. That is the same wall PR #14 is behind,
and it now has a second thing waiting on it.

**It is a Do-Not-Vibe surface twice over** — migrations universally, and the membership scoping
rule specifically, since it constrains the table that rule traverses. It is reviewed line by
line by a human and named in the completion report.

**Status: OUTSTANDING.**

### 5.5 Outstanding obligation — `docs/ENVIRONMENT.md` §4 is stale about `seed.sql`

**§4 lists `supabase/seed.sql` under "Blocks Phase 2"**, saying `db reset` warns *"no files
matched pattern: supabase/seed.sql"* on every run and that it is *"Not writable yet — ADR-026
wants one demo salon with bookings in every status, which needs tables, which are Phase 3."*

**All of that has moved on.** The file exists, is 144 lines, seeds one owner, one business and
one membership at fixed ids, is idempotent by `on conflict do nothing`, and is applied by
`supabase db reset` and `npm run seed`. **It is covered by `seed.integration.test.ts`**, which
does not count rows — it signs the seeded owner in against real GoTrue and asserts the token
names them. Its own header already records the partial scope §4 said made it unwritable:
*"Only the first part of that is writable today … This file seeds what exists … and grows with
each slice that adds a table."*

**`CLAUDE.md` §5 makes a stale entry there a defect, not untidiness**, which is why this is an
obligation rather than a note.

**Deferred to the same pass as §5.1, and for the same reason.** PR #14 also edits
`docs/ENVIRONMENT.md`, and a conflict in the one document whose whole value is being readable
about the state of the world is worse than a fortnight of staleness. **Both are corrected in one
pass the moment #14 merges.**

**Status: ~~OUTSTANDING~~ — DISCHARGED 2026-08-19**, in that same pass. `docs/ENVIRONMENT.md` §4's
`seed.sql` row now records what the file does rather than that it cannot be written, and notes
that ADR-026's full ask — one demo salon with bookings in every status — is still unmet because
those tables do not exist.

## 6. Unknowns and spikes

**There are none, and no spike is proposed.** The manual asks for a spike wherever some part is
*"I don't actually know how X works"*. Nothing in this slice's pinned scope is that.

**Why the answer is honestly empty, not lazily empty.** The slice writes one row to
`public.businesses` and one to `public.memberships` — two tables that already exist, already have
their constraints, and were exercised end to end in Phase 3 — through an API pattern already
serving traffic on staging: Zod schema, route, service, repository taking its executor, RFC 9457
problem on failure, generated OpenAPI, generated Dart client, `AsyncValue` in a screen. Every
layer this slice touches has a working instance of itself in the repository. A spike proposed
here would be theatre, and Actions minutes are the scarce resource.

**Candidates considered, and why each is knowable by reading rather than by experiment:**

- **How a unique-constraint violation surfaces** when a second business is attempted
  (criterion 34). PostgreSQL raises SQLSTATE `23505` naming the constraint, and ADR-036 chose
  explicit constraint names *precisely* so the API can branch on them — `uq_memberships_user_business`
  is a name we picked, not one we inherited. Spike 001/C1 already observed the analogous
  `23P01` path for an exclusion constraint. Nothing to discover.
- **A deliberate constraint violation inside the integration transaction.** A failed statement
  aborts a PostgreSQL transaction, and the suite runs each test inside one — so a test that
  provokes `23505` would poison everything after it. **This is already solved infrastructure,
  not an open question:** `apps/api/test/integration/harness.ts` provides a helper that runs a
  statement expected to fail inside a `savepoint` and restores afterwards, and both the harness
  and `apps/api/test/README.md` document the caveat. Two existing test files already rely on it.
  It is a Phase 1 design note, not an unknown.
- **Writing the business and its membership atomically.** A Kysely transaction, with the
  executor passed in — which `CLAUDE.md` §5 already makes non-negotiable and every existing
  repository already does.
- **Trimming a name (decision 9).** Application logic with no environmental dependency.
- **The screen.** The design tokens, `go_router` redirect and Riverpod wiring all shipped in
  PR 3a and PR 3b, and screen #20 renders live staging data through them today.

### Not unknowns, but two constraints this slice must plan around

Named here because they bind how the slice can be *verified*, and discovering them during Phase 5
would be expensive.

- **The staging e2e account must never be given a membership** (K78, and stated as the rule that
  outlives the rotation policy). This slice's central observable — criteria 41 and 42, that the
  membership stub stops lying — **cannot be demonstrated on that account.** An e2e journey
  covering business setup needs a different staging account, deliberately created and
  deliberately disposable.
- **E14 makes a second staging account non-trivial.** Staging's sender is Resend's test address
  and reaches exactly one inbox, so an account that must click an activation link cannot be
  created for CI. The existing e2e account was created through the GoTrue admin path with
  `email_confirmed_at` set at creation, and a second one would have to be too.

### A14 — does not touch this slice

**A14 is contention on the *exclusion* constraint** over team member, time range and occupying
status, in a `bookings` table that does not exist. This slice creates no bookings, and no
exclusion constraint exists to contend on.

The nearest analogue is `uq_memberships_user_business`, and it **cannot** contend across parallel
test files: contention there needs two tests inserting the same `(user_id, business_id)` pair,
and every test creates its own account and its own business. Criterion 24 deliberately puts the
same *name* on two businesses, and no constraint covers names at all (decision 7).

**A14 stays classified against the booking slice, unchanged.**

## 7. Success metrics

**There is no production environment and there are no users, so release metrics cannot be
measured.** Stating that plainly rather than inventing an activation rate nobody can read is the
honest answer, and the manual's *"what you'll look at after release"* has no referent yet:
ADR-023 records that production has no Supabase slot, and ADR-024 deploys production only on a
tag that has never been cut.

**What can honestly be observed, and therefore stands in until production exists:**

- **The 42 acceptance criteria, observed against deployed staging** rather than against a
  fixture. That is the whole of what "it worked" can mean for this slice today.
- **The frame's own solved-signal, §1:** an owner who signs up reaches a state where
  `memberships` holds their row and the router carries them past the setup stub, on their own
  credential. Criteria 41 and 42 are that signal made falsifiable, and
  `membership_repository.dart` stops being a lie at exactly the moment they pass.
- **One number that is real and worth recording at merge:** how many of the 42 criteria are
  covered by a named test, and how many are not. `DEFINITION_OF_DONE.md` requires every
  criterion to map to a named test, so the gap between 42 and that count is a measurement, not
  an estimate — and it is the first slice where that number can exist at all, Phase 3 having
  had no criteria to count against (ADR-040 §3.1, K77).

**CORRECTED 2026-08-18 — both bullets above say 42, and the file holds 61.** They were written
when 42 was the count, and 43–61 were appended afterwards: 43–47 (loading, empty and error per
screen), 48–51 (decision 10's index), 52–54 (the rename surface, decision 11), 55–60 (the
navigation chain, decision 12) and 61 (sign-out for an owner with no business, T6). **Read "the
61 acceptance criteria" and "the gap between 61 and that count" in both places.**

**This is the same defect as `02-design.md` §B.9's, in the same slice, from the same cause** — a
hand-written total describing an append-only list, in a document the appending step had no reason
to open. §B.9 now carries the rule that answers it: a criterion is classified in the same commit
that appends it. **The parallel rule for this section is to stop writing the total at all.**
Neither bullet needs one: what they assert is that the criteria are observed against deployed
staging, and that the mapped-versus-unmapped split is derivable rather than estimated. **The
count is a `grep`, and `01-acceptance-criteria.md` carries the command.** A number copied here
can only go stale; the command cannot.

*The original wording is left standing above rather than edited, because it records what the
frame believed when the scope was pinned, and the growth from 42 to 61 is itself the honest
history of the slice.*

**What is deliberately not proposed:** owner-funnel metrics, completion rates, time-to-first-
business, drop-off between sign-up and business creation. Every one of them needs real owners on
a production deployment. They become answerable when production exists, and inventing a
staging-shaped proxy for them now would produce a number that measures the session's own test
data.
