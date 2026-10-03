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
- No ratings, reviews, review counts, portfolio, photo counter ("1/6"), category line ("Hair stylist"), "View booking", "Rate this visit" or feedback thumbs: there's no data for them yet (later phases).
- Sign-in uses Google or an email code instead of a phone code (ADR 0007), laid out per `bookflow-client-signin.png`.
- Font: Urbanist (Dennis, 2026-10-03).
- The tagline is plain text (owners type it); the script lettering in `01` is part of that salon's logo artwork.
- The area line ("Kilimani, Nairobi") is derived from the address with `shortArea()`.
- "Pick a time" has no design; follow the patterns above.
- The share card has no feedback row.
- Where an original colour fails WCAG AA text contrast, use the nearest darker shade of the same hue ("Open" #008746, "until" #776dab, greys #707070); the WhatsApp button keeps #25d366 with dark text instead of white (Dennis, 2026-10-03).
- The third section tab is "Hours & location", not "Other" (Dennis, 2026-10-03).
- "Any professional" starts selected on Select professional, unlike `10` (Dennis, 2026-10-03).
- No "Returning clients skip this" footnote on `18` until returning clients really skip that step (phase 3b) (Dennis, 2026-10-03).
- `18` asks for "First name"; the value is stored as the client's `full_name` (Dennis, 2026-10-03).
- On "You're all set", "Get directions" takes the black button slot until "View booking" exists (phase 3b) (Dennis, 2026-10-03).

## Owner app (`apps/owner`), images in `design-ref/original-owner/`
To be added before the next owner UI task.
