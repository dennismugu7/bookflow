# Business setup — acceptance criteria

Written **after** `00-frame.md` pinned the scope and **before** any design or test, as `CLAUDE.md`
§7 requires (K77). Criteria constrain tests; tests never author criteria.

Each statement below is observable from outside the implementation — an API response, a database
state, or something on screen — and each can fail. No test name, file name or framework detail
appears here, deliberately.

> ## The numbering rule — append-only, never renumbered
>
> **Criteria are cited by number, here and in every document, test and review that follows. A
> criterion's number is therefore permanent.**
>
> - **New criteria take the next free number.** Never insert, never reflow.
> - **Never renumber, never reorder, never reuse a number**, including one whose criterion has
>   been withdrawn.
> - **To withdraw one, mark it withdrawn in place with the reason**, and leave its number
>   standing. A gap is readable; a silently reassigned number makes every prior citation point
>   at something else.
> - Correcting a typo in a statement is fine. Changing what it *asserts* is a withdrawal plus a
>   new number.
>
> This rule exists in the file rather than in a person's memory because renumbering is the
> tidiest-looking way to break every citation at once.
>
> ## The naming rule — a test carries the number of the criterion it covers
>
> **A test that covers a criterion names it, in the form `criterion N — …`.** A test covering
> several names all of them: `criterion 37, 39 — …`.
>
> **So the mapping is derived, never maintained.** `DEFINITION_OF_DONE.md` asks that every
> criterion "maps to a **named** test", and this makes that a `grep` rather than a table:
>
> ```
> grep -rhoE "'criterion [0-9]+(, [0-9]+)*" apps/api/src apps/api/test apps/mobile/test \
>   | grep -oE "[0-9]+" | sort -n | uniq
> ```
>
> **Two details in that command are load-bearing, both found by running it.**
>
> **The leading `'` is deliberate.** Without it the grep also matches prose — a comment reading
> *"the boundary opposite criterion 10"* would count as coverage. Anchoring on the opening quote
> restricts it to string literals, which is where test names live. There are three such prose
> mentions today and all three happen to name criteria that are covered anyway, so the loose form
> gave the right answer for the wrong reason.
>
> **Do not anchor on `it(` or `testWidgets(`.** The formatter wraps long declarations, so the
> call and its name land on different lines and a line-anchored pattern silently under-counts —
> it reported **21** where the true figure is **23**, losing the two Dart tests whose names the
> formatter had moved. A mapping check that quietly under-reports is worse than none, because it
> looks like work still to do rather than like a broken instrument.
>
> **Why derived and not written down.** A table a human maintains is a table that goes stale, and
> this project has the evidence: `02-design.md` §B.9's count drifted **twice in one day**, both
> times because criteria were appended in a step that did not revisit it. A count nobody can
> compute is a count nobody can check, and it reads as current the whole time it is wrong.
>
> **A number in a test name is a claim.** If the test does not actually exercise that criterion,
> the name is a false mapping and worse than no mapping — the grep will report coverage that does
> not exist. Name what the test proves, not what you meant it to prove.

## Criteria

### Creating a business, and what exists afterwards

1. Creating a business with a valid name succeeds, and that business is afterwards readable by
   the account that created it.
2. The created business's identifier is a UUID.
3. The created business's name is the name that was submitted.
4. The created business's `published` is `false` immediately after creation.
5. Exactly one membership row joins the creating account to the new business, and its role is
   `owner`.
6. No onboarding step beyond screen #5 is required: once the name is submitted, the business and
   its membership exist without any further step being completed.
7. Creating a business creates no services, no team members, no portfolio images and no opening
   hours.

### Name validation, at the constraint's real boundaries

8. A name of exactly one non-whitespace character is accepted.
9. A name of exactly 200 non-whitespace characters is accepted.
10. A name of 201 characters is rejected, and no business is created.
11. An empty name is rejected, and no business is created.
12. A name consisting only of whitespace is rejected, and no business is created.

### Renaming

13. After the owner renames their business, a subsequent read returns the new name.
14. A rename changes the name and nothing else: the identifier, `published`, and the membership
    row are unchanged afterwards.
15. A rename is validated identically to creation — criteria 8 through 12 hold for a rename.
16. No field other than the name can be changed by any request this slice exposes.

### Deletion

17. No request an owner can make removes their business or its membership; both remain present
    and readable afterwards.

### Authorisation

18. An unauthenticated request to create a business is refused, and no business is created.
19. An unauthenticated request to read or rename a business is refused.
20. A signed-in user who is not a member of a business receives a not-found response when
    reading it, and that response is indistinguishable from the response for a business that
    does not exist.
21. A signed-in user who is not a member of a business cannot rename it, and the business's name
    is unchanged afterwards.

### One business per account

22. An account that already has a business does not acquire a second: after any further creation
    attempt, that account still holds exactly one business and exactly one membership.
23. A further creation attempt leaves the existing business's name, identifier and `published`
    state unchanged.

### Names are not unique

24. Two different accounts may each hold a business with an identical name, and both creations
    succeed.

### What the owner sees

25. An owner who has just created a business is no longer routed to the "finish setting up"
    screen.
26. While the business is unpublished, the dashboard shows a setup-continuation state naming
    where the owner is in setup and what remains.
27. While the business is unpublished, the dashboard does not show the bookings empty state.
28. While the business is unpublished, the dashboard does not show the share-link prompt or the
    "Share your booking link ›" button.
29. Screen #5 presents no back arrow to an owner arriving from sign-up.
30. Screen #5 does not submit a business with an empty name.

### Failure behaviour

31. Every failure response in this slice is an RFC 9457 problem document carrying `type`,
    `title` and `status`.
32. A validation failure does not echo the submitted name back in the response body.
33. A failed business-creation request surfaces an error to the owner and does not leave the
    screen in a permanent loading state.

### The conflict on a second business (decision 8)

34. A creation attempt by an account that already has a business is refused, and no second
    business and no second membership is created.
35. That refusal is an RFC 9457 problem document whose `type` names a conflict, distinct from
    every problem type the API returned before this slice.
36. A refused second attempt that submitted a *different* name leaves the existing business's
    name unchanged, and the submitted name is stored nowhere.

### Names are stored trimmed (decision 9)

37. A name submitted with leading or trailing whitespace is stored without it: a subsequent read
    returns the trimmed name.
38. A name of exactly 200 non-whitespace characters submitted with surrounding whitespace is
    accepted, and the name afterwards readable is exactly those 200 characters.
39. A rename trims identically to creation: a new name submitted with surrounding whitespace is
    stored without it.
40. Two names differing only in leading or trailing whitespace are stored identically.

### The membership stub stops lying

41. After creating a business, the account's membership status reports that business rather than
    reporting that the account has none.
42. That status survives a restart: an owner who reopens the app on a valid session is still
    recognised as having a business, and is not returned to the "finish setting up" screen.

### Loading, empty and error states (`DEFINITION_OF_DONE.md`)

43. While a business-creation request is in flight, screen #5 shows a loading state.
44. When a business-creation request fails, screen #5 shows an error state, and the owner can
    submit again without restarting the app.
45. While the owner's business and membership status are being loaded, the dashboard shows a
    loading state rather than a blank or partially-populated screen.
46. When that load fails, the dashboard shows an error state, and shows neither the
    setup-continuation state nor the bookings empty state.
47. For a business with no bookings, no services, no team members and no portfolio images — the
    ordinary output of this slice — the dashboard renders the setup-continuation state rather
    than a blank screen.

### One business per account, enforced (decision 10)

48. Two creation attempts issued concurrently for the same account do not leave that account
    holding two businesses: afterwards it holds exactly one business and exactly one membership.
49. When concurrent attempts collide, at most one succeeds and the other is refused — no attempt
    both fails and leaves a business behind.
50. An account holding an `owner` membership can still be given a membership with a different
    role at a second business, and that insert is accepted. This is what pins the enforcement to
    a *partial* index: were it satisfied by a plain unique key on the account, this criterion
    would fail.
51. A business created by one account and a business created by another are unaffected by each
    other's existence: neither account's creation is refused because a different account already
    has a business.

### The rename surface, once it had one (decision 11)

52. Screen #20 shows a business section carrying the business name, beneath the personal section.
53. While a rename request is in flight, screen #20's business section shows a loading state.
54. When a rename request fails, screen #20's business section shows an error state, and the
    owner can submit the rename again without restarting the app.

### Reachability and the account menu (decision 12)

55. An owner with a business can reach screen #20 from the screen they land on after signing in,
    without reinstalling, signing out, or being sent there by a redirect. **This criterion is
    first in this group deliberately: it is the one that would have caught a route change that
    left screen #20 with no path to it.**
56. Screen #17 shows no row whose destination does not exist.
57. An owner with a business can reach sign-out, and signing out from there returns them to the
    signed-out shell.
58. Screen #20's back affordance returns to screen #17, and does not sign the owner out.
59. While screen #17's header profile is loading, its rows are still present and Log out still
    works.
60. When screen #17's header profile fails to load, the rows are still present and Log out still
    works.

### The other half of sign-out (T6)

61. An owner with **no** business can reach sign-out, and signing out returns them to the
    signed-out shell. **Criterion 57 covers only an owner *with* a business**, and this is the
    half that was missing: `/setup` is the sole destination the redirect allows an owner without
    one, so an exit there is the only exit they have.

### The return leg (T11)

62. An owner looking at screen #17 can return to screen #12 from a control on that screen, and
    arrives at the dashboard — not signed out, and not still on the account menu. **Criterion 58
    pins the same property one screen further in — #20 returning to #17 — and nothing pinned this
    leg**, which is the third gap of this shape after §5.3's unnamed rename surface and criterion
    55's unpinned reachability.

## Notes on individual criteria

**Criterion 32 — where the no-echo rule comes from.** It is not introduced here. It restates a
convention `apps/api/src/platform/problem.ts` already holds and states twice. Beside
`validation-failed`: *"Carries no field list and no echo of the input, like every other problem
here — the client knows what it sent, and a reflected value is how an error response becomes a
probe."* And above `problemBody`, which builds every problem body in the API: *"Deliberately
carries NO `detail` and NO `instance`. A detail string is where an error response leaks: 'no
membership for user X on business Y' is a helpful message and an oracle."* Criterion 32 pins the
existing behaviour so this slice does not become the first route to break it.

**Criterion 50 is behaviourally unobservable today, and not for want of a fixture.** It requires
that an account holding an `owner` membership can still take a membership with a **different
role** at a second business — the property that pins decision 10's index to being *partial*
rather than a plain `unique (user_id)`. **`ck_memberships_role check (role in ('owner'))` permits
no other value**, so the row that would distinguish a partial index from a plain one **cannot be
inserted at all**. Any attempt is rejected by a check constraint, not by the index under test,
and a test asserting the rejection would be asserting the wrong thing entirely.

**It becomes observable when I9 widens the role vocabulary** — the migration already names
`ck_memberships_role` as *"where it widens"*. Widening it here is out of scope: I9 is a `D` item
and this slice does not decide the role set.

**The proxy, so `DEFINITION_OF_DONE.md`'s criterion-to-test mapping is honest rather than
silently unmet:** a named test asserting the index's **predicate** from the system catalogue —
that `uq_memberships_one_owner_per_user` exists, is unique, and carries a `WHERE role = 'owner'`
clause, readable from `pg_indexes.indexdef`.

**Stated plainly, because the gap is the point: that is a schema assertion, not the behavioural
one criterion 50 describes.** It proves the index was *declared* partial. It does not prove a
non-owner membership at a second business is *accepted*, because nothing can accept one yet. **A
future change to `ck_memberships_role` would not fail that proxy**, which is exactly the
limitation — the proxy cannot notice the day the real behaviour becomes testable. Criterion 50 is
left as written, and this note is the record of what is and is not being demonstrated.

**Criteria 48 and 49 are UNPROVABLE IN THIS HARNESS, and that is a finding rather than work
nobody got to.** Both were attempted. Recorded so neither reads as an omission:

- **48's concurrent half needs a second connection.** The harness gives one transaction per test,
  by design. What the partial unique index guarantees — at most one owner membership per user, at
  commit time, whatever the interleaving — **is** proved, sequentially, in
  `one-owner-membership.integration.test.ts`. What is not proved is PostgreSQL blocking the second
  inserter, which is PostgreSQL's own property tested by PostgreSQL; spike 001/C1 took the same
  position for the exclusion constraint. **48's sequential half is covered by criterion 22's test.**
- **49's second clause — "no attempt both fails and leaves a business behind" — cannot be
  observed at all.** Fault injection was tried: a `not valid` check constraint making the
  membership insert fail after the business insert. The failed statement **aborts the
  transaction**, so the counting query cannot run; the only way to make it usable again is
  `rollback to savepoint`, which **erases the business row whether or not the statement was
  atomic**. Every arrangement that lets you look has already destroyed the evidence. The property
  holds **by construction** — both inserts are a single CTE, and PostgreSQL executes one statement
  atomically — and `createBusinessForUser` documents that as the reason for its shape. The test
  asserts only what is observable: the request fails rather than returning 201.

**They become provable when the harness gains a second connection**, which is the same capability
A14 will need for the booking slice's contention question. Until then they are the two criteria
this slice cannot close, and the reason is the instrument.

**Criterion 39's comparison half is DISCHARGED.** The note above recorded that "a rename trims
identically to creation" could not be proved until `POST` existed, because there was nothing to
compare against. It exists, and `criterion 39 — a padded name is stored identically by both`
compares the two stored values **to each other** rather than each to a literal — which would have
passed even if one route trimmed and the other merely received an already-trimmed value.

**Criterion 22 was correct and unachievable, and that is how the gap was found.** It says an
account that already has a business "does not acquire a second". When it was written, **nothing
in the schema or the code enforced that** — `uq_memberships_user_business` forbids a repeat join
to the *same* business, so two concurrent creations produce two businesses and no constraint
objects. The criterion was not wrong; it asserted something true of the design and false of the
system, which is exactly what a criterion is for. **It is left untouched — criteria are
append-only — and decision 10's partial unique index is what makes it achievable.** Criteria 48
to 51 pin the enforcement itself, 50 specifically pinning that the index must be *partial*.

Worth noting how it surfaced: not by reading the criterion, and not by reading the migration,
but by writing §A.2 of the design and having to state, in one sentence, what each constraint
actually forbids.

**Which screens this slice introduces, and which of the three states each takes.** The
`DEFINITION_OF_DONE.md` requirement is per screen, so the list has to exist before the criteria
do.

| New surface | Loading | Empty | Error |
|---|---|---|---|
| **Screen #5** — the business-name form | 43 | inapplicable, see below | 44 |
| **The dashboard's setup-continuation state** (§5's K47 answer) | 45 | 47 | 46 |

The dashboard's *empty* state is not a separate screen state here: for a business with nothing
under it, the setup-continuation state **is** what empty renders as, which is why criterion 47
pins it and criterion 46 forbids falling back to it when the truth is unknown.

**UPDATED 2026-08-17. The rename surface is named and now on this list.** It was owed and
unidentified; decision 11 settles it as **screen #20's business section**, widened to the
Personal/Business Information Management page. It is a *section added to a screen that already
exists* rather than a new screen, which is why it sits apart in the table:

| Surface | Loading | Empty | Error |
|---|---|---|---|
| **Screen #20's business section** (decision 11) — an existing screen, widened | 53 | inapplicable | 54 |
| **Screen #17**, the account menu (decision 12) — a new screen | 59 | inapplicable | 60 |

Criterion 52 pins the section itself. Criteria 13–16 and 39 remain the API-observable half.

**Screen #17's empty state is inapplicable** because the menu is a fixed list of rows known at
compile time, not a collection loaded from anywhere — it cannot return nothing. Its loading and
error criteria are shaped by a carve-out worth restating here: **both pin that the rows survive**,
because `ErrorView` would replace the screen and take Log out with it, stranding exactly the user
who most needs to leave.

**Nothing pinned reachability until criterion 55.** Criteria 52–54 presuppose an owner is looking
at screen #20 and none said how they arrived; 25 pins only that they leave the setup stub. The
gap surfaced when §C.5 proposed giving `/home` to screen #12 — which would have left #20, and
with it sign-out, with no path at all. **55 is written first in its group for that reason**, and
it is the second gap of this shape after §5.3's unnamed rename surface.

**Criterion 62 is the third, and it was found the same way — by asking a question about a screen
rather than by reading what was written about it.** Criterion 55 pins the way *in* (#12 → #17 →
#20) and 58 pins the way *back* from #20 to #17. **Nothing pinned the way back from #17 to #12**,
and screen #17 was the only screen in the chain whose back affordance the code did not declare:
`profile_screen.dart` builds an explicit `leading:` calling `context.pop()`, and
`account_menu_screen.dart` built `AppBar(title: Text('Account'))` and nothing else.

**What was actually there, established by a probe rather than by reasoning about Flutter.** The
probe pushed #17 from #12 and counted: `onAccount=1 backButtons=1 arrowIcons=1`. **The affordance
existed** — `AppBar.automaticallyImplyLeading` supplies a `BackButton` when the route can pop —
**so this was never a broken screen.** The `onAccount=1` is the control: without it, a zero count
would have been consistent with the probe never reaching the screen.

**It was still a gap, and precisely of the kind this list exists to catch.** The arrow was
supplied by the framework on the condition that `/account` is *pushed*. Nothing in the repository
recorded that dependency, no test asserted the arrow, and no criterion named the property — so a
later change routing to `/account` with `go` instead of `push`, or promoting it to a shell, would
have removed the only way back to the dashboard **silently**, and every existing test would still
pass. That is the screen-#20-orphan failure exactly, with a framework default standing in for the
missing decision.

**Entry 19 of `docs/analysis/08-design-deviations.md` also depends on it.** The design gives #17 a
bottom global navigation with a Home button; the ruling that omits it reasons that the back path
makes Home redundant. **A deviation whose stated reason rests on an untested property is the same
failure shape as an obligation attributed to a document nobody quoted** — so the property is now
declared in the widget, pinned by this criterion, and named by a test.

## Deliberately not covered

Each of these is excluded because `00-frame.md` §3 makes it a non-goal or §4 decides it away —
not because it was overlooked.

- **Tagline, About and the business banner.** Decision 1: name only. No column exists for them.
- **Any image upload**, and therefore F2's formats and size limits and F4's derivatives.
- **The salon handle** (K54). No handle table exists.
- **The publish action itself** — what it is and where it lives — and **the "at least one
  service" precondition** that §5's K27 answer imposes. Publishing is a non-goal here; the
  precondition binds the publishing slice, and criterion 4 only pins that a new business starts
  unpublished.
- **The `business_public` projection and every public or unauthenticated read** (K55, K71).
  Nothing in this slice is reachable without a token.
- **Screens #6, #7 and #8** — team members, portfolio, opening hours and location.
- **Services and pricing** (#21, #22).
- **A second member, and any role but `owner`** (ADR-003, I9).
- **Back-navigation between onboarding steps, and preservation of partially-entered data across
  them.** Criterion 29 covers only the absence of the back arrow itself.
- **The dashboard beyond the setup-continuation state** — bookings, contacts, calendar, and the
  share-link surface once there is something to share. Criteria 26–28 pin only the minimum §5's
  K47 answer requires.
- **Profile editing** (K75).
- **Salon category** (decision 5, K16 stays open).
- **Enforcing name uniqueness.** Decision 7 rules names are not unique; criterion 24 asserts the
  opposite of enforcement, deliberately.
- **Whether the conflict response names or links the existing business.** Decision 8 settles
  that the attempt is refused; whether the refusal identifies what already exists is screen copy,
  not a Phase 0 decision. Note it raises no oracle either way — the caller is that business's
  owner — so criterion 32's no-echo reasoning does not decide it.
- **Internal whitespace and Unicode normalisation in names.** Decision 9 trims leading and
  trailing whitespace and nothing else. Collapsing runs of spaces inside a name, or normalising
  Unicode forms so two byte-different spellings compare equal, is neither decided nor covered,
  and criteria 37–40 assert only what trimming the ends produces.
- **The `PROBLEM_TYPES` entry decision 8 requires.** Criterion 35 pins the response the slug must
  carry; appending the slug is a change to ADR-014's error contract, tracked as an outstanding
  obligation in `00-frame.md` §5.2 rather than as a criterion.
- **Screen #17's My services, Settings and Support rows — OMITTED, and that is the fifth design
  deviation.** The design gives #17 those three alongside Profile and Log out; decision 12 ships
  **Profile and Log out only**, because #21/#22, #23 and #18 do not exist. Criterion 56 pins the
  omission. **This is K75's lesson applied before the mistake rather than after** — a visible
  control that does nothing is a promise the app does not keep — and shipping the full menu would
  make that promise three times on one screen. Recorded for
  `docs/analysis/08-design-deviations.md` in the slice that ships the code, on the same terms as
  the other four.
- **An empty state for screen #17 — INAPPLICABLE.** A fixed list of rows known at compile time is
  not a collection and cannot return nothing. Criteria 59 and 60 cover loading and error.
- **An empty state for screen #5 — INAPPLICABLE, not overlooked.**
  `DEFINITION_OF_DONE.md` requires loading, empty and error on every new screen. Screen #5 is a
  form: it renders no collection, so there is nothing it can be empty *of*. Its unfilled state is
  its initial state, not an empty state in the sense the requirement means, and criterion 30
  already pins that it does not submit an empty name. Loading and error are covered by criteria
  43 and 44.
- **Performance and other non-functional criteria — INAPPLICABLE, and considered.** The feature
  manual's own example set includes one (*"loads in under 2s for 10k rows"*), and this slice has
  none. It writes one row and reads one row: no collection, no pagination, no aggregate, no
  volume that could degrade. There is no quantity here for a threshold to be about. Recorded so
  the absence reads as a decision rather than an omission; the first slice that returns a
  collection — bookings, contacts, services — is where a threshold starts meaning something.
- **Loading and error states for the rename surface — OWED, not excluded.** This is the one
  entry on this list that is **not** a decision to leave something out. Decision 4's reason is
  that an owner who mistypes their business name must be able to fix it, which an API-only
  rename cannot satisfy — so **an owner-facing rename surface exists in this slice**. Which
  screen it is has never been named in any design, and that is a Phase 1 design decision,
  tracked as an outstanding obligation in `00-frame.md` §5.3. Criteria 13–16 and 39 pin the
  behaviour and are API-observable only. The screen's loading and error criteria are **appended
  when the surface is named** — append-only, so new numbers, never a renumber. Its empty state
  is inapplicable for the same reason screen #5's is.
  **UPDATED 2026-08-17 — the surface is now named and this entry is no longer OWED.** Decision 11
  puts renaming on **screen #20**, widened to the Personal/Business Information Management page
  its own routing text already names. `00-frame.md` §5.3 is **discharged**, and **criteria 52–54
  are the appended criteria this entry promised** — 52 the section, 53 loading, 54 error. **What
  remains on this list is the empty state alone, and now as a genuine inapplicability rather than
  a placeholder:** the business section is a field with an edit affordance, not a collection, so
  there is nothing it can be empty *of*, exactly as with screen #5.

## Blocked

**EMPTY. Nothing is blocked.** The list is kept rather than deleted, because an absent list and
an empty one read identically to someone looking for what is missing, and only one of them is a
statement.

All three entries closed on 2026-08-17:

1. **What the API returns on a second creation attempt — DECIDED.** Decision 8: refused with a
   conflict, not silently satisfied by returning the existing business. Criteria 34–36 replace
   the gap; the slug the response needs is an outstanding obligation in `00-frame.md` §5.2, not
   a blocked criterion — the behaviour is decided, only the contract edit is pending.
2. **Whether the name is trimmed before it is stored — DECIDED.** Decision 9: stored trimmed of
   leading and trailing whitespace. Criteria 37–40 replace the gap.
3. **What the setup-continuation state enumerates — RULED NOT BLOCKED**, by the guiding session
   on 2026-08-17. Which remaining steps the state lists is **design, not a Phase 0 decision**:
   Phase 0 fixes what must be true, and §5's K47 answer already fixes both halves that bind —
   that the state exists and names where the owner is, and that the bookings empty state and
   share-link prompt do not appear. Criterion 26 is therefore **correctly** as precise as §5
   allows, and was never under-specified. It was listed as blocked by mistaking a design
   question for a missing decision.
