> Derived analysis, not source. `docs/source/` is authoritative; where this file and the source disagree, the source wins.

# Distinct backend capabilities required by the native app

Deduplicated from every "Backend / System Action" entry in `docs/source/DD-Bookflow-Native.md`. Entries the document explicitly marks as "None (pure UI)" or as router-only navigation are excluded; OS-level deep links (`mailto:`, `tel:`) are excluded as client-side.

## Identity & authentication

1. **App-launch initialisation process** (splash). "Invokes an initialization process" — content unspecified.
2. **Email + password registration.** `201 Created` returning auth token / verification status; `409 Conflict` for a duplicate email; `400 Bad Request` for password-policy failure.
3. **Verification-code issuance and email delivery** — an 8-digit code sent to the registering address.
4. **Persistence of a pending / unverified account state** server-side.
5. **Account-activation endpoint** — validate the submitted code, mark the account verified, handle invalid and expired codes distinctly.
6. **Resend verification code** — issues a new code and invalidates the previous one.
7. **Credential login** — `200 OK` with session/token; `401 Unauthorized`; `404 Not Found`.
8. **Social OAuth (Google, Facebook)** via provider SDK, plus a backend exchange that issues session token/cookies.
9. **Password-reset request endpoint** — emails an identity-verification code / reset link.
10. **Password-reset code verification.**
11. **Persist the new password** at the end of the reset flow.
12. **Change-password endpoint** that re-authenticates with the current password before updating (`200` / `401` / `400`).
13. **Session issuance and logout / session invalidation.** The document's "API Call:" bullet for logout is left blank.

## Business content the client webapp consumes

14. **Create/update the business profile record** — name, tagline, about, banner.
15. **Sanitisation and max-length enforcement** on text destined for a public page ("stripping scripts/HTML, enforcing a max length").
16. **Image upload into publicly-readable, CDN-backed storage** — business banner, team photos, portfolio images, profile avatar.
17. **Image processing** — resizing/compression for web display, with higher fidelity called out for portfolio work.
18. **Team-member record create/update**, associated with the business profile.
19. **Portfolio image collection** associated with the business.
20. **Weekly opening-hours persistence** — explicitly "the source of truth the client webapp uses to show availability and determine bookable time slots".
21. **Location-pin persistence** — a Maps URL, or captured latitude/longitude if pin-drop.
22. **A publish / "goes live" gate** controlling when profile data becomes client-visible. *Flagged unresolved by the author.*
23. **Service catalogue create/update**, associated with the business profile, surfaced to clients as bookable options.

## Bookings

24. **Generate and serve a unique per-business booking link** for sharing. The document's "Hook/API Call:" bullet is left blank; only "Copies the unique string to the device clipboard" is stated.
25. **Fetch the booking data set** for the selected top-level tab.
26. **Fetch/filter bookings by status** (Booked / Confirmed / Cancelled) — "Fetches (or filters locally from)" leaves server-side vs client-side undecided.
27. **Booking status transitions** — → confirmed, → cancelled, and cancelled → booked-or-confirmed (reinstate).
28. **Outbound transactional email to clients** on confirm, on cancel, and on reinstate. The first two templates are written out in full; the third is "exact copy to be defined".
29. **Store and retrieve the client-uploaded proof-of-payment file**, associated with a specific booking record.
30. **Fetch bookings by date range for the calendar** — month, week, and day ranges — with caching of already-fetched ranges.
31. **Fetch a full booking record** for a single calendar block.
32. **Near-real-time propagation of client-webapp bookings** into the owner's calendar. *Flagged unresolved by the author.*

## Clients / contacts

33. **Return an array of contact objects** for the Contacts list (the document names a `useContacts()` hook as the consumer).
34. **Fetch a single contact by id** — including appointment history, total spent, and notes.

## Account, settings, support

35. **Read/update the personal user profile** — first name, last name, email, avatar.
36. **Load app configuration** — "notification preferences, currency settings, timezone, security/2FA settings".
37. **Serve static legal content** — Terms of Service and Privacy Policy, from a content endpoint.
38. **Support-request submission** — email + description + attachments as multipart/form-data, with `200/202`, `400`, and `413/415` handling.
39. **Log the selected account-deletion reason** as an analytics / product-feedback event.
40. **Account deletion** — named once as "the delete-own-account **Supabase Edge Function**", elsewhere as "the account-deletion endpoint" — plus session clearing and cached-user-data clearing.

## Specification slots left empty

Places where the document's template carries a "Backend / System Action" heading with nothing under it. These are not "None" — they are unfilled:

| Screen | Bullet | File:line |
|---|---|---|
| Sign-up modal | "○ API Call" (create account) — no endpoint, payload or shape | `DD-Bookflow-Native.md:74` |
| Sign-up modal | "○ API Call" (social login) | `:89` |
| Dashboard / share booking link | "○ Hook/API Call:" | `:617` |
| Profile & Account Menu | initial load — "Backend / System Action:" | `:960` |
| Profile & Account Menu | Log out — "API Call:" and "Local Storage Action:" | `:984`, `:985` |
| Log Out Confirmation Modal | tap Confirm — no Backend / System Action bullet at all | `:1086` |
| My Profile Details | initial load — "Backend / System Action:" | `:1116` |
| My Profile Details | "E. Saving Editable Fields" — Frontend Action only; section and screen end mid-item | `:1131` |
| My Services (populated) | initial load — "Backend / System:" with an empty "○" | `:1238` |
| My Services (populated) | tap pencil edit — trailing empty "●" | `:1245` |
| My Services (populated) | tap FAB — trailing empty "●" | `:1250` |
| Settings | delete account — trailing empty "●" | `:1315` |
