> Derived analysis, not source. `docs/source/` is authoritative; where this file and the source disagree, the source wins.

# Screens in the native app (document order)

The document's own numbering is incomplete and inconsistent — it labels "Screen 1, 2, 3, 5, 8, 10, 11, 12" and leaves every other screen unnumbered, so there is no canonical inventory in the source. The numbering below is this analysis's own, following document order in `docs/source/DD-Bookflow-Native.md`.

| # | Screen (as the document names it) | Purpose | Screenshot |
|---|---|---|---|
| 1 | Screen 1: Splash screen | Branded launch screen; auto-advances to the auth gateway | `native-00-screen-1-splash-screen.png` |
| 2 | Screen 2: Welcome / Authentication Gateway | Fork between "Create for free" and "Sign in" | `native-01-screen-2-welcome-authentication-gateway-screen.png` |
| 3 | Screen 3: Account Creation / Sign-up Modal | Email+password registration sheet with Google/Facebook social sign-up | `native-02-screen-3-account-creation-sign-up-modal.png` |
| 4 | Email Verification — "Enter your code" | Enter the 8-digit emailed code to activate the new account | `native-03-email-verification-enter-your-code.png` |
| 5 | Business Branding Onboarding | Capture business name, tagline, about, banner — the client-facing identity | `native-04-business-branding-onboarding-let-s-give-your.png` |
| 6 | Team Member Onboarding | Add a staff member's name, bio and photo for the client-facing roster | `native-05-team-member-onboarding-let-s-put-some-faces-to-the.png` |
| 7 | Portfolio Onboarding | Upload work-sample images for the client-facing gallery | `native-06-portfolio-onboarding-let-s-show-off-your-best-work.png` |
| 8 | Opening Hours & Location Onboarding | Set the weekly schedule (required) and a Google Maps pin (optional) | `native-07-opening-hours-location-onboarding-let-s-set-your.png` |
| 9 | Login Modal | Existing-user sign-in, with "Forgot password?" and social login | `native-08-login-modal.png` |
| 10 | *(no section of its own)* "Please verify your identity" | Password-reset step: enter the emailed code to prove identity | `native-09-submitted-on-the-next-screen-a-code-to-verify-their-ide.png` |
| 11 | *(no section of its own)* "Reset your password" | Password-reset step: enter and confirm the new password | `native-10-the-loading-spinner-turns-as-the-new-password-gets-stor.png` |
| 12 | Screen 5: Dashboard / Main Bookings View | Bookings/Contacts/Calendar shell; zero-bookings empty state with share-your-link CTA | `native-11-screen-5-dashboard-main-bookings-view.png` |
| 13 | Bookings Dashboard — "Bookings" tab (collapsed & expanded) | The booking list; expand a card to see client details, payment proof, confirm/cancel; filter by Booked/Confirmed/Cancelled | `native-12-bookings-dashboard-bookings-tab-collapsed.png` (collapsed), `native-13-bookings-dashboard-bookings-tab-collapsed.png` (expanded) |
| 14 | Cancel Confirmation Dialog | Second-tap guard before a cancellation is finalised | **none** |
| 15 | Screen 8: Contacts Directory View | Scrollable list of client contacts with tap-to-mail / tap-to-dial | `native-14-here-is-the-detailed-ui-front-end-and-back-end-breakdow.png` |
| 16 | Calendar Tab — Booking Schedule View | Mini month picker + hourly week grid showing bookings as time blocks | `native-15-calendar-tab-booking-schedule-view.png` |
| 17 | Screen 10: User Profile & Account Menu | Account hub: Profile / My services / Settings / Support / Log out | `native-16-here-is-the-detailed-ui-front-end-and-back-end-breakdow.png` |
| 18 | Help Center — Contact / Support Request Form | Submit a support request with email, description (2000 chars) and screenshot attachments | `native-17-untitled.png` (top), `native-18-help-center-contact-support-request-form.png` (bottom) |
| 19 | Screen 11: Log Out Confirmation Modal | Confirm sign-out of the named account | `native-19-here-is-the-detailed-ui-front-end-and-back-end-breakdow.png` |
| 20 | Screen 12: My Profile Details | Read-only personal account card (first/last name, email, avatar) with an Edit toggle | `native-20-here-is-the-detailed-ui-front-end-and-back-end-breakdow.png` |
| 21 | My Services — Empty State | Zero-state of the bookable service menu, with a "+" FAB | `native-21-my-services-empty-state.png` |
| 22 | "UI & Functional Specification" — My Services, populated | The service list once populated: name / duration / price cards with per-card edit | `native-22-ui-functional-specification.png` |
| 23 | Settings Screen | Change password, Privacy policy, Terms of service, Delete account | `native-23-settings-screen.png` |
| 24 | Change Password Screen | Current + new + confirm password, with a reset fallback link | `native-24-change-password-screen.png` |
| 25 | Delete Account — Exit Survey | Retention off-ramp: support contact plus a single-select reason for leaving | `native-25-delete-account-exit-survey-screen.png` |
| 26 | Delete Account — Final Confirmation | Gate-checkbox acknowledgement before the irreversible delete | `native-26-delete-account-final-confirmation-screen.png` |
| 27 | Account Deletion — Success Confirmation | Terminal state confirming deletion; no back navigation | `native-27-account-deletion-success-confirmation-screen.png` |

All screenshots live in `docs/designs/native/`.

## Filename notes

Consistent with the README's warning that filenames are approximate and derived from the nearest heading:

- `native-17-untitled.png` is actually the **top** of the Help Center page; `native-18-help-center-contact-support-request-form.png` is its **continuation** (upload zone → constraints → submit → footer).
- `native-16`, `native-19` and `native-20` all carry the same `here-is-the-detailed-ui-front-end-and-back-end-breakdow` stem but are three different screens — Profile & Account Menu, Log Out Confirmation Modal, and My Profile Details respectively. The stem comes from the recurring sentence "Here is the detailed UI, front-end, and back-end breakdown for the … screen:" that precedes each.
- `native-12` and `native-13` share the stem `bookings-dashboard-bookings-tab-collapsed`, but `native-13` shows the **expanded** card state.

## Screens referenced but never specified

Named in the document, with no section of their own and no screenshot:

- **The "Add service" / "Edit Service" form sheet.** Referenced from My Services empty state ("Opens an 'Add service' form/sheet — likely capturing fields such as service name, description, duration, price, and possibly a category or which team member(s) can perform it", `DD-Bookflow-Native.md:1168`) and from the populated list ("Opens an 'Edit Service' modal sheet pre-filled with the selected card's current values", `:1243`; "Opens an 'Add New Service' form modal sheet", `:1248`). Fields, validation and backend behaviour are guessed at, never specified.
- **The contact detail view at `/contacts/:contact_id`.** Reached by tapping a contact card, "showing appointment history, total spent, notes, etc." (`:810`), with the backend action given only as "Router push to /contacts/:contact_id" (`:812`).
- **The booking detail popover/sheet opened from a calendar block.** "Likely expands or opens a detail popover/sheet showing the booking's service, client name, time, and status" (`:906`).
- **A confirmation step for "Reinstate booking?"** — "likely also benefits from its own lightweight confirmation step given it re-activates a booking the client was already told was cancelled" (`:761`).

## Screens implied by the two password flows

Screens 10 and 11 above (`native-09`, `native-10`) exist as screenshots but have no section of their own. They are described only inside the Login Modal's "D. Tap 'Forgot password?' Link" bullet (`:544`–`:555`), in prose that is itself unfinished — see `03-flagged-ambiguities.md`.
