> Derived analysis, not source. `docs/source/` is authoritative; where this file and the source disagree, the source wins.

# Triage of unresolved items

Every unresolved item from `03-flagged-ambiguities.md` and `04-unstated-assumptions.md`, classified on two axes. Nothing here is answered — answers live in `docs/decisions/`, and empirical verdicts in `docs/spikes/`.

**Axis 1 — type.** `DECISION` = a product or design choice; no code needed to answer it. `SPIKE` = a genuine technical unknown where reality, not preference, supplies the answer, and throwaway code is needed to get it.

**Axis 2 — when.** `F` = blocks the foundation; a wrong answer forces a migration, an auth rewrite, or a module-boundary change, so it must be settled before any code is written. `S` = blocks a specific vertical slice; can wait until that slice's Phase 0, not past it. `D` = deferrable; log it and ship without it.

**Category** letters are `04-unstated-assumptions.md`'s sections A–K. Items originating in `03-flagged-ambiguities.md` are mapped to the nearest category; `K` absorbs auth, platform, product-surface and model-shape items.

**Screen numbers** are `01-screen-inventory.md`'s. Web pages are named.

Sixteen accepted decisions are applied below — ADR-001 (build order), ADR-002 (client booking access), ADR-003 (tenancy), ADR-004 (publication gate), ADR-005 (target market), ADR-006 (booking record shape), ADR-007 (availability and conflict), ADR-008 (contact identity), ADR-009 (money), ADR-010 (time), ADR-011 (asset storage), ADR-012 (outbound email), ADR-013 (platform and backend architecture), ADR-014 (API contract and client generation), ADR-015 (native client framework), ADR-016 (identifiers and numeric serialisation) — plus **spike 001** (`docs/spikes/001-platform.md`), which supplied the evidence for ADR-013 and ADR-016. Items they settle move to the Resolved table. Items they narrow without settling stay classified where they were, with an italic note. Items they create are marked **NEW**.

---

## Triage table

| ID | Cat | Question | Type | When | Blocked screens | If we guess wrong (F only) |
|---|---|---|---|---|---|---|
| I4 | I | What is a salon's public identifier, and can it be rotated or revoked? *Narrowed by ADR-016: primary keys are UUIDs, which are non-enumerable and a plausible public identifier — but a primary key cannot be rotated, so if rotation is required the public identifier must be a separate column from the PK.* | DECISION | F | #12 share action; web salon profile and every sub-route | It is the public identity of every salon, embedded in links shared to WhatsApp and Instagram and in any QR code; changing it later breaks every link a salon has already distributed and the client has already bookmarked. Choosing the PK as the public identifier forecloses rotation permanently. |
| I6 | I | Which fields of a business are publicly readable without auth, and which belong to the owner's account only? *Narrowed by ADR-004: applies only to published businesses. Narrowed by ADR-011: assets are out of scope. Narrowed by ADR-013: no client talks to PostgREST, so this is an API response-shaping decision, not a database exposure one.* | DECISION | F | #5, #6, #7, #8, #20; web salon profile, Team, Portfolio, Other | Public and private columns sit on the same records written by the same flows. The blast radius is now contained to our own serialisers rather than to RLS policy, but getting the boundary wrong still leaks owner account data through an unauthenticated page, and fixing it after the API is public is a breaking response change. |
| K8 | K | What is the session model for owners — lifetime, refresh strategy, and server-side invalidation on logout? *Substantially narrowed. Spike 001/C5 established the mechanism empirically: Supabase Auth issues **ES256** tokens with a published JWKS, and a separate Node service verified one independently — signature and claims — without calling back to Supabase; a tampered token was rejected. ADR-013 fixes Supabase Auth as the issuer and the API as an independent verifier. What remains undecided is token lifetime, whether and how refresh happens, and what logout invalidates server-side — the document's logout "API Call:" bullet is still blank.* | DECISION | F | #3, #9, #17, #19, and every authenticated screen | The verification path is settled, but expiry and invalidation are not. Stateless ES256 verification means a token stays valid until it expires regardless of logout, so if logout must revoke, that needs a denylist or a session record decided now — retrofitting revocation onto stateless verification is an auth rewrite. Distinct from the client token (K20). |
| K9 | K | When a Google or Facebook login presents an email that already has a password account, are the identities linked or kept separate? *Narrowed by ADR-003: recovery moves a membership row rather than re-parenting a business. Narrowed by ADR-013: this is now a Supabase Auth identity-linking behaviour to configure, not one to build.* | DECISION | F | #3, #9 | It is an identity-uniqueness rule. Guessing wrong either creates two accounts for one person — with the business reachable from only one — or silently merges identities. Both are painful to unwind once real owners have signed up. |
| K20 | K | **NEW (ADR-002).** What is the magic-link token's model — scope, lifetime, revocation on cancellation, and reuse for review submission after the booking has passed? *Narrowed by ADR-013: minted and verified by our own API rather than Supabase Auth, so its model is entirely ours to set. Narrowed by ADR-016: the booking it references is a UUID, so the token need not carry an enumerable id.* | DECISION | F | web booking page (new), Confirmation / Deposit Instructions; #13, #14 | It is a second auth model sitting beside the owner's. Scope and expiry must be decided before the token is minted, because retrofitting revocation or splitting one token into cancel-scoped and review-scoped credentials invalidates every link already sitting in a client's inbox. |
| A1 | A | Do bookable slots step by service duration, by a fixed grid, or by an owner-configured interval? | DECISION | S | web Select date and time | |
| A2 | A | Is there a turnaround buffer between appointments? | DECISION | S | #16; web Select date and time | |
| A5 | A | Is a slot held or reserved while the client moves through the multi-step booking flow? *Narrowed by ADR-007: post-submit expiry reduces the exposure but does not remove the pre-submit race.* | DECISION | S | web Select services → Review and continue | |
| A6 | A | Does an omitted day mean closed, and is a closed day stored explicitly? *Narrowed by ADR-007: applies at two layers, salon and team member. Narrowed by ADR-010: an omitted day is literally an absent row.* | DECISION | S | #8; web Opening times | |
| A8 | A | How far ahead can a client book, and is today the earliest selectable date? | DECISION | S | web Select date and time | |
| A10 | A | Does "24:00" mean end-of-day or midnight next day, and may an opening-hours row cross midnight? *Narrowed by ADR-010: day-of-week plus a plain time has no representation for a row that crosses midnight, so this must be answered explicitly.* | DECISION | S | #8, #16; web Opening times | |
| A11 | A | **NEW (ADR-006).** By what rule does "Any professional" resolve to a specific team member — first available, least loaded, round robin? | DECISION | S | web Select professional, Select date and time | |
| A12 | A | **NEW (ADR-007).** How long is the expiry window before an unverified booking releases its slot? | DECISION | S | #13; web Confirmation / Deposit Instructions | |
| B1 | B | Where is the deposit amount configured — per salon or per service, flat or percentage — and on which native screen? *Narrowed by ADR-009: the deposit is money and shares the bigint minor-units representation.* | DECISION | S | web Confirmation / Deposit Instructions; a native screen that does not exist | |
| B2 | B | Where does the client see the payment destination, and where does the owner enter it? *Narrowed by ADR-005: Kenya makes M-Pesa the realistic channel, but this does not choose it.* | DECISION | S | web Confirmation / Deposit Instructions; a native screen that does not exist | |
| B3 | B | Does **Confirmed** mean "deposit verified", or is verification a separate state? *Narrowed by ADR-007: an unverified booking expires, so verification is what makes a booking durable — but whether that is the same transition as Confirmed is undecided.* | DECISION | S | #13; web Confirmation / Deposit Instructions | |
| B6 | B | What formats and size limit apply to the proof-of-payment upload, and how long is it retained? *Narrowed by ADR-011: proofs live in the private bucket behind an authorizing endpoint.* | DECISION | S | #13; web Confirmation / Deposit Instructions | |
| C5 | C | Can a price vary by professional or by time slot, as the web copy's "from KES 400" implies? *Narrowed by ADR-006: snapshotting makes variable pricing safe to introduce later.* | DECISION | S | #22; web service cards, summary bar, time slots | |
| D5 | D | What date and time format do the confirmation, cancellation and reinstatement emails use? *Narrowed by ADR-005 and ADR-010: timezone is Africa/Nairobi and a single formatting helper owns it.* | DECISION | S | all three email templates | |
| E1 | E | Which email provider and sender identity, on which domain? *Narrowed by ADR-005 (must deliver to Kenya), ADR-002 (also carries the client's booking link) and ADR-012 (called only from the worker, so swapping it is configuration).* | DECISION | S | #4, #10, #11, #13, #18; web Confirmation / Deposit Instructions, booking page | |
| E2 | E | Does the chosen provider deliver verification codes and transactional mail reliably and fast enough to be an activation gate? *Narrowed by ADR-005 (Kenyan inboxes) and ADR-012 (retries absorb transient failure, but an activation gate still needs first-attempt speed).* | **SPIKE** | S | #4, #10, #11; web booking page | |
| E4 | E | Is the owner notified of a new booking, and through which channel? *Narrowed by ADR-012: an email notification is a new outbox row, not new infrastructure.* | DECISION | S | #12, #13, #16 | |
| E9 | E | Does the **Booked** state itself send the client anything beyond the web flow's own confirmation? *Narrowed by ADR-012: an additional outbox row.* | DECISION | S | #13; web Confirmation / Deposit Instructions | |
| E12 | E | **NEW (ADR-012).** What retry policy, backoff, failure ceiling and dead-letter handling applies to the outbox? *Narrowed by ADR-013: the Node worker owns this, so it is application policy in testable code rather than scheduler configuration.* | DECISION | S | #13, #14; web booking page — and any surface that reports delivery | |
| F2 | F | What maximum size and accepted formats apply to each of the four native upload surfaces? *Narrowed by ADR-011: the destination bucket is decided for each; the limits are not.* | DECISION | S | #5, #6, #7, #20 | |
| F4 | F | Are image derivatives generated at upload time or on the fly, and does the chosen storage or CDN provide the transforms the web layouts need? *Narrowed by ADR-011 (immutable paths mean derivatives are themselves objects) and ADR-013 (our API sits in front, so generating on upload is available without depending on a CDN feature).* | **SPIKE** | S | #5, #6, #7; web hero gallery, team avatars, portfolio grid | |
| F6 | F | Can the owner replace, remove or reorder uploaded images after onboarding, and on what screen? *Narrowed by ADR-011: the portfolio child table carries an explicit sort order, so reorder is a data operation; the screen still does not exist.* | DECISION | S | #7, and a portfolio management screen that does not exist | |
| F8 | F | What happens to stored objects when a business or an account is deleted? *Narrowed by ADR-011: two buckets, and immutable paths mean deletion must enumerate objects.* | DECISION | S | #26, #27 | |
| F11 | F | **NEW (ADR-011).** How long is the signed URL for a payment proof valid? | DECISION | S | #13 | |
| G3 | G | May a cancelled or no-show booking leave a review? | DECISION | S | web Reviews section, booking page | |
| G9 | G | Is the salon aggregate rating recomputed on read or maintained, and is the seeded "1,739" real data or mockup? | DECISION | S | web salon profile rating cluster, Reviews section | |
| G11 | G | Are the profile-page star cluster (private mailto to the owner) and the Reviews-section stars (public on-platform review) one flow or two? | DECISION | S | web salon profile, Reviews section, Team member profile | |
| H4 | H | Is there a cancellation window or notice period, on either side? | DECISION | S | #13, #14; web booking page | |
| H8 | H | Does a client-initiated cancellation land in the same **Cancelled** state as an owner's, and may the owner reinstate it? *Narrowed by ADR-007: the state set also contains expired, which is not the same thing as cancelled.* | DECISION | S | #13, #14, #16; web booking page | |
| I10 | I | **NEW (ADR-003).** What does the app do for an authenticated user with zero memberships — between sign-up and business creation? | DECISION | S | #3, #4, #5, #12 | |
| J3 | J | Is v1 UI copy English-only, or English and Swahili? *Narrowed by ADR-005: RTL and non-Latin script are out of scope.* | DECISION | S | all screens on both clients | |
| K5 | K | What belongs in each of the twelve empty "Backend / System Action" slots? *Narrowed by ADR-014: the envelope, error format and pagination shape are fixed, so each slot is now an endpoint definition rather than an open design.* | DECISION | S | #3, #12, #17, #19, #20, #22, #23 | |
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
| K27 | K | What does the client webapp show for a salon with zero services, zero team members, or zero portfolio images? *Narrowed by ADR-004: describes a salon that published with empty sections, not one mid-setup.* | DECISION | S | #6, #7, #21; web Services, Team, Portfolio, Book Now entry point | |
| K28 | K | Can services be reordered, hidden or archived without deletion, and can a service be tied to specific team members? *Narrowed by ADR-006: all services in one booking share one team member.* | DECISION | S | #21, #22; web Services, Select professional | |
| K29 | K | Does reinstating a booking return it to **Booked** or straight to **Confirmed**, and does it get its own confirmation step? *Narrowed by ADR-007: reinstating restarts or bypasses the expiry clock, and the slot may have been taken.* | DECISION | S | #13 | |
| K30 | K | Is the status filter a server query or a client-side filter of an already-fetched list? *Narrowed by ADR-014: collections are cursor-paginated server resources, so a filter over an unbounded list cannot be client-side.* | DECISION | S | #13 | |
| K31 | K | Does a new client booking reach the owner's calendar live, or only on refresh? *Narrowed by spike 001/C6: Realtime works — both anon and service_role clients received an INSERT once subscribed. But there is a settle window after `SUBSCRIBED` during which changes are missed, so a live calendar must fetch current state after subscribing rather than treating the subscription as the sole source of truth. `replica identity full` is required for previous-value payloads.* | DECISION | S | #12, #16 | |
| K32 | K | What does a calendar block show and do — status colour, label, tap behaviour, and how a cancelled booking is treated? *Narrowed by ADR-007 (must also represent expired) and ADR-006 (every block has a team member to group or colour by).* | DECISION | S | #16 | |
| K47 | K | **NEW (ADR-004).** What is the publish action, where does it live, and what does the dashboard show while unpublished? | DECISION | S | #12, #17, and a publish surface that does not exist | |
| K48 | K | **NEW (ADR-004).** Can a published business be unpublished, and what happens to its live share link and outstanding bookings? | DECISION | S | #12, #13; web salon profile, booking page | |
| K49 | K | **NEW (ADR-006).** How does the web "Select services" step become genuinely multi-select, given the design specifies single-select at `Web:832`? | DECISION | S | web Select services, Review and continue | |
| K50 | K | **NEW (ADR-007).** Where does the owner enter each team member's working days and times? No such screen exists in any design. | DECISION | S | #6, #8, #17 — the screen does not exist | |
| K52 | K | **NEW (ADR-008).** What is the exact phone normalisation rule applied before keying, and does phone become a required field on the client booking form? | DECISION | S | #15; web Confirmation / Deposit Instructions | |
| K53 | K | **NEW (ADR-015).** Which cloud CI provider builds and signs iOS, and how are signing credentials managed given no local macOS? | DECISION | S | all native screens — release path only | |
| A7 | A | Are holidays, one-off closures and mid-day breaks supported? *Narrowed by ADR-007: closures apply at two layers.* | DECISION | D | #8; web Opening times | |
| B4 | B | Is there any reconciliation of deposit against total — balance due, receipts? | DECISION | D | #13; unspecified contact detail view | |
| B5 | B | Are deposits refundable, and by what mechanism? | DECISION | D | #13, #14 | |
| B7 | B | How are no-shows, partial payments, overpayments and disputes handled? | DECISION | D | #13 | |
| B8 | B | Where does the "total spent" figure on the contact detail view come from? *Narrowed by ADR-008 (a keyed contact makes it reconcilable) and ADR-009 (it sums bigint minor units, so it cannot drift).* | DECISION | D | unspecified contact detail view | |
| C3 | C | What are the currency formatting rules — symbol position, separators, decimal places? *Narrowed by ADR-005 (KES only) and ADR-009 (one formatting helper owns display).* | DECISION | D | #13, #22; web every price | |
| C6 | C | Is tax or VAT represented anywhere? *Narrowed by ADR-009: integer minor units make percentage math tractable.* | DECISION | D | #22; web Review and continue | |
| D4 | D | Do the two clients agree on a 12-hour or 24-hour clock and a single date format? *Narrowed by ADR-010: one formatting helper per client.* | DECISION | D | #13, #16; web all timestamps | |
| E5 | E | Are there push notifications, and does the native app register device tokens? *Narrowed by ADR-015: Flutter, so the path is FCM with APNs behind it.* | DECISION | D | #12, #13, #16 | |
| E6 | E | Is SMS ever a channel? | DECISION | D | web Confirmation / Deposit Instructions | |
| E7 | E | Where do the "notification preferences" that Settings claims to load actually live? | DECISION | D | #23 | |
| E8 | E | Are there appointment reminders before the booking? *Narrowed by ADR-012: a reminder is a scheduled outbox row.* | DECISION | D | #13; web booking page | |
| E10 | E | Are email templates managed in a templating system and localised? *Narrowed by ADR-012: templates render at dispatch time inside the worker.* | DECISION | D | all three email templates | |
| F5 | F | Do uploads show progress, and can they be retried or resumed? | DECISION | D | #5, #6, #7, #20 | |
| F9 | F | Is publicly served imagery scanned or moderated? | DECISION | D | #5, #6, #7 | |
| F10 | F | Is EXIF orientation handled, and is alt text captured? | DECISION | D | #5, #6, #7; web hero gallery, portfolio grid | |
| F12 | F | **NEW (ADR-011).** What cleans up objects orphaned when an asset is replaced, given immutable paths never overwrite? | DECISION | D | #5, #6, #7, #20 | |
| G5 | G | Can a client edit a review they have already left? | DECISION | D | web Reviews section, booking page | |
| G6 | G | Is there any moderation — report, hide, delete, or owner response? | DECISION | D | web Reviews section; a native screen that does not exist | |
| G7 | G | Does the owner get any surface at all to read or respond to reviews of their business and staff? | DECISION | D | native — none exists; web Reviews section | |
| G10 | G | Are ratings whole stars only, or can they be partial? | DECISION | D | web Reviews section, Team cards, rating clusters | |
| H5 | H | Is the deposit refunded when a booking is cancelled, and by whom? | DECISION | D | #13, #14; web booking page | |
| H6 | H | Can either party reschedule, rather than cancel and rebook? | DECISION | D | #13; web booking page | |
| H7 | H | How is a no-show recorded? | DECISION | D | #13 | |
| I8 | I | Is ownership transferable, can a business have multiple locations, and how does an owner recover a lost account? *Narrowed by ADR-003: transfer and a second seat become row operations on the membership table.* | DECISION | D | #17, #20, #23 | |
| I9 | I | **NEW (ADR-003).** What is the role vocabulary in v1, given the membership table carries a role column with no UI behind it? | DECISION | D | none — schema only | |
| J5 | J | Are UI strings and email templates translated? *Narrowed by ADR-005: at most English plus Swahili.* | DECISION | D | all screens on both clients | |
| K13 | K | Can the owner create or edit a booking directly — walk-ins, phone bookings? | DECISION | D | #13, #16 | |
| K14 | K | What happens to a waitlist entry, and where does the owner see it? | DECISION | D | web Select date and time; native — no surface exists | |
| K33 | K | What analytics exist beyond the one speculative deletion-reason event? | DECISION | D | #25 | |
| K34 | K | What are the loading, empty, error and offline states across the native app? *Narrowed by ADR-015: these are Flutter widget states, and ADR-014's stable error `type` slug gives the error case something to branch on.* | DECISION | D | all native screens | |
| K35 | K | What is the accessibility standard for either client? *Narrowed by ADR-015: the native side is Flutter's semantics layer rather than platform-native accessibility.* | DECISION | D | all screens on both clients | |
| K36 | K | What is deleted, retained or anonymised when an owner deletes their account? *Narrowed by ADR-011: deletion must enumerate immutable objects across two buckets.* | DECISION | D | #25, #26, #27; web salon profile | |
| K37 | K | Does the "Something else" survey option reveal a free-text field, and is a reason required before Continue? | DECISION | D | #25 | |
| K38 | K | Are both the back arrow and the close icon on the final delete-confirmation screen intentional, and is the survey selection preserved on back? | DECISION | D | #26 | |
| K39 | K | Is the gradient checkmark badge reserved for terminal success states, or part of a broader icon system? | DECISION | D | #27 | |
| K40 | K | Should the Settings screen's chevron be dropped on the two rows that navigate externally? | DECISION | D | #23 | |
| K41 | K | Are the Log Out modal's colours to be corrected against the app theme, as the author requested inline? | DECISION | D | #19 | |
| K42 | K | Is a failed login's 404 surfaced distinctly, or folded into the 401 for security? | DECISION | D | #9 | |
| K43 | K | What is the finalised copy for the cancel dialog, the reinstate affordance and the reinstatement email? | DECISION | D | #13, #14 | |
| K44 | K | Which is correct — the extracted Help Center text naming "Fresha", or the screenshot naming "Bookflow"? | DECISION | D | #18 | |
| K45 | K | Does the Settings screen gain the notification, currency, timezone and 2FA controls that Screen 10 claims it loads? *Narrowed by ADR-005: currency and timezone are not configurable.* | DECISION | D | #17, #23 | |
| K46 | K | Is a single wide input the right control for an 8-digit code, and is it validated to exactly 8 numeric characters? | DECISION | D | #4, #10 | |

## Resolved by accepted decisions

| ID | Cat | Item | Was | Resolved by |
|---|---|---|---|---|
| A3 | A | Business-level or per-team-member schedules | F | ADR-007 — two layers; a slot exists only where both are open. |
| A4 | A | Can two bookings occupy the same instant, and what enforces it | F | ADR-007 — exclusion constraint over (team member, range, occupying status). Proven in spike 001/C1: overlap rejected with SQLSTATE 23P01, different member accepted, adjacent range accepted. |
| A9 | A | Which booking statuses occupy a slot | F | ADR-007 — Booked-but-unverified occupies for a bounded window, then expires. Spike 001/C1 step 5 confirmed cancelling releases the slot. |
| C2 | C | How is money stored | F | ADR-009 — integer minor units in `bigint`. Spike 001/C2 returned PARTIAL: exact in Postgres and over the driver, drifts above 2⁵³ in JSON. ADR-016 sets the mitigation. |
| C7 | C | Snapshot or live service reference | F | ADR-006 — snapshot name, duration and price; nullable `service_id` for reporting only. |
| D1 | D | What carries a timezone | F | ADR-005 — one application-wide zone, Africa/Nairobi. |
| D2 | D | Storage format for instants versus recurring hours | F | ADR-010 — `timestamptz` UTC instants; day-of-week plus plain time for recurring. Never interchanged. |
| E3 | E | Must email succeed for a status change to commit | F | ADR-012 — transactional outbox; the provider is never called inside a request transaction. |
| E11 | E | What runs the outbox worker | F | ADR-013 — a Node worker in the same repository sharing the service layer. Spike 001/C3 confirmed `pg_cron` exists as a fallback but the manual requires this logic unit-testable. |
| F1 | F | Storage provider and URL model | F | ADR-011 — public CDN-fronted bucket, content-hashed immutable paths. Spike 001/C4: public object readable unauthenticated (200). |
| F3 | F | Payment-proof access rule | F | ADR-011 — private bucket behind an authorizing endpoint returning short-lived signed URLs. Spike 001/C4: private path 400 unauthenticated; signed URL 200, then 400 `InvalidJWT` after expiry. |
| F7 | F | Portfolio one image or many | F | ADR-011 — child table with explicit sort order. |
| I1 | I | Ownership cardinality and seat count | F | ADR-003 — one business per account, one seat, via a membership table. |
| I3 | I | The authorization scoping rule | F | ADR-003 — `user → membership → business`. Enforcement point split to I3b. |
| I3b | I | Where the scoping rule is enforced | F | ADR-013 — the repository layer. Forced by spike 001/C7: the service credential bypasses RLS entirely (2 rows read where anon got 0), so RLS cannot be the primary control. |
| J1 | J | Target market | F | ADR-005 — Kenya only. |
| J2 | J | Team member name one field or two | F | ADR-005 — Latin script only, one field. |
| K1 | K | Platform, database, API framework, host | F | ADR-013 — PostgreSQL on Supabase with a Fastify TypeScript API in front; clients never touch PostgREST. Validated by spike 001 across all six capability requirements. |
| K2 | K | Does the platform actually support what the ADRs require | F (SPIKE) | Spike 001 — executed against the live project. Five PASS, one PARTIAL (bigint over JSON). Overall: Supabase satisfies K1; nothing had to move elsewhere. |
| K3 | K | Native client framework | F | ADR-015 — Flutter, chosen on the calendar week-grid's rendering demands and pixel fidelity. |
| K4 | K | API contract style | F | ADR-014 — REST/JSON, `/v1`, cursor pagination, RFC 9457 problem+json, `{data, meta}` for collections; OpenAPI 3.1 generated from code, Dart client generated in CI. |
| K11 | K | Public on save, or on publish | F | ADR-004 — a `published` flag; every public read filters on it. |
| K17 | K | Does a booking store the team member | F | ADR-006 — non-null FK plus name snapshot; "Any professional" resolves at booking time. |
| K18 | K | Multi-service bookings | F | ADR-006 — line-items child table; duration is the sum. |
| K19 | K | Client identity key | F | ADR-008 — first-class contact scoped to a business, keyed on normalised phone. |
| K51 | K | What expires an unverified booking | F | ADR-013 — the same Node worker, in the service layer, not `pg_cron`. |
| C1 | C | Is currency configurable | S | ADR-005 — KES, not configurable. |
| D3 | D | DST and recurring opening times | S | ADR-005 — Africa/Nairobi observes no DST. |
| D6 | D | Whose "today" | S | ADR-005 — one fixed zone. |
| E13 | E | Does expiry share the outbox worker | S | ADR-013 — yes, one Node worker runs both. |
| G8 | G | Review attribution under "Any professional" | S | ADR-006 — the booking always names a specific person. |
| J6 | J | Validation locale | S | ADR-005 — Kenyan phone format, Latin name charset. |
| C4 | C | Multi-currency | D | ADR-005 — no, in v1. |
| J4 | J | RTL in the owner app | D | ADR-005 — Latin script only. |
| G1 | G | Who may leave a review | — | ADR-002 — the per-booking token authenticates the reviewer. |
| G2 | G | Review-to-booking linkage | — | ADR-002 — the token is minted per booking. |
| G4 | G | Duplicate-review prevention | — | ADR-002 — one token per booking. Editability remains open as G5. |
| H1 | H | No client cancellation path | — | ADR-002 — the emailed link opens a booking page with a cancel action. |
| H2 | H | Emails carry no mechanism | — | ADR-002 — every booking email carries the signed link. |
| H3 | H | No booking reference surfaced | — | ADR-002 — the token is the reference. |

ADR-001 resolves nothing; it sequences the work. ADR-016 resolves no tracked item — it settles the ID strategy, which the triage never captured, and records spike 001/C2's mitigation. ADR-002 does **not** resolve I4: the salon's public share-link identifier is a different identifier from the per-booking token.

---

## F items

1. What is a salon's public identifier, and can it be rotated or revoked? *(I4 — narrowed by ADR-016 but rotation is unanswered, and a UUID primary key forecloses it)*
2. Which fields of a published business are publicly readable, and which belong to the owner's account only? *(I6)*
3. What is the owner session's lifetime, refresh strategy, and server-side invalidation on logout? *(K8 — mechanism settled by spike 001/C5; expiry and revocation are not)*
4. When a social login presents an email that already has a password account, are the identities linked or kept separate? *(K9)*
5. What is the magic-link token's scope, lifetime, revocation on cancellation, and reuse for review submission? *(K20)*
