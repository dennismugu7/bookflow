# Screen map: which design each screen copies

The images are in `design-ref/` (git-ignored; ask Dennis if missing). **For layout, spacing, sizes, type and copy, the image wins** (ADR 0009). Only the deviations listed below are allowed.

## Client web (`apps/web`), images in `design-ref/original-client/`

| Route / state | Copy from |
| --- | --- |
| `/s/[slug]` hero and info block | `01-salon-hero` |
| Sticky tabs | `02`–`07` (tab bar) |
| Services section | `02-services-tab`, `03-services-team` |
| Team row | `03-services-team`, `04-team-reviews` (team part only) |
| Professional profile sheet | `11-professional-profile` |
| Opening hours | `07-hours-location`, `06-portfolio-hours` (hours part) |
| Location | `07-hours-location` |
| Bottom "Ready for a fresh look?" bar | `01`–`07` |
| Book: select services | `08-select-services`, `09-select-services-selected` |
| Book: select professional | `10-select-professional`, `12-professional-selected` |
| Book: pick a time | no design: reuse the header, cards and bottom bar of `08`/`10` |
| Confirm: salon header and hold banner | `16-confirm-hold-signin` |
| Confirm: sign-in | `docs/design/bookflow-client-signin.png` (header and banner from `16`) |
| Confirm: name and phone | `18-confirm-name` |
| You're all set | `21-booked`, plus the share card from `20-booked-share` |

### Approved deviations (client web)
- No ratings, reviews, review counts, portfolio, photo counter ("1/6"), category line ("Hair stylist"), "Rate this visit" or feedback thumbs: there's no data for them yet (later phases).
- Sign-in uses Google or an email code instead of a phone code (ADR 0007), laid out per `bookflow-client-signin.png`.
- Font: Urbanist (Dennis, 2026-10-03).
- The tagline is plain text (owners type it); the script lettering in `01` is part of that salon's logo artwork.
- The area line ("Kilimani, Nairobi") is derived from the address with `shortArea()`.
- "Pick a time" has no design; follow the patterns above.
- The share card has no feedback row.
- Where an original colour fails WCAG AA text contrast, use the nearest darker shade of the same hue ("Open" #008746, "until" #776dab, greys #707070); the WhatsApp button keeps #25d366 with dark text instead of white (Dennis, 2026-10-03).
- The third section tab is "Hours & location", not "Other" (Dennis, 2026-10-03).
- "Any professional" starts selected on Select professional, unlike `10` (Dennis, 2026-10-03).
- `18` asks for "First name"; the value is stored as the client's `full_name` (Dennis, 2026-10-03).
- The back arrow and × on confirm have no grey square behind them (the shade in `16`/`18` was a mistake); they keep a 44 px tap area with a soft pressed tint (Dennis, 2026-10-03).

### Client web, approved additions (Dennis, 2026-10-04): Phase 3b
Mockups in `docs/design/client-v2/` (fake data):

| Screen | Copy from |
| --- | --- |
| `/me`, My bookings (upcoming) | `client-v2/01-my-bookings.png` |
| `/me`, Past | `client-v2/02-past.png` |
| Cancel sheet | `client-v2/03-cancel-sheet.png` |
| Too late to cancel (under 2 hours) | `client-v2/04-too-late.png` |
| Confirm, returning client | `client-v2/05-returning.png` |
| You're all set (View booking replaces the Get directions button) | `client-v2/06-booked.png` |

Phase 3b deviations (Dennis, 2026-10-04):
- Text black and grey keep the existing tokens (#0d0d0d, #707070), not the mockups' #16131f / #6b6878.
- Booking cards always say "with <stylist>"; "any professional" isn't stored.
- "Pay at the salon. No payment is taken online." also shows for first-time clients on `18`.
- "Confirmed" pill text is #1a7347 (the mockup's #1e7f4f fails AA on its tint).

### Client web, white pages and navigation (Dennis, 2026-10-04)
These override the originals and mockups above:
- Every client page has a plain white background: no grey or tinted page backgrounds or bands (salon sections, booking steps, confirm, the summary on "You're all set", My bookings, the profile sheet). Content that sat on a band is a white card with a 1 px #E7E6EC border and 14 px corners, inside the page margins. All cards (service, professional, date, booking) use that border and radius; the selected state keeps the 2.5 px purple border. The booking steps' bottom bar has a 1 px #E7E6EC top line. The hold banner keeps its yellow-orange gradient (it isn't a page band).
- "Continue with Google" is Google's blue sign-in button: #4285F4, the official multicolour G in a white rounded square on the left, white text, 48 px high, 8 px corners. White on #4285F4 is 3.6:1, below AA for normal text; kept because Google's branding requires it.
- My bookings has a back arrow top left: back to the previous page in this tab, or to the last salon opened in this browser when there's none (the home page if no salon yet).
- "You're all set" has an outline "Browse more services" button under Add to calendar / View booking, opening the salon page.

## Owner app (`apps/owner`), images in `design-ref/original-owner/`

Files are numbered as Dennis made them (`NN-name.png`). The current app on Dennis's phone is in `design-ref/live-owner/` (2026-10-03).

| Screen / state | Copy from |
| --- | --- |
| Splash | `01-splash` |
| Welcome (signed out) | `02-welcome` |
| Sign-in sheet (email) | `05-sign-in`, `03-create-account` (sheet over the purple gradient, layout and buttons) |
| Code entry | `04-enter-code` |
| Create your salon (onboarding) | no design: same sheet style as `03`/`05` |
| Today, no bookings | `12-today-empty`, with the header and tab bar from `12`–`14` |
| Today with bookings, booking card and actions | `13`–`24` (Phase 4) |
| Calendar | `25-calendar-day` (Phase 4; placeholder until then) |
| Clients | `26`–`28` (Phase 4; placeholder until then) |
| Account | `29-account`, `30-account-logout`, `31-logout-confirm` |
| My brand | `44-my-brand-empty`, `45-my-brand` (view), `46-my-brand-edit` |
| My services | `47-services-empty`, `49-services-list`, `48-add-service` |
| My team | `50-team-empty`, `52-team-list`, `51-add-team-member`, `53-team-member-profile` |
| Portfolio | `54`, `55` (Phase 2c) |
| Opening hours | `57-opening-hours` (view), `56-opening-hours-edit` |
| Location | `58-location-edit`, `59-location` (view) |
| Profile, settings, delete account, feedback, help | `32`–`43`, `60`–`62` (later phases) |

### Approved deviations (owner app)
- **Sign-in uses a 6-digit email code, with no passwords** (Phase 2a decision). No password fields, no reset or change-password screens (`06`–`11`, `34`). Google and Facebook buttons are hidden until Google sign-in for owners exists (2c); Facebook is not planned.
- Font: Urbanist (Dennis, 2026-10-03).
- No ratings, review counts or deposits anywhere (no reviews yet; ADR 0004 removed deposits).
- Account rows for features that don't exist yet (Profile, Settings, Share feedback, Support, Portfolio) are hidden, not shown as dead links.
- The Today stat tiles ("Booked / Expected / Gaps") and booking cards come with Phase 4; the empty Today copies `12` without the tiles until then.
- Calendar and Clients stay "Coming soon" until Phase 4.
- The "By proceeding, you agree to the Terms of Service and Privacy Policy" line on `03` is left out until those pages exist (release phase) (Dennis, 2026-10-04).
- Account shows the signed-in email as the name, and its initials in the avatar, until Profile stores an owner name (Dennis, 2026-10-04).
- Splash: only Android's system splash (the B on purple) shows, until the app knows the first screen; there's no second full-screen `01` stage (Dennis, 2026-10-04).
- Location shows a real map from 0.4.0 (Dennis, 2026-10-04): Google's embed, with our drawn map while it loads or when offline; tapping it opens Google Maps.
- Kept for existing behaviour (Dennis, 2026-10-04): the "Working alone? Add me as a team member" link on My team; Booking link (share, Live badge) and Unpublish salon under Account "General"; duration chips 20/30/45/60/90 + Custom as in `48` (15 min via Custom).

### Approved redesigns (Dennis, 2026-10-04): these replace the originals
Mockups in `docs/design/owner-v2/` (fake data). For these screens, copy the mockup, not the original image:

| Screen | Copy from |
| --- | --- |
| My brand (one screen, banner + overlapping logo) | `owner-v2/01-my-brand.png` |
| My services / Add a service | `owner-v2/02-services.png`, `owner-v2/03-add-service.png` |
| My team | `owner-v2/04-team.png` |
| Opening hours (day list, tap a day to edit) | `owner-v2/05-hours.png` |
| Location (no pin / pin set) | `owner-v2/06-location-no-pin.png`, `owner-v2/07-location-pin.png` |
| Menu tab (was Account) | `owner-v2/08-menu.png` |
| Today, no bookings | `owner-v2/09-today-options.png`, option **A** |
| Welcome (gradient + animation) | `owner-v2/10-welcome-frames.png`, `10-welcome-animation.mp4`, `10-welcome-animation.html` |

Welcome animation plays once, then holds the last frame. Dennis, 2026-10-04.

Everywhere in the owner app: white pages without framed view cards, a fixed top bar with a back arrow, a grey field outline at rest that turns blue while typing, and one blue round add button.

### Phase 4a, Today with bookings (Dennis, 2026-10-04): replaces originals 13 to 19
Mockups in `docs/design/owner-v3/` (fake data), adapted from originals 13 to 19 without deposits:

| Screen | Copy from |
| --- | --- |
| Today with bookings, gaps and stats | `owner-v3/01-today.png` |
| Booking opened (Call, WhatsApp, actions) | `owner-v3/02-booking-open.png` |
| Cancel sheet | `owner-v3/03-cancel.png` |
| No-show sheet | `owner-v3/04-no-show.png` |
| New booking (walk-in or phone) | `owner-v3/05-add-booking.png` |

Phase 4a deviations (Dennis, 2026-10-04):
- The "Share your booking link" pill stays at the end of the Today list, under the last booking or gap.
- Call and WhatsApp use real phone and WhatsApp icons, not the ✆ / ◎ glyphs in `02`.
- Sheet copy says "their" instead of "her" (`03`, `04`): clients can be anyone.
- "… will see it as cancelled in their bookings." shows only for web bookings; walk-ins have no account to see it. "This can't be undone." always shows.
- "Phone not verified" is hidden when the client has no phone (walk-ins).

### Phase 4b/4c, Calendar and Clients (Dennis, 2026-10-04): replaces originals 25 to 28
Mockups in `docs/design/owner-v4/` (fake data), adapted from originals 25 to 28 without deposits or ratings:

| Screen | Copy from |
| --- | --- |
| Calendar, Day (a column per team member) | `owner-v4/01-calendar-day.png` |
| Calendar, Week | `owner-v4/02-calendar-week.png` |
| Clients, empty | `owner-v4/03-clients-empty.png` |
| Clients list (search and segments) | `owner-v4/04-clients-list.png` |
| Client profile (stats, notes, past visits) | `owner-v4/05-client-profile.png` |

### Release 0.5.0, Google sign-in and notifications (Dennis, 2026-10-04)
Mockups in `docs/design/owner-v5/` (fake data). Sign in and Create account keep original 05's sheet and add Google's official button:

| Screen | Copy from |
| --- | --- |
| Sign in (Google + email code) | `owner-v5/01-sign-in.png` |
| Create account (with Terms and Privacy line) | `owner-v5/02-create-account.png` |
| Turn on notifications (shown once) | `owner-v5/03-allow-notifications.png` |
| Android notifications (content and tap target) | `owner-v5/04-notifications.png` |
| Menu → Notifications switches | `owner-v5/05-notification-settings.png` |

Release 0.5.0 deviations (Dennis, 2026-10-04):
- Menu → Notifications uses the shared owner top bar (arrow, title and height as on every other owner screen), not the tighter bar drawn in `05`.
- The code screen (original `04`) sits on the same light-blue background and wordmark as Sign in (`01`), instead of the purple gradient. Its content is unchanged.

### Release 0.5.1, salon photos and sharing (Dennis, 2026-10-05)
Mockups in `docs/design/owner-v6/` (plain colours stand in for photos):

| Screen | Copy from |
| --- | --- |
| My brand with Salon photos (up to 6, first is the banner) | `owner-v6/01-my-brand-photos.png` |
| Menu → Booking link sheet (message + Share) | `owner-v6/02-share-link.png` |
| WhatsApp link preview (share image, message, link) | `owner-v6/03-whatsapp-preview.png` |
| Client salon page photo slider (original 01's 1/6 counter) | `owner-v6/04-salon-page-photos.png` |
| Day view one-line short blocks; blue main buttons | `owner-v6/05-small-fixes.png` |

Approved change (Dennis, 2026-10-05): primary filled buttons are the app blue `#1E7BF2`, not black.
