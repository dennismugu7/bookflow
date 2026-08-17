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

## Notes on individual criteria

**Criterion 32 — where the no-echo rule comes from.** It is not introduced here. It restates a
convention `apps/api/src/platform/problem.ts` already holds and states twice. Beside
`validation-failed`: *"Carries no field list and no echo of the input, like every other problem
here — the client knows what it sent, and a reflected value is how an error response becomes a
probe."* And above `problemBody`, which builds every problem body in the API: *"Deliberately
carries NO `detail` and NO `instance`. A detail string is where an error response leaks: 'no
membership for user X on business Y' is a helpful message and an oracle."* Criterion 32 pins the
existing behaviour so this slice does not become the first route to break it.

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

**A rename surface is owed and not yet on this list.** Decision 4 implies one exists — an owner
who mistypes the name must be able to fix it, and an owner does not issue API requests — but no
design names which screen it is. That is a Phase 1 decision, tracked in `00-frame.md` §5.3.
Criteria 13–16 and 39 pin the behaviour; the screen's loading and error criteria are appended
once it has an identity, and its empty state is inapplicable for the same reason screen #5's is.

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
