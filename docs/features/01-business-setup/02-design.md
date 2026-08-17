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

**Criteria this contract CANNOT satisfy — the list that matters, 19 of them:**

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
- **25, 26, 27, 28, 29, 30, 33, 43, 44, 45, 46, 47 (screens and their states).** UI, in Phase 1
  §C. The contract is necessary for several and sufficient for none.
- **41 and 42 (the membership status reports the business, and survives a restart).** `GET
  /v1/me/business` is necessary and not sufficient: 41 needs the Flutter repository to replace
  its `MembershipStatus.none` constant, and 42 needs session restore to re-issue the call.
- **The whole of it also rests on §5.2 being discharged.** Until `business-already-exists` exists
  in `PROBLEM_TYPES`, criteria 34 and 35 cannot pass, and this contract cannot be implemented as
  written.

## C. UI and component tree

*Not written in this step.* Blocked in part on §5.3 of `00-frame.md` — the rename surface has no
screen. See `03-rename-surface-evidence.md` if that decision is taken separately.

## D. Layers touched, and risk

*Not written in this step.*

## E. Task sequence

*Not written in this step.*
