> Derived analysis, not source. `docs/source/` is authoritative; where this file and the source disagree, the source wins.

# Triage of unresolved items

Every unresolved item from `03-flagged-ambiguities.md` and `04-unstated-assumptions.md`, classified on two axes. Nothing here is answered — answers live in `docs/decisions/`, and empirical verdicts in `docs/spikes/`.

**Axis 1 — type.** `DECISION` = a product or design choice; no code needed to answer it. `SPIKE` = a genuine technical unknown where reality, not preference, supplies the answer, and throwaway code is needed to get it.

**Axis 2 — when.** `F` = blocks the foundation; a wrong answer forces a migration, an auth rewrite, or a module-boundary change, so it must be settled before any code is written. `S` = blocks a specific vertical slice; can wait until that slice's Phase 0, not past it. `D` = deferrable; log it and ship without it.

**Category** letters are `04-unstated-assumptions.md`'s sections A–K. Items originating in `03-flagged-ambiguities.md` are mapped to the nearest category; `K` absorbs auth, platform, product-surface and model-shape items.

**Screen numbers** are `01-screen-inventory.md`'s. Web pages are named.

**Status: no `F` items are open.** K72 and K73 were raised by the PR 1 migration review on 2026-08-11 and closed the same day by ADR-037 and ADR-038 — the second only after its central assumption was verified against the hosted project rather than asserted. Thirty-eight accepted decisions in `docs/decisions/`, plus **spike 001** (`docs/spikes/001-platform.md`), have closed every item that has blocked the foundation. Items each decision settles move to the Resolved table; items narrowed without being settled stay classified where they were, with an italic note; items created are marked **NEW**.

---

## Triage table

| ID | Cat | Question | Type | When | Blocked screens |
|---|---|---|---|---|---|
| A1 | A | Do bookable slots step by service duration, by a fixed grid, or by an owner-configured interval? | DECISION | S | web Select date and time |
| A2 | A | Is there a turnaround buffer between appointments? | DECISION | S | #16; web Select date and time |
| A5 | A | Is a slot held or reserved while the client moves through the multi-step booking flow? *Narrowed by ADR-007: post-submit expiry reduces the exposure but does not remove the pre-submit race.* | DECISION | S | web Select services → Review and continue |
| A6 | A | Does an omitted day mean closed, and is a closed day stored explicitly? *Narrowed by ADR-007 (two layers) and ADR-010 (an omitted day is literally an absent row).* | DECISION | S | #8; web Opening times |
| A8 | A | How far ahead can a client book, and is today the earliest selectable date? | DECISION | S | web Select date and time |
| A10 | A | Does "24:00" mean end-of-day or midnight next day, and may an opening-hours row cross midnight? *Narrowed by ADR-010: day-of-week plus plain time has no representation for a crossing row.* | DECISION | S | #8, #16; web Opening times |
| A11 | A | **NEW (ADR-006).** By what rule does "Any professional" resolve to a specific team member — first available, least loaded, round robin? | DECISION | S | web Select professional, Select date and time |
| A12 | A | **NEW (ADR-007).** How long is the expiry window before an unverified booking releases its slot? | DECISION | S | #13; web Confirmation / Deposit Instructions |
| A14 | A | **NEW (Phase 2).** How does the integration suite avoid contending on the exclusion constraint? Test files run in parallel, each in its own transaction, against one shared database. Once ADR-007's constraint exists, two files inserting a booking for the same team member over an overlapping range will contend **across** transactions and surface as an intermittent failure rather than a clear one. Three options: run the integration suite single-threaded; require every test file to use disjoint fixture data (a distinct team member and date range per file); or provision a database per worker. The first is simplest, the third is the only one that scales, and the second depends on discipline no tool enforces. Decide before the booking slice, not while debugging a flake. | DECISION | S | none — blocks the booking slice's integration suite |
| A15 | A | **NEW (PR 2c). CORRECTED and CLOSED (PR 4b) — the premise was wrong.** The entry asserted that the trigger is the admin/public deliverability asymmetry (spike 002 S2). **Re-measured on staging 2026-08-15, after custom SMTP: it is not.** Every address the admin API accepted was rejected by `/resend` with **500 `unexpected_failure`** — including a plain `@example.com` control — and the only address that succeeded was the Resend account owner's own. The cause is the Resend TEST sender, which delivers to one inbox, not address validation. **The compensation itself is verified against the deployed staging API and real GoTrue**: neither an `auth.users` row nor a `user_profiles` row survives, and both tables return to their baseline counts. **Classification received: 503 `auth-unavailable`** — the `unavailable` path, exactly as this entry suspected, because the failure arrives as a 500 rather than an address rejection. **Still unproven:** the `invalid-email` branch that answers 400, which has never run against real GoTrue and should be re-checked when E1's domain-verified sender lands. See `docs/analysis/09-phase3-close.md` §2. | **VERIFY** | S | none |
| K75 | K | **NEW (PR 3b).** Profile editing — the "Edit" affordance `native-20` draws is **not built**, because nothing it could do exists. It needs an API side (a `PATCH /v1/me` or equivalent: which fields are editable, whether the email is among them given GoTrue owns it per ADR-027, and what happens to `terms_version`) and a client side (screen #20's edit mode, validation, and the ADR-011 avatar upload path with its authorizing endpoint for a signed URL). **Deferred deliberately rather than stubbed**: a visible control that does nothing is a promise the app does not keep. Recorded as deviation 9 in `08-design-deviations.md`. Belongs to a profile-editing slice after Phase 3 — it is not part of ADR-032's "prove the wiring" scope, and adding it would have widened PR 3b from one page to a feature. | DECISION | S | #20 (the Edit state), and the avatar upload surface |
| K76 | K | **NEW (PR 4a).** Bundle Supabase's CA certificate and pass it to the `pg` pool, so the database connection is **verified** rather than merely encrypted. **What is given up today:** staging connects to Supabase's Supavisor pooler with `sslmode=no-verify`. The traffic is encrypted, but the server is not authenticated — an active man-in-the-middle between the API and the database would not be detected, and TLS without verification stops the attack it is usually deployed against. **Why the shortcut exists:** the pooler presents a self-signed chain, and `sslmode=require` fails with *"self-signed certificate in certificate chain"* because `pg-connection-string` maps `require` to `verify-full` (it warns it will adopt libpq's weaker semantics in its next major, which is a second reason not to rely on `require`). **The fix:** obtain Supabase's CA, ship it in the image, and pass it as `ssl: { ca }` in `platform/db.ts` — which currently takes only a connection string, so this is a change to that file plus a certificate in `apps/api/Dockerfile`, not a configuration tweak. **What prevents the shortcut surviving:** `platform/config.ts` refuses to start when `APP_ENV=production` and `DATABASE_URL` does not carry `sslmode=verify-full` or `verify-ca`, naming the variable and citing this item — so production cannot boot on the staging position, and this item cannot be quietly skipped. Classified against the **production slice**, which is the first moment it binds. | DECISION | S | none — blocks the production deploy, not any screen |
| B1 | B | Where is the deposit amount configured — per salon or per service, flat or percentage — and on which native screen? *Narrowed by ADR-009: the deposit shares the bigint minor-units representation.* | DECISION | S | web Confirmation / Deposit Instructions; a native screen that does not exist |
| B2 | B | Where does the client see the payment destination, and where does the owner enter it? *Narrowed by ADR-005: Kenya makes M-Pesa the realistic channel, but this does not choose it.* | DECISION | S | web Confirmation / Deposit Instructions; a native screen that does not exist |
| B3 | B | Does **Confirmed** mean "deposit verified", or is verification a separate state? *Narrowed by ADR-007 (unverified bookings expire) and ADR-019 (the client's token goes inert on terminal states, so which states are terminal now also governs the client's link).* | DECISION | S | #13; web Confirmation / Deposit Instructions |
| B6 | B | What formats and size limit apply to the proof-of-payment upload, and how long is it retained? *Narrowed by ADR-011: proofs live in the private bucket behind an authorizing endpoint.* | DECISION | S | #13; web Confirmation / Deposit Instructions |
| C5 | C | Can a price vary by professional or by time slot, as the web copy's "from KES 400" implies? *Narrowed by ADR-006: snapshotting makes variable pricing safe to introduce later.* | DECISION | S | #22; web service cards, summary bar, time slots |
| D5 | D | What date and time format do the confirmation, cancellation and reinstatement emails use? *Narrowed by ADR-005 and ADR-010: Africa/Nairobi, and one formatting helper owns it.* | DECISION | S | all three email templates |
| E14 | E | **NEW (PR 4b).** Staging's Supabase SMTP sends as **`onboarding@resend.dev`**, Resend's **test sender**, which delivers **only to the Resend account owner's own address**. Measured 2026-08-15: `POST /resend` returns **200** for `dennismugu7@gmail.com` and **500 `unexpected_failure`** for every other address tried, including a plain `@example.com` control. **Consequence: nobody but the account owner can complete sign-up on staging**, because activation mail never arrives — so any multi-user, second-owner or invite behaviour is untestable there, and so is anything that depends on a user other than the owner existing. **The fix is already available and is configuration, not procurement:** `mugu-labs.com` is a **verified** sending domain on the same Resend account (observed 2026-08-15, sending enabled, `eu-west-1`), so the change is to point staging's SMTP sender at an address on that domain. **What it blocks:** ADR-033's e2e journey, which cannot complete a sign-up on staging for any address but one; A15's `invalid-email` classification branch, which has never run against real GoTrue; and any acceptance testing of staging by a second person. **What it currently props up:** `scripts/smoke-staging.mjs` infers database reachability from the mailer FAILING, and that assertion is written to go red and name this item the moment the sender is fixed — which is the intended proof that the fix landed. Related to but distinct from **E1** (which sender identity, on which domain, for production) and **E2** (deliverability as an activation gate); this one is a concrete staging defect with a known fix rather than an open question. | DECISION | S | none directly — blocks the e2e slice and any multi-user testing on staging |
| E1 | E | Which email provider and sender identity, on which domain? *Narrowed by ADR-005, ADR-002 and ADR-012: must deliver to Kenya, carries the client's booking link, and is called only from the worker.* *Reassigned by ADR-027: staging sends through Supabase built-in SMTP, so this belongs to the custom-SMTP cutover — triggered before any real owner signs up — not to Phase 3.* | DECISION | S | #4, #10, #11, #13, #18; web Confirmation / Deposit Instructions, booking page |
| E2 | E | Does the chosen provider deliver verification codes and transactional mail reliably and fast enough to be an activation gate? *Narrowed by ADR-005 and ADR-012.* *Reassigned by ADR-027: same trigger as E1. Not a Phase 3 blocker.* **Direct evidence, 2026-08-14 — observed, not hypothesised: the activation email sent through staging's Resend test sender `onboarding@resend.dev` was delivered and landed in Gmail's SPAM folder, not the inbox.** The cause is structural, not a provider-quality finding and no indictment of Resend: that sender has **no SPF, DKIM or DMARC alignment with any domain we control**, so receiving servers distrust it **by construction**. *Staging is unaffected — the mechanism is proved (ADR-037 amendment, spike 002), and mail reaching spam still proves GoTrue dispatched it.* **The consequence is for real owners and it is severe: an activation email in spam is an owner who never completes sign-up and never reports it — a silent funnel failure with no error anywhere to notice. The same sender would later carry booking confirmations to their clients.** E2 is therefore **answered for the test sender — it is not adequate as an activation gate** — and remains open only for the domain-verified sender E1 must choose, which is where authentication alignment gets fixed. | **SPIKE** | S | #4, #10, #11; web booking page |
| E4 | E | Is the owner notified of a new booking, and through which channel? *Narrowed by ADR-012: an email notification is a new outbox row.* | DECISION | S | #12, #13, #16 |
| E9 | E | Does the **Booked** state itself send the client anything beyond the web flow's own confirmation? *Narrowed by ADR-012.* | DECISION | S | #13; web Confirmation / Deposit Instructions |
| E12 | E | **NEW (ADR-012).** What retry policy, backoff, failure ceiling and dead-letter handling applies to the outbox? *Narrowed by ADR-013: the Node worker owns this in testable code.* | DECISION | S | #13, #14; web booking page |
| F2 | F | What maximum size and accepted formats apply to each of the four native upload surfaces? *Narrowed by ADR-011: the destination bucket is decided for each.* | DECISION | S | #5, #6, #7, #20 |
| F4 | F | Are image derivatives generated at upload time or on the fly, and does the chosen storage or CDN provide the transforms the web layouts need? *Narrowed by ADR-011 and ADR-013.* | **SPIKE** | S | #5, #6, #7; web hero gallery, team avatars, portfolio grid |
| F6 | F | Can the owner replace, remove or reorder uploaded images after onboarding, and on what screen? *Narrowed by ADR-011: the portfolio child table carries an explicit sort order.* | DECISION | S | #7, and a portfolio management screen that does not exist |
| F8 | F | What happens to stored objects when a business or an account is deleted? *Narrowed by ADR-011: two buckets, and immutable paths mean deletion must enumerate objects.* | DECISION | S | #26, #27 |
| F11 | F | **NEW (ADR-011).** How long is the signed URL for a payment proof valid? | DECISION | S | #13 |
| G3 | G | May a cancelled or no-show booking leave a review? *Narrowed by ADR-019: the review capability opens at appointment end and runs thirty days; what remains is whether a cancelled booking's token goes inert instead.* | DECISION | S | web Reviews section, booking page |
| G9 | G | Is the salon aggregate rating recomputed on read or maintained, and is the seeded "1,739" real data or mockup? | DECISION | S | web salon profile rating cluster, Reviews section |
| G11 | G | Are the profile-page star cluster (private mailto to the owner) and the Reviews-section stars (public on-platform review) one flow or two? | DECISION | S | web salon profile, Reviews section, Team member profile |
| H8 | H | Does a client-initiated cancellation land in the same **Cancelled** state as an owner's, and may the owner reinstate it? *Narrowed by ADR-007 (the state set includes expired) and ADR-019 (terminal states make the client's token inert).* | DECISION | S | #13, #14, #16; web booking page |
| K5 | K | What belongs in each of the twelve empty "Backend / System Action" slots? *Narrowed by ADR-014: envelope, error format and pagination are fixed, so each slot is an endpoint definition.* *Not a Phase 3 prerequisite: the auth-screen slots are the output of building those screens, not an input to them. Each slot is settled as its endpoint is written, and reviewed with it.* | DECISION | S | #3, #12, #17, #19, #20, #22, #23 |
| K12 | K | On which screens can business profile, team roster, portfolio and opening hours be edited after onboarding? *Narrowed by ADR-021: renaming a handle is one of the things this surface has to support.* | DECISION | S | #5, #6, #7, #8, #17 — the editing screens do not exist |
| K15 | K | What are the four referenced-but-unspecified screens — Add/Edit Service, contact detail, calendar booking detail, reinstate confirmation? | DECISION | S | #13, #15, #16, #21, #22 |
| K16 | K | Where does the native app collect salon category, team member role, business address text and the owner's public contact email? *Narrowed by ADR-020: the `business_public` allowlist defines what must be collected to serve the public page.* | DECISION | S | #5, #6, #8, #20; web salon profile, Team, Location |
| K21 | K | Is the Help Center a native screen, a webview, or an external site? | DECISION | S | #18 |
| K22 | K | Where do Help Center submissions actually go? | DECISION | S | #18 |
| K23 | K | Must a team member have a name and photo, and what does the client webapp show when a photo is missing? | DECISION | S | #6; web Team section, Select professional |
| K24 | K | How does the owner add a second team member — does the form repeat, or is there a roster screen? | DECISION | S | #6 |
| K25 | K | Is the Google Maps field a pasted link or an in-app pin drop, and what does the client profile show when it is empty? | DECISION | S | #8; web Location section |
| K26 | K | Must the owner enter all seven days one by one, or is there a default or copy-to-all-days shortcut? | DECISION | S | #8 |
| K27 | K | What does the client webapp show for a salon with zero services, zero team members, or zero portfolio images? *Narrowed by ADR-004: a salon that published with empty sections, not one mid-setup.* | DECISION | S | #6, #7, #21; web Services, Team, Portfolio, Book Now entry point |
| K28 | K | Can services be reordered, hidden or archived without deletion, and can a service be tied to specific team members? *Narrowed by ADR-006.* | DECISION | S | #21, #22; web Services, Select professional |
| K29 | K | Does reinstating a booking return it to **Booked** or straight to **Confirmed**, and does it get its own confirmation step? *Narrowed by ADR-007.* | DECISION | S | #13 |
| K30 | K | Is the status filter a server query or a client-side filter of an already-fetched list? *Narrowed by ADR-014: collections are cursor-paginated server resources.* | DECISION | S | #13 |
| K31 | K | Does a new client booking reach the owner's calendar live, or only on refresh? *Narrowed by spike 001/C6: Realtime works for both anon and service_role, but there is a settle window after `SUBSCRIBED` during which changes are missed — a live calendar must fetch current state after subscribing. `replica identity full` is required for previous-value payloads.* | DECISION | S | #12, #16 |
| K32 | K | What does a calendar block show and do — status colour, label, tap behaviour, and how a cancelled booking is treated? *Narrowed by ADR-007 (must also show expired) and ADR-006 (every block has a team member).* | DECISION | S | #16 |
| K47 | K | **NEW (ADR-004).** What is the publish action, where does it live, and what does the dashboard show while unpublished? | DECISION | S | #12, #17, and a publish surface that does not exist |
| K48 | K | **NEW (ADR-004).** Can a published business be unpublished, and what happens to its live share link and outstanding bookings? *Narrowed by ADR-021: the handle is not released on unpublish, so the link resolves to something even while hidden.* | DECISION | S | #12, #13; web salon profile, booking page |
| K49 | K | **NEW (ADR-006).** How does the web "Select services" step become genuinely multi-select, given the design specifies single-select at `Web:832`? | DECISION | S | web Select services, Review and continue |
| K50 | K | **NEW (ADR-007).** Where does the owner enter each team member's working days and times? No such screen exists in any design. | DECISION | S | #6, #8, #17 — the screen does not exist |
| K52 | K | **NEW (ADR-008).** What is the exact phone normalisation rule applied before keying, and does phone become a required field on the client booking form? | DECISION | S | #15; web Confirmation / Deposit Instructions |
| K54 | K | **NEW (ADR-021).** The handle field on the Business Branding onboarding step, its live availability check, and the contents of the reserved-word list. | DECISION | S | #5 — the field does not exist in any design |
| K55 | K | **NEW (ADR-020).** What is the actual field allowlist in `business_public`, including whether the owner's contact email belongs in it given the web feedback mailto? | DECISION | S | #5, #6, #7, #8, #20; web salon profile, Team, Portfolio, Other |
| K56 | K | **NEW (ADR-018).** What is the owner shown when a social link is refused because the provider does not assert a verified email? *ADR-029: social login is out of Phase 3, so this belongs to the social-login slice.* | DECISION | S | #3, #9 |
| K68 | K | What is the budget position for a domain, a transactional email provider and Fly.io? *Resolved for Phase 3 by ADR-034: free tiers only. What remains is the spend at the custom-SMTP cutover and at production, and it belongs to those slices.* | DECISION | S | #4, #10, #11; web booking page |
| A7 | A | Are holidays, one-off closures and mid-day breaks supported? *Narrowed by ADR-007: closures apply at two layers.* | DECISION | D | #8; web Opening times |
| B4 | B | Is there any reconciliation of deposit against total — balance due, receipts? | DECISION | D | #13; unspecified contact detail view |
| B5 | B | Are deposits refundable, and by what mechanism? | DECISION | D | #13, #14 |
| B7 | B | How are no-shows, partial payments, overpayments and disputes handled? | DECISION | D | #13 |
| B8 | B | Where does the "total spent" figure on the contact detail view come from? *Narrowed by ADR-008 and ADR-009.* | DECISION | D | unspecified contact detail view |
| C3 | C | What are the currency formatting rules — symbol position, separators, decimal places? *Narrowed by ADR-005 and ADR-009: KES only, one formatting helper.* | DECISION | D | #13, #22; web every price |
| C6 | C | Is tax or VAT represented anywhere? *Narrowed by ADR-009.* | DECISION | D | #22; web Review and continue |
| D4 | D | Do the two clients agree on a 12-hour or 24-hour clock and a single date format? *Narrowed by ADR-010: one formatting helper per client.* | DECISION | D | #13, #16; web all timestamps |
| E5 | E | Are there push notifications, and does the native app register device tokens? *Narrowed by ADR-015: Flutter, so FCM with APNs behind it.* | DECISION | D | #12, #13, #16 |
| E6 | E | Is SMS ever a channel? | DECISION | D | web Confirmation / Deposit Instructions |
| E7 | E | Where do the "notification preferences" that Settings claims to load actually live? | DECISION | D | #23 |
| E8 | E | Are there appointment reminders before the booking? *Narrowed by ADR-012: a reminder is a scheduled outbox row.* | DECISION | D | #13; web booking page |
| E10 | E | Are email templates managed in a templating system and localised? *Narrowed by ADR-012: templates render inside the worker.* | DECISION | D | all three email templates |
| F5 | F | Do uploads show progress, and can they be retried or resumed? | DECISION | D | #5, #6, #7, #20 |
| F9 | F | Is publicly served imagery scanned or moderated? | DECISION | D | #5, #6, #7 |
| F10 | F | Is EXIF orientation handled, and is alt text captured? | DECISION | D | #5, #6, #7; web hero gallery, portfolio grid |
| F12 | F | **NEW (ADR-011).** What cleans up objects orphaned when an asset is replaced, given immutable paths never overwrite? | DECISION | D | #5, #6, #7, #20 |
| G5 | G | Can a client edit a review they have already left? *Narrowed by ADR-019: the thirty-day review window bounds when editing could happen at all.* | DECISION | D | web Reviews section, booking page |
| G6 | G | Is there any moderation — report, hide, delete, or owner response? | DECISION | D | web Reviews section; a native screen that does not exist |
| G7 | G | Does the owner get any surface at all to read or respond to reviews of their business and staff? | DECISION | D | native — none exists; web Reviews section |
| G10 | G | Are ratings whole stars only, or can they be partial? | DECISION | D | web Reviews section, Team cards, rating clusters |
| H5 | H | Is the deposit refunded when a booking is cancelled, and by whom? | DECISION | D | #13, #14; web booking page |
| H6 | H | Can either party reschedule, rather than cancel and rebook? | DECISION | D | #13; web booking page |
| H7 | H | How is a no-show recorded? | DECISION | D | #13 |
| I8 | I | Is ownership transferable, can a business have multiple locations, and how does an owner recover a lost account? *Narrowed by ADR-003: row operations on the membership table.* | DECISION | D | #17, #20, #23 |
| I9 | I | **NEW (ADR-003).** What is the role vocabulary in v1, given the membership table carries a role column with no UI behind it? | DECISION | D | none — schema only |
| J5 | J | Are UI strings and email templates translated? *Narrowed by ADR-005: at most English plus Swahili.* | DECISION | D | all screens on both clients |
| K13 | K | Can the owner create or edit a booking directly — walk-ins, phone bookings? | DECISION | D | #13, #16 |
| K14 | K | What happens to a waitlist entry, and where does the owner see it? | DECISION | D | web Select date and time; native — no surface exists |
| K33 | K | What analytics exist beyond the one speculative deletion-reason event? | DECISION | D | #25 |
| K34 | K | What are the loading, empty, error and offline states across the native app? *Narrowed by ADR-015 and ADR-014: Flutter widget states, with a stable error `type` slug to branch on.* | DECISION | D | all native screens |
| K35 | K | What is the accessibility standard for either client? *Narrowed by ADR-015: Flutter's semantics layer on the native side.* | DECISION | D | all screens on both clients |
| K36 | K | What is deleted, retained or anonymised when an owner deletes their account? *Narrowed by ADR-011: deletion must enumerate immutable objects across two buckets.* | DECISION | D | #25, #26, #27; web salon profile |
| K37 | K | Does the "Something else" survey option reveal a free-text field, and is a reason required before Continue? | DECISION | D | #25 |
| K38 | K | Are both the back arrow and the close icon on the final delete-confirmation screen intentional, and is the survey selection preserved on back? | DECISION | D | #26 |
| K39 | K | Is the gradient checkmark badge reserved for terminal success states, or part of a broader icon system? | DECISION | D | #27 |
| K40 | K | Should the Settings screen's chevron be dropped on the two rows that navigate externally? | DECISION | D | #23 |
| K41 | K | Are the Log Out modal's colours to be corrected against the app theme, as the author requested inline? | DECISION | D | #19 |
| K42 | K | Is a failed login's 404 surfaced distinctly, or folded into the 401 for security? | DECISION | D | #9 |
| K43 | K | What is the finalised copy for the cancel dialog, the reinstate affordance and the reinstatement email? | DECISION | D | #13, #14 |
| K44 | K | Which is correct — the extracted Help Center text naming "Fresha", or the screenshot naming "Bookflow"? | DECISION | D | #18 |
| K45 | K | Does the Settings screen gain the notification, currency, timezone and 2FA controls that Screen 10 claims it loads? *Narrowed by ADR-005.* | DECISION | D | #17, #23 |
| K46 | K | Is a single wide input the right control for an 8-digit code, and is it validated to exactly 8 numeric characters? | DECISION | D | #4, #10 |
| K57 | K | **NEW (ADR-017).** What is the refresh token's absolute lifetime, and does it rotate on use? | DECISION | D | #3, #9, #19 |
| K58 | K | **NEW (ADR-026).** Is a feature-flag system needed? Deliberately deferred, with a named trigger: answer before the first production release. | DECISION | D | none — process only |
| K69 | K | **NEW (ADR-027).** How are sender identity, from-address, subject conventions and branding kept consistent across the two email template systems — GoTrue's for auth mail and the worker's for domain mail — given nothing enforces it and no test covers it? | DECISION | D | all email templates, both paths |
| K70 | K | **NEW (ADR-031).** The Terms of Service and Privacy Policy documents do not exist. `user_profiles` records acceptance of a version string that currently points at nothing. A content task before launch, not a design question. | DECISION | D | #3, #23 |
| K71 | K | **NEW (Phase 3 PR 1).** How is `business_public` built, given the base tables now carry both RLS-with-no-policies **and** `revoke all from anon, authenticated`? A plain view fails with `permission denied` rather than returning empty, so the projection must be `security definer` — pinning `search_path`, exposing only the allowlist, and filtering on ADR-004's `published` itself — or else re-grant `anon` on the base tables, which undoes the hardening. Planned as privileged code, not as a view. | DECISION | S | web salon profile, Team, Portfolio, Location |

## Resolved by accepted decisions

| ID | Cat | Item | Was | Resolved by |
|---|---|---|---|---|
| K74 | K | What the client does when our API answers 401 | S (raised and closed in the PR 3a review) | **PR 3a.** A Dio error interceptor signs the session out on 401; the existing redirect then routes to the signed-out shell, so no screen handles it. **An unconditional sign-out is safe because of ADR-014's error contract, not by assumption:** `apps/api` emits exactly three 401 slugs — `missing-token`, `invalid-token`, `expired-token` — and all three mean the credential is unusable. "Not yours" is not among them, because PR 2b made not-yours and does-not-exist byte-identical **404s** so the endpoint could not be used as an existence oracle. That choice is what leaves 401 meaning one thing. `validateStatus` was also returned to Dio's default: accepting everything under 500 meant a 401 was never an error and no error interceptor could see it. Tested three ways — 401 signs out, 404 and 500 do not. **It stops being safe the day a fourth 401 slug means anything else**, which is recorded in `api_client.dart` where someone changing `PROBLEM_TYPES` has a chance of meeting it. |
| A3 | A | Business-level or per-team-member schedules | F | ADR-007 — two layers; a slot exists only where both are open. |
| A4 | A | Can two bookings occupy the same instant, and what enforces it | F | ADR-007 — exclusion constraint over (team member, range, occupying status). Spike 001/C1: overlap rejected with SQLSTATE 23P01. |
| A9 | A | Which booking statuses occupy a slot | F | ADR-007 — Booked-but-unverified occupies for a bounded window, then expires. Spike 001/C1 step 5 confirmed cancelling releases the slot. |
| C2 | C | How is money stored | F | ADR-009 — integer minor units in `bigint`. Spike 001/C2 PARTIAL: drifts above 2⁵³ in JSON; ADR-016 sets the mitigation. |
| C7 | C | Snapshot or live service reference | F | ADR-006 — snapshot name, duration and price; nullable `service_id` for reporting only. |
| D1 | D | What carries a timezone | F | ADR-005 — one application-wide zone, Africa/Nairobi. |
| D2 | D | Storage format for instants versus recurring hours | F | ADR-010 — `timestamptz` UTC instants; day-of-week plus plain time for recurring. |
| E3 | E | Must email succeed for a status change to commit | F | ADR-012 — transactional outbox; the provider is never called inside a request transaction. |
| E11 | E | What runs the outbox worker | F | ADR-013 — a Node worker in the same repository sharing the service layer. Spike 001/C3 confirmed `pg_cron` exists as a fallback. |
| F1 | F | Storage provider and URL model | F | ADR-011 — public CDN-fronted bucket, content-hashed immutable paths. Spike 001/C4: public object readable unauthenticated (200). |
| F3 | F | Payment-proof access rule | F | ADR-011 — private bucket behind an authorizing endpoint. Spike 001/C4: private path 400; signed URL 200 then 400 after expiry. |
| F7 | F | Portfolio one image or many | F | ADR-011 — child table with explicit sort order. |
| I1 | I | Ownership cardinality and seat count | F | ADR-003 — one business per account, one seat, via a membership table. |
| I3 | I | The authorization scoping rule | F | ADR-003 — `user → membership → business`. |
| I3b | I | Where the scoping rule is enforced | F | ADR-013 — the repository layer. Forced by spike 001/C7: the service credential bypasses RLS entirely. |
| I4 | I | The salon's public identifier, and whether it can be rotated | F | ADR-021 — an owner-chosen handle in its own table with a `current` flag; renames insert a new row, retired handles redirect permanently and are never reassignable. |
| I6 | I | Which fields of a business are publicly readable | F | ADR-020 — an explicit `business_public` allowlist projection; public endpoints never read owner-scoped tables. |
| J1 | J | Target market | F | ADR-005 — Kenya only. |
| J2 | J | Team member name one field or two | F | ADR-005 — Latin script only, one field. |
| K1 | K | Platform, database, API framework, host | F | ADR-013 — PostgreSQL on Supabase behind a Fastify API. Validated by spike 001 across all six capability requirements. |
| K2 | K | Does the platform actually support what the ADRs require | F (SPIKE) | Spike 001 — five PASS, one PARTIAL. Supabase satisfies K1; nothing had to move elsewhere. |
| K3 | K | Native client framework | F | ADR-015 — Flutter. |
| K4 | K | API contract style | F | ADR-014 — REST/JSON, `/v1`, cursor pagination, RFC 9457, OpenAPI generated from code, Dart client generated in CI. |
| K8 | K | Owner session lifetime, refresh, logout invalidation | F | ADR-017 — one-hour ES256 access tokens verified via JWKS (spike 001/C5), long-lived refresh revoked on logout, no denylist. Exposure after logout is bounded by the access token lifetime, accepted explicitly. |
| K9 | K | Social login against an existing password account | F | ADR-018 — linked only when the provider asserts a verified, matching email; otherwise no link and no account. |
| K11 | K | Public on save, or on publish | F | ADR-004 — a `published` flag; every public read filters on it. |
| K17 | K | Does a booking store the team member | F | ADR-006 — non-null FK plus name snapshot. |
| K18 | K | Multi-service bookings | F | ADR-006 — line-items child table; duration is the sum. |
| K19 | K | Client identity key | F | ADR-008 — contact scoped to a business, keyed on normalised phone. |
| K20 | K | The client booking token's model | F | ADR-019 — opaque stored value, not a JWT; one per booking with time-gated cancel and review capabilities; inert on terminal states. |
| K51 | K | What expires an unverified booking | F | ADR-013 — the same Node worker, in the service layer. |
| C1 | C | Is currency configurable | S | ADR-005 — KES, not configurable. |
| D3 | D | DST and recurring opening times | S | ADR-005 — Africa/Nairobi observes no DST. |
| D6 | D | Whose "today" | S | ADR-005 — one fixed zone. |
| E13 | E | Does expiry share the outbox worker | S | ADR-013 — yes, one Node worker runs both. |
| G8 | G | Review attribution under "Any professional" | S | ADR-006 — the booking always names a specific person. |
| H4 | H | Cancellation window or notice period | S | ADR-019 — the client may cancel at any point up to the appointment start, with no notice period. Owner-side cancellation remains unconstrained, as the designs have it. |
| J6 | J | Validation locale | S | ADR-005 — Kenyan phone format, Latin name charset. |
| K53 | K | iOS CI provider and signing credential management | S | ADR-024 — GitHub Actions with a macOS runner; signing credentials as encrypted secrets imported at build time. CI is the only mechanism by which an iOS artifact can exist. This was the last item blocking Phase 2. |
| K72 | K | How a `public.user_profiles` row is created, given GoTrue owns the `auth.users` insert and the consent columns are `not null` | **F** | ADR-037 — sign-up is mediated by our API, which proxies to GoTrue server-side and inserts the profile with a server-supplied terms version, compensating with an admin delete if the profile insert fails. The trigger-on-`auth.users` alternative was rejected: `raw_user_meta_data` is client-supplied, and a consent record the subject controls is not a consent record. |
| K73 | K | Which database role the API connects as | **F** | ADR-038 — a dedicated non-owner role with CRUD, no DDL, no ownership, and the `BYPASSRLS` attribute. **Verified on staging, not assumed:** `postgres` is not a superuser but holds `BYPASSRLS` and `CREATEROLE`, so the grant works; the role reads through RLS, cannot create or alter, and `anon` stays blocked. ADR-013's model is unchanged. |
| A13 | A | Do the GiST operator classes from `btree_gist` resolve when the exclusion constraint is created on a hosted project, and must the migration set `search_path` or schema-qualify | S (SPIKE) | **Answered on the hosted project, 2026-08-11** — not the local stack. `bookflow-staging` (`vvborjxraxdeflrllqwh`): the migration role is `postgres`, its `search_path` is `"$user", public, extensions`, and an unqualified `exclude using gist (uuid_col with =, range_col with &&)` **succeeded**. No `set search_path` and no schema qualification is required. `extensions.gist_uuid_ops` is also addressable explicitly if ever wanted. |
| K6 | K | What is the password policy | S | ADR-030 — minimum eight characters, no composition rules, GoTrue leaked-password protection enabled. NIST SP 800-63B: length plus a breach check, not composition. |
| K7 | K | What are the verification code's expiry, attempt limit, resend cooldown and lockout | S | ADR-027 made these configuration rather than code; ADR-030 sets the values — six digits, ten-minute expiry, sixty-second resend cooldown, GoTrue rate limiting for lockout. |
| K10 | K | Are Terms and Privacy versioned, and is acceptance recorded at sign-up | S | ADR-031 — versioned, with a version string and timestamp on `user_profiles` written at sign-up. Cheap now; later it is a migration plus a backfill that cannot honestly be performed. |
| K63 | K | What is Phase 3's "one placeholder domain table" — name, columns, relationship to the membership table? Migrations are Do-Not-Vibe, so it cannot be im… | S | ADR-031 — `user_profiles`, `businesses`, `memberships`. Not a placeholder: the tenancy spine, so Phase 3 proves the membership scoping rule rather than asserting it. |
| I10 | I | What does the app do for an authenticated user with zero memberships — between sign-up and business creation | S | ADR-031 (data half — a profile row and no membership row) and ADR-032 (UI half — a stubbed "finish setting up" screen, replaced by the onboarding slice). |
| K64 | K | Which screen is Phase 3's "one true page"? The obvious candidate is the zero-membership state (I10), which `docs/BUILD_LOG.md` §5 records as having no… | S | ADR-032 — My Profile Details (#20). Fully designed, reads the authenticated user's own record end to end, needs no business to exist. |
| K65 | K | Is Phase 3 one `DEFINITION_OF_DONE.md` pass and one PR, or several? The checklist is written per slice and `BUILD_LOG` §6 says one slice at a time, bu… | S | ADR-032 — four sequential PRs, each leaving the app runnable; the full `DEFINITION_OF_DONE.md` pass applies when the slice is whole. |
| K66 | K | Does the sole owner self-reviewing on a PR satisfy `DEFINITION_OF_DONE.md`'s human gate for Do-Not-Vibe surfaces? There is one contributor, `main` is… | S | ADR-032 — yes, under three named constraints: GitHub UI not the editor, a separate sitting, a written Do-Not-Vibe checklist recorded as a PR comment. Explicitly weaker than a second reviewer. |
| K62 | K | Which journeys are "critical" in the sense `DEFINITION_OF_DONE.md` requires an e2e test for, and what tooling runs those tests across a Fastify API an… | S | ADR-033 — a critical journey is one whose failure prevents a booking being taken or made. Flutter `integration_test` against staging, and nothing else satisfies the e2e gate. |
| K67 | K | How do migrations reach staging and production — from CI, from a developer machine, or as a release command — and under which credential? ADR-023 bars… | S | ADR-034 — applied by CI on merge to `main`, before deploy, with a scoped credential in Actions secrets. Never from a development machine. Production gets a manual approval gate. |
| J3 | J | Is v1 UI copy English-only, or English and Swahili | S | ADR-035 — English only for v1. No i18n wiring. Trigger for revisiting is demand from real owners. |
| K59 | K | Who sends the account-activation email — GoTrue or the ADR-012 outbox | **F** | ADR-027 — the boundary is ownership of the record the email reports on. GoTrue owns the user record and the mail; the outbox owns email about records our API owns. |
| K61 | K | Flutter client architecture — routing, state, DI, and the loading/empty/error conventions | **F** | ADR-028 — `go_router`, Riverpod for state and injection with no service locator, exhaustive `AsyncValue`, and a repository per feature wrapping the generated client. |
| K60 | K | Whether the outbox and its worker ship in Phase 3 | S | ADR-027 — they do not. No domain record exists to notify anyone about until the booking slice. |
| C4 | C | Multi-currency | D | ADR-005 — no, in v1. |
| J4 | J | RTL in the owner app | D | ADR-005 — Latin script only. |
| G1 | G | Who may leave a review | — | ADR-002 — the per-booking token authenticates the reviewer. |
| G2 | G | Review-to-booking linkage | — | ADR-002 — the token is minted per booking. |
| G4 | G | Duplicate-review prevention | — | ADR-002 — one token per booking. |
| H1 | H | No client cancellation path | — | ADR-002 — the emailed link opens a booking page with a cancel action. |
| H2 | H | Emails carry no mechanism | — | ADR-002 — every booking email carries the signed link. |
| H3 | H | No booking reference surfaced | — | ADR-002 — the token is the reference. |

ADR-001 resolves nothing; it sequences the work. ADR-016 resolves no tracked item — it settles the ID strategy, which the triage never captured, and records spike 001/C2's mitigation.

---

## F items

**None open.**

Four have been opened and closed since Phase 2 ended, which is the number worth noticing rather
than the zero. Two came from a cold-start check reading the standing documents (K59, K61); two
came from the line-by-line review of PR 1's migration (K72, K73). **Neither pair was visible from
the ADRs** — one set surfaced by reading the documents against each other, the other by reading
SQL.

- **K59 → ADR-027**, the email boundary. **K61 → ADR-028**, the Flutter architecture.
- **K72 → ADR-037.** How a profile row is created. The obvious answer — a trigger reading
  `raw_user_meta_data` — was rejected because that metadata is client-supplied, and a consent
  record the subject controls is not a consent record.
- **K73 → ADR-038.** Which role the API connects as. Answered only after checking on the hosted
  project that `BYPASSRLS` can be granted at all by a non-superuser `postgres`; had it failed,
  the fallback would have made RLS load-bearing and amended ADR-013.

**The pattern across all four:** decisions recorded thoroughly at the level they were made, with
a gap where two of them meet. Reviews find those. ADR authorship does not.

### The original F set

Two numbers appear for this, and both are right. **Twenty-eight** items were classified `F` in
the original triage. **Three more were classified `F` afterwards**, as ADR-013's consequences
surfaced questions the first pass had not asked:

- **I3b** — where the membership scoping rule is enforced. Forced by spike 001/C7: the service
  credential bypasses RLS entirely, so the layer had to be named.
- **E11** — what process runs the outbox worker.
- **K51** — what process expires an unverified booking.

**Thirty-one in total**, which is the row count in the Resolved table above. **The table is
authoritative; this section summarises it.** Where they disagree, the table is correct.

All thirty-one are settled, in `docs/decisions/ADR-001` through `ADR-021` and
`docs/spikes/001-platform.md`.

Two carry accepted, named risks rather than clean closure, and both are recorded in their
ADRs rather than buried here:

- **K8 / ADR-017** — verification is stateless, so an access token issued before logout stays
  valid until it expires. Maximum exposure is one hour. The lever is the token lifetime, not
  a denylist.
- **I4 / ADR-021** — retired handles are never reassignable, so handles accumulate
  indefinitely. Accepted, because a released handle claimed by a competitor would redirect
  the original owner's shared links and printed QR codes to someone else.

Those thirty-one are closed. The foundation is not, on the strength of K59 and K61 above —
which is a finding about the review that declared it closed, not only about the two items.
