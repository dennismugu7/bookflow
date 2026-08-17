# Business setup — Phase 3 close

> Derived record. What was built, what was proved, and what was **not**.

The feature manual's Phase 3 asks for *"a thin vertical slice that pierces every layer and works
end to end — one field, one row, one button"*. `02-design.md` §E.4 chose that pierce: **screen
#20's business section**, reading `GET /v1/me/business` and renaming through
`PATCH /v1/businesses/{businessId}`.

## 1. The pierce, layer by layer, and what each proof actually was

| Layer | Built | What the proof was |
|---|---|---|
| **1. Data** | Nothing. No migration. | The tables already exist and `seed.sql` supplies an owner with a business. Decision 10's index is thickening (T2), not this. Proved by the three existing migrations applying cleanly — `supabase migration list --local` shows every local version matched. |
| **2. Data-access** | `findBusinessOwnedBy`, `renameBusinessForUser` | Six integration tests against the **real local Postgres**, every one planting a business owned by somebody else. The method takes no business id, so a test where the caller's business is the only business would pass against a query with no `user_id` filter at all. |
| **3. Service** | `getMyBusiness`, `renameMyBusiness` | Pass-through, as the manual permits. Asserted `toEqual` the repository rather than merely defined — a pass-through that quietly reshaped the row would still be defined. |
| **4. API** | `GET /v1/me/business`, `PATCH /v1/businesses/:businessId` | Thirteen tests through the **real app with a real GoTrue token**. The read is driven **1 → 0 → 1** on one account inside a single test. Every trimming boundary is checked against the **column**, not the response. |
| **5. Frontend data** | `features/business/` — models, repository, providers | The 404-as-data rule implemented where §C.6 said it must be. A widget test pins that a failed **read** renders the shared `ErrorView` while a failed **submission** does not — the distinction the whole design rests on. |
| **6. Frontend UI** | Screen #20's business section | Four widget tests, each **driving** a state rather than catching it once: the spinner is asserted absent → present → absent, because one asserted only while loading passes against a spinner that never clears. |

## 2. THE SEAM GAP — the honest part

**Every layer passes its own gate. The seams are typed. The two halves have never met in a
running process.**

The API is proved against a real local Postgres and a real GoTrue token. The widgets are proved
against **stubbed repositories**. What connects them — the generated Dio client, the base URL,
the auth interceptor attaching a real token to these particular routes, the JSON actually
deserialising into `Business` — has been exercised by nothing.

**Nobody has watched it run.** `docs/ENVIRONMENT.md` records the Android toolchain as *"CI-only
for now — no local emulator or device has been used"*, and iOS is impossible on Windows (ADR-015).
There is no emulator and no device on this machine.

**The tests do not close this gap and must not be read as closing it.** "The pierce works" today
means every layer passes its own gate and the types line up across the seams — not that a person
has tapped Save and watched a name change.

**Three routes would close it. Dennis has not chosen one.**

1. **A physical Android phone over USB**, with the app pointed at the local API over the LAN.
   Needs the API bound beyond localhost and the phone on the same network. No CI, no minutes.
2. **A local Android emulator**, reaching the host API at **`10.0.2.2`**, which is the emulator's
   alias for the host loopback. Needs the Android SDK and an AVD, neither of which has been set
   up here. No CI, no minutes.
3. **`e2e-staging` after the reset**, which drives a real build on a real emulator against the
   deployed API. This is the one `DEFINITION_OF_DONE.md` actually asks for — and it needs Actions
   minutes, so it cannot happen before ~2026-08-31.

Routes 1 and 2 are available **now** and would answer the question days earlier than route 3.
Route 3 is the one that satisfies the gate. They are not substitutes for each other.

## 3. The first real number — criteria mapped to named tests

`00-frame.md` §7 said the one honest measurement at merge is **how many of the criteria map to a
named test**. This is the first moment that number can exist; Phase 3 had no criteria to count
against (ADR-040 §3.1, K77).

**Of 60 criteria: 17 mapped, 43 not.**

**Mapped, with the test that names each:**

| # | Test |
|---|---|
| 9 | `accepts 200 non-whitespace characters carrying padding` |
| 10 | `rejects 201 characters` |
| 12 | `rejects a whitespace-only name` |
| 13 | `renames, and a subsequent read returns the new name` |
| 19 | `is 401 with no token` · `is 401 with no token, and nothing is written` |
| 20 | `gives the SAME response for "not yours" and "does not exist"` |
| 21 | `a non-member gets 404 AND the name is unchanged afterwards` |
| 24 | `two accounts may hold businesses with the identical name` |
| 31 | `carries no detail and no instance in its failure body` |
| 32 | `a validation failure body carries no detail and no instance` |
| 37 | `stores a padded name trimmed` |
| 38 | `accepts 200 non-whitespace characters carrying padding` |
| 39 | the trimming tests, which are all renames |
| 51 | `two accounts may hold businesses with the identical name` |
| 52 | `criterion 52 — the section shows the business name` |
| 53 | `criterion 53 — a rename in flight shows loading, which then clears` |
| 54 | `criterion 54 — a failed rename shows an error and stays submittable` |

**Unmapped, and the split matters more than the total.** Most of the 43 are unmapped because the
code does not exist yet — creation (1–7, 18, 22, 23, 33–36), the dashboard and account menu
(25–30, 43–47, 55–60), the concurrency index (48–50), the membership status (41, 42).

**But six are testable TODAY and are not tested**, which counting exposed and reading would not
have:

- **8** — a name of exactly one non-whitespace character is accepted. The boundary opposite 10,
  and only one end is covered.
- **11** — an empty name is rejected. It *is* asserted, inside the test named *"a validation
  failure body carries no detail and no instance"*. **That is not a test named after criterion
  11**, and the DoD asks for a named test, so it counts as unmapped rather than as a technicality.
- **14** — a rename changes the name and nothing else. Nothing asserts `id`, `published` and the
  membership row are unchanged afterwards.
- **16** — no field other than the name can be changed. No test attempts one.
- **17** — nothing an owner can do removes their business. Satisfied by the absence of a route,
  and absence is exactly what nobody writes a test for.
- **40** — two names differing only in surrounding whitespace are stored identically.

**No criterion is unnamed-because-untestable.** Every one of the 60 has an imaginable test; the
43 are blocked on code, not on being ill-posed. That is the check §3 of the criteria file exists
to make possible, and it passes.

## 4. Still owed

**The ADR-039 classification.** Due at the first widget for screen **#5, #12 or #17** — none of
which this pierce built. Screen #20 was classified in PR 3b and decision 11's widening inherits
it. **Unchanged and still owed** (`02-design.md` §C.8).

**Outstanding obligations, by number** (`00-frame.md` §5):

- **§5.1** — the `05-triage.md` update moving K27 and K47 to Resolved. Waits on PR #14.
- **§5.2** — `business-already-exists` is not in `PROBLEM_TYPES`. Task T3.
- **§5.3** — **DISCHARGED** 2026-08-17 by decision 11.
- **§5.4** — decision 10's migration, and applying it via `migrate-staging`. Task T2, and it
  needs minutes.
- **§5.5** — `docs/ENVIRONMENT.md` §4 is stale about `seed.sql`. Waits on PR #14 with §5.1.

**R3's staging account** — the e2e account cannot demonstrate criteria 41 and 42 (K78), and E14
makes a replacement non-trivial. Still undecided, and it blocks the e2e gate if left.

## 5. Two things this pierce added that were not planned

**`BookflowSizes.inlineSpinner = 18` — an INVENTED token.** Recorded as such in `tokens.dart`,
alongside `avatarSmall`, with its justification: no screenshot shows an in-flight control, so
there is nothing to measure; 18 is what fits Material's default button height without changing
it, *which is the property that matters*. It is not a measurement pretending to be one.

**`_withRoboto` missed `textButtonTheme` — a pre-existing gap, found and fixed as a side effect.**
The golden's theme helper re-applies Roboto to `textTheme` and the app bar title, but
`textButtonTheme`'s style captured `labelLarge` when the theme was built, so the family never
reached it. The label fell back to the test font, which draws every glyph as a filled rectangle —
and the first regenerated golden showed **"Edit" as a solid blue block**.

**Could it affect any golden other than `native-20`?** **No — because `native-20` is the only
golden there is.** `apps/mobile/test/golden/` contains one test and
`docs/designs/built/` one image. The gap was invisible for as long as no golden screen had a
button, and decision 11 put the first one on this screen. **Every future golden inherits the fix**,
which is the reason it was fixed in the helper rather than worked around in this test.

## 6. What remains of §E

**T1 discharged** (the grant probe, closed as a side effect of building the fixtures — see
`03-environment.md` §E.4). **Remaining: T2, T3, T6, T7+T8, T9, T10, T11.**

Everything from here is **thickening rather than construction**, which is the manual's own test
for having finished this phase.

## 7. Counts at close

| Gate | Count |
|---|---|
| TypeScript unit | **42**, in 3 files |
| TypeScript integration | **97**, in 10 files — against the real local Supabase stack |
| Dart | **32** |
| `flutter analyze` | clean |
| `dart format` | 27 files, 0 changed |
| Contract drift | `contracts:check` exits 0 |

**See also `03-environment.md` §E.5**: `seed.sql`'s business is `published = true` with zero
services, which §5's K27 answer makes impossible once the publishing slice enforces its
precondition. Local-only and predating the decision — recorded there so the publishing slice does
not inherit a fixture that contradicts it.
