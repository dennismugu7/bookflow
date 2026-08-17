# Business setup — acceptance criteria

Written **after** `00-frame.md` pinned the scope and **before** any design or test, as `CLAUDE.md`
§7 requires (K77). Criteria constrain tests; tests never author criteria.

Each statement below is observable from outside the implementation — an API response, a database
state, or something on screen — and each can fail. No test name, file name or framework detail
appears here, deliberately.

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

## Blocked

**Three.** Each is a criterion that could not be written because a decision does not exist. None
has been invented.

1. **What the API returns on a second creation attempt.** Criterion 22 pins the part that is
   certain — no second business results — and stops there. Undecided: whether the request fails
   or returns the existing business idempotently, and if it fails, with which status and slug.
   No existing entry in the API's problem-type table covers a conflict, and adding one is a
   change to ADR-014's error contract rather than a detail of this slice.
2. **Whether the name is trimmed before it is stored.** `ck_businesses_name_present` checks
   `length(btrim(name))`, but the column stores the value as submitted — so `"  Salon  "` is
   accepted today and stored with its padding, and a 200-character name carrying padding is
   stored longer than 200 characters. Criteria 8–12 assert acceptance and rejection only; none
   asserts the stored form, because the stored form is undecided.
3. **What the setup-continuation state enumerates.** §5 decides that the state exists and what
   it must not show. It does not decide which remaining steps it lists. Criterion 26 asserts
   only that it names where the owner is and what remains, which is as precise as the decision
   allows.
