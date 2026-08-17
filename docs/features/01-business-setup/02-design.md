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
different businesses. **Decision 8's conflict is therefore enforced by application logic over a
`memberships` read, and the unique constraint is the backstop for the concurrent case only.**
This is the most important sentence in this section and it corrects a natural misreading.

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
| Q3 | Does this account already have a business? — `memberships where user_id = $1` (decision 8, criterion 22) | `uq_memberships_user_business`, **prefix match on `user_id`** |
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

**This slice needs no migration at all.** Not additive, not altering — zero schema change.

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

**Consequence: the Do-Not-Vibe migration surface is not touched by this slice.** That is worth
saying out loud, because "migrations" is the surface a reviewer would otherwise expect a
business-creation slice to hit.

**The one thing to re-check at Phase 2**, and it is a schema question rather than a code one: the
application role's grants. `20260811180042_application_role.sql` grants CRUD to `bookflow_api`;
this slice performs the first `insert` into `businesses` and `memberships` from the API, and
nothing has yet exercised those grants for writes on these two tables.

## B. API contract

*Not written in this step.*

## C. UI and component tree

*Not written in this step.* Blocked in part on §5.3 of `00-frame.md` — the rename surface has no
screen. See `03-rename-surface-evidence.md` if that decision is taken separately.

## D. Layers touched, and risk

*Not written in this step.*

## E. Task sequence

*Not written in this step.*
