Bookflow — Style Reference Document
This document distills the visual language used across the current Bookflow app screens
(splash, auth, onboarding, dashboard, and profile) so a designer can extend the app's look and
feel consistently onto a web page or new screens.




1. Brand Feel
Bookflow reads as friendly, modern, and trustworthy — a consumer-facing scheduling tool
aimed at small service businesses (the sample data leans salon/barber). The palette pairs a
moody indigo/purple "hero" tone for branding moments (splash, sign-up entry, profile banner)
with clean white surfaces for functional/task screens (forms, bookings, contacts). The overall
impression is soft and rounded rather than sharp or corporate — generous corner radii,
pill-shaped controls, and light drop shadows throughout.




2. Color Palette
Primary brand color — Deep Indigo/Violet Used on the splash screen, the entry/auth landing
screen, and the profile banner. It appears as a soft radial or diagonal gradient rather than a flat
fill, moving between a deep blue-violet (roughly #2B1B7A–#3A2A9E) and a brighter
periwinkle-violet (roughly #5A3FD1–#6C4FE0). This gradient is the app's signature "hero"
background and should be reserved for brand/marketing moments, not everyday functional
screens.

Accent green — CTA color A bright, saturated mint/emerald green (roughly
#3DD68C–#4CD98F) is used exclusively for the single highest-priority action on a screen: the
"Create for free" button. It sits on the indigo background and is the most visually loud element in
the app, so it should stay rare and reserved for primary conversion actions.

Accent blue — interactive/system color A clean, mid-saturation blue (roughly
#1E7CF2–#2F80ED) is used for: primary buttons on white screens (e.g., "Verify"), input-field
focus outlines, all inline text links ("Resend," "booking link," "Confirm booking?," "Check
payment," "Confirmation message," "Terms of Service," "Privacy Policy"), and the selected date
indicator on the calendar. This blue functions as the "action/interactive" color on white
backgrounds, distinct from the green CTA color used only on the hero screens.

Neutral backgrounds
   ●​ Pure white (#FFFFFF) for all form and content screens.
   ●​ A very pale sky-blue-to-white gradient wash sits behind the Bookings/Contacts/Calendar
      dashboard header, giving those screens a slightly softer, airier feel than plain white.
   ●​ Light gray (#F4F5F7–#F7F8FA) is used for secondary surfaces such as the calendar
      month-grid panel and the upload/drop-zone box.

Neutral text & borders

   ●​ Primary text/headings: near-black charcoal (#1A1A1A–#222222).
   ●​ Secondary/body text: medium gray (#6B7280–#8A8F98).
   ●​ Placeholder text inside inputs: light gray (#A9AEB8).
   ●​ Borders on cards and inputs: pale gray-blue (#D6E0F0–#E2E8F0), thin (1px) hairlines.

Status / badge color The "Booked" pill uses a neutral off-white/light-gray fill with a thin gray
border and dark text — a deliberately low-key, non-alarming status treatment rather than a bold
color, reserving color emphasis for the CTA and link states.

Avatar color User initials avatars ("XX") use a saturated grass/lime green circle (roughly
#5FBF3F–#6FCB45) with white bold lettering — a distinct third green tone from the CTA mint
green, used specifically for identity/profile markers.




3. Typography
Wordmark / Logo "Bookflow" is set in a rounded, geometric, extra-bold sans-serif (a
rounded-terminal display face, similar in spirit to Poppins ExtraBold or Baloo) in white, used
large on the splash and landing screens and smaller in the top navigation.

Tagline The tagline "Ready, set, book" uses a lighter-weight italic serif or humanist italic, in a
soft lavender-white — a deliberate contrast to the bold, upright wordmark, giving the brand a
"confident but friendly" pairing of a heavy display face with a light script-like accent.

Headings (in-app, e.g., "Create your Bookflow," "Let's give your business its own
identity") A clean, rounded-neutral sans-serif (system-UI style, e.g., similar to SF Pro / Inter),
medium-to-regular weight, centered on onboarding/auth screens, sentence case.

Body copy / helper text Same sans-serif family, regular weight, gray, comfortably sized
(roughly 14–16px equivalent), generous line height, centered on onboarding screens and
left-aligned within cards elsewhere.

Labels (form field labels like "Business name," "Enter email:") Same sans-serif, slightly
bolder or same weight as body but often bold for field labels on the business-identity screen,
regular weight for the simpler auth screens.
Data emphasis (prices, names) Bold weight is used to emphasize key data points inside cards
— e.g., service price ("KES 140") and contact/customer names are bolded against otherwise
regular-weight surrounding text.

Italic secondary data Email addresses throughout the app (in contact cards and booking
details) are consistently styled in italic, distinguishing them from names and phone numbers,
which are set in regular weight.

Overall type scale There's a fairly restrained hierarchy: one large display size for the
wordmark/marketing headlines, one mid-size for screen titles, and one body size used for
almost everything else, with bold/italic doing most of the work to create emphasis rather than
many distinct sizes.




4. Buttons
Primary hero CTA (green) Full-width or wide pill shape, fully rounded ends (radius ≈ half the
button height), solid mint-green fill, bold white centered label, no border, subtle shadow lift.
Reserved for the single most important action on a branded/marketing screen.

Primary functional CTA (blue) Full-width pill/rounded-rectangle (large radius, ~24–28px), solid
blue fill, bold white centered label. Used on white functional screens for the main forward action
("Verify," "Save").

Secondary/text actions No fill, no border — just colored text (blue for interactive links, gray for
neutral secondary actions like "Sign in" or "Back to sign in"). Centered under the primary button.
Underlines are not used; color alone signals interactivity.

Social login buttons Small square-ish buttons with soft rounded corners, thin light-gray border,
white fill, centered brand icon (Google "G," Facebook "f"), no visible text label — purely icon
buttons, placed side by side.

Segmented/tab navigation "Bookings / Contacts / Calendar" is rendered as three separate
pill-shaped outline buttons in a row rather than a single connected tab bar. The active tab gets a
solid black/dark outline and bold text; inactive tabs use a thin light-gray outline and gray/regular
text.




5. Form Inputs
Rounded-rectangle text fields (corner radius ≈ 8–10px) with a thin, light blue-gray border at rest
that appears to intensify to full blue on focus. Comfortable internal padding, gray placeholder
text, and roughly 44–48px height for good tap targets. The password field includes a
right-aligned eye icon toggle for show/hide. Fields are stacked vertically with a visible text label
above each one on more complex forms (business identity screen) but rely on placeholder-only
labeling on the simpler auth screens.

Upload/drop zone A larger rounded-rectangle box with a thin gray border, centered
cloud-upload icon, and centered gray helper label ("Upload image") — visually consistent with
the input-field styling but taller and dashed/soft in emphasis to signal a drop target rather than a
text field.




6. Cards & Containers
Cards (bookings, contacts) are white rounded rectangles (radius ≈ 12–16px) with a very thin
light-gray border and a soft, barely-there drop shadow — enough to lift them off the pale
background without feeling heavy. Internal padding is generous. Cards are collapsible: a small
chevron toggle at the bottom-center expands a card to reveal more detail (date, booking
timestamp, customer info, and inline blue action links), and rotates/flips when expanded.

Bottom-sheet / modal panels Auth and onboarding screens are presented as a white
rounded-top "sheet" rising over the indigo hero background, with a small horizontal gray
"grabber" bar at the top center and a back-arrow icon at the top-left — a mobile bottom-sheet
pattern that could translate to a centered modal or side panel on web.




7. Icons & Avatars
Icons throughout (profile, services, settings, support, upload, chevrons, back arrow) are simple,
single-weight line icons — minimal, rounded-stroke, monochrome (black or dark gray), no fills.
Avatars are perfect circles with a solid green fill and bold white two-letter initials, used
consistently in the top-right of dashboard screens and enlarged on the profile page.




8. Imagery
Two distinct image treatments appear:

   ●​ A soft, glowing, abstract purple/violet gradient texture behind brand moments (splash,
      landing, profile banner) — dreamy, out-of-focus, tech-adjacent (the profile banner even
      integrates faint circuit-line/bubble motifs).
   ●​ A simple, flat, light-blue line illustration (calendar/document motif) for the empty-state
      graphic on the Bookings screen — friendly and uncluttered, using only 2–3 tints of blue.




9. Layout & Spacing Principles
   ●​ Generous whitespace and centered alignment dominate onboarding and auth flows.
   ●​ List/card-based screens (Bookings, Contacts) left-align content within full-width cards
      with consistent vertical spacing between cards.
   ●​ Corner radii scale with element size: small tight radii on tab pills and social buttons,
      medium radii on inputs and small cards, large radii on primary buttons and the
      bottom-sheet panel — but everything is rounded, never sharp-cornered.
   ●​ A consistent top navigation pattern persists across the dashboard: three tab pills on the
      left, a circular avatar on the right, sitting just below a light gradient header strip.




10. Suggested Web Translation Notes
For a web page extending this system: keep the indigo gradient hero for landing/marketing
sections and the green CTA reserved for the primary conversion button (e.g., "Sign up free");
use the blue for all secondary interactive elements (links, form focus states, secondary buttons);
maintain the rounded, pill-first shape language across buttons and nav; and preserve the italic
treatment for email/secondary metadata and bold treatment for names/prices to keep
information hierarchy consistent with the mobile app.
