> Derived analysis, not source. `docs/source/` is authoritative; where this file and the source disagree, the source wins.

# Triage of unresolved items

Every unresolved item from `03-flagged-ambiguities.md` and `04-unstated-assumptions.md`, classified on two axes. Nothing here is answered — answers live in `docs/decisions/`.

**Axis 1 — type.** `DECISION` = a product or design choice; no code needed to answer it. `SPIKE` = a genuine technical unknown where reality, not preference, supplies the answer, and throwaway code is needed to get it.

**Axis 2 — when.** `F` = blocks the foundation; a wrong answer forces a migration, an auth rewrite, or a module-boundary change, so it must be settled before any code is written. `S` = blocks a specific vertical slice; can wait until that slice's Phase 0, not past it. `D` = deferrable; log it and ship without it.

**Category** letters are `04-unstated-assumptions.md`'s sections A–K. Items originating in `03-flagged-ambiguities.md` are mapped to the nearest category; `K` absorbs auth, platform, product-surface and model-shape items.

**Screen numbers** are `01-screen-inventory.md`'s. Web pages are named.

Five accepted decisions are applied below — ADR-001 (build order), ADR-002 (client booking access), ADR-003 (tenancy model), ADR-004 (publication gate), ADR-005 (target market), all in `docs/decisions/`. Items they settle move to the Resolved table. Items they narrow without settling stay classified where they were, with an italic note. Items they create are marked **NEW**.

---

## Triage table

| ID | Cat | Question | Type | When | Blocked screens | If we guess wrong (F only) |
|---|---|---|---|---|---|---|
| A3 | A | Does availability hang off the business only, or does each team member carry their own schedule? | DECISION | F | #8, #16; web Select professional, Select date and time | The schedule table's foreign key moves from business to team member; every availability query is rewritten and existing rows have no owner to attach to. |
| A4 | A | Can two bookings occupy the same instant — never, once per team member, or up to a capacity — and what is the uniqueness/conflict rule that enforces it? | DECISION | F | #13, #16; web Select date and time | The conflict constraint's dimensions are baked into the bookings table; adding a staff or capacity dimension later means constraining over already-dirty data that may contain real double-bookings. |
| A9 | A | Which booking statuses occupy a slot — does an unverified **Booked** hold it, and does **Cancelled** release it given reinstate exists? | DECISION | F | #13, #14, #16; web Select date and time | The status enum becomes load-bearing in the availability predicate; changing which values occupy a slot invalidates every past conflict check and can make already-cancelled bookings unreinstateable. |
| C2 | C | How is money stored — integer minor units, fixed-point decimal, or float? *Narrowed by ADR-005: single currency removes the currency-code column; minor-units versus decimal remains open.* | DECISION | F | #13, #22, #23, unspecified Add/Edit Service; web service cards, summary bar, review card | Every price, deposit and total column changes type; the migration touches services, bookings and any computed totals, and rounding differences are unrecoverable. Both scaffolding manuals name payment math as Do-Not-Vibe. |
| C7 | C | Does a booking snapshot the service's name, duration and price at booking time, or reference the live service row? | DECISION | F | #13, #22; web service cards, Review and continue | Referencing live rows means editing a service silently rewrites the price and duration of every past booking; converting to snapshots later cannot recover the values that were true at the time. This is the root of the doc's own 10-vs-20-minute discrepancy. |
| D2 | D | What is the storage format for instants versus recurring wall-clock hours — UTC instant, local wall-clock, or both? *Narrowed by ADR-005: a single fixed zone with no DST makes conversion unambiguous, but the representation choice remains.* | DECISION | F | #8, #13, #16; web Opening times, date strip, time slots | Opening hours are recurring wall-clock and bookings are instants; storing both the same way breaks one of them, and the fix is a type migration across the schedule and booking tables. |
| E3 | E | Must an outbound email succeed for a booking status change to commit — is dispatch inside the transaction, or through an outbox/queue? | DECISION | F | #13, #14, #4, #10, #11; web Confirmation / Deposit Instructions, booking page | Without an outbox decided up front, every status-changing endpoint couples an external call to a DB transaction; adding reliability later means rewriting all of them and the module boundary between the domain and the mailer. |
| F1 | F | Which storage provider and bucket, and are asset URLs public and permanent or signed and expiring? | DECISION | F | #5, #6, #7, #13, #20; web hero gallery, team avatars, portfolio grid | Public URLs get embedded in the client webapp, in shared links and in emails; switching to signed URLs later invalidates every stored reference and changes every read path. |
| F3 | F | Do client-uploaded payment proofs live in the same store as public brand assets, and what authorization rule guards them? | DECISION | F | #13; web Confirmation / Deposit Instructions | If payment proofs land in the public bucket, clients' financial documents are world-readable at a guessable URL; fixing it means migrating objects, invalidating references, and disclosing a breach. This is also the cross-tenant storage exposure named in section I. |
| F7 | F | Is the portfolio one image or many? | DECISION | F | #7; web Portfolio section | A single column on the business versus a child table; converting one to the other migrates data and rewrites every read on both clients. |
| I3b | I | **NEW (ADR-003).** At which layer is the membership scoping rule enforced — database row-level security, API middleware, or repository-layer guard — and how does every future protected route inherit it without re-implementing it? *Downstream of K1: the platform choice constrains which layers are available.* | DECISION | F | Every authenticated native screen; every scoped backend route | ADR-003 fixes the rule but not where it lives. Enforced per-route by hand, the rule is one forgotten call away from a cross-tenant read, and moving it to a shared layer later means auditing every endpoint written before the move. This is the "authorization scaffolding" the Project-Scaffolding manual requires in Phase 4 — "the reusable guard/middleware pattern every protected feature route will call, proven on the one real endpoint from Phase 3." |
| I4 | I | What is a salon's public identifier — opaque token, slug, or database id — and can it be rotated or revoked? | DECISION | F | #12 share action; web salon profile and every sub-route | It is the public identity of every salon, embedded in links shared to WhatsApp and Instagram and in any QR code; changing it later breaks every link a salon has already distributed and the client has already bookmarked. |
| I6 | I | Which fields of a business are publicly readable without auth, and which belong to the owner's account only? *Narrowed by ADR-004: applies only to published businesses; unpublished ones are unreadable entirely.* | DECISION | F | #5, #6, #7, #8, #20; web salon profile, Team, Portfolio, Other | Public and private columns sit on the same records written by the same flows; getting the field boundary wrong leaks the owner's account data through an unauthenticated page, and fixing it means splitting the read model after the API is public. |
| K1 | K | Which backend platform, database, API framework and host? | DECISION | F | All | It is the foundation. "Supabase Edge Function" is named once, in one bullet, and nothing else in either document names a stack. |
| K2 | K | Does the chosen platform actually support the availability query pattern, the row-level scoping rule and the target hosting, at the expected data volume? | **SPIKE** | F | All | The Project-Scaffolding manual prescribes exactly this spike: "Can the target hosting run this stack? Does the core data shape actually support the query patterns the product needs?" An unspiked answer here is baked under everything built on top. ADR-003 makes the scoping rule (`user → membership → business`) part of what must be verified. |
| K3 | K | Which framework for the native owner app? | DECISION | F | All native screens | The document mixes React Navigation, React hooks, Flutter's `BackdropFilter` and web `navigator.share()` as if they coexist. The choice fixes the module boundaries every screen sits inside. |
| K4 | K | What is the API contract style — response envelope, error format, pagination convention, versioning? | DECISION | F | All | Named in Phase 1 of the Project-Scaffolding manual as a decide-once item; without it every endpoint is shaped differently and the client-side error/loading conventions cannot be shared. |
| K8 | K | What is the session model for owners — token or cookie, stored where, refreshed how, expiring when? | DECISION | F | #3, #9, #17, #19, and every authenticated screen | It is the auth model. The document's logout "API Call:" bullet is blank, so nothing about server-side invalidation is specified; changing the model later is an auth rewrite. Distinct from the client token (K20). |
| K9 | K | When a Google or Facebook login presents an email that already has a password account, are the identities linked or kept separate? *Narrowed by ADR-003: recovery moves a membership row rather than re-parenting a business.* | DECISION | F | #3, #9 | It is an identity-uniqueness rule. Guessing wrong either creates two accounts for one person — with the business reachable from only one — or silently merges identities. Both are painful to unwind once real owners have signed up. |
| K17 | K | Does a booking store the team member it was made with? | DECISION | F | #13, #16; web Select professional, Review and continue, Team member profile | It is a column and a foreign key on the core booking table, and the join every per-staff rating and per-staff availability query needs. Added later, all historical bookings are unattributable. The web doc already notices the orphaned "·" where the name should render (`Web:1218`). |
| K18 | K | Can one booking contain more than one service? | DECISION | F | #13, #22; web Select services, Review and continue | A single `service_id` on the booking versus a line-items child table; converting later migrates every booking row and rewrites duration and total computation. The native card shows "Haircut, Beard" while the web flow is strictly single-select. |
| K19 | K | What is a client's identity key — is a contact a derived record keyed by email or phone within a business, or a free-standing row per booking? | DECISION | F | #13, #15, unspecified contact detail view | It decides the contacts table's key. Get it wrong and the same person appears once per booking, so appointment history and "total spent" can never be reconciled without a manual merge. The doc's own two sample contacts share an identical email and phone. |
| K20 | K | **NEW (ADR-002).** What is the magic-link token's model — scope, lifetime, revocation on cancellation, and reuse for review submission after the booking has passed? | DECISION | F | web booking page (new), Confirmation / Deposit Instructions; #13, #14 | It is a second auth model sitting beside the owner's. Scope and expiry must be decided before the token is minted, because retrofitting revocation or splitting one token into cancel-scoped and review-scoped credentials invalidates every link already sitting in a client's inbox. |
| A1 | A | Do bookable slots step by service duration, by a fixed grid, or by an owner-configured interval? | DECISION | S | web Select date and time | |
| A2 | A | Is there a turnaround buffer between appointments? | DECISION | S | #16; web Select date and time | |
| A5 | A | Is a slot held or reserved while the client moves through the multi-step booking flow? | DECISION | S | web Select services → Review and continue | |
| A6 | A | Does an omitted day mean closed, and is a closed day stored explicitly? | DECISION | S | #8; web Opening times | |
| A8 | A | How far ahead can a client book, and is today the earliest selectable date? | DECISION | S | web Select date and time | |
| A10 | A | Does "24:00" mean end-of-day or midnight next day, and may an opening-hours row cross midnight? | DECISION | S | #8, #16; web Opening times | |
| B1 | B | Where is the deposit amount configured — per salon or per service, flat or percentage — and on which native screen? | DECISION | S | web Confirmation / Deposit Instructions; a native screen that does not exist | |
| B2 | B | Where does the client see the payment destination, and where does the owner enter it? *Narrowed by ADR-005: Kenya makes M-Pesa the realistic channel, but this does not choose it.* | DECISION | S | web Confirmation / Deposit Instructions; a native screen that does not exist | |
| B3 | B | Does **Confirmed** mean "deposit verified", or is verification a separate state? | DECISION | S | #13; web Confirmation / Deposit Instructions | |
| B6 | B | What formats and size limit apply to the proof-of-payment upload, and how long is it retained? | DECISION | S | #13; web Confirmation / Deposit Instructions | |
| C5 | C | Can a price vary by professional or by time slot, as the web copy's "from KES 400" implies? | DECISION | S | #22; web service cards, summary bar, time slots | |
| D5 | D | What date and time format do the confirmation, cancellation and reinstatement emails use? *Narrowed by ADR-005: the timezone is Africa/Nairobi; the format remains open.* | DECISION | S | all three email templates | |
| E1 | E | Which email provider and sender identity, on which domain? *Narrowed by ADR-005: must deliver to Kenya. Widened by ADR-002: also carries the client's booking link, not just owner auth.* | DECISION | S | #4, #10, #11, #13, #18; web Confirmation / Deposit Instructions, booking page | |
| E2 | E | Does the chosen provider actually deliver verification codes and transactional mail reliably and fast enough to be an activation gate? *Narrowed by ADR-005: the delivery target is Kenyan inboxes specifically.* | **SPIKE** | S | #4, #10, #11; web booking page | |
| E4 | E | Is the owner notified of a new booking, and through which channel? | DECISION | S | #12, #13, #16 | |
| E9 | E | Does the **Booked** state itself send the client anything beyond the web flow's own confirmation? | DECISION | S | #13; web Confirmation / Deposit Instructions | |
| F2 | F | What maximum size and accepted formats apply to each of the four native upload surfaces? | DECISION | S | #5, #6, #7, #20 | |
| F4 | F | Are image derivatives generated at upload time or on the fly, and does the chosen storage or CDN provide the transforms the web layouts need? | **SPIKE** | S | #5, #6, #7; web hero gallery, team avatars, portfolio grid | |
| F6 | F | Can the owner replace, remove or reorder uploaded images after onboarding, and on what screen? | DECISION | S | #7, and a portfolio management screen that does not exist | |
| F8 | F | What happens to stored objects when a business or an account is deleted? | DECISION | S | #26, #27 | |
| G3 | G | May a cancelled or no-show booking leave a review? | DECISION | S | web Reviews section, booking page | |
| G8 | G | Which team member is a review attributed to when the client chose "Any professional"? | DECISION | S | web Reviews, Team cards, Team member profile | |
| G9 | G | Is the salon aggregate rating recomputed on read or maintained, and is the seeded "1,739" real data or mockup? | DECISION | S | web salon profile rating cluster, Reviews section | |
| G11 | G | Are the profile-page star cluster (private mailto to the owner) and the Reviews-section stars (public on-platform review) one flow or two? | DECISION | S | web salon profile, Reviews section, Team member profile | |
| H4 | H | Is there a cancellation window or notice period, on either side? | DECISION | S | #13, #14; web booking page | |
| H8 | H | Does a client-initiated cancellation land in the same **Cancelled** state as an owner's, and may the owner reinstate it? | DECISION | S | #13, #14, #16; web booking page | |
| I10 | I | **NEW (ADR-003).** What does the app do for an authenticated user with zero memberships — between sign-up and business creation? | DECISION | S | #3, #4, #5, #12 | |
| J3 | J | Is v1 UI copy English-only, or English and Swahili? *Narrowed by ADR-005: RTL and non-Latin script are out of scope; the language question remains, since Kenya is bilingual in Latin script.* | DECISION | S | all screens on both clients | |
| K5 | K | What belongs in each of the twelve empty "Backend / System Action" slots? | DECISION | S | #3, #12, #17, #19, #20, #22, #23 | |
| K6 | K | What is the password policy? | DECISION | S | #3, #24 | |
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
| K27 | K | What does the client webapp show for a salon with zero services, zero team members, or zero portfolio images? *Narrowed by ADR-004: now describes a salon that published with empty sections, not one mid-setup.* | DECISION | S | #6, #7, #21; web Services, Team, Portfolio, Book Now entry point | |
| K28 | K | Can services be reordered, hidden or archived without deletion, and can a service be tied to specific team members? | DECISION | S | #21, #22; web Services, Select professional | |
| K29 | K | Does reinstating a booking return it to **Booked** or straight to **Confirmed**, and does it get its own confirmation step? | DECISION | S | #13 | |
| K30 | K | Is the status filter a server query or a client-side filter of an already-fetched list? | DECISION | S | #13 | |
| K31 | K | Does a new client booking reach the owner's calendar live, or only on refresh? | DECISION | S | #12, #16 | |
| K32 | K | What does a calendar block show and do — status colour, label, tap behaviour, and how a cancelled booking is treated? | DECISION | S | #16 | |
| K47 | K | **NEW (ADR-004).** What is the publish action, where does it live, and what does the dashboard show while unpublished? | DECISION | S | #12, #17, and a publish surface that does not exist | |
| K48 | K | **NEW (ADR-004).** Can a published business be unpublished, and what happens to its live share link and outstanding bookings when it is? | DECISION | S | #12, #13; web salon profile, booking page | |
| A7 | A | Are holidays, one-off closures and mid-day breaks supported? | DECISION | D | #8; web Opening times | |
| B4 | B | Is there any reconciliation of deposit against total — balance due, receipts? | DECISION | D | #13; unspecified contact detail view | |
| B5 | B | Are deposits refundable, and by what mechanism? | DECISION | D | #13, #14 | |
| B7 | B | How are no-shows, partial payments, overpayments and disputes handled? | DECISION | D | #13 | |
| B8 | B | Where does the "total spent" figure on the contact detail view come from? | DECISION | D | unspecified contact detail view | |
| C3 | C | What are the currency formatting rules — symbol position, separators, decimal places? *Narrowed by ADR-005: KES only, so this is one format to pick, not a system.* | DECISION | D | #13, #22; web every price | |
| C6 | C | Is tax or VAT represented anywhere? | DECISION | D | #22; web Review and continue | |
| D4 | D | Do the two clients agree on a 12-hour or 24-hour clock and a single date format? | DECISION | D | #13, #16; web all timestamps | |
| E5 | E | Are there push notifications, and does the native app register device tokens? | DECISION | D | #12, #13, #16 | |
| E6 | E | Is SMS ever a channel? | DECISION | D | web Confirmation / Deposit Instructions | |
| E7 | E | Where do the "notification preferences" that Settings claims to load actually live? | DECISION | D | #23 | |
| E8 | E | Are there appointment reminders before the booking? | DECISION | D | #13; web booking page | |
| E10 | E | Are email templates managed in a templating system and localised? | DECISION | D | all three email templates | |
| F5 | F | Do uploads show progress, and can they be retried or resumed? | DECISION | D | #5, #6, #7, #20 | |
| F9 | F | Is publicly served imagery scanned or moderated? | DECISION | D | #5, #6, #7 | |
| F10 | F | Is EXIF orientation handled, and is alt text captured? | DECISION | D | #5, #6, #7; web hero gallery, portfolio grid | |
| G5 | G | Can a client edit a review they have already left? | DECISION | D | web Reviews section, booking page | |
| G6 | G | Is there any moderation — report, hide, delete, or owner response? | DECISION | D | web Reviews section; a native screen that does not exist | |
| G7 | G | Does the owner get any surface at all to read or respond to reviews of their business and staff? | DECISION | D | native — none exists; web Reviews section | |
| G10 | G | Are ratings whole stars only, or can they be partial? | DECISION | D | web Reviews section, Team cards, rating clusters | |
| H5 | H | Is the deposit refunded when a booking is cancelled, and by whom? | DECISION | D | #13, #14; web booking page | |
| H6 | H | Can either party reschedule, rather than cancel and rebook? | DECISION | D | #13; web booking page | |
| H7 | H | How is a no-show recorded? | DECISION | D | #13 | |
| I8 | I | Is ownership transferable, can a business have multiple locations, and how does an owner recover a lost account? *Narrowed by ADR-003: transfer and a second seat become row operations on the membership table, not an auth rewrite. Recovery is sharper, since one seat means no second person to recover through.* | DECISION | D | #17, #20, #23 | |
| I9 | I | **NEW (ADR-003).** What is the role vocabulary in v1, given the membership table carries a role column with no UI behind it? | DECISION | D | none — schema only | |
| J5 | J | Are UI strings and email templates translated? *Narrowed by ADR-005: no RTL, single market; scope is at most English plus Swahili.* | DECISION | D | all screens on both clients | |
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
| K45 | K | Does the Settings screen gain the notification, currency, timezone and 2FA controls that Screen 10 claims it loads, or is that list wrong? *Narrowed by ADR-005: currency and timezone are not configurable, so at most notifications and 2FA remain.* | DECISION | D | #17, #23 | |
| K46 | K | Is a single wide input the right control for an 8-digit code, and is it validated to exactly 8 numeric characters? | DECISION | D | #4, #10 | |

## Resolved by accepted decisions

| ID | Cat | Item | Was | Resolved by |
|---|---|---|---|---|
| D1 | D | What carries a timezone — business, booking, user, or nothing — and which clock renders each surface | F | ADR-005 — a single application-wide zone, Africa/Nairobi. Nothing carries a timezone; there is one clock. |
| I1 | I | Does a user own exactly one business, and can a business have more than one authenticated user | F | ADR-003 — one business per account, one seat in v1, expressed as a membership table rather than an owner column. |
| I3 | I | The single authorization rule scoping every protected read and write | F | ADR-003 — the **rule** is `user → membership → business`. This settles what the check is, not where it runs; the enforcement point is split out as I3b and remains F. |
| J1 | J | Which market does v1 target | F | ADR-005 — Kenya only. The Greek and Arabic names and the € price are mockup artifacts. |
| J2 | J | Is a team member's name one field or two | F | ADR-005 — Latin script only, so one field. |
| K11 | K | Is onboarding data public on save, or only once the salon goes live | F | ADR-004 — private until explicitly published; every public read filters on a `published` flag. |
| C1 | C | Is currency configurable per business | S | ADR-005 — KES, not configurable. |
| D3 | D | Does a recurring opening time survive a DST shift | S | ADR-005 — Africa/Nairobi observes no DST. |
| D6 | D | Whose "today" does the calendar and the bolded current-day row use | S | ADR-005 — a single fixed zone, so one "today" for everyone. |
| J6 | J | What locale do phone, address and name validation assume | S | ADR-005 — Kenyan phone format, Latin name charset. |
| C4 | C | Is multi-currency ever supported | D | ADR-005 — no, in v1. |
| J4 | J | Does the owner app support RTL | D | ADR-005 — Latin script only. |
| G1 | G | Who may leave a review — no identity requirement, and the client webapp has no login | — | ADR-002 — the per-booking token authenticates the reviewer. No client accounts. |
| G2 | G | Whether a review is tied to a booking | — | ADR-002 — the token is minted per booking, so linkage is inherent in the credential. |
| G4 | G | Duplicate-review prevention | — | ADR-002 — one token per booking is a natural uniqueness key. Editability remains open as G5. |
| H1 | H | The client has no cancellation path anywhere | — | ADR-002 — the emailed link opens a booking page with a cancel action. |
| H2 | H | The emails carry no link, reference or mechanism | — | ADR-002 — every booking email carries the signed link. |
| H3 | H | No booking reference or ID is surfaced to the client | — | ADR-002 — the token is the reference. |

ADR-001 resolves nothing; it sequences the work. ADR-002 does **not** resolve I4 — the salon's public share-link identifier is a different identifier from the per-booking token.

---

## F items

1. Does availability hang off the business only, or does each team member carry their own schedule? *(A3)*
2. Can two bookings occupy the same instant — never, once per team member, or up to a capacity — and what uniqueness/conflict rule enforces it? *(A4)*
3. Which booking statuses occupy a slot: does an unverified **Booked** hold it, and does **Cancelled** release it given reinstate exists? *(A9)*
4. How is money stored — integer minor units, fixed-point decimal, or float? *(C2)*
5. Does a booking snapshot the service's name, duration and price at booking time, or reference the live service row? *(C7)*
6. What is the storage format for instants versus recurring wall-clock hours? *(D2)*
7. Must an outbound email succeed for a booking status change to commit — dispatch inside the transaction, or through an outbox? *(E3)*
8. Which storage provider and bucket, and are asset URLs public and permanent or signed and expiring? *(F1)*
9. Do client-uploaded payment proofs live in the same store as public brand assets, and what authorization rule guards them? *(F3)*
10. Is the portfolio one image or many? *(F7)*
11. At which layer is the membership scoping rule enforced — row-level security, API middleware, or repository guard — and how does every future protected route inherit it? *(I3b, downstream of K1)*
12. What is a salon's public identifier — opaque token, slug, or database id — and can it be rotated or revoked? *(I4)*
13. Which fields of a published business are publicly readable, and which belong to the owner's account only? *(I6)*
14. Which backend platform, database, API framework and host? *(K1)*
15. **SPIKE** — Does the chosen platform actually support the availability query pattern, the `user → membership → business` scoping rule and the target hosting, at the expected data volume? *(K2)*
16. Which framework for the native owner app? *(K3)*
17. What is the API contract style — response envelope, error format, pagination convention, versioning? *(K4)*
18. What is the session model for owners — token or cookie, stored where, refreshed how, expiring when? *(K8)*
19. When a social login presents an email that already has a password account, are the identities linked or kept separate? *(K9)*
20. Does a booking store the team member it was made with? *(K17)*
21. Can one booking contain more than one service? *(K18)*
22. What is a client's identity key — is a contact keyed by email or phone within a business, or free-standing per booking? *(K19)*
23. What is the magic-link token's scope, lifetime, revocation on cancellation, and reuse for review submission? *(K20)*
