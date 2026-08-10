> Derived analysis, not source. `docs/source/` is authoritative; where this file and the source disagree, the source wins.

# Triage of unresolved items

Every unresolved item from `03-flagged-ambiguities.md` and `04-unstated-assumptions.md`, classified on two axes. Nothing here is answered.

**Axis 1 — type.** `DECISION` = a product or design choice; no code needed to answer it. `SPIKE` = a genuine technical unknown where reality, not preference, supplies the answer, and throwaway code is needed to get it.

**Axis 2 — when.** `F` = blocks the foundation; a wrong answer forces a migration, an auth rewrite, or a module-boundary change, so it must be settled before any code is written. `S` = blocks a specific vertical slice; can wait until that slice's Phase 0, not past it. `D` = deferrable; log it and ship without it.

**Category** letters are `04-unstated-assumptions.md`'s sections A–K. Items originating in `03-flagged-ambiguities.md` are mapped to the nearest category; `K` absorbs auth, platform, product-surface and model-shape items.

**Screen numbers** are `01-screen-inventory.md`'s. Web pages are named.

Two fixed constraints are applied when marking items RESOLVED:
1. Build order: shared backend → native owner app → client web app.
2. Client access to their own booking is a signed magic-link token emailed with every booking, opening a single booking page with a cancel action. No client accounts, no login. The same token later authenticates review submission.

---

## Triage table

| ID | Cat | Question | Type | When | Blocked screens | If we guess wrong (F only) |
|---|---|---|---|---|---|---|
| A3 | A | Does availability hang off the business only, or does each team member carry their own schedule? | DECISION | F | #8, #16; web Select professional, Select date and time | The schedule table's foreign key moves from business to team member; every availability query is rewritten and existing rows have no owner to attach to. |
| A4 | A | Can two bookings occupy the same instant — never, once per team member, or up to a capacity — and what is the uniqueness/conflict rule that enforces it? | DECISION | F | #13, #16; web Select date and time | The conflict constraint's dimensions are baked into the bookings table; adding a staff or capacity dimension later means constraining over already-dirty data that may contain real double-bookings. |
| A9 | A | Which booking statuses occupy a slot — does an unverified **Booked** hold it, and does **Cancelled** release it given reinstate exists? | DECISION | F | #13, #14, #16; web Select date and time | The status enum becomes load-bearing in the availability predicate; changing which values occupy a slot invalidates every past conflict check and can make already-cancelled bookings unreinstateable. |
| C2 | C | How is money stored — integer minor units, fixed-point decimal, or float? | DECISION | F | #13, #22, #23, unspecified Add/Edit Service; web service cards, summary bar, review card | Every price, deposit and total column changes type; the migration touches services, bookings and any computed totals, and rounding differences are unrecoverable. Both scaffolding manuals name payment math as Do-Not-Vibe. |
| C7 | C | Does a booking snapshot the service's name, duration and price at booking time, or reference the live service row? | DECISION | F | #13, #22; web service cards, Review and continue | Referencing live rows means editing a service silently rewrites the price and duration of every past booking; converting to snapshots later cannot recover the values that were true at the time. This is the root of the doc's own 10-vs-20-minute discrepancy. |
| D1 | D | What carries a timezone — the business, the booking, the user, or nothing — and which clock renders the owner calendar, the client Open/Closed badge, and the emailed appointment time? | DECISION | F | #8, #13, #16, all three email templates; web Opening times, Open/Closed cluster, date strip, time slots | Every datetime column and every read is affected; retrofitting a timezone onto stored values requires knowing an offset that was never captured, so historical bookings cannot be reinterpreted correctly. |
| D2 | D | What is the storage format for instants versus recurring wall-clock hours — UTC instant, local wall-clock, or both? | DECISION | F | #8, #13, #16; web Opening times, date strip, time slots | Opening hours are recurring wall-clock and bookings are instants; storing both the same way breaks one of them, and the fix is a type migration across the schedule and booking tables. |
| E3 | E | Must an outbound email succeed for a booking status change to commit — is dispatch inside the transaction, or through an outbox/queue? | DECISION | F | #13, #14, #4, #10, #11; web Confirmation / Deposit Instructions | Without an outbox decided up front, every status-changing endpoint couples an external call to a DB transaction; adding reliability later means rewriting all of them and the module boundary between the domain and the mailer. |
| F1 | F | Which storage provider and bucket, and are asset URLs public and permanent or signed and expiring? | DECISION | F | #5, #6, #7, #13, #20; web hero gallery, team avatars, portfolio grid | Public URLs get embedded in the client webapp, in shared links and in emails; switching to signed URLs later invalidates every stored reference and changes every read path. |
| F3 | F | Do client-uploaded payment proofs live in the same store as public brand assets, and what authorization rule guards them? | DECISION | F | #13; web Confirmation / Deposit Instructions | If payment proofs land in the public bucket, clients' financial documents are world-readable at a guessable URL; fixing it means migrating objects, invalidating references, and disclosing a breach. This is also the cross-tenant storage exposure named in section I. |
| F7 | F | Is the portfolio one image or many? | DECISION | F | #7; web Portfolio section | A single column on the business versus a child table; converting one to the other migrates data and rewrites every read on both clients. |
| I1 | I | Does a user own exactly one business, and can a business ever have more than one authenticated user? | DECISION | F | Every native screen that reads or writes business data — #5, #6, #7, #8, #12, #13, #15, #16, #21, #22, #26 | Whether business ownership is a column on the user or a membership table decides how every query is scoped; changing it rewrites every ownership check in the codebase. |
| I3 | I | What is the single authorization rule by which every protected read and write is scoped to the owning business? | DECISION | F | Every authenticated native screen | This is the auth model. Guessing it means either no scoping (cross-tenant reads of bookings, contacts and payment proofs) or per-endpoint ad-hoc checks that must all be found and replaced later. The Project-Scaffolding manual names it Do-Not-Vibe. |
| I4 | I | What is a salon's public identifier — opaque token, slug, or database id — and can it be rotated or revoked? | DECISION | F | #12 share action; web salon profile and every sub-route | It is the public identity of every salon, embedded in links shared to WhatsApp and Instagram and in any QR code; changing it later breaks every link a salon has already distributed and the client has already bookmarked. |
| I6 | I | Which fields of a business are publicly readable without auth, and which belong to the owner's account only? | DECISION | F | #5, #6, #7, #8, #20; web salon profile, Team, Portfolio, Other | Public and private columns currently sit on the same records written by the same flows; getting the boundary wrong leaks the owner's account data through an unauthenticated page, and fixing it means splitting the read model after the API is public. |
| J1 | J | Which market does v1 target? | DECISION | F | #5, #6, #8, #15; web every price, timestamp, address and name | It is the upstream input to currency (C2), timezone (D1), payment channel (B2) and script support (J2); deciding it after those are built means revisiting all four. The sample data contradicts itself — KES and a Kenyan phone number in native, Greek addresses and a € price in web. |
| J2 | J | Is a team member's name one field or two — Latin plus an optional secondary script? | DECISION | F | #6; web Team section, Select professional, Team member profile | The web app renders both scripts inline from a form with a single input. If it ships as one column, splitting it later cannot recover the parts, because the second script was never captured separately — every owner must re-enter their roster. |
| K1 | K | Which backend platform, database, API framework and host? | DECISION | F | All | It is the foundation. "Supabase Edge Function" is named once, in one bullet, and nothing else in either document names a stack. |
| K2 | K | Does the chosen platform actually support the availability query pattern, the row-level scoping rule and the target hosting, at the expected data volume? | **SPIKE** | F | All | The Project-Scaffolding manual prescribes exactly this spike: "Can the target hosting run this stack? Does the core data shape actually support the query patterns the product needs?" An unspiked answer here is baked under everything built on top. |
| K3 | K | Which framework for the native owner app? | DECISION | F | All native screens | The document mixes React Navigation, React hooks, Flutter's `BackdropFilter` and web `navigator.share()` as if they coexist. The choice fixes the module boundaries every screen sits inside. |
| K4 | K | What is the API contract style — response envelope, error format, pagination convention, versioning? | DECISION | F | All | Named in Phase 1 of the Project-Scaffolding manual as a decide-once item; without it every endpoint is shaped differently and the client-side error/loading conventions cannot be shared. |
| K8 | K | What is the session model for owners — token or cookie, stored where, refreshed how, expiring when? | DECISION | F | #3, #9, #17, #19, and every authenticated screen | It is the auth model. The document's logout "API Call:" bullet is blank, so nothing about server-side invalidation is specified; changing the model later is an auth rewrite. |
| K9 | K | When a Google or Facebook login presents an email that already has a password account, are the identities linked or kept separate? | DECISION | F | #3, #9 | It is an identity-uniqueness rule. Guessing wrong either creates two accounts for one person — with the business attached to only one — or silently merges identities. Both are painful to unwind once real owners have signed up. |
| K11 | K | Is onboarding data public on save, or only once the salon explicitly goes live? | DECISION | F | #5, #6, #7, #8, #21; web every page | A published flag on the business must be filtered on by every public read; adding it later means changing every client-webapp query and accepting that half-finished profiles were already publicly visible in the interim. Flagged by the author at `DD-Bookflow-Native.md:240`. |
| K17 | K | Does a booking store the team member it was made with? | DECISION | F | #13, #16; web Select professional, Review and continue, Team member profile | It is a column and a foreign key on the core booking table, and the join every per-staff rating and per-staff availability query needs. Added later, all historical bookings are unattributable. The web doc already notices the orphaned "·" where the name should render (`Web:1218`). |
| K18 | K | Can one booking contain more than one service? | DECISION | F | #13, #22; web Select services, Review and continue | A single `service_id` on the booking versus a line-items child table; converting later migrates every booking row and rewrites duration and total computation. The native card shows "Haircut, Beard" while the web flow is strictly single-select. |
| K19 | K | What is a client's identity key — is a contact a derived record keyed by email or phone within a business, or a free-standing row per booking? | DECISION | F | #13, #15, unspecified contact detail view | It decides the contacts table's key. Get it wrong and the same person appears once per booking, so appointment history and "total spent" can never be reconciled without a manual merge. The doc's own two sample contacts share an identical email and phone. |
| K20 | K | *(New — introduced by fixed constraint 2, not present in the source docs.)* What is the magic-link token's model — scope, lifetime, revocation on cancellation, and reuse for review submission after the booking has passed? | DECISION | F | web booking page (new), Confirmation / Deposit Instructions; #13, #14 | It is a second auth model sitting beside the owner's. Scope and expiry must be decided before the token is minted, because retrofitting revocation or splitting one token into cancel-scoped and review-scoped credentials invalidates every link already sitting in a client's inbox. |
| A1 | A | Do bookable slots step by service duration, by a fixed grid, or by an owner-configured interval? | DECISION | S | web Select date and time | |
| A2 | A | Is there a turnaround buffer between appointments? | DECISION | S | #16; web Select date and time | |
| A5 | A | Is a slot held or reserved while the client moves through the multi-step booking flow? | DECISION | S | web Select services → Review and continue | |
| A6 | A | Does an omitted day mean closed, and is a closed day stored explicitly? | DECISION | S | #8; web Opening times | |
| A8 | A | How far ahead can a client book, and is today the earliest selectable date? | DECISION | S | web Select date and time | |
| A10 | A | Does "24:00" mean end-of-day or midnight next day, and may an opening-hours row cross midnight? | DECISION | S | #8, #16; web Opening times | |
| B1 | B | Where is the deposit amount configured — per salon or per service, flat or percentage — and on which native screen? | DECISION | S | web Confirmation / Deposit Instructions; a native screen that does not exist | |
| B2 | B | Where does the client see the payment destination, and where does the owner enter it? | DECISION | S | web Confirmation / Deposit Instructions; a native screen that does not exist | |
| B3 | B | Does **Confirmed** mean "deposit verified", or is verification a separate state? | DECISION | S | #13; web Confirmation / Deposit Instructions | |
| B6 | B | What formats and size limit apply to the proof-of-payment upload, and how long is it retained? | DECISION | S | #13; web Confirmation / Deposit Instructions | |
| C1 | C | Is currency configurable per business, and on which screen? | DECISION | S | #22, #23; web every price | |
| C5 | C | Can a price vary by professional or by time slot, as the web copy's "from KES 400" implies? | DECISION | S | #22; web service cards, summary bar, time slots | |
| D3 | D | Does a recurring 10:00 opening survive a DST shift unchanged? | DECISION | S | #8; web Opening times, Open/Closed cluster | |
| D5 | D | What date and time format do the confirmation, cancellation and reinstatement emails use, and in whose timezone? | DECISION | S | all three email templates | |
| D6 | D | Whose "today" does the calendar's Today button and the web app's bolded current-day row use? | DECISION | S | #16; web Opening times | |
| E1 | E | Which email provider and sender identity, on which domain? | DECISION | S | #4, #10, #11, #13, #18; web Confirmation / Deposit Instructions | |
| E2 | E | Does the chosen provider actually deliver verification codes and transactional mail to the target market reliably and fast enough to be an activation gate? | **SPIKE** | S | #4, #10, #11 | |
| E4 | E | Is the owner notified of a new booking, and through which channel? | DECISION | S | #12, #13, #16 | |
| E9 | E | Does the **Booked** state itself send the client anything beyond the web flow's own confirmation? | DECISION | S | #13; web Confirmation / Deposit Instructions | |
| F2 | F | What maximum size and accepted formats apply to each of the four native upload surfaces? | DECISION | S | #5, #6, #7, #20 | |
| F4 | F | Are image derivatives generated at upload time or on the fly, and does the chosen storage or CDN provide the transforms the web layouts need? | **SPIKE** | S | #5, #6, #7; web hero gallery, team avatars, portfolio grid | |
| F6 | F | Can the owner replace, remove or reorder uploaded images after onboarding, and on what screen? | DECISION | S | #7, and a portfolio management screen that does not exist | |
| F8 | F | What happens to stored objects when a business or an account is deleted? | DECISION | S | #26, #27 | |
| G3 | G | May a cancelled or no-show booking leave a review? | DECISION | S | web Reviews section | |
| G8 | G | Which team member is a review attributed to when the client chose "Any professional"? | DECISION | S | web Reviews, Team cards, Team member profile | |
| G9 | G | Is the salon aggregate rating recomputed on read or maintained, and is the seeded "1,739" real data or mockup? | DECISION | S | web salon profile rating cluster, Reviews section | |
| G11 | G | Are the profile-page star cluster (private mailto to the owner) and the Reviews-section stars (public on-platform review) one flow or two? | DECISION | S | web salon profile, Reviews section, Team member profile | |
| H4 | H | Is there a cancellation window or notice period, on either side? | DECISION | S | #13, #14; web booking page (new) | |
| H8 | H | Does a client-initiated cancellation land in the same **Cancelled** state as an owner's, and may the owner reinstate it? | DECISION | S | #13, #14, #16; web booking page (new) | |
| J3 | J | Is the product English-only for v1, or wired for i18n from the start? | DECISION | S | all screens on both clients | |
| J6 | J | What locale do phone number, address and name validation assume? | DECISION | S | #6, #15; web Confirmation / Deposit Instructions | |
| K5 | K | What belongs in each of the twelve empty "Backend / System Action" slots? | DECISION | S | #3, #12, #17, #19, #20, #22, #23 | |
| K6 | K | What is the password policy? | DECISION | S | #3, #24; web none | |
| K7 | K | What are the verification code's expiry, attempt limit, resend cooldown and lockout? | DECISION | S | #4, #10 | |
| K10 | K | Are Terms and Privacy versioned, and is acceptance recorded at sign-up? | DECISION | S | #3, #23 | |
| K12 | K | On which screens can business profile, team roster, portfolio and opening hours be edited after onboarding? | DECISION | S | #5, #6, #7, #8, #17 — the editing screens do not exist | |
| K15 | K | What are the four referenced-but-unspecified screens — Add/Edit Service, contact detail, calendar booking detail, reinstate confirmation? | DECISION | S | #13, #15, #16, #21, #22 | |
| K16 | K | Where does the native app collect salon category, team member role, business address text and the owner's public contact email? | DECISION | S | #5, #6, #8, #20; web salon profile, Team, Location | |
| K21 | K | Is the Help Center a native screen, a webview, or an external site? | DECISION | S | #18 | |
| K22 | K | Where do Help Center submissions actually go? | DECISION | S | #18 | |
| K23 | K | Must a team member have a name and photo, and what does the client webapp show when a photo is missing? | DECISION | S | #6; web Team section, Select professional | |
| K24 | K | How does the owner add a second team member — does the form repeat, or is there a roster screen? | DECISION | S | #6 | |
| K25 | K | Is the Google Maps field a pasted link or an in-app pin drop, and what does the client profile show when it is empty? | DECISION | S | #8; web Location section | |
| K26 | K | Must the owner enter all seven days one by one, or is there a default or copy-to-all-days shortcut? | DECISION | S | #8 | |
| K27 | K | What does the client webapp show for a salon with zero services, zero team members, or zero portfolio images? | DECISION | S | #6, #7, #21; web Services, Team, Portfolio, Book Now entry point | |
| K28 | K | Can services be reordered, hidden or archived without deletion, and can a service be tied to specific team members? | DECISION | S | #21, #22; web Services, Select professional | |
| K29 | K | Does reinstating a booking return it to **Booked** or straight to **Confirmed**, and does it get its own confirmation step? | DECISION | S | #13 | |
| K30 | K | Is the status filter a server query or a client-side filter of an already-fetched list? | DECISION | S | #13 | |
| K31 | K | Does a new client booking reach the owner's calendar live, or only on refresh? | DECISION | S | #12, #16 | |
| K32 | K | What does a calendar block show and do — status colour, label, tap behaviour, and how a cancelled booking is treated? | DECISION | S | #16 | |
| A7 | A | Are holidays, one-off closures and mid-day breaks supported? | DECISION | D | #8; web Opening times | |
| B4 | B | Is there any reconciliation of deposit against total — balance due, receipts? | DECISION | D | #13; unspecified contact detail view | |
| B5 | B | Are deposits refundable, and by what mechanism? | DECISION | D | #13, #14 | |
| B7 | B | How are no-shows, partial payments, overpayments and disputes handled? | DECISION | D | #13 | |
| B8 | B | Where does the "total spent" figure on the contact detail view come from? | DECISION | D | unspecified contact detail view | |
| C3 | C | What are the currency formatting rules — symbol position, separators, decimal places? | DECISION | D | #13, #22; web every price | |
| C4 | C | Is multi-currency ever supported? | DECISION | D | web every price | |
| C6 | C | Is tax or VAT represented anywhere? | DECISION | D | #22; web Review and continue | |
| D4 | D | Do the two clients agree on a 12-hour or 24-hour clock and a single date format? | DECISION | D | #13, #16; web all timestamps | |
| E5 | E | Are there push notifications, and does the native app register device tokens? | DECISION | D | #12, #13, #16 | |
| E6 | E | Is SMS ever a channel? | DECISION | D | web Confirmation / Deposit Instructions | |
| E7 | E | Where do the "notification preferences" that Settings claims to load actually live? | DECISION | D | #23 | |
| E8 | E | Are there appointment reminders before the booking? | DECISION | D | #13; web booking page (new) | |
| E10 | E | Are email templates managed in a templating system and localised? | DECISION | D | all three email templates | |
| F5 | F | Do uploads show progress, and can they be retried or resumed? | DECISION | D | #5, #6, #7, #20 | |
| F9 | F | Is publicly served imagery scanned or moderated? | DECISION | D | #5, #6, #7 | |
| F10 | F | Is EXIF orientation handled, and is alt text captured? | DECISION | D | #5, #6, #7; web hero gallery, portfolio grid | |
| G5 | G | Can a client edit a review they have already left? | DECISION | D | web Reviews section | |
| G6 | G | Is there any moderation — report, hide, delete, or owner response? | DECISION | D | web Reviews section; a native screen that does not exist | |
| G7 | G | Does the owner get any surface at all to read or respond to reviews of their business and staff? | DECISION | D | native — none exists; web Reviews section | |
| G10 | G | Are ratings whole stars only, or can they be partial? | DECISION | D | web Reviews section, Team cards, rating clusters | |
| H5 | H | Is the deposit refunded when a booking is cancelled, and by whom? | DECISION | D | #13, #14; web booking page (new) | |
| H6 | H | Can either party reschedule, rather than cancel and rebook? | DECISION | D | #13; web booking page (new) | |
| H7 | H | How is a no-show recorded? | DECISION | D | #13 | |
| I8 | I | Is ownership transferable, can a business have multiple locations, and how does an owner recover a lost account? | DECISION | D | #17, #20, #23 | |
| J4 | J | Does the owner app support RTL? | DECISION | D | #6, #15 | |
| J5 | J | Are UI strings and email templates translated? | DECISION | D | all screens on both clients | |
| K13 | K | Can the owner create or edit a booking directly — walk-ins, phone bookings? | DECISION | D | #13, #16 | |
| K14 | K | What happens to a waitlist entry, and where does the owner see it? | DECISION | D | web Select date and time; native — no surface exists | |
| K33 | K | What analytics exist beyond the one speculative deletion-reason event? | DECISION | D | #25 | |
| K34 | K | What are the loading, empty, error and offline states across the native app? | DECISION | D | all native screens | |
| K35 | K | What is the accessibility standard for either client? | DECISION | D | all screens on both clients | |
| K36 | K | What is deleted, retained or anonymised when an owner deletes their account — bookings, contacts, images, the live public page? | DECISION | D | #25, #26, #27; web salon profile | |
| K37 | K | Does the "Something else" survey option reveal a free-text field, and is a reason required before Continue? | DECISION | D | #25 | |
| K38 | K | Are both the back arrow and the close icon on the final delete-confirmation screen intentional, and is the survey selection preserved on back? | DECISION | D | #26 | |
| K39 | K | Is the gradient checkmark badge reserved for terminal success states, or part of a broader icon system? | DECISION | D | #27 | |
| K40 | K | Should the Settings screen's chevron be dropped on the two rows that navigate externally? | DECISION | D | #23 | |
| K41 | K | Are the Log Out modal's colours to be corrected against the app theme, as the author requested inline? | DECISION | D | #19 | |
| K42 | K | Is a failed login's 404 surfaced distinctly, or folded into the 401 for security? | DECISION | D | #9 | |
| K43 | K | What is the finalised copy for the cancel dialog, the reinstate affordance and the reinstatement email? | DECISION | D | #13, #14 | |
| K44 | K | Which is correct — the extracted Help Center text naming "Fresha", or the screenshot naming "Bookflow"? | DECISION | D | #18 | |
| K45 | K | Does the Settings screen gain the notification, currency, timezone and 2FA controls that Screen 10 claims it loads, or is that list wrong? | DECISION | D | #17, #23 | |
| K46 | K | Is a single wide input the right control for an 8-digit code, and is it validated to exactly 8 numeric characters? | DECISION | D | #4, #10 | |

## Resolved by the fixed constraints

| ID | Cat | Item | Resolved by |
|---|---|---|---|
| G1 | G | Who may leave a review — no identity requirement was stated and the client webapp has no login | Constraint 2 — the per-booking magic-link token authenticates review submission, so the reviewer is the token holder. No client accounts are needed. |
| G2 | G | Whether a review is tied to a booking — the submission flow collected no booking reference | Constraint 2 — the token is minted per booking, so booking linkage is inherent in the credential. |
| G4 | G | Duplicate-review prevention | Constraint 2 — one token per booking gives a natural uniqueness key. (Whether the review is *editable* remains open as G5.) |
| H1 | H | The client has no cancellation path anywhere | Constraint 2 — the emailed link opens a booking page with a cancel action. |
| H2 | H | The emails carry no link, reference or mechanism — "just get in touch with us" resolves to nothing | Constraint 2 — every booking email carries the signed link. |
| H3 | H | No booking reference or ID is ever surfaced to the client | Constraint 2 — the token is the reference. |

Note: constraint 2 does **not** resolve `I4` (the salon's public share-link identifier), which is a different identifier from the per-booking token, and it introduces `K20` (the token's own scope, lifetime and revocation model).

---

## F items

1. Does availability hang off the business only, or does each team member carry their own schedule? *(A3)*
2. Can two bookings occupy the same instant — never, once per team member, or up to a capacity — and what uniqueness/conflict rule enforces it? *(A4)*
3. Which booking statuses occupy a slot: does an unverified **Booked** hold it, and does **Cancelled** release it given reinstate exists? *(A9)*
4. How is money stored — integer minor units, fixed-point decimal, or float? *(C2)*
5. Does a booking snapshot the service's name, duration and price at booking time, or reference the live service row? *(C7)*
6. What carries a timezone — business, booking, user, or nothing — and which clock renders the owner calendar, the client Open/Closed badge, and the emailed appointment time? *(D1)*
7. What is the storage format for instants versus recurring wall-clock hours? *(D2)*
8. Must an outbound email succeed for a booking status change to commit — dispatch inside the transaction, or through an outbox? *(E3)*
9. Which storage provider and bucket, and are asset URLs public and permanent or signed and expiring? *(F1)*
10. Do client-uploaded payment proofs live in the same store as public brand assets, and what authorization rule guards them? *(F3)*
11. Is the portfolio one image or many? *(F7)*
12. Does a user own exactly one business, and can a business ever have more than one authenticated user? *(I1)*
13. What is the single authorization rule by which every protected read and write is scoped to the owning business? *(I3)*
14. What is a salon's public identifier — opaque token, slug, or database id — and can it be rotated or revoked? *(I4)*
15. Which fields of a business are publicly readable without auth, and which belong to the owner's account only? *(I6)*
16. Which market does v1 target? *(J1)*
17. Is a team member's name one field or two — Latin plus an optional secondary script? *(J2)*
18. Which backend platform, database, API framework and host? *(K1)*
19. **SPIKE** — Does the chosen platform actually support the availability query pattern, the row-level scoping rule and the target hosting, at the expected data volume? *(K2)*
20. Which framework for the native owner app? *(K3)*
21. What is the API contract style — response envelope, error format, pagination convention, versioning? *(K4)*
22. What is the session model for owners — token or cookie, stored where, refreshed how, expiring when? *(K8)*
23. When a social login presents an email that already has a password account, are the identities linked or kept separate? *(K9)*
24. Is onboarding data public on save, or only once the salon explicitly goes live? *(K11)*
25. Does a booking store the team member it was made with? *(K17)*
26. Can one booking contain more than one service? *(K18)*
27. What is a client's identity key — is a contact keyed by email or phone within a business, or free-standing per booking? *(K19)*
28. What is the magic-link token's scope, lifetime, revocation on cancellation, and reuse for review submission? *(K20)*
