> Derived analysis, not source. `docs/source/` is authoritative; where this file and the source disagree, the source wins.

# Unstated assumptions — what the design docs lean on without defining

Distinct from `03-flagged-ambiguities.md`, which records what the author *noticed*. This file records what neither document addresses at all. Line references are to `docs/source/DD-Bookflow-Native.md` unless prefixed `Web:`, which refers to `docs/source/DD-Bookflow-Web.md`.

Each section states what is **Specified**, then what it is **Silent on**, then **which screens depend on it**. Nothing here is solved or designed.

---

## A. Availability

**Specified.** Opening hours are captured once, during onboarding, as repeated "Day : Open time - Close time" rows added via a "+" button; "Done" is gated on at least one valid row; close-after-open is validated client-side (`:456`, `:473`). The document declares the consequence explicitly: "The opening hours become the source of truth the client webapp uses to show availability and determine bookable time slots" (`:480`). Services carry a duration ("20 mins", "50 mins"). On the web side, the date strip is "data-driven from the salon's actual availability" and time slots are "data-driven from the salon's actual availability for the selected professional + date combination … should dynamically refetch/recompute whenever the date or professional selection changes" (`Web:1088`, `Web:1120`).

**Silent on.** The computation itself — every input beyond "hours exist" is undefined:

- **Slot granularity.** One slot ("16:00") is shown. Nothing says whether slots step by service duration, by a fixed grid, or by owner configuration.
- **Turnaround/buffer** between appointments.
- **Per-team-member schedules.** Only one business-level weekly schedule exists. Yet "Select professional" filters slots by professional, and "Any professional" claims "Maximum availa…" (truncated in the source, full copy unconfirmed) — a claim that requires per-person availability the data model never captures.
- **Concurrency/capacity.** Whether two clients can hold 16:00 with different staff, or with the same staff, is never stated.
- **Conflict prevention at write time.** No locking, no hold/reservation during the multi-step booking flow, no uniqueness rule. The calendar's open question refers to "a conflicting or adjacent slot" as a scenario without defining what prevents it.
- **Closed days.** Onboarding can only *add* open rows; there is no closed marker. The web `OpeningHoursList` expects a closed state the author notes is "not shown in this crop but should be handled as a data state" (`Web:597`). What an omitted day means is undefined — and the author's open question ("unclear if the owner must manually add all 7 days one-by-one") means a partial schedule is reachable.
- **Holidays, one-off closures, breaks, vacation.**
- **Lead time and booking horizon.** The web doc asks directly: "can users scroll to dates before today, or is that card simply off-screen padding?" (`Web:1072`)
- **Whether a Booked (deposit unverified) booking holds its slot**, and whether a Cancelled one releases it — the latter is a named open question on the calendar screen.
- **Midnight-crossing hours.** "10:00 - 24:00" and a booking block rendered at "12 AM" are used with no model for a day boundary.

**Screens that depend on it.** Native: Opening Hours & Location onboarding (#8), Calendar tab (#16). Web: Select date and time, Select professional, Opening times section, the "Open until 24:00" status cluster.

---

## B. Payments

**Specified.** In the native app, a booking's expanded card carries "Check payment Confirmation message", which "Opens the file the client uploaded during their booking on the client-facing webapp — the client's proof-of-payment/deposit confirmation", backed by "Fetches the file from storage, associated with this specific booking record" (`:677`–`:682`). One further mention: reinstatement "possibly straight to confirmed, if the deposit was already verified prior to cancellation" (`:765`). In the web app: "Just drop a **KES 500** deposit to lock in your booking", with the amount marked dynamic, and an "Upload confirmation message here" link opening a file picker (`Web:1326`, `Web:1344`).

**Silent on.**

- **Where the deposit amount is configured.** The web doc flags this as an open question — "is the deposit amount owner-configured, or system-calculated?" (`Web:1328`) — and no native screen answers it. There is no deposit field on business branding, on any service, in Settings, or on My Profile. Whether it is per-salon, per-service, flat, or a percentage is undefined.
- **Provider.** M-Pesa appears five times in the web doc and zero times in the native doc, and every web occurrence is the author's own speculation ("presumably via M-Pesa or similar given the KES currency and Kenya context", `Web:1290`). There is no integration, no till/paybill/shortcode, no API, no callback.
- **Payment destination shown to the client.** Flagged by the web author as a blocking gap: "the copy references a deposit but doesn't show payment instructions/destination … without it the client has no way to know how to pay" (`Web:1337`).
- **What "verified" means.** The owner opens an image. There is no verify action, no verified flag, and no state in the lifecycle for it. "the deposit was already verified" refers to a concept with no representation anywhere. Whether **Confirmed** is intended to *mean* "deposit verified" is never stated.
- **Reconciliation** — deposit versus total price, balance due at the appointment, receipts.
- **Refunds.** The cancellation email says nothing about the deposit, and no refund path exists on either side.
- **The proof file's constraints.** Web says `accept="image/*"`; the native side states nothing about format, size, retention, or who may retrieve it.
- **No-show, partial payment, overpayment, disputes.**
- **"Total spent"** on the unspecified contact detail view (`:810`) implies a per-client payment ledger with no source data.

**Screens that depend on it.** Native: Bookings tab expanded card (#13), reinstate flow, the unspecified contact detail view. Web: Confirmation / Deposit Instructions.

---

## C. Money

**Specified.** "KES" prefixes every price example in both documents. The Styles Reference fixes the treatment — bold weight for prices, and on web "a distinct semantic 'price' color treatment … a green-family accent" (`Web:238`). Native names "currency settings" once, inside a parenthetical list of things the Settings route loads (`:973`).

**Silent on.**

- **Whether currency is configurable at all, and where.** The Settings screen as specified and screenshotted has four rows — Change password, Privacy policy, Terms of service, Delete account. No currency row exists.
- **Formatting rules** — code versus symbol, position, thousands separator, decimal places. All native prices are whole numbers with no decimals; no rule is given.
- **Storage representation** (minor units versus decimal versus float). Both scaffolding manuals name payment math as Do-Not-Vibe territory; the design docs never touch it.
- **Multi-currency or FX.** The web doc flags its own inconsistency: "currency inconsistency (€9 vs KES 400) between the time slot price and summary bar — likely needs correcting to a single consistent currency/value pulled from one source" (`Web:1154`).
- **Variable pricing.** "The word 'from' is notable — suggesting price could vary (e.g., by team member selected later in the flow)" (`Web:854`). Whether per-professional or per-slot pricing exists is unresolved, and no native screen sets it.
- **Tax/VAT** — absent from both documents.
- The duration discrepancy the web author flags ("10 mins" in the summary bar versus "20 mins" on the service card, `Web:1194`) has the same root: no single authoritative service record shape is defined.

**Screens that depend on it.** Native: the unspecified Add/Edit Service form, My Services list (#22), Bookings cards (#13), Settings (#23). Web: service cards, sticky summary bar, review card, total row, time-slot rows.

---

## D. Time

**Specified.** Display strings only. Native: "July 22, 2026. 10 AM", "Booked on: July 19, 2026", an hourly grid labelled from "12 AM", a range label "July 20–24, 2026". Web: "Sat, 8 Aug 2026 at 20:56" review timestamps; "Monday 10 August"; "16:00–16:10 (10 mins duration)"; "10:00 - 24:00". Two computations are specified as client-side: the bolded "today" row "evaluated against the client's local current date on render" (`Web:761`), and the Open/Closed badge "Computed live against current time vs. mobile-app-configured business hours" (`Web:166`).

**Silent on.**

- **Timezone.** The word occurs exactly once across both documents — as an item in that parenthetical config list (`:973`). No timezone is attached to a business, a booking, an opening-hours row, or a user. Whose clock the owner's calendar, the client's "Open until 24:00" badge, and the emailed appointment time each use is undefined, and the two clients are explicitly different devices in potentially different places.
- **Storage format.** No ISO 8601, no UTC, no date/time type is named anywhere. (Verified: the only "UTC" substring in either file is inside the word "outcomes".)
- **DST.** Zero mentions in either document.
- **Format consistency.** Native uses 12-hour ("10 AM", "12 AM"); web uses 24-hour ("16:00", "20:56", "24:00"). Native dates read "July 22, 2026"; web dates read "Sat, 8 Aug 2026" and "Monday 10 August". No formatting rule reconciles them, and both render the same underlying records.
- **Whether "24:00" denotes end-of-day or midnight of the following day**, and whether an opening-hours row may cross midnight. The only validation specified is close > open.
- **The email templates** interpolate `[Date]` and `[Time]` with no format and no timezone (`:700`, `:738`).
- **Relative-time rules** ("today", "tomorrow"), and whose "today" the calendar's Today button jumps to.

**Screens that depend on it.** Native: Opening Hours onboarding (#8), Bookings cards (#13), Calendar tab (#16), all three email templates. Web: Opening times list, Open/Closed cluster, date strip, time slots, review timestamps, review summary card.

---

## E. Notifications

**Specified.** Email only, and only these:

- Booking **confirmation** to the client — full copy given (`:694`–`:706`).
- Booking **cancellation** to the client — full copy given (`:733`–`:743`).
- Booking **reinstatement** to the client — "Should trigger" it; "exact copy to be defined" (`:767`).
- Sign-up **verification code** (8 digits) and **resend**.
- Password-**reset** code / link.
- Web-side **booking confirmation** to the client-entered address on Submit, with helper copy "Drop your email in here, and we'll ping you the booking confirmation!" (`Web:1377`).
- Help Center "Send email" support submission.
- The cancel dialog's warning text asserts the behaviour to the owner: "The client will be notified by email." (`:643`)

**Silent on.**

- **Provider or service.** None named. No sender identity, from-domain, reply-to, or deliverability consideration. `mugu-labs.com` appears only in a footer and in support copy.
- **Template system, branding, and whether emails are localised.** The templates are inline plain text with `[Client Name]` / `[Salon Name]` / `[Service Name]` placeholders and no stated interpolation source.
- **Failure semantics** beyond "Inline error/toast if the status update or email dispatch fails." Whether a failed send rolls back the status change is undefined — and the two are described as one atomic-sounding action.
- **Notifications to the owner: none exist in any channel.** There is no new-booking alert. The dashboard empty state promises "appointments will land here automatically" (`:591`), and the mechanism behind that word is precisely the calendar's unresolved sync question.
- **Push: zero mentions.** No permission prompt, no device-token registration, no payload — in a native mobile app whose core value is inbound bookings. (The two "push" matches in the native doc are `Router push` and a CSS layout description.)
- **SMS: not a channel.** It appears twice across both documents, neither time as one — once as a target in the native share sheet (`:615`), once describing the *content* of a payment screenshot in the web doc (`Web:1349`).
- **"notification preferences"** is named once as something Settings loads; the Settings screen has no such row and no such control.
- **Appointment reminders** (to client or owner) before the booking.
- **The Booked state itself produces no email.** A client submits, receives one confirmation from the web flow, and hears nothing until the owner acts.

**Screens that depend on it.** Native: Bookings tab confirm/cancel/reinstate (#13, #14), Email Verification (#4), password-reset steps (#10, #11), Help Center (#18), Settings (#23), Dashboard empty state (#12). Web: Confirmation / Deposit Instructions.

---

## F. Media

**Specified.** Four native upload surfaces exist: business banner, team-member photo, portfolio images, profile avatar. The storage requirement is stated as a consequence rather than a spec — assets "need to land in storage that the client webapp can read directly and quickly — typically a public CDN-backed bucket rather than private storage, since unauthenticated visitors need to load this banner" (`:228`), and this "implies image processing considerations (resizing/compression for web display)" (`:230`), with the note that for portfolio "image resolution/compression handling matters more here … clients are visually evaluating the salon's craft" (`:385`). The profile avatar picker is the only native surface with a format hint: "Selects media file (.jpg/.png)" (`:1125`). The Help Center — a web page — is the only surface anywhere with real constraints: ".jpg, .png • max size 10mb", with `413`/`415` handling. Web-side, the proof-of-payment input is `accept="image/*"`, and the portfolio grid is square-cropped, cover-fit, 9 images with a count badge.

**Silent on.**

- **Provider, bucket, URL scheme, public versus signed URLs.** "CDN" appears three times in the native doc, always as the author's inference, never as a decision.
- **Max file size and accepted formats for all four native uploads.** None are stated.
- **Derivative sizes and aspect ratios.** The web app needs a ~4:3 landscape hero, circular team crops at three different diameters (grid ~110–120px, list row, profile ~300px+), and square portfolio tiles. Nothing says who generates these, from what source, or at what point.
- **Upload progress, cancellation, retry, resumability.** The specs stop at "toast/banner for upload-related failures".
- **Replace, remove, reorder** — "not visible in this static mockup state" for portfolio, and there is **no portfolio management screen at all after onboarding**, so images cannot be added or removed later by any specified path.
- **Whether portfolio upload is multi-image** (the author's open question).
- **Orphan cleanup and deletion cascade** on account deletion.
- **Content scanning or moderation** for images served publicly under the product's domain.
- **Access-control asymmetry.** The proof-of-payment file is the one *private* asset in the system (owner-only, tied to a booking) and its storage class, retention period, and authorization rule are unspecified, while every other asset is described as deliberately public.
- **EXIF/orientation handling, alt text.**

**Screens that depend on it.** Native: Business Branding (#5), Team Member (#6), Portfolio (#7), My Profile avatar (#20), Bookings expanded card payment file (#13), Help Center (#18). Web: hero gallery, team avatars, team member profile photo, portfolio grid + lightbox, deposit upload.

---

## G. Reviews

**Specified — entirely in the web doc; the native doc never mentions ratings.**

- Salon aggregate "5.0 (1,739)" — "Aggregated from webapp client ratings (**not** mobile app)" (`Web:168`), and "the developer should treat the displayed rating/count as a computed aggregate from a ratings table, not static profile data" (`Web:151`).
- Per-team-member ratings ("4.9", "5.0", and "5.0 (183)" on the profile) — "Computed from webapp booking reviews tied to that specific team member — same aggregation pattern as the salon-level rating, but scoped per-person" (`Web:1532`).
- Review list item shape: initials avatar with a colour the author recommends hashing from name/id, reviewer name, "Sat, 8 Aug 2026 at 20:56", star row, optional comment, most-recent-first.
- Two star interactions the author cannot reconcile and explicitly escalates: the profile-page cluster opening a **mailto** to the owner (private feedback) versus the Reviews-section stars opening an on-platform public submission — "Worth confirming with you whether these are meant to be the same modal/action or genuinely two separate features" (`Web:538`).

**Silent on.**

- **Who may leave a review.** No identity requirement is stated, and the client web app has no login on any of its pages. Nothing ties a submission to a person.
- **Whether a review requires a completed booking.** Per-member ratings are described as deriving from "booking reviews", but the submission flow collects no booking reference and the booking flow collects no review.
- **Duplicate prevention** — raised only as "Consider whether an already-reviewed client should see their existing review pre-filled/editable versus being able to submit duplicate reviews" (`Web:542`).
- **Moderation: zero mentions in either document.** (The four "moderat" matches in the web doc are all "moderate corner radius".) No report, hide, delete, edit, or owner response.
- **The owner has no review surface whatsoever.** The native app — the entire owner-facing product — never mentions ratings. There is no screen to read, reply to, dispute, or moderate reviews of their own business or their named staff, while those ratings are the most prominent trust signal on their public page and on each staff member's card.
- **Attribution when the client selected "Any professional".**
- **Aggregate recomputation and caching**, and the provenance of the seeded "1,739".
- **Scale semantics** — the doc says the list "should support partial ratings 1–5" (`Web:508`) while the input is described as whole-star selection.

**Screens that depend on it.** Web: salon profile rating cluster, Reviews section (aggregate + list + submission), Team cards, Select professional rows, Team member profile. Native: none exist — that absence is the gap.

---

## H. Cancellation from the client side

**Verified asymmetry.** Cancellation-family terms (`cancel`, `cancels`, `cancelled`, `cancelling`, `cancellation`) appear **48 times** in `DD-Bookflow-Native.md` and **zero times** in `DD-Bookflow-Web.md`.

**Specified — owner-side only.** A three-outcome lifecycle from Booked (remain, → Confirmed, → Cancelled); a confirmation dialog gating the destructive action; a cancellation email with full copy; Cancelled as an explicitly non-terminal state with a reinstate path; and a Cancelled filter view.

**Silent on.**

- **The client has no cancellation path anywhere.** The web booking flow terminates at Submit. There is no account, no "my bookings", no booking-reference lookup, no link in any email back into the product.
- **The emails' only stated recourse is prose.** The confirmation email: "If you need to make any changes, just get in touch with us." (`:702`) The cancellation email: "If you'd like to rebook or have any questions, please don't hesitate to get in touch with us." (`:740`) Neither carries a link, a reference number, or a mechanism, and no channel is given — "get in touch" resolves to nothing specified, since the salon's own phone number and email are never collected in native onboarding either.
- **No booking reference or ID is ever surfaced to the client.**
- **No cancellation window, notice period, or policy** on either side.
- **No deposit-refund rule on cancellation**, from either side.
- **Reschedule does not exist on either side** — not for the client, who has no post-booking surface at all, and not for the owner, whose only three booking actions are confirm, cancel and reinstate. Changing an appointment's date, time, service or professional is impossible for both parties within everything the documents specify; the only available path is cancel-and-rebook, which discards the deposit-verification state and re-enters the web flow from the beginning as an unrelated booking.
- **No-show handling.**
- **Downstream consequence.** The calendar's "Cancelled bookings' calendar treatment" open question can only ever concern owner-initiated cancellations, because client-initiated ones cannot occur. Whatever answer is chosen there does not cover the case a real client will most often produce.

**Screens that depend on it.** Native: Bookings tab (#13), Cancel Confirmation Dialog (#14), Calendar (#16), and both email templates. Web: the gap spans the whole client product and is sharpest at the terminal Confirmation / Deposit Instructions screen, which is the last thing a client ever sees.

---

## I. Multi-tenancy

**Specified.** The README states the architecture in one line: "One backend, one database, two clients." Records are described as "associated with the business profile" — team members (`:319`), portfolio images (`:396`), services (`:1178`). Web routes are speculated as `/salon/{id}/services` (`Web:126`) and `/salon/{id}/book/services` (`Web:773`). The native share action "Copies the unique string to the device clipboard or feeds it directly into the native mobile OS sharing intent" (`:618`).

**Silent on.**

- **Whether one account equals one business.** Sign-up creates a user; onboarding creates a business profile. The cardinality is never stated — one business per account, several, or one business per location.
- **Staff logins, roles, permissions.** Absent. Team members are content records with a name, photo and bio; they cannot log in, they have no credentials, and no screen creates one — yet they carry individual ratings and are selectable in the client booking flow. Nothing in either document describes a second seat of any kind.
- **Any authorization rule.** Every backend action in the native doc is described without a permission check — fetch bookings, fetch contacts, update booking status, fetch the payment-proof file, delete account. The Project-Scaffolding manual names this precisely — "Decide auth and authorization once. Who can be a user, how do they authenticate … how does every future protected route check them the same way? Auth is Do-Not-Vibe territory" — and the design docs never answer it.
- **What the booking link actually contains.** The native doc calls it "the unique string" and leaves the generating call blank ("○ Hook/API Call:", `:617`). Its format, whether it embeds a business id, a slug, or an opaque token, whether it is guessable or enumerable, whether it can be rotated or revoked, and what happens to it after account deletion are all undefined.
- **How the client webapp resolves a URL to a specific salon.** The web doc never shows a route for the salon profile page itself — only two speculative sub-routes below `/salon/{id}`. Whether `{id}` is a database id, a slug derived from the business name, or the same opaque token as the share link is unstated, as is uniqueness/collision handling for name-derived slugs and behaviour for an unknown or deleted id. The web doc notes only that the page is "likely reached via direct link/QR code, so no header chrome needed" (`Web:41`) — QR codes are mentioned once here and nowhere else, with no generation surface in the native app.
- **What unauthenticated clients may read.** The entire salon profile is served without auth, but no read model or field-level exposure rule separates public business data from the owner's account data — both are written through the same profile flows, and the web app reads the owner's email for the feedback mailto ("Sourced from mobile app account/profile settings", `Web:171`).
- **Cross-tenant exposure surfaces.** Contacts, bookings, and especially the public image bucket (banner, team photos, portfolio) alongside the private payment-proof files, which the document places in the same storage discussion without distinguishing their access rules.
- **Ownership transfer, multiple locations or branches, and account recovery** for a business whose owner loses access.

**Screens that depend on it.** Native: every screen that reads or writes business data — Business Branding (#5), Team Member (#6), Portfolio (#7), Opening Hours (#8), Dashboard and share link (#12), Bookings (#13), Contacts (#15), Calendar (#16), My Services (#21, #22), and account deletion (#26). Web: the entire product, every page of which is an unauthenticated read of one specific tenant.

---

## J. Localisation

**Specified — only as a rendering concern, and only in the web doc.** Team member names appear bilingually ("Rifat / رفعت", `Web:376`) and in Greek ("Άρτεμις – Ευθυμία"), with a Greek role label ("Αισθητικός", `Web:964`). The instruction is layout-level: "the layout needs to support RTL script rendering inline after the LTR name, and should truncate gracefully with ellipsis if the name is long (visible in 'Mouhamad…' being cut off) — so apply `text-overflow: ellipsis` with `white-space: nowrap` (or a max-line clamp) per column" (`Web:376`). The team member profile page adds that "the data model should still support it per the earlier bilingual name pattern observed in the Team grid — this particular team member's data may simply not include a secondary script" (`Web:1483`).

**Silent on.**

- **Zero occurrences of "locale", "localisation", "localization", or i18n** in either document.
- **The native app, which is the origin of every one of those strings, has no localisation story at all** — no language setting, no script or direction handling, and a single "Name" input on the team-member form (`:262`). Whether a bilingual name is one field containing both scripts or two separate fields is undefined at the point of entry, which is the only point where it could be decided.
- **Language selection for either app.** No setting exists on the Settings screen, no device-language detection is described, and no default is named.
- **RTL for the owner app.** The requirement is stated only for the web app's team names. The native app renders the same names — in the team onboarding form, and potentially in booking and contact records — with no direction handling mentioned.
- **Translated UI strings or email templates.** The confirmation and cancellation copy is English-only inline text; the Help Center form, the delete-account survey options and the onboarding microcopy are all English literals in the spec.
- **Date, time, number and currency formatting locale** — the same gap that surfaces in sections C and D, here as its root cause.
- **Market incoherence in the sample data.** The native doc uses KES currency and a Kenyan phone number (0701408727); the web doc uses Greek addresses ("Delfon 8, Peristeri."), Greek and Arabic names, and a € price. Nothing states which market v1 targets, and that single choice drives currency, timezone, payment provider and script support simultaneously.
- **Input validation that assumes a locale** — phone number format, address shape, and name character sets are all unvalidated and unspecified.

**Screens that depend on it.** Native: Team Member onboarding (#6) as the sole origin of the bilingual data, Business Branding (#5) for tagline and about text, Contacts (#15) for client names and phone numbers, and all three email templates. Web: Team section, Select professional, Team member profile, Opening times, every price and every timestamp.

---

## K. Everything else the docs lean on without defining

### Platform and stack

- **"Supabase Edge Function" is named once**, in one bullet, on the delete-account survey screen (`:1445`). Nothing else in either document names a database, API style, ORM, migration tool, or host.
- **The frontend framework is implied but never chosen**, and the implications conflict with each other: `navigation.navigate()` / `navigation.goBack()` (React Navigation), `useContacts()` and `setIsLogOutModalOpen()` (React), `BackdropFilter` (Flutter), `navigator.share()` (web).
- **No API contract style, response envelope, error format, pagination convention, or versioning** — all five are items the Project-Scaffolding manual instructs to decide once, up front, so that "every endpoint any feature ever adds should look like it was written by the same person."

### Empty specification slots

Twelve places where the document's template carries a "Backend / System Action" heading with nothing under it. These are not "None" — they are unfilled. Enumerated with line references in `02-backend-capabilities.md`.

### Auth details

- **Password policy contents** — "e.g., min length, character sets" is the entire specification (`:62`).
- **OTP expiry, attempt limits, resend cooldown** (the "30s" is explicitly a guess), and lockout.
- **Session model** — token versus cookie, storage location, refresh, expiry. Logout's server-side effect is a blank bullet.
- **OAuth app registration, scopes, and account linking** when a Google or Facebook email matches an existing password account.
- **Consent.** The Terms of Service and Privacy Policy documents don't exist, aren't versioned, and acceptance isn't recorded, despite sign-up copy asserting agreement ("By proceeding, you agree to the…").

### Product surfaces referenced but never built

- **The publish / "go live" gate** — the highest-leverage unresolved item, since it determines whether every onboarding write is immediately public.
- **Post-onboarding editing** for business profile, team roster, portfolio, and opening hours. None exists; onboarding is the only entry point, and the account menu offers only Profile / My services / Settings / Support.
- **Owner-initiated booking creation, editing, or rescheduling.**
- **Waitlist.** The web app offers "Join waitlist" (5 mentions, `Web:1126`); the native app has none (0 mentions), so no owner surface receives it.
- **Add/Edit Service form; contact detail view; calendar booking-detail sheet; reinstate confirmation step** — all four listed in `01-screen-inventory.md`.

### Data the web app reads and the native app never collects

Four elements attributed to "the mobile app" in the web doc's Data Source Summary tables that appear on no native form:

| Element | Web doc attribution |
|---|---|
| Salon category ("Barber") | rendered at `Web:59`, sourced nowhere |
| Team member role / specialty | "Synced from mobile app (owner assigns roles to team members)" (`Web:619`) |
| Business address as text | "likely also sourced from the mobile app profile (owner-entered address string)" (`Web:726`) |
| Owner's public contact email | "Sourced from mobile app account/profile settings" (`Web:171`) |

The native team-member form has exactly three fields — Name, About, Photo — and the native location step collects only a "Google Maps pin", never an address.

### Model gaps

- **Booking record fields are never enumerated**, and specifically whether a booking stores the selected professional. The web flow makes choosing one an entire step; the owner's card never displays it; the web author notices the orphaned "·" separator where the name should render and flags it (`Web:1218`).
- **Multi-service bookings.** The native card reads "Haircut, Beard — 50 mins. — KES 140" while the web selection is explicitly single-select (`Web:832`).
- **Contact provenance and deduplication** — the two sample contacts share an identical email address and phone number (`:793`–`:798`).
- **The "total spent" ledger** implied by the contact detail description.

### Cross-cutting

- **Analytics** — one speculative bullet (`:1443`), no stack, no other events.
- **Error, loading, empty and offline states** beyond inline toasts, for a mobile client. The Feature-Scaffolding manual names loading/empty/error as the three states "where junior work falls apart"; the design docs specify only the happy path plus toasts.
- **Accessibility** — absent from both documents.
- **Data retention and deletion cascade.** What becomes of bookings, contacts, uploaded images, the live public page, and clients' personal data when an owner deletes their account. The only statement is the checkbox copy: "I know I won't be able to access my client bookings."
- **Support routing.** Where "Send email" delivers. `support@mugu-labs.com` appears only in delete-account copy, never in the Help Center spec.
- **Screen numbering.** The native doc numbers 1, 2, 3, 5, 8, 10, 11, 12 and leaves 4, 6, 7, 9 unassigned, so there is no canonical inventory in the source to check completeness against.

### Two internal contradictions

- **The Settings screen contradicts itself across the document.** Screen 10 says tapping Settings "Loads local/remote app configurations (e.g., notification preferences, currency settings, timezone, security/2FA settings)" (`:973`). The Settings screen as actually specified and screenshotted contains four rows: Change password, Privacy policy, Terms of service, Delete account. None of those four config areas exist anywhere in the app.
- **The Help Center's helper text names a different product.** The extracted text reads "If you have a **Fresha** account, enter the email address you log in with." (`:998`); the screenshot `native-17-untitled.png` reads "If you have a **Bookflow** account…". One of the two is wrong, the author does not flag it, and the README's "PDF is authoritative" rule does not adjudicate a disagreement between the document's prose and its own image.
