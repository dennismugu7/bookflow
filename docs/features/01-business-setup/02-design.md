# Business setup — Phase 1 technical design

The feature manual's Phase 1 (`docs/source/Manual-Feature-Scaffolding.md:29-53`). Its stated
output is *"the architecture/logic map"*. Sections below follow the manual's own order.

**Written against the schema and the code, not against memory.** Every field, type and
constraint below is quoted from `supabase/migrations/20260811164304_foundation_schema.sql`.

## A. Data model

### A.1 Entities this slice touches

Two of the three foundation tables. `user_profiles` is read by the existing `GET /v1/me` and is
**not** touched by this slice.

**`public.businesses`** — every column it has:

| Column | Type | Definition, quoted |
|---|---|---|
| `id` | `uuid` | `id uuid not null default gen_random_uuid()` |
| `name` | `text` | `name text not null` |
| `published` | `boolean` | `published boolean not null default false` |
| `created_at` | `timestamptz` | `created_at timestamptz not null default now()` |
| `updated_at` | `timestamptz` | `updated_at timestamptz not null default now()` |

**`public.memberships`** — every column it has:

| Column | Type | Definition, quoted |
|---|---|---|
| `id` | `uuid` | `id uuid not null default gen_random_uuid()` |
| `user_id` | `uuid` | `user_id uuid not null` |
| `business_id` | `uuid` | `business_id uuid not null` |
| `role` | `text` | `role text not null default 'owner'` |
| `created_at` | `timestamptz` | `created_at timestamptz not null default now()` |
| `updated_at` | `timestamptz` | `updated_at timestamptz not null default now()` |

`updated_at` on both is maintained by trigger, not by application code —
`trg_businesses_updated_at` and `trg_memberships_updated_at`, each
`before update ... for each row execute function public.set_updated_at()`. **Nothing in this
slice sets `updated_at`**, including on rename.

### A.2 Relationships and constraints that bear on this slice

Quoted from the migration:

- `constraint pk_businesses primary key (id)`
- `constraint ck_businesses_name_present check (length(btrim(name)) between 1 and 200)`
- `constraint pk_memberships primary key (id)`
- `constraint fk_memberships_user foreign key (user_id) references auth.users (id) on delete cascade`
- `constraint fk_memberships_business foreign key (business_id) references public.businesses (id) on delete cascade`
- `constraint uq_memberships_user_business unique (user_id, business_id)`
- `constraint ck_memberships_role check (role in ('owner'))`

**The relationship is many-to-many by construction and one-to-one by policy.** `memberships` is a
join table, and the migration says why the shape was chosen: *"a business row does not know who
owns it, which is the point of modelling ownership as a join rather than an owner_id column."*
ADR-003's one-business-per-account rule is **not** enforced by `uq_memberships_user_business` —
that constraint forbids the same user joining the same business twice, not a user joining two
different businesses.

**CORRECTED 2026-08-17.** This paragraph originally continued: *"the unique constraint is the
backstop for the concurrent case only."* **It is not a backstop for that case at all.** Two
concurrent creations insert `(U, B1)` and `(U, B2)` with different business ids; the tuples
differ and neither is rejected. The constraint backstops only a double-join to the *same*
business, which is not the race decision 8 is about — so as written, criterion 22 was
unachievable. **Decision 10 supplies the real backstop:** a partial unique index on
`memberships (user_id) where role = 'owner'`, sketched in §A.4. Application logic still performs
the read; the index is what makes the concurrent case safe.

`ck_businesses_name_present` measures **`btrim(name)`** while the column stores what is given.
Decision 9 (store trimmed) is an application-layer rule; the constraint does not impose it.

### A.3 Indexes, against the queries this slice actually runs

Every index that exists on these two tables: `pk_businesses` (implicit unique on `businesses(id)`),
`pk_memberships` (implicit unique on `memberships(id)`), `uq_memberships_user_business` (implicit
unique on `memberships(user_id, business_id)`, **in that column order**), and one explicit
`create index ix_memberships_business on public.memberships (business_id)`. **PostgreSQL creates
no index for a foreign key**, so `fk_memberships_user` and `fk_memberships_business` contribute
none.

| # | Query this slice runs | Index that serves it |
|---|---|---|
| Q1 | Insert a business | none needed; maintains `pk_businesses` |
| Q2 | Insert a membership | uniqueness checked against `uq_memberships_user_business` |
| Q3 | Does this account already have a business? — `memberships where user_id = $1` (decision 8, criterion 22) | after decision 10, **`uq_memberships_one_owner_per_user` directly** — it is keyed on exactly this predicate. `uq_memberships_user_business`'s `user_id` prefix also serves it. **The read alone is insufficient**: it answers the question but cannot prevent two concurrent readers both finding none. The index, not the read, is what satisfies criterion 22. |
| Q4 | Membership status for criterion 41 — the caller's business via `memberships where user_id = $1` joined to `businesses` | `uq_memberships_user_business` prefix on `user_id`, then `pk_businesses` |
| Q5 | Read a business by id, scoped — the existing `findBusinessForUser` | `pk_businesses` for `businesses.id`; the join and `user_id` filter by `uq_memberships_user_business`, or `ix_memberships_business` for the join side |
| Q6 | Rename — update `businesses` by id, after Q5's scope check | `pk_businesses` |

**Q3 and Q4 are the ones worth stating explicitly, and they are served only because
`uq_memberships_user_business` is declared `(user_id, business_id)` and not the reverse.** A
composite index serves a **prefix**, never a suffix. Had the columns been written
`(business_id, user_id)`, both queries — the conflict check and every membership-status lookup
the app performs on launch — would fall back to a sequential scan, and `ix_memberships_business`
would not save them. The column order is load-bearing and was not chosen for this slice.

**No query this slice runs is unindexed.** Stated as a finding rather than an absence of one.

**No index is needed on `businesses.name` and none exists.** Decision 7 makes names non-unique
and nothing queries by name — criterion 24 asserts two accounts may hold the same name, which is
a statement about the *absence* of a constraint, not a lookup.

### A.4 Migration judgement

**CORRECTED 2026-08-17. This section originally read "This slice needs no migration at all —
not additive, not altering — zero schema change", and concluded that "the Do-Not-Vibe migration
surface is not touched by this slice." Both are false.** They followed from reading
`uq_memberships_user_business` as enforcing ADR-003's rule, which §A.2 now records that it does
not. **This slice owns exactly one migration**, and it is on the Do-Not-Vibe surface.

**What was right, and still is:** every column this slice reads or writes already exists.
Shown from the schema rather than asserted:

- Decision 1 ships **name only**, and `businesses.name text not null` exists with its length
  constraint already.
- Decision 4's rename writes the same column. Decision 9's trimming is application-layer, and
  `ck_businesses_name_present` already tolerates a trimmed value.
- Decision 8's conflict needs a read of `memberships` plus the existing
  `uq_memberships_user_business` as the concurrent backstop. Both exist.
- The membership row needs `role`, which already defaults to `'owner'` and is already constrained
  to it by `ck_memberships_role`.
- Criterion 4's `published = false` at creation is already the column default.

**What no existing column supplies is enforcement of ADR-003's cardinality**, and that is the
one migration this slice owns.

#### The migration, sketched — Phase 1 sketches, Phase 3 writes the file

```
create unique index uq_memberships_one_owner_per_user
  on public.memberships (user_id)
  where role = 'owner';
```

**No file is created in Phase 1.** This is the sketch the manual asks for at this phase.

**Naming.** ADR-036's table maps `uq_` to *unique constraint* and `ix_` to *index*, and a partial
unique index is strictly the latter — PostgreSQL cannot express a partial unique *constraint*.
The `uq_` prefix is chosen anyway, and deliberately: ADR-036's own rationale is that *"constraint
names are a public interface here"* because the API branches on the name a violation reports, and
a `23505` naming `uq_…` tells a reader what was violated. **ADR-036 does not anticipate a partial
unique index; this is a gap in its table, not a departure from it.** Worth a ruling before the
second one is written.

**Additive.** It creates an index. No column is altered, nothing is dropped, no data is rewritten.
Safe by the manual's own test.

**It fails to build if duplicate owner rows already exist.** That is the correct behaviour — it
refuses rather than silently keeping one. **Staging has none today**: no code path has ever
inserted a `memberships` row, because nothing under `apps/api/src` writes to that table.

**DO-NOT-VIBE: YES, twice.** *Migrations* universally (`CLAUDE.md` §6), and *the membership
scoping rule* specifically, since this constrains the table that rule traverses. It is written
deliberately, reviewed line by line by a human, and named in the completion report. Tracked as an
outstanding obligation in `00-frame.md` §5.4 — it reaches staging only through ADR-034's
`migrate-staging` job, so it waits on Actions minutes.

**The one thing to re-check at Phase 2**, and it is a schema question rather than a code one: the
application role's grants. `20260811180042_application_role.sql` grants CRUD to `bookflow_api`;
this slice performs the first `insert` into `businesses` and `memberships` from the API, and
nothing has yet exercised those grants for writes on these two tables.

## B. API contract

**Read before writing, and followed rather than invented:** `modules/businesses/businesses.routes.ts`
(the one existing business route and its 404 reasoning), `modules/me/me.routes.ts` (`profileSchema`,
`.meta({ id })`, `operationId`), `modules/auth/auth.routes.ts` and `auth.schema.ts` (the `public:
true` opt-out, the 202-not-201 reasoning, and `personName`'s `.trim().min(1).max(…)` chain),
`platform/problem.ts` (all nine slugs and `problemBody`), and ADR-014 §Envelope.

**ADR-014 fixes the envelope and this contract does not deviate:** *"collections return
`{data, meta}`; single resources return the resource itself."* Every response below is a bare
resource. No wrapper is introduced.

### B.1 Endpoints

| Method | Path | Status | Purpose |
|---|---|---|---|
| `POST` | `/v1/businesses` | **new** | Create the caller's business and its owner membership |
| `GET` | `/v1/businesses/{businessId}` | **unchanged** | Already exists; this slice does not touch it |
| `PATCH` | `/v1/businesses/{businessId}` | **new** | Rename — the name field only |
| `GET` | `/v1/me/business` | **new** | The caller's business, or the fact that they have none |

**No `DELETE`.** Criterion 17 is satisfied by the absence of a route, not by a route that
refuses — there is nothing to call.

### B.2 Request payloads, as Zod

One shared declaration, following `auth.schema.ts`'s pattern exactly:

```
const businessName = z
  .string()
  .trim()
  .min(1)
  .max(200)
  .describe('Required. Trimmed. 1–200 characters after trimming.');

export const createBusinessRequestSchema = z
  .object({ name: businessName })
  .meta({ id: 'CreateBusinessRequest' });

export const renameBusinessRequestSchema = z
  .object({ name: businessName })
  .meta({ id: 'RenameBusinessRequest' });
```

`PATCH` takes the same body shape as `POST` deliberately: the name is the only editable field
(decision 4), so a partial-update body and a full one are the same object. Two schema ids rather
than one, because they are separate operations in the generated Dart client and a shared id would
couple them the first time they diverge.

`GET /v1/me/business` takes no body and no parameters.

### B.3 Where decision 9's trimming happens — precisely

**In the Zod schema, at the route boundary, before the handler is entered.** `.trim()` precedes
`.min(1)` and `.max(200)` in the chain above, and that ordering is the whole mechanism:

- `"  Vera's Salon  "` → trimmed to `"Vera's Salon"` → passes → **stored trimmed**. Criteria 37,
  39, 40.
- `"   "` → trimmed to `""` → fails `.min(1)` → `validation-failed`. Criterion 12.
- 200 non-whitespace characters with padding → trimmed to exactly 200 → passes `.max(200)` →
  stored as exactly those 200. **Criterion 38, and it only holds because `.trim()` comes first.**
- 201 characters → fails `.max(200)`. Criterion 10.

**The service and repository never see an untrimmed value**, so `ck_businesses_name_present` —
which measures `btrim(name)` while the column stores what it is given — can never disagree with
what is stored. This is the precedent `personName` already set for `user_profiles`; nothing new
is being decided about *how*, only about *whether*, and decision 9 decided that.

### B.4 Success responses

| Endpoint | Status | Body |
|---|---|---|
| `POST /v1/businesses` | **201** | `Business` |
| `PATCH /v1/businesses/{businessId}` | **200** | `Business` |
| `GET /v1/me/business` | **200** | `Business` |

`Business` is the **existing** `businessSchema` in `businesses.routes.ts` — `{ id, name,
published }` — reused unchanged, not redeclared. Criterion 4 (`published` is `false` at creation)
is observable directly in the 201 body because `published` is already in that schema.

**201, not 202.** `auth.routes.ts` documents why sign-up answers 202: *"nothing usable exists
yet."* Here something usable does — the business is readable immediately by criterion 1 — so the
ordinary 201 applies. The distinction is deliberate and follows the existing reasoning rather
than contradicting it.

### B.5 Failures — every one mapped to a slug

| Endpoint | Condition | Status | Slug |
|---|---|---|---|
| all three | no token | 401 | `missing-token` |
| all three | malformed or unverifiable token | 401 | `invalid-token` |
| all three | expired token | 401 | `expired-token` |
| `POST` | body fails the Zod schema — empty, whitespace-only, over 200 | 400 | `validation-failed` |
| `POST` | caller already has a business | **409** | **`business-already-exists` — PROPOSED, does not exist** |
| `PATCH` | body fails the Zod schema | 400 | `validation-failed` |
| `PATCH` | `businessId` is not a UUID | 400 | `validation-failed` |
| `PATCH` | business does not exist, **or** is not the caller's | 404 | `not-found` |
| `GET /v1/me/business` | caller has no business | 404 | `not-found` |
| any | unhandled | 500 | `internal-error` |

**Every body is `problemBody`'s output** — `{ type, title, status }`, no `detail`, no `instance`.
That is what satisfies criterion 32, and it is existing behaviour rather than a new rule.

**`PATCH`'s 404 is byte-identical for "does not exist" and "not yours"**, inheriting
`businesses.routes.ts`'s reasoning verbatim: a distinct 403 would confirm which business ids
exist. Criteria 20 and 21.

### B.6 The proposed conflict slug

**`business-already-exists`, status 409. It does not exist and this contract cannot ship without
it** — tracked as an outstanding obligation in `00-frame.md` §5.2, because appending to
`PROBLEM_TYPES` changes ADR-014's error contract that both clients branch on.

```
'business-already-exists': {
  status: 409,
  title: 'Business already exists',
},
```

**Why specific rather than a generic `conflict`.** ADR-014 has the client branch on `type` and
not on a message, so a slug is only useful to the degree the client can act on it. A generic
`conflict` would force the client to work out *what* conflicted from something other than the
`type`, which is the thing that contract forbids. `password-rejected` is the existing precedent
for a slug scoped to one situation.

**Two properties this response must have**, both from decision 8 and both testable:

- It carries **no `detail`**, so it does not name or link the existing business. That is the
  no-echo convention, not a new rule.
- **Nothing is written.** The refused attempt inserts no business and no membership, and the
  submitted name is stored nowhere. Criterion 36.

### B.7 The read path criterion 41 needs

**No existing endpoint answers it, so a new one is part of this contract.** Established by
reading, not assumed: `GET /v1/me` returns `{ id, firstName, lastName, avatarPath }` and no
business; `GET /v1/businesses/{businessId}` requires an id the client does not have before it
knows whether a business exists. `membership_repository.dart` says the same thing in its own
comment — *"`apps/api` has no endpoint that answers this question."*

**`GET /v1/me/business` → 200 with `Business`, or 404 `not-found` when the account has none.**

**404 for "you have no business" is the uncomfortable part of this design, and it is chosen
deliberately.** ADR-014 fixes that a single resource is returned as itself, so a
`{ business: null }` envelope is not available without deviating. `GET /v1/me` already sets the
precedent of throwing `not-found` for a missing singleton.

**The consequence is a rule for the Flutter side, and criterion 46 depends on it.** The feature
repository — the ADR-028 layer that exists precisely to wrap the generated client — **maps 404 to
`MembershipStatus.none`, a data answer, and every other failure to an error.** If a 404 were
allowed to surface as an `AsyncValue.error`, the dashboard would render its error state for the
ordinary condition of a brand-new account, which criterion 46 forbids. This is the single most
important line in this contract for the client, and it is recorded here rather than left to be
discovered in Phase 4.

**Alternative considered and rejected:** adding a nullable `business` to `profileSchema`. It
avoids the 404 strain, but changes an existing shipped contract, mixes two resources in one
response, and would alter the schema the Phase 3 e2e test reads.

### B.8 Auth and default-deny

**All four routes are authenticated. None declares `config: { public: true }`.** Under the
`onRequest` hook in `app.ts`, that is all that is required — a route is protected by saying
nothing. `POST /v1/auth/signup` remains the only route in the API that opts out, alongside
`/health`.

No rate limit is declared on any of these routes. `fastifyRateLimit` is registered with
`global: false`, so nothing is throttled unless it asks, and the throttled endpoint is sign-up,
which is public. These three are behind a token.

### B.9 What this contract makes satisfiable — and what it cannot

**Satisfiable by this contract**, wholly or as the API half — **32 criteria**: 1, 2, 3, 4, 6, 7,
8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 23, 24, 31, 32, 34, 35, 36, 37, 38, 39, 40,
51.

**Criteria this contract CANNOT satisfy — the list that matters, 28 of them:**

**COUNT CORRECTED TWICE, and the pattern is worth more than either correction.** First on
2026-08-17, when this mapping totalled 51 against a file holding 54 — criteria 52–54 appended
with the rename surface and never classified. Then again the same day at 54 against 60, criteria
**55–60** appended with decision 12's navigation chain and likewise never classified. All nine
are UI. **The mapping drifts every time criteria are appended in a step that does not revisit
it**, which is a standing hazard of an append-only list read by a section that summarises it, and
the reason the totals are stated rather than left implicit. **32 satisfiable + 28 not = 60.**

- **22 — CORRECTED 2026-08-17. This was listed as satisfiable and is not.** Criterion 22 reads
  *"after **any** further creation attempt"*, and a concurrent double-submit is one. **The
  distinction:** the contract satisfies 22's **sequential** case entirely — a second request
  arriving after the first has committed reads the existing membership and is refused with the
  409. It cannot satisfy the **concurrent** case, where both requests read before either writes.
  **Only decision 10's partial unique index satisfies that**, which is the same reason 48 and 49
  sit here. The Notes section of the criteria file already said this; the mapping had not caught
  up.
- **48 and 49 (concurrency).** The contract's read-then-insert cannot stop two simultaneous
  callers both finding no business. **Only decision 10's partial unique index can**, and the
  contract's job is to turn the resulting `23505` into the 409 above rather than a 500. The
  contract is where the failure becomes *legible*, not where it becomes *impossible*.
- **50 (a non-owner membership at a second business remains possible).** A property of the index
  predicate. No endpoint in this slice creates a non-owner membership, so nothing here exercises
  it.
- **5 (the membership row and its `owner` role).** Caused by `POST`, but observed in the
  database; no response body exposes membership rows.
- **25, 26, 27, 28, 29, 30, 33, 43, 44, 45, 46, 47, 52, 53, 54 (screens and their states).** UI,
  in §C. The contract is necessary for several and sufficient for none.
- **55, 56, 57, 58, 59, 60 (reachability and the account menu).** UI and routing, in §C.9.
  **The contract is not even necessary for these** — no endpoint is involved in whether a screen
  can be opened, whether a menu omits a row, or whether sign-out is reachable. They are the
  criteria furthest from this section, which is precisely why the mapping lost them.
- **41 and 42 (the membership status reports the business, and survives a restart).** `GET
  /v1/me/business` is necessary and not sufficient: 41 needs the Flutter repository to replace
  its `MembershipStatus.none` constant, and 42 needs session restore to re-issue the call.
- **The whole of it also rests on §5.2 being discharged.** Until `business-already-exists` exists
  in `PROBLEM_TYPES`, criteria 34 and 35 cannot pass, and this contract cannot be implemented as
  written.

## C. UI and component tree

**Read before writing, and followed rather than invented:** `ui/async_value_view.dart` (the
`AsyncValueView` / `LoadingView` / `ErrorView` / `EmptyStateView` set, and its rule that **no
screen writes its own spinner**), `features/profile/profile_providers.dart` (a `FutureProvider`
per read, errors deliberately uncaught), `features/profile/profile_repository.dart` (the only
file in its feature permitted to import `package:bookflow_api`, enforced by
`test/design_system_test.dart`), `platform/router.dart` (the `AppDestination` enum and the
membership-driven redirect), `features/setup/setup_required_screen.dart` (the stub), and
`features/membership/membership_repository.dart`.

**Empty is not a fourth state here.** ADR-028, quoted in `async_value_view.dart`: *"Empty is not
an `AsyncValue` case and remains the screen's own responsibility inside the data branch."* Every
"empty state" below therefore lives **inside** a data branch, never beside loading and error.

### C.1 The three surfaces, and one new feature folder

Following ADR-028's `features/<feature>/` shape, this slice adds **`features/business/`** with
`business_repository.dart`, `business_providers.dart`, `business_models.dart`, and the screens.
`features/membership/` is **modified**, not added — its constant is replaced by a real call.

| Surface | New or changed | Holds | Fetches |
|---|---|---|---|
| **Screen #5** — business-name form | new | the typed name; submission in flight | nothing |
| **Screen #12** — setup-continuation | new | nothing of its own | the caller's business |
| **Screen #20** — widened, decision 11 | changed | the edited name; submission in flight | the caller's business, beside the existing profile |

### C.2 Screen #5 — the business-name form

**What it holds.** One text field's value, and whether a submission is in flight. Local to the
screen; no provider caches a half-typed name.

**What it submits.** `POST /v1/businesses` with `{ name }`. **The client does not pre-trim** —
decision 9's `.trim()` lives in the Zod schema server-side (§B.3), and duplicating it here would
create two places where the rule could drift.

**What it fetches: nothing.** This is why its empty state is inapplicable.

**Loading — criterion 43.** The in-flight state is a property of a *submission*, not of a read,
so it is **not** an `AsyncValueView`. `AsyncValueView` renders a whole screen from an
`AsyncValue`; here the form must stay on screen with its content intact while the request runs.
A `Notifier` holding an `AsyncValue<void>` for the submission, with the screen disabling its
submit control and showing progress on it. **The distinction matters and is the one place this
slice departs from screen #20's pattern** — #20 reads, and a read can own the whole screen.

**Empty — INAPPLICABLE, and why rather than omitted.** `EmptyStateView` exists for *"a successful
load with nothing in it"*. This screen performs no load. Its unfilled field is its initial state,
not an empty state, and criterion 30 already pins that it does not submit an empty name.

**Error — criterion 44.** The submission's error branch keeps the form mounted and the typed name
intact, surfaces the failure, and leaves the control usable. `ErrorView` is **not** used: it
replaces the screen and offers a retry, which would discard what the owner typed. This is the
second deliberate departure, and it follows `ErrorView`'s own doc — *"Overridable so a screen can
say something truer than the default when it genuinely knows more."* Here it genuinely does: a
409 means "you already have one" and a 400 means "that name will not do", and neither is
*"Something went wrong."*

### C.3 Screen #12 — the setup-continuation state

**What it fetches.** `GET /v1/me/business`, through `business_providers.dart`'s
`FutureProvider`, exactly as `myProfileProvider` wraps `GET /v1/me`.

**All three states, and the ordering criterion 46 imposes:**

- **Loading — criterion 45.** `AsyncValueView`'s loading branch → `LoadingView`. Nothing else is
  drawn: not a skeleton of the setup state, not the bookings frame.
- **Error — criterion 46.** `AsyncValueView`'s error branch → `ErrorView` with `onRetry`.
  **It shows neither the setup-continuation state nor the bookings empty state.** Both assert
  something about a business whose state is not known, and asserting either while ignorant is
  the failure this criterion exists to prevent. `router.dart` already argues the same point for
  the redirect: *"Guessing wrong in that direction is worse than saying 'we could not load this'
  and offering a retry."*
- **Data — criterion 47.** Inside the data branch, and only there: a business with nothing under
  it renders the **setup-continuation state**, naming where the owner is in setup and what
  remains. **Criteria 27 and 28**: no bookings empty state, no share-link prompt, no *"Share your
  booking link ›"* button, because there is nothing to share.

**Nothing here needs `EmptyStateView`.** The zero-everything case *is* the setup-continuation
state (criterion 47), so emptiness is expressed by the content, not by a generic view.

### C.4 Screen #20 widened — decision 11

**What it holds.** The existing personal section, unchanged. Beneath it, a **business section**
holding the business name, an edit affordance, the edited value while editing, and whether a
rename is in flight.

**What it fetches.** Two independent reads: the existing `myProfileProvider`, and the same
`GET /v1/me/business` provider screen #12 uses. Independent on purpose — one failing must not
blank the other.

- **Criterion 52.** The business section renders the name, beneath the personal section.
- **Loading — criterion 53.** The rename submission's in-flight state, on the same
  submission-not-read pattern as §C.2: the section stays mounted, its control shows progress.
- **Error — criterion 54.** Keeps the section mounted with the edited value intact and the
  control usable. Not `ErrorView`, for the same reason as §C.2.
- **Empty — inapplicable.** A field with an edit affordance is not a collection.

**How it sits beside the read-only personal section.** The personal fields keep K75's dead `Edit`
control, unbuilt, and the business section below has a working one. **This is decision 11's
recorded cost and it is not softened here.** The section is visually subordinate — beneath, under
its own heading — so the working affordance reads as belonging to the business block rather than
as an inconsistency within one card.

### C.5 Routing

`router.dart`'s `AppDestination` enum today: `startup('/startup')`, `signedOut('/welcome')`,
`setupRequired('/setup')`, `home('/home')` — which builds `ProfileScreen` — and
`unavailable('/unavailable')`. The redirect maps `MembershipStatus.member → home` and
`MembershipStatus.none → setupRequired`.

**After sign-up.** Unchanged in mechanism: no membership, so `none`, so `/setup`. **What changes
is what `/setup` offers** — today a dead-end stub with a sign-out button; now the entry point to
screen #5. Criterion 29's "no back arrow" follows from this: the owner arrives from a
destination, not from a previous onboarding step.

**After creating a business.** The membership provider is invalidated, the read re-runs, the
status becomes `member`, and the redirect carries the owner to `/home`. **Criterion 25 is
satisfied by the existing redirect and no new routing rule** — which is what the redirect tests
already exercise by overriding the repository to force `member`.

**CORRECTED 2026-08-17.** This section originally ended: *"`/home` builds `ProfileScreen` today.
Screen #12 becomes the home destination, and screen #20 moves behind it. That is a change to an
existing route, not an addition."* **The first two sentences are true and the third is badly
incomplete** — "moves behind it" quietly assumed a *behind* existed. It did not. **The moment
`/home` stops building `ProfileScreen`, screen #20 has no navigation path at all**, and with it
go sign-out for any owner with a business (its only affordance is #20's back arrow) and the only
surface in the app that renders a profile.

**Decision 12 supplies the missing path**, and it is more than a route swap: **#12's avatar →
screen #17 → #20**, with screen #17 built by this slice. §C.9 sketches it.

### C.6 The 404 rule — where criterion 46 actually lives

`GET /v1/me/business` answers **404 when the account has no business** (§B.7). **That 404 is a
data answer, not an error, and the mapping happens in exactly one place:
`features/business/business_repository.dart`.**

- **404** → the "no business" value. **Not thrown.**
- **Every other failure** → rethrown, so `AsyncValue` turns it into the error state.

**This is the single line criterion 46 depends on.** If a 404 escaped as a `DioException`, the
dashboard would render `ErrorView` for the ordinary condition of a brand-new account, and the
redirect would send a user with no business to `/unavailable` rather than `/setup`.

**It is a deliberate exception to the repository convention**, and the convention says so itself:
`profile_repository.dart` states that errors *"are deliberately NOT caught"* because the 401
interceptor and `AsyncValue.guard` both need to see them. **That reasoning does not extend to a
404 that means "nothing here yet"** — there is no session to end and no failure to report. The
exception is narrow: one status, one repository, everything else rethrown.

**`membership_repository.dart` is where this lands.** Its `NoBusinessYetMembershipRepository`
constant — the file that says it *"becomes a lie the moment business creation ships"* — is
replaced by a real implementation over this call. **Criteria 41 and 42.**

### C.7 Every screen criterion, mapped to a surface and a state

| Criterion | Surface | State |
|---|---|---|
| 25 | routing (§C.5) | redirect on `member` |
| 26 | screen #12 | data |
| 27 | screen #12 | data — by absence |
| 28 | screen #12 | data — by absence |
| 29 | screen #5 | initial |
| 30 | screen #5 | initial — submit blocked on an empty field |
| 33 | screen #5 | submission error |
| 43 | screen #5 | submission loading |
| 44 | screen #5 | submission error |
| 45 | screen #12 | loading |
| 46 | screen #12 | error, and §C.6's 404 rule |
| 47 | screen #12 | data |
| 52 | screen #20 business section | data |
| 53 | screen #20 business section | submission loading |
| 54 | screen #20 business section | submission error |

**All fifteen have a home. None is unhoused — stated as a finding, having been checked one by
one rather than asserted.**

**Two are close enough to overlap that it is worth saying they are not duplicates.** 33 and 44
both concern screen #5's failure path: **33** says an error is surfaced and the screen does not
stay in a permanent loading state — it forbids a hang. **44** says the owner can submit again
without restarting — it requires recovery. An implementation could satisfy 33 and fail 44 by
showing an error and disabling the form.

### C.8 ADR-039 — nothing is owed. All three screens are already classified.

**CORRECTED 2026-08-17. This section said a classification was owed for screens #5, #12 and #17,
and named it an obligation to settle before their widgets. That is false, and reading ADR-039's
Decision settles it in a minute.**

ADR-039 classifies all three **by name**:

- **Screen #5 is `native-04`** — inside "Screens `native-00` through `native-11`" and named among
  "all four onboarding steps". **Generation A.**
- **Screen #12 is `native-11`** — the upper bound of that range, named explicitly as "the
  dashboard". **Generation A.**
- **Screen #17 is `native-16`** — listed first under Generation B and named as "the profile and
  account menu". **Generation B.**

**The eight genuinely unclassified are `native-12, 13, 14, 15, 17, 18, 21, 22`.** None is
`native-04`, `native-11` or `native-16`. There was never an obligation here.

**What IS true, and binds T6 and T7+T8 more tightly than the imagined obligation did:**

- **Screens #5 and #12 are Generation A, which ADR-039 calls "Bookflow's design system".** The
  tokens in `tokens.dart` were derived from Generation A screens, so they apply **directly** —
  blue actions `#0278FF`, green CTA `#2DE27E`, the indigo hero gradient, green initials avatars.
  A measurement taken from either screenshot is a measurement of the system.
- **Screen #17 is Generation B, and ADR-039 rules that Generation B "is not" the design system.**
  It is a **structural reference only**: "Layout, hierarchy, copy and content stand. Colour and
  treatment come from the tokens." So `native-16`'s violet accents, black pill buttons and pink
  avatar are **never sampled**. Read it for what the rows are and where they sit; take every
  colour from `tokens.dart`.

**That is a stronger constraint than "classify it first", and it is already decided** — which is
the whole reason the imagined obligation was worse than useless: it deferred a live rule behind a
step that did not exist.

*Superseded text follows, left as the record of what was asserted.*

### C.8.1 What this section said before the correction

**Owed for one surface, and this sketch does not discharge it.**

ADR-039 splits the 28 screenshots into two visual languages and rules that only Generation A's
colour may be copied; the guiding brief records eight as unclassified, to be resolved as each
screen is built. **This slice builds against three:**

- **Screen #12** (`native-11-screen-5-dashboard-main-bookings-view.png`) and **screen #5**
  (`native-04-business-branding-onboarding-let-s-give-your.png`) — both are **built here for the
  first time**, so if either is among the eight, its classification is owed **before its widgets
  are written**, not after.
- **Screen #20** was already classified in PR 3b, which built it. Widening it adds no new
  question: the business section inherits the section it sits under.

**This document does not classify anything, deliberately** — ADR-039 decides which screenshots
belong to which generation, and answering it inside a slice's design sketch would settle an ADR's
question in the wrong document, which is the mistake §5.3 was raised over.

**Recorded as owed, to be settled at the start of Phase 3** — when widgets are written and the
tokens are actually reached for — **not as a fourth outstanding obligation in `00-frame.md` §5**,
because unlike §5.1, §5.2 and §5.4 it blocks nothing that is currently in flight and has a
natural trigger already.

**Decision 12 adds a fourth surface, screen #17**, and the same answer applies to it: if it is
among the eight, its classification is owed before its widgets are written.

### C.9 The navigation chain — decision 12

**Screen #12's avatar.** Part of the top bar the design specifies alongside the
Bookings/Contacts/Calendar tabs — *"**User Profile Avatar:** A circular badge with initials
**"xx"** on the far right"* (`DD-Bookflow-Native.md:586`). It renders initials from the profile,
reusing `OwnerProfile.initials`, which `profile_models.dart` already computes for #20's badge.
**It holds nothing and fetches nothing of its own**; it reads the profile provider the screen
already has. Its tap opens screen #17.

**Screen #17, the account menu — built by this slice.** Composition per decision 12: a header
carrying the avatar and display name, then **two rows only — Profile and Log out.** My services,
Settings and Support are omitted rather than drawn inert.

- **What it holds.** Nothing. It is a menu.
- **What it fetches.** The profile, for the header's name and initials — the same
  `myProfileProvider` #20 uses, not a second call.

**`DEFINITION_OF_DONE.md` line 32 applied to it, as a new screen:**

- **Loading.** Applies. The header reads the profile, so `AsyncValueView`'s loading branch →
  `LoadingView` while it is in flight. **The rows do not wait on it** — Profile and Log out are
  static and navigate regardless, so the loading state covers the header only. Sign-out
  reachable while the profile is still loading is the point: a user whose profile read hangs must
  still be able to leave.
- **Error.** Applies, and with the same carve-out. A failed profile read degrades the header,
  **not the menu.** `ErrorView` is not used here — it replaces the screen, which would take
  Log out with it and strand exactly the user who most needs it.
- **Empty — INAPPLICABLE, and why rather than omitted.** The menu is a fixed list of rows known
  at compile time, not a collection loaded from anywhere. It cannot return nothing. The header's
  profile is a single resource, absent only as an error.

**The route change, and it is a first for this app.** `router.dart`'s redirect is **total**: it
returns `destination.path` unless already there, every screen change today is a consequence of
state, no `GoRoute` has children, and **nothing anywhere calls `context.go` or `context.push`.**
Decision 12 introduces **the app's first tap-driven navigation** — #12 → #17 → #20 — which the
current redirect cannot express, because a pushed route is not the destination the provider
computes and the redirect would immediately pull the user back to `/home`.

**That is a change to routing's shape, not a new entry in the enum**, and it is the largest
single piece of new work decision 12 takes on. **Whether it warrants its own ADR is deliberately
not decided here** — ADR-028 chose `go_router` and the auth-aware redirect without anticipating
push navigation, and whether extending it is an implementation detail or a foundation change is a
**risk question, which is §D's subject.** Raised there, not settled here.

**Sign-out relocation.** From #20's back arrow to #17's Log out row. `profile_screen.dart`'s
comment — *"It leads nowhere in this slice — there is one screen behind the shell — so it signs
out instead of pretending to navigate"* — **expires with decision 12**, because there is now a
screen behind it. That comment is the marker for the change.

**Screen #20's back affordance** returns to **#17**. It stops signing out.

**One property worth pinning because it is easy to lose:** sign-out must remain reachable for an
owner with a business at every step of this move. It is reachable today only through #20; after
the move only through #17; and **between those two states is a diff in which it is reachable
through neither.** Criterion 57 exists for that.

## D. Layers touched, and risk

The manual's own list, walked in its own order. **A layer this slice does not touch is named and
marked so, rather than omitted** — an omitted layer and an untouched one look identical, and only
one of them has been thought about.

### D.1 Layer by layer

**Database.** Touched. One migration — decision 10's partial unique index (§A.4). No table, no
column, no type, no trigger. Writes to `businesses` and `memberships`; reads both.

**Data-access.** Touched, and this is where most of the new code lives. A new
`modules/businesses/` repository gaining insert, update and two scoped reads, each **taking its
executor as an argument** per `CLAUDE.md` §5. The insert of a business and its membership must
share one transaction.

**Business logic.** Touched. A new `businesses.service.ts`: the conflict check, the
create-both-rows transaction, and the rename. Thin, but not empty — and it is where the
read-then-insert of decision 8 lives.

**API.** Touched. Three new routes, one existing route unchanged, one new `PROBLEM_TYPES` entry
(§5.2), and the OpenAPI spec plus the Dart client regenerating as a consequence.

**Frontend.** Touched, heavily. Three screens built (#5, #12, #17), one widened (#20), a new
`features/business/` folder, `features/membership/`'s constant replaced, and the first
tap-driven route.

**Infra / config.** **NOT TOUCHED.** No new environment variable, no new secret, no Render
change, no `render.yaml` change, no new CI job. The one infra *dependency* is that ADR-034's
existing `migrate-staging` job must run for §5.4's migration — an existing job doing its
existing work.

**Jobs / webhooks.** **NOT TOUCHED.** No outbox row, no worker, no scheduled task, no inbound
webhook. Worth stating because a business-creation slice might be expected to send a welcome
email; ADR-027 puts account email on GoTrue's side and the outbox does not ship until the booking
slice.

### D.2 Do-Not-Vibe surfaces — checked against `CLAUDE.md` §6, not against memory

The universal list is *payment math · webhooks · migrations · auth and password reset ·
production secrets*. The Bookflow-specific list adds the availability predicate and exclusion
constraint, booking status transitions, the membership scoping rule, the public projection
allowlist, booking token minting and validation, the payment-proof access path, handle assignment
and retirement, and the outbox transaction boundary.

**Touched — two:**

1. **Migrations.** Decision 10's partial unique index. Universal list.
2. **The membership scoping rule.** Twice over: the new repository applies it to every protected
   read and write, and decision 10's index constrains the very table the rule traverses.

**Deliberately checked and NOT touched — the rest of both lists.** No payment math, no webhooks,
no auth or password-reset path (sign-up and sign-in are untouched; this slice adds no
credential handling), no production secrets, no availability predicate or exclusion constraint,
no booking statuses, no public projection (`business_public` is a non-goal), no booking tokens,
no payment-proof path, no handle assignment (ADR-021's table does not exist), and no outbox
boundary.

**Operationally, per `CLAUDE.md` §6:** both are written deliberately, reviewed line by line by a
human, never accepted from a generated diff on faith, and **named in the completion report.**

### D.3 Risks — the specific ones

Generic risk is not worth writing down. Each below is particular to this slice, and each carries
**what would make it visible early** rather than at the gate.

**R1 — `bookflow_api`'s write grants on `businesses` and `memberships` have never been exercised
by any code path.** `20260811180042_application_role.sql` grants CRUD, but **nothing under
`apps/api/src` has ever inserted into either table** — the only writes the API performs today are
to `user_profiles`, at sign-up. A grant that has never run is a grant nobody has tested.
**Early warning:** the first integration test that inserts a business, run against the real local
stack under the `bookflow_api` role rather than as `postgres`. `role.integration.test.ts` already
establishes the pattern for asserting what a role may and may not do. **This is cheap and it is
the first thing to write** — it fails in seconds locally rather than in `migrate-staging`.

**R2 — the first tap-driven route.** §C.9: `router.dart`'s redirect is total, no `GoRoute` has
children, nothing calls `context.go` or `context.push`. A pushed route is **not** the destination
the provider computes, so the redirect as written would pull the user straight back to `/home`.
This is a change to routing's shape, in the one file that decides where a user may be.
**Early warning:** `router_redirect_test.dart` already drives both membership statuses through
the redirect by overriding the repository, without a widget tree. **A test that pushes #17 and
asserts the redirect does not yank the user back belongs in that same file, written before the
screen exists.** If the redirect cannot express it, that is known before any widget is built.

**R3 — criteria 41 and 42 cannot be demonstrated on the staging e2e account.** K78's standing
rule is that this account **must never be given a membership**, and 41 and 42 are precisely about
an account acquiring one. **E14 compounds it:** staging's sender is Resend's test address
reaching one inbox, so a replacement account cannot complete an activation link and must be
admin-created with `email_confirmed_at` set, as the existing one was. **Early warning:** decide
the second account's provenance **now, in Phase 1**, not when the e2e gate is written — and the
check that proves it is `docs/ENVIRONMENT.md`'s "expected total: 1" identity check on
`auth.users`, which **must be updated in the same commit that creates the account** or it starts
reporting residue that is not residue.

**R4 — the mapping in §B.9 drifts whenever criteria are appended.** It has been wrong twice in
one day, both times because criteria were added in a step that did not revisit it. **Early
warning:** the totals are now stated explicitly, so a reader can subtract; and the criteria file's
count is a single `grep`. **Cheapest real fix is procedural** — whoever appends a criterion
classifies it in the same commit.

**R5 — three screens and a widened fourth is the largest frontend surface any slice has
carried.** Phase 3 built one screen and called it the one true page. This slice builds #5, #12
and #17, widens #20, and adds the first push route. **Early warning:** §E's task order is where
this is either managed or not, and the manual's own instruction — *"Aim for an order where each
step leaves the app in a runnable state"* — is the test. **Specifically: the diff that moves
`/home` to screen #12 must not be separable from the diff that builds #17**, because between them
sign-out is reachable through neither screen (§C.9). Criterion 57 is the assertion; the task
order is what keeps it true at every commit rather than only at the end.

### D.4 A question for you to rule on, not settled here

**Does the first push route need its own ADR, an amendment to ADR-028, or neither?**

**What ADR-028 actually decides, quoted in full** (lines 23–26): *"**Routing: `go_router`.**
Declarative routes, and the auth-aware redirect between the logged-out and logged-in shells
expressed as a `redirect` on the router rather than as navigation scattered through widgets. One
place decides whether an unauthenticated user may be where they are."*

**That is narrower than it is usually read.** It decides the library; it decides that the
**auth-aware** redirect lives on the router; and its stated purpose is *"whether an
unauthenticated user may be where they are."* **It says nothing about the redirect being total,
and it does not forbid push navigation.**

**The totality is emergent, not decided.** It is a property of how `router.dart` was written —
the redirect returns `destination.path` unless already there, and no `GoRoute` has children — not
a rule anyone recorded. The file's own comment stays within ADR-028's scope: *"no screen in this
app pushes a route **to keep an unauthenticated user out**, and no screen checks a session before
rendering."* That is a statement about auth, not about navigation generally. **No other ADR
addresses routing** — a search of `docs/decisions/` for `go_router` or `redirect` returns ADR-028
and ADR-021, and ADR-021's matches are about URL redirects for retired salon handles, an
unrelated sense of the word.

**Recommendation: an AMENDMENT to ADR-028, not a new ADR, and not neither.**

- **Not a new ADR**, because nothing is being reversed or re-decided. `go_router` stands, the
  auth-aware redirect stands, and its rationale is untouched.
- **Not neither**, because the next reader will hit exactly the ambiguity this section had to
  resolve by reading source. ADR-028 is where someone looks to find out how navigation works, and
  it currently answers only half the question.
- **An amendment**, because this is `CLAUDE.md` §3's category precisely: a fact that has moved on.
  It would record that the redirect is total for shell selection, that push navigation is
  permitted **within** a shell, and where the boundary sits.

**One caveat on my own recommendation.** ADR-041's amendment was filed under the same category
and the guiding brief records that as a **governance gap** — §3 has no category for an amendment
that *sharpens* an under-specified rule. This is arguably the same shape: ADR-028 is not wrong,
it is silent. **Worth ruling on both together.**

## E. Task sequence

The manual: *"Sequence the work into tasks and order them by dependency. Data layer usually first
(everything depends on it); UI polish usually last. Aim for an order where each step leaves the
app in a runnable state."*

**Three constraints bind this order. They are not preferences.**

- **T1 comes first (R1).** `bookflow_api`'s write grants on `businesses` and `memberships` have
  never been exercised. A grant failure caught locally costs seconds; caught in
  `migrate-staging` it costs a CI run nobody can currently pay for.
- **T7 and T8 must not be separable (R5).** Between moving `/home` to the dashboard and building
  the account menu, **sign-out is reachable through neither screen.** Criterion 57 is the
  assertion; this ordering is what keeps it true at every commit rather than only at the end.
- **T5 precedes every widget (R2).** The redirect test for a pushed route needs no widget tree
  and tells us whether ADR-042's requirement can be met at all.

### E.1 The tasks

| # | Task | Produces | Depends on | Criteria it makes observable | Runnable after? |
|---|---|---|---|---|---|
| **T1** | Grant probe | An integration test inserting a business and a membership **as `bookflow_api`**, following `role.integration.test.ts` | nothing | none directly — it de-risks every later task | **yes**, nothing shipped |
| **T2** | The migration | `uq_memberships_one_owner_per_user`, the partial unique index (§A.4) | T1 | 48, 49, 50 at the database level | **yes** |
| **T3** | The conflict slug | `business-already-exists` appended to `PROBLEM_TYPES` (§5.2) | nothing | none alone | **yes** |
| **T4** | API vertical slice | `modules/businesses/` — schema, repository, service, three routes; regenerated spec and Dart client | T1, T2, T3 | 1–24, 31, 32, 34–40, 51 | **yes** — the app still shows #20 |
| **T5** | Redirect for pushed routes | `router.dart` per ADR-042, and the redirect test that pushes a within-shell route | nothing | none directly | **yes**, no screen uses it yet |
| **T6** | Screen #5 and the business feature | `features/business/`, the form, `POST` wired | T4, T5 | 29, 30, 33, 43, 44 | **yes** |
| **T7+T8** | **One task, deliberately.** Dashboard at `/home`, account menu, avatar, sign-out moved, #20's back affordance | screens #12 and #17, the first push route | T4, T5, T6 | 25, 26, 27, 28, 45, 46, 47, 55, 56, 57, 58, 59, 60 | **yes — only because they are one task** |
| **T9** | Membership status | `features/membership/`'s constant replaced by a real call over `GET /v1/me/business`; the 404 mapping (§C.6) | T4, T7+T8 | 41, 42 | **yes** |
| **T10** | Screen #20's business section | The section, its edit affordance, `PATCH` wired | T4, T7+T8 | 52, 53, 54 | **yes** — **DONE, by the pierce; see below** |
| **T11** | Design-system and deviation records | ADR-039 classification for #5, #12, #17; the five deviations into `08-design-deviations.md` | T6, T7+T8, T10 | none — it is the record | **yes** |

### E.2 Runnable at every step — checked, not asserted

**Yes at every step, and one of them only because of how the tasks are cut.**

**T7+T8 is the honest part of this table.** Written as two tasks it fails: after moving `/home`
to the dashboard, screen #20 has no path and sign-out is reachable from nowhere — criteria 55, 57
and 58 all fail, and an owner who opens the app cannot leave it. **That is not "less polished",
it is broken.** Merging them is not tidiness; it is the only ordering in which the constraint
holds, and it is why R5 was recorded as a risk rather than a note.

**T2 deserves a caveat rather than a clean yes.** The index applies to a database with no
`memberships` rows, so it cannot fail on existing data — but it is applied to *staging* by
`migrate-staging`, and until then local and staging schemas differ. The app runs against both;
"runnable" holds, "identical" does not.

**T3 is inert on its own.** A slug nothing throws changes no behaviour. It is separated from T4
deliberately, because it edits ADR-014's shared error contract and deserves its own review rather
than arriving inside a 500-line feature diff.

### E.3 What can be done now, and what waits for 2026-08-31

**This is the split that decides how much of Phases 2 and 3 can start immediately.**

**Fully doable AND verifiable locally — T1 through T7+T8, T9, T10, T11.** Everything, in other
words, up to the point of proving it. `npm run verify` runs lint, format, typecheck, unit tests
**and the integration suite against the real local Supabase stack** — the same stack, the same
Postgres 17.6 line, the same migrations. The pre-push hook already runs it on every push, and has
on all seventeen commits of this branch. On the Dart side `flutter analyze`, `dart format` and
`flutter test` are local. **The redirect test (T5), the grant probe (T1) and every widget test
need no network at all.**

**Needs CI and Actions minutes — three things, and only three:**

1. **`migrate-staging` applying T2's index to staging.** ADR-034 forbids applying migrations from
   a development machine. This is `00-frame.md` §5.4's outstanding obligation.
2. **The `contracts` job** proving the regenerated OpenAPI spec and Dart client have no drift.
   Generation is local; the **drift check as a gate** is CI's.
3. **`deploy-staging`, `smoke-staging` and `e2e-staging`** — the deployed API, and the e2e journey
   `DEFINITION_OF_DONE.md` requires for a critical journey.

**Needs staging specifically, beyond minutes — one thing, and it should be decided now.** R3: the
staging e2e account cannot demonstrate criteria 41 and 42, because K78 forbids giving it a
membership, and E14 means a replacement must be admin-created with `email_confirmed_at` set.
**That decision costs nothing today and blocks the e2e gate if left until the gate is written.**

**So: T1 through T11 can be built and locally verified before the reset. What cannot happen is
merging any of it** — `DEFINITION_OF_DONE.md` wants CI green end to end, and PR #14 is already
waiting on the same wall. The work is not blocked; only the merge is.

### E.4 The first vertical pierce — and where §E and the manual disagree

**§E's ordering constraints stand. What follows changes the granularity of the first pass, not
the order.**

**The disagreement, stated plainly.** The manual's Phase 3 demands *"a thin vertical slice that
pierces every layer and works end to end — one field, one row, one button"* **before any layer is
complete.** §E's tasks are **complete-in-layer**: T4 is the whole API vertical — three routes,
full validation, the regenerated client — and building it as written puts every route in place
before a single screen exists. **That is a horizontal layer wearing a vertical name**, and the
manual warns about exactly it: *"nothing actually runs until the very end, and integration
problems all hit you at once, late."*

**THE FIRST PIERCE: screen #20's business section.** Reading `GET /v1/me/business`, and renaming
through `PATCH /v1/businesses/{businessId}`. One field — the business name. One row — the
caller's business. One button — the rename.

**Why #20 and not #12**, which is the more obvious "home" candidate: **#12 needs the routing
change**, and the routing change drags in the whole T7+T8 atomic bundle — the avatar, the account
menu, the sign-out relocation, the first push route. **#20 is at `/home` and reachable today**,
so the pierce needs no navigation work at all. The thinnest pierce is the one that borrows an
existing route rather than inventing one.

**Why rename is in the pierce and not deferred.** The manual's exit condition is *"click →
request → service → query → database → back up the stack → rendered on screen."* **A read on load
has no click.** Rename supplies it, and it is one field and one button — the manual's own
measure. Without it the pierce proves the read path and stops short of the sentence the phase is
defined by.

**Why this ordering defers a decision rather than forcing one.** **Screen #20 is already
classified under ADR-039**, in PR 3b, and decision 11's widening inherits that classification.
So the classification owed for **#5, #12 and #17** — see §C.8 — **is not due until thickening**,
which is where those screens are built. Piercing through #20 buys that time honestly rather than
by postponing an obligation that has come due.

**What the pierce does NOT include.** Named so its absence reads as sequencing rather than
oversight — **every one is thickening, in §E's existing order**:

- **Creating a business** (`POST /v1/businesses`) — T4's remainder and T6's screen #5.
- **The conflict slug** `business-already-exists` — T3. Nothing in the pierce can conflict:
  it reads and renames a business that already exists.
- **Decision 10's migration** — T2. The pierce adds no constraint and needs none.
- **The dashboard and the account menu** — T7+T8, atomic, and deliberately untouched.
- **The membership-status replacement** — T9. The pierce reads the business directly; it does
  not yet change what `membership_repository.dart` reports.

**After the pierce, everything is thickening rather than construction**, which is the manual's own
test for having finished this phase.

### E.5 T10 was completed by the pierce — recorded rather than re-invented

**T10 has nothing left in it.** §E scheduled "screen #20's business section — the section, its
edit affordance, `PATCH` wired" as a task, and then §E.4 chose exactly that as the first vertical
pierce. The pierce built it: `business_section.dart`, the edit affordance, `PATCH` wired end to
end, and criteria **52, 53 and 54** mapped and green.

**This is recorded rather than resolved by inventing work to match the task name.** The pierce
pulled T10 forward by design — it was picked *because* screen #20 was reachable and needed no
routing change — and §E's table was written before that decision existed. A task list and a
decision taken later disagreed, and the decision is the one that happened.

**What T10's dependencies were really protecting** still held: it lists T4 and T7+T8, and the
section's `PATCH` did need T4. T7+T8 it did not need, because #20 was at `/home` when the pierce
built it; that dependency was about #20 *after* the move, and it is satisfied now either way.
