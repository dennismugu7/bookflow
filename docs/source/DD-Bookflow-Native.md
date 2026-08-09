## Screen 1: Splash screen
### 1. UI Elements (What the User Sees)
 * **Background:** Deep purple gradient background.
 * **Header/Logo:** Bold white brand logo text reading **"Bookflow"**.
 * **Tagline:** Italicized white subtext reading *"Ready, set, book"*.
### 2. User Interactions & Action Flows
 * **Passive View:** This screen serves as an introductory splash screen.
 * **Auto-timer / Tap:**
   * **Frontend Action:** Navigates/fades automatically (or on screen tap) to Screen 2 (Welcome
/ Onboarding screen).
   * **Backend / System Action:**
     * Invokes an initialization process.
## Screen 2 : Welcome / Authentication Gateway Screen
### 1. UI Elements (What the User Sees)
 * **Background:** Deep purple gradient background matching Screen 1.
 * **Logo:** Centered white **"Bookflow"** title.
 * **Buttons:**
   * **"Create for free"**: Bright green, rounded filled CTA button with white text.
   * **"Sign in"**: White text link/button directly beneath the primary CTA.
### 2. User Interactions & Action Flows
#### A. Tap "Create for free" Button
 * **Frontend Action:** Opens the registration modal sheet (Screen 3) or navigates to the
sign-up flow.
 * **Backend / System Action:** No immediate external API call required; triggers a local router
state transition
#### B. Tap "Sign in" Button
 * **Frontend Action:** Navigates to the existing user login screen/modal.
 * **Backend / System Action:** Router transition to the sign-in state.
Screen 3: Account Creation / Sign-up Modal
1. UI Elements (What the User Sees)

   ●​   Sheet Interface: Slide-up bottom sheet with a grab handle indicator centered at the top.
   ●​   Navigation: Back arrow icon (←) at the top-left corner.
   ●​   Title: Bold header reading "Create your Bookflow".
   ●​   Form Fields:
            ○​ Email Label & Field: "Enter email:" label above a text input with placeholder
                address@mail.com.
          ○​ Password Field: Input field with placeholder Password and a trailing password
             visibility toggle icon (slashed eye).
   ●​ Social Authentication Options:
          ○​ Section label: "Create using social login"
          ○​ Two rounded icon buttons: Google and Facebook.
   ●​ Legal Disclaimer: Text ("By proceeding, you agree to the...") with hyperlinks for "Terms
      of Service" and "Privacy Policy".
   ●​ CTA Button: Full-width bright blue primary button at the bottom reading "Create for
      free".

2. User Interactions & Action Flows

A. Tap Back Arrow (←) or Drag Down Handle

   ●​ Frontend Action: Dismisses the bottom sheet with a slide-down animation and returns
      to the previous view.
   ●​ Backend / System Action: Clears temporary form state and cancels pending input
      hooks.

B. Tap Email & Password Fields / Enter Details

   ●​ Frontend Action: Displays soft keyboard, highlights active input focus, updates
      component state, and masks password characters by default.
   ●​ Backend / System Action: Runs client-side validation for email formatting and
      password strength requirements (e.g., min length, character sets).

C. Tap Eye Icon in Password Field

   ●​ Frontend Action: Toggles password visibility from obscured to plain text and updates
      the eye icon state.
   ●​ Backend / System Action: None (pure UI visual toggle state).

D. Tap "Create for free" Button
   ●​ Frontend Action: Disables input fields, renders an inline spinner on the CTA button, and
      prevents duplicate submissions.
   ●​ Backend / System Action:
         ○​ API Call
         ○​ Response Handling:
                ■​ Success (201 Created): Receives auth token/verification status and
                     routes user to email confirmation/OTP or onboarding.
                ■​ Failure (409 Conflict): Displays inline error/toast ("Email already
                     registered").
                ■​ Failure (400 Bad Request): Displays password constraint validation
                     errors below the field.

E. Tap Social Login Icons (Google / Facebook)

   ●​ Frontend Action: Opens the native OAuth authentication prompt for the selected
      provider.
   ●​ Backend / System Action:
         ○​ Authenticates via provider SDK
         ○​ API Call
         ○​ Issues session token/cookies and routes user to main dashboard.

F. Tap "Terms of Service" or "Privacy Policy" Links

   ●​ Frontend Action: Opens webview overlay or launches external browser with policy
      documentation.
   ●​ Backend / System Action: Fetches static content endpoint
Email Verification — "Enter your code"
1. UI Elements (What the User Sees)

   ●​ Sheet Interface: Slide-up bottom sheet with a grab handle indicator centered at the top,
      consistent with the sign-up/login sheet pattern.
   ●​ Navigation: Back arrow icon (←) at the top-left corner.
   ●​ Title: Centered heading "Enter your code".
   ●​ Context Message: Left-aligned body text confirming delivery — "We sent a 8-digit code
      to dennismugu7@gmail.com. Enter it below to activate your account."
   ●​ Form Field:
          ○​ Verification code Label & Field: Label above a single bordered text input
              (currently empty, shown in active/focused blue-border state) — a single wide field
              rather than the segmented per-digit box pattern common in OTP UIs.
   ●​ CTA Button: Full-width solid blue button reading "Verify".
   ●​ Secondary Actions:
          ○​ Centered text "Didn't get a code? " followed by inline blue hyperlink "Resend".
          ○​ Below that, a separate centered plain-text (non-button-styled) link "Back to sign
              in".

2. Layout Notes

This continues directly from the "Create your Bookflow" sign-up sheet reviewed earlier — the
flow is: sign-up form → this OTP verification screen → account activation. Notably, the code
input is a single free-text field rather than 8 individual boxes (one per digit), which is a simpler
but less guided input pattern than typical OTP screens — worth confirming this is intentional
given it's an 8-digit code (longer than the typical 4-6 digit OTP, making a single field more
error-prone for the user to track digit count).

3. User Interactions & Action Flows

A. Tap Back Arrow (←)

   ●​ Frontend Action: Returns to the previous screen (likely the sign-up sheet), dismissing
      this step.
   ●​ Backend / System Action: Clears the in-progress verification state; the pending
      unverified account likely remains in a "pending" state server-side.

B. Tap & Type in "Verification code" Field

   ●​ Frontend Action: Displays soft keyboard (likely numeric keypad given digit-only input),
      highlights focus state (already shown active here), updates component state as digits
      are entered.
   ●​ Backend / System Action: Possibly client-side validation for exactly 8 numeric characters
      before enabling "Verify".

C. Tap "Verify"

   ●​ Frontend Action: Disables input and button, renders inline spinner, prevents duplicate
      submissions.
   ●​ Backend / System Action:
         ○​ API call submitting the entered code for validation against the account-activation
             endpoint.
         ○​ Response Handling:
                ■​ Success: Marks account as verified/activated, routes user into the app
                    (onboarding or main dashboard).
                ■​ Failure (invalid/expired code): Inline error below the field (e.g., "Incorrect
                    code, please try again" or "This code has expired, request a new one").

D. Tap "Resend"

   ●​ Frontend Action: Likely disables the link temporarily and shows a cooldown state (e.g.,
      "Resend in 30s") to prevent spam-triggering new codes.
   ●​ Backend / System Action: Triggers a new verification-code-send request to the same
      email address; invalidates the previous code.

E. Tap "Back to sign in"

   ●​ Frontend Action: Exits the verification flow entirely and navigates to the Login sheet.
   ●​ Backend / System Action: None directly — though this implies the user is abandoning
      activation of the account they just created, which may leave it in an unverified/pending
      state.
Business Branding Onboarding — "Let's give your
business its own identity"
1. UI Elements (What the User Sees)

   ●​ Sheet Interface: Slide-up bottom sheet with a grab handle indicator centered at the top.
   ●​ Navigation: Back arrow icon (←) at the top-left corner.

                      ✨
   ●​ Title: Two-line centered heading "Let's give your business its own identity" with a trailing
      sparkle emoji ( ).
   ●​ Body Copy: Centered gray descriptive text — "This is what your clients will see first
      when they book with you — let's make a great first impression!" — this line explicitly
      confirms the data entered here is destined for the client-facing booking webapp.
   ●​ Form Fields (four total, one required, three optional):
          ○​ Business name (required, no "(optional)" tag) — bordered input, placeholder
              "What should we call your establishment?"
          ○​ Business Tagline (optional) — label with inline gray "(optional)" tag, bordered
              input, placeholder "Your business, in a nutshell".
          ○​ About (optional) — label with inline gray "(optional)" tag, bordered input,
              placeholder "Tell your story".
          ○​ Business banner (optional) — label with inline gray "(optional)" tag, bordered
              rounded upload button with cloud-upload icon and text "Upload image".
   ●​ CTA Button: Pill-shaped, blue, compact button reading "Next" with trailing chevron (›).

2. Layout Notes

This screen is the salon owner's side of a two-sided data flow: the owner (mobile app) writes the
business profile, and the client (webapp) reads it as the first thing they see when landing on the
salon's booking page. That distinction shapes several of the interaction details below — this isn't
just saving a settings record, it's publishing public-facing content.

3. User Interactions & Action Flows

A. Tap Back Arrow (←)

   ●​ Frontend Action: Returns to the previous onboarding step, dismissing this sheet.
   ●​ Backend / System Action: Preserves any partially-entered data in local/session state;
      nothing has been published yet at this point.

B. Tap & Type in "Business name" Field

   ●​ Frontend Action: Displays soft keyboard, highlights focus state, updates component
      state.
   ●​ Backend / System Action: Required-field validation — "Next" likely disabled until
      non-empty, since the client-facing page presumably can't render a salon listing without a
      name.

C. Tap & Type in "Business Tagline" / "About" Fields

   ●​ Frontend Action: Displays soft keyboard, highlights focus state, updates component
      state.
   ●​ Backend / System Action: No required-field validation given optional status. Since this
      text renders directly on a public page, basic sanitization (stripping scripts/HTML,
      enforcing a max length) matters more here than on an internal-only field.

D. Tap "Upload image" (Business banner)

   ●​ Frontend Action: Opens native OS file picker or camera/gallery selector; on selection,
      likely swaps to an image thumbnail preview with remove/replace option.
   ●​ Backend / System Action: On upload, the image needs to land in storage that the client
      webapp can read directly and quickly — typically a public CDN-backed bucket rather
      than private storage, since unauthenticated visitors need to load this banner. Also
      implies image processing considerations (resizing/compression for web display) since
      this same asset needs to render well in the client-facing layout, not just the mobile app.

E. Tap "Next"

   ●​ Frontend Action: Validates the required "Business name" field, disables interaction
      briefly, transitions to the next onboarding step.
   ●​ Backend / System Action:
          ○​ API call to create/update the business profile record.
          ○​ Response Handling:
                   ■​ Success: Advances to the next onboarding step. Worth clarifying whether
                        this data becomes visible on the client webapp immediately upon save, or
                        only once the full onboarding flow (all steps) is completed and the salon
                        "goes live" — an owner may not want a half-finished profile (no team
                        members yet, no services yet) visible to real clients mid-setup.
                   ■​ Failure: Inline error near "Business name" if empty/invalid, or a
                        toast/banner for upload-related failures.
Team Member Onboarding — "Let's put some faces to the
business"
1. UI Elements (What the User Sees)

   ●​ Sheet Interface: Slide-up bottom sheet with a grab handle indicator centered at the top.
   ●​ Navigation: Back arrow icon (←) at the top-left corner.

                      ✨
   ●​ Title: Two-line centered heading "Let's put some faces to the business" with a trailing
      sparkle emoji ( ).
   ●​ Body Copy: Centered gray descriptive text — "Help your clients get to know your team
      before they book. Add each team member's name, photo and a short description about
      them." — again explicitly stating this data feeds the client-facing booking webapp, likely
      as staff-selection/profile cards during the booking flow.
   ●​ Form Fields:
          ○​ Name Label & Field: Bold "Name" label above a bordered text input with
              placeholder "John Doe".
          ○​ About Label & Field: Bold "About" label above a bordered text input with
              placeholder "A short introduction for clients".
          ○​ Photo Label & Upload Control: Bold "Photo" label above a bordered, rounded
              upload button containing a cloud-upload icon and the text "Upload image".
   ●​ CTA Row (bottom):
          ○​ Pill-shaped, blue, compact "Next" button with trailing chevron (›), left-positioned.
          ○​ Plain gray text "Skip" link, right-positioned in the same row.

2. Layout Notes

Since clients will likely pick a specific staff member when booking an appointment (a common
salon-booking pattern — "choose your stylist"), this data isn't just decorative bio content; it's
functional booking-flow data. That reframes a couple of the fields: "Name" and "Photo" probably
aren't optional in practice even though no asterisk is shown, since a client needs to identify who
they're booking with, and "About" is more likely a nice-to-have bio.

3. User Interactions & Action Flows

A. Tap Back Arrow (←)

   ●​ Frontend Action: Returns to the previous onboarding step, dismissing this sheet.
   ●​ Backend / System Action: Preserves partially-entered data in local/session state.

B. Tap & Type in "Name" Field

   ●​ Frontend Action: Displays soft keyboard, highlights focus state, updates component
      state.
   ●​ Backend / System Action: Given this name will likely appear as a selectable option in the
      client booking flow (e.g., a staff-picker dropdown or card grid), this is functionally closer
      to a required field than a cosmetic one — worth confirming with the team whether
      validation should enforce that, even though "(optional)" tagging isn't shown here.

C. Tap & Type in "About" Field

   ●​ Frontend Action: Displays soft keyboard, highlights focus state, updates component
      state.
   ●​ Backend / System Action: Renders as public bio text on the client webapp, so the same
      sanitization/max-length considerations from the business "About" field apply here too.

D. Tap "Upload image"

   ●​ Frontend Action: Opens native OS file picker or camera/gallery selector; on selection,
      likely swaps to an image thumbnail preview with a remove/replace affordance.
   ●​ Backend / System Action: Needs to land in publicly-readable storage the client webapp
      can load quickly, since this photo likely appears in a staff-selection UI clients browse
      while booking — same CDN/public-bucket consideration as the business banner. If a
      team member has no photo uploaded, the client webapp needs a defined fallback
      (initials avatar, placeholder silhouette, etc.) rather than a broken image.

E. Tap "Next"

   ●​ Frontend Action: Validates any required fields, disables interaction briefly, transitions to
      the next step — likely repeats this form to add another team member, or advances the
      wizard once the owner is done adding staff.
   ●​ Backend / System Action:
          ○​ API call to create/update the team member record, associated with the business
             profile.
          ○​ Response Handling:
                  ■​ Success: Advances to the next step; this team member becomes part of
                      the roster clients see, subject to whether the salon's overall profile has
                      "gone live" yet.
                  ■​ Failure: Inline error near the relevant field, or a toast/banner for
                      upload-related failures.

F. Tap "Skip"

   ●​ Frontend Action: Bypasses adding this team member entirely, advances directly to the
      next screen in the onboarding wizard without saving any data.
   ●​ Backend / System Action: No record created. Since team members likely populate the
      client-facing staff picker, an owner skipping this step entirely means clients may see an
      empty or missing staff-selection option during booking — worth checking whether the
      booking flow gracefully handles a salon with zero team members listed (e.g., defaults to
      "any available staff" or hides staff selection entirely).
Portfolio Onboarding — "Let's show off your best work"
1. UI Elements (What the User Sees)

   ●​ Sheet Interface: Slide-up bottom sheet with a grab handle indicator centered at the top.
   ●​ Navigation: Back arrow icon (←) at the top-left corner.

        ✨
   ●​ Title: Single-line heading "Let's show off your best work" with a trailing sparkle emoji
      ( ).
   ●​ Body Copy: Centered gray descriptive text — "Show clients what you do best by adding
      some of your favorite cuts and styles."
   ●​ Upload Control: Single centered, compact, bordered rounded upload button containing
      a cloud-upload icon and the text "Upload image" — notably narrower and more centrally
      placed than the full-width upload zones seen in earlier screens (Business banner,
      Photo), and there's no visible field label above it (e.g., no "Portfolio" heading).
   ●​ CTA Row (bottom):
          ○​ Pill-shaped, blue, compact "Next" button with trailing chevron (›), left-positioned.
          ○​ Plain gray text "Skip" link, right-positioned in the same row.

2. Layout Notes

This is the salon's visual showcase — the images uploaded here become the browsable
portfolio/gallery clients scroll through on the webapp when deciding whether to book, likely the
highest-impact visual content in the whole client-facing profile (more so than the single business
banner). The single compact upload button is a notable contrast to what a portfolio-building step
typically needs: usually multiple images, not one. This screen's layout doesn't show any
indication of multi-image support (no grid of uploaded thumbnails, no "+" to add more, no
counter like "3/10 photos").

3. User Interactions & Action Flows

A. Tap Back Arrow (←)

   ●​ Frontend Action: Returns to the previous onboarding step, dismissing this sheet.
   ●​ Backend / System Action: Preserves any already-uploaded portfolio images in
      local/session state.

B. Tap "Upload image"

   ●​ Frontend Action: Opens native OS file picker or camera/gallery selector. If multi-select is
      supported, the user could pick several images at once; if single-select, the button likely
      needs to be tapped repeatedly to build out a full portfolio, and the UI should then show a
      running grid/list of what's been added so far with remove/reorder affordances (not visible
      in this static mockup state).
   ●​ Backend / System Action: Each uploaded image needs to land in publicly-readable
      storage the client webapp can load quickly, since these are the actual gallery images
      clients browse — same CDN/public-bucket pattern as the banner and team photos.
      Given this is a portfolio meant to showcase quality work, image resolution/compression
      handling matters more here than elsewhere, since clients are visually evaluating the
      salon's craft — overly compressed thumbnails could undersell the work.

C. Tap "Next"

   ●​ Frontend Action: Advances to the next onboarding step, whether zero, one, or multiple
      images have been uploaded (no required-field marker shown, and "Skip" exists as a
      separate action, implying "Next" with zero images may still be allowed — worth clarifying
      if that's the intent, or if "Next" should require at least one photo given "Skip" already
      covers the zero-photo path).
   ●​ Backend / System Action:
           ○​ API call associating the uploaded image(s) with the business's portfolio
               collection.
           ○​ Response Handling:
                   ■​ Success: Advances to next step; images become part of the client-visible
                        gallery, subject to whether the profile has "gone live."
                   ■​ Failure: Toast/banner for upload failures (file type, size, or network
                        issues).

D. Tap "Skip"

   ●​ Frontend Action: Bypasses portfolio upload entirely, advances to the next screen without
      saving any images.
   ●​ Backend / System Action: No portfolio content created. Since this is likely a strong
      conversion driver for clients deciding whether to book (visual proof of work), an owner
      skipping this step means the client webapp needs a defined empty state for a salon with
      no portfolio yet (e.g., hide the gallery section entirely rather than showing a blank/broken
      grid).
Opening Hours & Location Onboarding — "Let's set your
opening hours" / "Let's put you on the map!" (Updated)
1. UI Elements (What the User Sees)

   ●​ Sheet Interface: Slide-up bottom sheet with a grab handle indicator centered at the top.
   ●​ Navigation: Back arrow icon (←) at the top-left corner.

                                                                                ✨
   ●​ Section 1 — Opening Hours (required):
         ○​ Title: "Let's set your opening hours" with a trailing sparkle emoji ( ).
         ○​ Body copy: "Let your clients know when you're open and ready to serve them."
         ○​ Bold "Opening times" label.
         ○​ Bordered schedule row template: "Day : Open time - Close time".
         ○​ Circular "+" add button below the row for adding additional day/time entries.
   ●​ Section 2 — Location (optional):
         ○​ Heading: "Let's put you on the map!"
         ○​ Body copy: "Help your clients find you without the guesswork. Just share your
             Google Maps location pin, and we'll show them exactly where to go."
         ○​ Bordered text input, placeholder "Google Maps pin".
   ●​ CTA Button: Compact, blue, centered button reading "Done" — closing out both
      sections at once.

2. Layout Notes

This screen bundles two pieces of client-facing operational data into one step: when the salon is
open, and where it physically is. Opening hours are required — the client webapp cannot
generate valid bookable time slots without this data, so "Done" should be gated on at least one
valid schedule row being entered. The location pin is optional; a salon can be booked without a
mapped location, though the client-facing profile would then need a defined fallback for a
missing map (see below).

3. User Interactions & Action Flows

A. Tap Back Arrow (←)

   ●​ Frontend Action: Returns to the previous onboarding step, dismissing this sheet.
   ●​ Backend / System Action: Preserves any already-entered schedule rows and pin data in
      local/session state.

B. Tap the "Day" / "Open time - Close time" Segments

   ●​ Frontend Action: Opens a day selector and time picker respectively for that schedule
      row.
   ●​ Backend / System Action: Client-side validation that close time is after open time.
C. Tap the "+" Add Button

   ●​ Frontend Action: Appends a new blank schedule row for building out additional
      days/hours.
   ●​ Backend / System Action: None yet — updates local form state.

D. Tap & Interact with "Google Maps pin" Field

   ●​ Frontend Action: Displays soft keyboard for entering a link, or opens a native map picker
      for dropping a pin directly (interaction model still to be confirmed — see open questions).
   ●​ Backend / System Action: If URL-based, client-side validation that the entered text is a
      well-formed Google Maps link; if pin-drop based, captures latitude/longitude coordinates
      directly. Since this field is optional, no validation blocks "Done" if left empty.

E. Tap "Done"

   ●​ Frontend Action: Validates that at least one valid opening-hours row exists (required);
      location pin is checked for well-formed input only if something was entered, but isn't
      required to proceed. Disables interaction briefly and closes out this onboarding step.
   ●​ Backend / System Action:
          ○​ API call saving the weekly schedule (required) and the location pin (if provided)
              to the business profile.
          ○​ Response Handling:
                  ■​ Success: The opening hours become the source of truth the client
                      webapp uses to show availability and determine bookable time slots; the
                      location pin, if provided, becomes an embedded map or "Get directions"
                      link on the client-facing salon profile page.
                  ■​ Failure: Inline error if no opening-hours row is set (e.g., "Please add at
                      least one opening time"), or inline error near the pin field only if an
                      entered link is malformed; toast/banner for a general save failure.

4. Open Questions Worth Resolving

   ●​ Pin input method ambiguity: Unclear whether "Google Maps pin" expects the owner to
      paste a shared Google Maps link or whether tapping the field opens an in-app map for
      dropping a pin directly — worth deciding, since a pasted-link flow risks user error (wrong
      link, expired share link, or a link to a different location than intended).
   ●​ No day pre-population or duplicate-day prevention: As flagged previously, unclear if
      the owner must manually add all 7 days one-by-one via "+", or if there's a smarter default
      or "copy to all days" shortcut.
   ●​ Client webapp fallback for no location pin: Since the pin is optional, the client-facing
      profile needs a defined state for a salon with no mapped location — e.g., hide the
      map/directions section entirely, or show the business address as plain text if one exists
      elsewhere in the profile data.
           Login Modal
           1. UI Elements (What the User Sees)

   ●​   Sheet Interface: Slide-up bottom sheet with a grab handle indicator centered at the top.
   ●​   Navigation: Back arrow icon (←) at the top-left corner.
   ●​   Title: Bold header reading "Login to Bookflow".
   ●​   Form Fields:
            ○​ Email Label & Field: "Enter email:" label above a text input with placeholder
                address@mail.com.
             ○​ Password Field: Input field with placeholder Password and a trailing password
                 visibility toggle icon (slashed eye).
   ●​   Inline Link: "Forgot password?" link positioned directly below the password field,
        left-aligned.
   ●​   Social Authentication Options:
             ○​ Section label: "Other login options" (distinct copy from the sign-up sheet's
                 "Create using social login").
             ○​ Two rounded icon buttons: Google and Facebook.
   ●​   No Legal Disclaimer: Unlike the sign-up sheet, there is no Terms of Service / Privacy
        Policy text block present.
   ●​   CTA Button: Full-width bright blue primary button at the bottom reading "Continue" (vs.
        "Create for free" on sign-up).

           2. User Interactions & Action Flows

A. Tap Back Arrow (←) or Drag Down Handle

   ●​ Frontend Action: Dismisses the bottom sheet with a slide-down animation, returns to
      previous view.
   ●​ Backend / System Action: Clears temporary form state, cancels pending input hooks.

B. Tap Email & Password Fields / Enter Details

   ●​ Frontend Action: Displays soft keyboard, highlights active input focus, updates
      component state, masks password by default.
   ●​ Backend / System Action: Client-side validation for email format; no strength check
      needed here (unlike sign-up) since this is verifying an existing credential, not creating
      one.

C. Tap Eye Icon in Password Field

   ●​ Frontend Action: Toggles password visibility between obscured and plain text, updates
      icon state.
   ●​ Backend / System Action: None (pure UI toggle).
D. Tap "Forgot password?" Link

   ●​ Frontend Action: Navigates to password reset flow. The user is prompted to enter their
      password. Upon submitting, the user sees a new screen open which is:
●​ Backend / System Action: Triggers password-reset request endpoint once email is
   submitted on the next screen. A code to verify their identity is sent to their email. The
   user opens their email copies it and pastes it in the screen and clicks ‘verify’. Once the
   code is verified, the user is navigated to the next screen where they can reset their
   password:
      THe loading spinner turns as the new password gets stored in the database, when done,
      the user is navigated back to the login modal, where they can sign in with their new
      password.

E. Tap "Continue" Button

   ●​ Frontend Action: Disables input fields, renders inline spinner on CTA, prevents duplicate
      submissions.
   ●​ Backend / System Action:
         ○​ API Call (credential verification)
         ○​ Response Handling:
                ■​ Success (200 OK): Receives auth token/session, routes user to main
                    dashboard.
                ■​ Failure (401 Unauthorized): Displays inline error/toast ("Incorrect email or
                    password").
                ■​ Failure (404 Not Found): Displays error indicating no account exists for
                    that email (or generically folded into the 401 message for security best
                    practice).

F. Tap Social Login Icons (Google / Facebook)

   ●​ Frontend Action: Opens native OAuth authentication prompt for the selected provider.
   ●​ Backend / System Action:
         ○​ Authenticates via provider SDK
         ○​ API Call
         ○​ Issues session token/cookies, routes user to main dashboard.
## Screen 5: Dashboard / Main Bookings View (6283.png)
### 1. UI Elements (What the User Sees)
 * **Top Navigation Bar:**
   * **Pill Segmented Control / Tabs:**
     * **"Bookings"** (Selected state: dark border/text).
     * **"Contacts"** (Unselected state: muted border/text).
     * **"Calendar"** (Unselected state: muted border/text).
   * **User Profile Avatar:** A circular badge with initials **"xx"** on the far right.
 * **Empty State Area:**
   * **Graphic:** Vector illustration depicting a light blue calendar card placeholder with clouds.
   * **Main Title:** Bold text reading **"No Bookings yet"**.
   * **Description Text:** *"Share your booking link on WhatsApp or Instagram, and
appointments will land here automatically."* Contains an inline blue hyperlink for *"booking
link"*. This link opens the Bookflow webapp - the app which clients use to place their bookings.
This is a standalone webapp that is integrated with this mobile app in various ways. This is
described in coming screens and has been described in the previous screens as well.
 * **Bottom Action Bar:**
   * A full-width/centered bright blue pill button reading **"Share your booking link ›"**.
### 2. User Interactions & Action Flows
#### A. Initial Screen Load
 * **Frontend Action:** Displays loading skeleton screens for the segmented tabs, then renders
the empty state UI if the bookings array is empty.
#### B. Tap "Contacts" Tab
 * **Frontend Action:** Switches active tab focus styling to "Contacts" and updates screen state.
 * **Backend / System Action:**
     * **Action:** Navigates to or loads the Contacts view within the current dashboard frame.
#### C. Tap "Calendar" Tab
 * **Frontend Action:** Switches active tab focus to "Calendar" and updates view state.
 * **Backend / System Action:**
     * **Action:** Navigates to or renders the interactive Calendar grid view.
#### D. Tap Profile Avatar Icon (xx)
 * **Frontend Action:** Opens user account settings or profile drawer/modal.
 * **Backend / System Action:** Triggers local route navigation to /settings or /profile.
#### E. Tap Inline "booking link" Hyperlink OR Bottom "Share your booking link ›" Button
 * **Frontend Action:** Opens native system Share Sheet (e.g., via navigator.share() on
Web/Mobile) or presents a share action modal with quick options (Copy Link, WhatsApp,
Instagram, SMS).
 * **Backend / System Action:**
   * **Hook/API Call:**
   * Copies the unique string to the device clipboard or feeds it directly into the native mobile OS
sharing intent.
Bookings Dashboard — "Bookings" Tab (Collapsed &
Expanded States) — Updated (Part 1 of 2)
1. UI Elements (What the User Sees)

   ●​ Top Navigation: Three pill-shaped tab buttons — "Bookings" (active/selected, bold
      outline), "Contacts", "Calendar" — plus a circular user avatar badge (green, initials "XX")
      top-right.
   ●​ Booking Cards (list view): Stacked rounded cards, each representing one booking.
          ○​ Collapsed state: Service name ("Haircut, Beard"), duration ("50 mins."), price
              ("KES 140"), a status pill on the right ("Booked"), and a downward chevron toggle
              centered at the bottom of the card.
          ○​ Expanded state: Replaces duration with the actual scheduled date/time ("July
              22, 2026. 10 AM"), adds a booking-metadata block ("Booked on: July 19, 2026"),
              a blue link "Check payment Confirmation message", client details (name "Xenon
              Xavier", email, phone number), a green "Confirm booking?" link, a red "Cancel
              booking?" link, and an upward chevron to collapse the card back.
   ●​ Bottom Filter/Status Bar: Three-way segmented control — "Booked"
      (calendar-with-checkmark icon, currently selected/outlined), "Confirmed" (green
      checkmark icon), "Cancelled" (red X icon). These act as both status labels and filtered
      record views: tapping "Confirmed" shows the running list of bookings the owner has
      confirmed, and "Cancelled" shows the list of bookings that were cancelled.
   ●​ New: Cancel Confirmation Dialog (modal/alert): Triggered by "Cancel booking?"
      before the cancellation is finalized. Contains a warning message (e.g., "Are you sure you
      want to cancel this booking? The client will be notified by email."), and two actions: a
      destructive confirm button (e.g., "Yes, cancel booking") and a dismiss/back-out option
      (e.g., "Go back" or "Keep booking").
   ●​ New: Reinstate Affordance (on a Cancelled booking card): A link or button (e.g.,
      "Reinstate booking?") available on cards within the "Cancelled" record view, allowing the
      owner to move a mistakenly-cancelled booking back to an active state.

2. Layout Notes

The color-coding of the two action links mirrors their destination tab — green "Confirm
booking?" corresponds to the green "Confirmed" tab, red "Cancel booking?" corresponds to the
red "Cancelled" tab. A booking now has three possible lifecycle outcomes from the "Booked"
state: remain booked, move to Confirmed, or move to Cancelled — with Cancelled now being a
non-terminal state, since a reinstate path exists to move a booking back out of it (see Part 2 for
the full flow and reasoning).
Part 2 will cover the full interaction flows, including the finalized cancellation email copy, the
confirm-before-cancel step-by-step flow, and the reinstatement flow


Bookings Dashboard — "Bookings" Tab — Updated (Part
2 of 2)
3. User Interactions & Action Flows

A. Tap "Bookings" / "Contacts" / "Calendar" Tabs

   ●​ Frontend Action: Switches the active top-level view.
   ●​ Backend / System Action: Fetches the relevant data set for the selected tab.

B. Tap the Chevron (Expand/Collapse a Booking Card)

   ●​ Frontend Action: Toggles between collapsed and expanded card states.
   ●​ Backend / System Action: None — reveals data already fetched with the initial booking
      list.

C. Tap "Check payment Confirmation message"

   ●​ Frontend Action: Opens the file the client uploaded during their booking on the
      client-facing webapp — the client's proof-of-payment/deposit confirmation.
   ●​ Backend / System Action: Fetches the file from storage, associated with this specific
      booking record.

D. Tap "Confirm booking?"

   ●​ Frontend Action: Marks the booking as confirmed, moving it out of the "Booked" list and
      into the "Confirmed" record; inline loading state during the API call.
   ●​ Backend / System Action:
          ○​ API call updating the booking record's status to confirmed.​

           ○​ Triggers an outbound confirmation email to the client:​
              ​
              ​
               Hi [Client Name],​

                                                                               🎉
              ​
               Great news! Your booking with [Salon Name] is confirmed.     ​
              ​
               Service: [Service Name] Date: [Date] Time: [Time]​
              ​
               We're looking forward to seeing you! If you need to make any changes, just get
              in touch with us.​
                               💕 [Salon Name]​
              ​
               See you soon!
              ​

          ○​ Response Handling:​

                 ■​ Success: Confirmation email sent, booking moved to the "Confirmed"
                    record.
                 ■​ Failure: Inline error/toast if the status update or email dispatch fails.

E. Tap "Cancel booking?"

   ●​ Frontend Action: Opens the new Cancel Confirmation Dialog rather than cancelling
      immediately — surfacing a warning and requiring an explicit second tap before anything
      is finalized. This directly resolves the earlier concern about accidental taps given the
      proximity to "Confirm booking?".
   ●​ Backend / System Action: None yet — no API call fires until the dialog is confirmed.

F. Within the Dialog — Tap "Yes, cancel booking" (confirm)

   ●​ Frontend Action: Closes the dialog, marks the booking as cancelled, moving it out of the
      "Booked" list and into the "Cancelled" record; inline loading state during the API call.
   ●​ Backend / System Action:
         ○​ API call updating the booking record's status to cancelled.​

          ○​ Triggers an outbound cancellation email to the client:​
             ​
             ​
              Hi [Client Name],​
             ​
              We're sorry to let you know that your booking with [Salon Name] has been
             cancelled.​
             ​
              Service: [Service Name] Date: [Date] Time: [Time]​
             ​
              We apologize for any inconvenience this may cause. If you'd like to rebook or
             have any questions, please don't hesitate to get in touch with us.​
             ​
              [Salon Name]​
             ​

          ○​ Response Handling:​

                 ■​ Success: Cancellation email sent, booking moved to the "Cancelled"
                    record.
                  ■​ Failure: Inline error/toast if the status update or email dispatch fails.

G. Within the Dialog — Tap "Go back" / "Keep booking" (dismiss)

   ●​ Frontend Action: Closes the dialog, returns to the expanded card view with no changes
      made.
   ●​ Backend / System Action: None — cancels the cancellation attempt.

H. Tap "Reinstate booking?" (on a card within the "Cancelled" record)

   ●​ Frontend Action: Moves the booking back to the "Booked" list, reversing the cancellation;
      likely also benefits from its own lightweight confirmation step given it re-activates a
      booking the client was already told was cancelled.
   ●​ Backend / System Action:
           ○​ API call updating the booking record's status back to booked (or possibly straight
               to confirmed, if the deposit was already verified prior to cancellation — worth
               deciding which state it should return to).
           ○​ Should trigger a follow-up email to the client letting them know their booking has
               been reinstated, so they aren't left with stale "this is cancelled" information —
               exact copy to be defined, but should mirror the tone/structure of the confirmation
               and cancellation templates.
           ○​ Response Handling:
                   ■​ Success: Booking moved back to "Booked" (or "Confirmed"),
                       reinstatement email sent.
                   ■​ Failure: Inline error/toast if the status update or email dispatch fails.

I. Tap "Booked" / "Confirmed" / "Cancelled" (bottom filter)

   ●​ Frontend Action: Filters the visible list to show only bookings in that state.
   ●​ Backend / System Action: Fetches (or filters locally from) bookings matching the
      selected status.
Here is the detailed UI, front-end, and back-end breakdown for the Contacts List screen:
## Screen 8: Contacts Directory View (6287.png)
### 1. UI Elements (What the User Sees)
 * **Top Navigation Bar:**
   * **Pill Segmented Control / Tabs:**
     * **"Bookings"** (Inactive tab: light outline, muted text).
     * **"Contacts"** (Active tab: solid outline, dark text).
     * **"Calendar"** (Inactive tab: light outline, muted text).
   * **User Profile Avatar:** Circular badge with initials **"xx"** on the top right.
 * **Contacts List Feed:**
   * **Contact Card 1:**
     * Full Name: **"Xenon Xavier"**
     * Email Address: *"xenon.xenonxavier@gmail.com"*
     * Phone Number: *"0701408727"*
   * **Contact Card 2:**
     * Full Name: **"Xenon Jason"**
     * Email Address: *"xenon.xenonxavier@gmail.com"*
     * Phone Number: *"0701408727"*
 * **Bottom Global Bar:**
   * **Home Icon Button:** Centered navigation icon labeled **"Home"**.
### 2. User Interactions & Action Flows
#### A. Initial Screen Load
 * **Frontend Action:** Highlights the **"Contacts"** tab and displays client cards in a scrollable
list view.
 * **Backend / System Action:**
      * **Response Handling:** Returns an array of contact objects; updates the client list state
(useContacts() hook).
#### B. Tap Individual Contact Card
 * **Frontend Action:** Highlights card focus and navigates to the detailed profile view for that
specific client (showing appointment history, total spent, notes, etc.).
 * **Backend / System Action:**
   * Router push to /contacts/:contact_id.
#### C. Tap Email Address or Phone Number
 * **Frontend Action:**
   * **Tap Email:** Launches native system email client pre-populated with the contact's email
address.
   * **Tap Phone:** Opens phone dialer app with the pre-filled mobile number (tel:0701408727).
 * **Backend / System Action:** Invokes OS-level deep-linking intents (mailto: or tel: protocol).
#### D. Tap "Bookings" or "Calendar" Tabs
 * **Frontend Action:** Shifts active tab indicator and navigates back to the respective section
view.
 * **Backend / System Action:** Router state change (navigation.navigate('Bookings') or
navigation.navigate('Calendar')).
#### E. Tap Bottom "Home" Icon
* **Frontend Action:** Navigates back to the main application landing/dashboard screen.
* **Backend / System Action:** Clears stack history or performs top-level navigation route
update.
Calendar Tab — Booking Schedule View
1. UI Elements (What the User Sees)

   ●​ Top Navigation: Three pill-shaped tab buttons — "Bookings", "Contacts", "Calendar"
      (active/selected, bold outline) — plus a circular user avatar badge (green, initials "XX")
      top-right.
   ●​ Mini Month Picker (upper panel):
          ○​ Header row with a collapse/expand chevron (˅), the current month/year label
              ("July 2026"), and two vertical navigation arrows (↑ previous, ↓ next) for stepping
              between months.
          ○​ Standard 7-column day-of-week header (S M T W T F S).
          ○​ Full month grid including leading/trailing days from adjacent months in muted
              styling.
          ○​ Selected week highlight: The row containing "19" is outlined/highlighted in blue,
              with "19" itself shown as a filled blue circle — indicating both the selected date
              and that the detail view below reflects that week.
   ●​ Week/Day Detail View (lower panel):
          ○​ Toolbar row: "Today" button (with calendar icon) to jump to the current date, "‹ ›"
              prev/next week arrows, and a date-range label "July 20–24, 2026" with a
              dropdown chevron (likely to switch view modes — day/week/month).
          ○​ Column headers for each day in the visible range ("20 Mon", "21 Tue", "22 Wed",
              continuing off-screen).
          ○​ Hourly time-slot grid running down the left side (12 AM, 1 AM, 2 AM, 3 AM...),
              with horizontal gridlines per day column.
          ○​ Booking block: A solid blue filled block spanning the 12 AM hour slot under "20
              Mon" — representing a scheduled booking occupying that time range.
   ●​ Bottom Navigation: Single centered "Home" tab with house icon.

2. Layout Notes

This is the salon owner's operational scheduling view, and it needs to reflect booking activity
originating from the client-facing webapp in near-real-time — when a client books a slot, it
should populate here as a time-blocked event so the owner has an accurate, at-a-glance view of
their day/week, not just a list (which the Bookings tab already covers). The blue block under "20
Mon" at 12 AM is the only visible booking in this crop — worth noting it renders as a solid color
block with no visible label (service name, client name, time range) at this zoom level, which may
need a tap-to-reveal or hover/press interaction to surface details.

3. User Interactions & Action Flows

A. Tap "Bookings" / "Contacts" / "Calendar" Tabs

   ●​ Frontend Action: Switches the active top-level view.
   ●​ Backend / System Action: Fetches the relevant data set for the selected tab.

B. Tap Month Navigation Arrows (↑ / ↓) in Mini Picker

   ●​ Frontend Action: Steps the mini calendar to the previous/next month, updates the
      month/year label.
   ●​ Backend / System Action: Fetches bookings for the newly visible month range if not
      already cached, to populate date indicators (e.g., dots or highlights on days with
      bookings — not visible in this static crop but a common pattern worth considering).

C. Tap a Date Cell in the Mini Picker

   ●​ Frontend Action: Selects that date, updates the highlighted week row, and syncs the
      detail view below to show that date's week.
   ●​ Backend / System Action: Fetches bookings for the newly selected week range.

D. Tap "Today"

   ●​ Frontend Action: Jumps both the mini picker and detail view back to the current date.
   ●​ Backend / System Action: Fetches bookings for the current week if not already loaded.

E. Tap "‹" / "›" (Detail View Navigation)

   ●​ Frontend Action: Steps the detail view backward/forward by week (or day, depending on
      the active view mode), updates the date-range label.
   ●​ Backend / System Action: Fetches bookings for the newly visible range.

F. Tap the Date-Range Label Dropdown (e.g., "July 20–24, 2026 ⌄")

   ●​ Frontend Action: Likely opens a view-mode switcher (Day / Week / Month / Agenda),
      changing how the detail grid renders.
   ●​ Backend / System Action: Refetches or reformats booking data to match the new view
      density.

G. Tap a Booking Block (e.g., the blue block under "20 Mon")

   ●​ Frontend Action: Likely expands or opens a detail popover/sheet showing the booking's
      service, client name, time, and status — mirroring the same booking record shown in the
      Bookings tab, since this is the same underlying data rendered in a calendar/timeline
      format rather than a card list.
   ●​ Backend / System Action: Fetches the full booking record if not already loaded with the
      calendar data.

H. Tap "Home" (bottom nav)

   ●​ Frontend Action: Navigates to the app's home/dashboard screen.
   ●​ Backend / System Action: None — pure navigation.
4. Open Questions Worth Resolving

  ●​ Sync timing between client bookings and this calendar: Needs to be defined
     whether a new client booking appears here immediately (live sync) or only after a
     refresh/reload, since the owner may be actively viewing their day while a client books a
     conflicting or adjacent slot.
  ●​ Visual differentiation by booking status: The single visible block is a flat blue color
     with no distinction shown for "Booked" vs. "Confirmed" vs. "Cancelled" bookings
     (statuses established in the Bookings tab) — worth deciding whether the calendar
     should color-code or otherwise visually flag booking status here too, so the owner isn't
     just seeing undifferentiated time blocks.
  ●​ No label on the booking block: At this zoom level the block shows no text
     (service/client/time) — needs a defined interaction (tap-to-expand, or a minimum block
     height before text renders) so the owner can identify what's booked without leaving the
     calendar view.
  ●​ Cancelled bookings' calendar treatment: Given the reversible cancel/reinstate flow
     established in the Bookings tab, unclear whether a cancelled booking's time slot
     disappears from this calendar entirely, gets visually marked as cancelled but still shown,
     or is only removed once reinstatement is no longer possible.
Here is the detailed UI, front-end, and back-end breakdown for the User Profile & Account
Settings Menu screen:
## Screen 10: User Profile & Account Menu (6289.png)
### 1. UI Elements (What the User Sees)
 * **Header / Banner Section:**
   * **Background:** Futuristic purple gradient banner graphic.
   * **Avatar:** Large green circular profile badge featuring the user's initials **"XX"**.
   * **User Name:** Bold white text reading **"xenon xavier"**.
 * **Main Menu Options (Grouped Card):**
   * **Profile:** User ID card icon + **"Profile"** label + Right chevron arrow (>).
   * **My services:** Hand holding people icon + **"My services"** label + Right chevron arrow
(>).
   * **Settings:** Gear icon + **"Settings"** label + Right chevron arrow (>).
   * **Support:** Lifebuoy / Help icon + **"Support"** label + Right chevron arrow (>).
 * **Session Action (Standalone Card):**
   * **Log out:** Exit icon ([→) + **"Log out"** label + Right chevron arrow (>).
 * **Bottom Global Navigation:**
   * **Home Icon Button:** Centered navigation icon labeled **"Home"**.
### 2. User Interactions & Action Flows
#### A. Initial Screen Load
 * **Frontend Action:** Triggered when the top-right profile avatar (XX) is clicked on any
previous main screen. Animates into view (as a dedicated screen or modal drawer) and displays
current user metadata.
 * **Backend / System Action:**
   #### B. Tap "Profile" Option
 * **Frontend Action:** Navigates to the Personal/Business Information Management page.
 * **Backend / System Action:**
   * **Route Change:** navigation.navigate('UserProfileDetails')
  #### C. Tap "My services" Option
 * **Frontend Action:** Navigates to the Service Catalog Management screen.
 * **Backend / System Action:**
   * **Route Change:** navigation.navigate('ServicesManager')
  #### D. Tap "Settings" Option
 * **Frontend Action:** Navigates to the App Configuration & Preferences screen.
 * **Backend / System Action:**
   * **Route Change:** navigation.navigate('AccountSettings')
   * **Action:** Loads local/remote app configurations (e.g., notification preferences, currency
settings, timezone, security/2FA settings).
#### E. Tap "Support" Option
 * **Frontend Action:** Navigates to Help center page as shown in the next screen
 * **Backend / System Action:**
   * **Route Change:** This is explained in the next screen
#### F. Tap "Log out" Option
 * **Frontend Action:** Shows a confirmation alert/dialog (e.g., *"Are you sure you want to log
out?"*). Upon confirmation, clears local storage/tokens and redirects to Screen 2 (Welcome /
Gateway).
 * **Backend / System Action:**
   * **API Call:
   * **Local Storage Action:
#### G. Tap Bottom "Home" Icon
 * **Frontend Action:** Dismisses the profile menu view and returns to the primary Dashboard
(Screen 5/6).
 * **Backend / System Action:** Router stack navigation back to the primary /dashboard route.
Help Center — Contact / Support Request Form
1. UI Elements (What the User Sees)

   ●​ Header/Branding: "Bookflow" logo lockup (purple rounded rectangle with wordmark and
      italic tagline "Ready, set, book") paired beside a large italic page title "Help Center".
   ●​ Form Fields:
           ○​ Email Label & Field: "Email *" (required) label above an empty bordered text
               input. Helper text below reads "If you have a Fresha account, enter the email
               address you log in with."
           ○​ Description Label & Field: "Describe what you need help with *" (required)
               label, paired with a right-aligned live character counter "0/2000". Below it, a large
               multi-line textarea with a resize handle (dotted grip icon) in the bottom-right
               corner.
   ●​ File Upload Zone:
           ○​ Dashed-border drop zone/card containing an upload icon (document with upward
               arrow), bold heading "Attach screenshots", secondary text "Drop your files here",
               and a bordered "Choose a file" button centered beneath.
           ○​ Constraint text below the drop zone: "File type .jpg, .png • max size 10mb".
   ●​ CTA Button: Full-width solid black button reading "Send email".
   ●​ Footer: Full-bleed purple gradient band containing the Bookflow logo lockup again and a
      copyright line "@2026 mugu-labs.com".

2. Layout Notes

This is a single scrolling page split across two screenshots — Image 1 shows the top (branding
→ email field → description field → start of upload zone), Image 2 shows the continuation
(upload zone → file constraints → submit button → footer). No sheet/modal chrome (no grab
handle, no back arrow) — this reads as a standalone web page, not a native app screen, which
tracks with the "@2026 mugu-labs.com" footer.

3. User Interactions & Action Flows

A. Tap/Focus Email Field

   ●​ Frontend Action: Highlights input focus state, displays cursor.
   ●​ Backend / System Action: Client-side email format validation on blur or submit.

B. Type in Description Textarea

   ●​ Frontend Action: Character counter increments live (e.g., "142/2000"); textarea is
      user-resizable via the drag handle.
   ●​ Backend / System Action: Enforces 2000-character hard limit, likely blocking further input
      or truncating at max.
C. Tap "Choose a file" / Drag File onto Drop Zone

   ●​ Frontend Action: Opens native OS file picker (on click) or accepts drag-and-drop; on
      successful selection, likely swaps the empty-state zone for a file thumbnail/filename with
      a remove (×) affordance.
   ●​ Backend / System Action: Client-side validation against constraints (.jpg/.png only, 10MB
      max) — rejects with inline error if violated (e.g., "File must be under 10MB" or
      "Unsupported file type").

D. Tap "Send email"

   ●​ Frontend Action: Disables form, renders loading state, prevents duplicate submission.
   ●​ Backend / System Action:
         ○​ API call submitting email, description, and attached file(s) (likely
             multipart/form-data given file upload).
         ○​ Response Handling:
                ■​ Success (200/202): Confirmation state (toast, inline success message, or
                    redirect to a "We've received your request" screen).
                ■​ Failure (400): Field-level validation errors (missing required
                    email/description).
                ■​ Failure (413/415): File-specific errors surfaced near the upload zone (size
                    or type violation).
Here is the detailed UI, front-end, and back-end breakdown for the Log Out Confirmation Modal
screen: Kindly make corrections on color selection if you find any. Colors should be standard
with the app theme and style.
## Screen 11: Log Out Confirmation Modal (6290.png)
### 1. UI Elements (What the User Sees)
 * **Background View:** Dimmed/overlayed User Profile menu (Screen 10) rendered behind a
dark backdrop filter.
 * **Modal Sheet / Card:**
   * **Close Action:** "X" icon located at the top right of the modal card.
   * **Title:** Bold black text reading **"Log out?"**.
   * **Confirmation Body Text:** *"Are you sure you want to log out of "* followed by the active
account email in bold text: **"dennismugu7@gmail.com"**.
   * **Action Buttons:**
     * **"Go back"**: Secondary rounded pill button with a black outline and white background on
the left.
     * **"Confirm"**: Primary rounded pill button with a solid black fill and white text on the right.
### 2. User Interactions & Action Flows
#### A. Initial Screen Trigger
 * **Frontend Action:** This modal pops up automatically when the user taps **"Log out"** from
Screen 10. The background is blurred/dimmed using a backdrop overlay component
(BackdropFilter or Modal wrapper).
 * **Backend / System Action:** No immediate network request; passes the current user session
state (user.email) into the modal props to dynamically render dennismugu7@gmail.com.
#### B. Tap Close Icon ("X") OR Tap "Go back" Button
 * **Frontend Action:** Dismisses the confirmation modal with a fade-out animation and restores
full focus and interactivity to Screen 10 (User Profile Menu).
 * **Backend / System Action:** Updates local UI state (setIsLogOutModalOpen(false)). No API
calls executed.
#### C. Tap Backdrop / Outside Modal Area
 * **Frontend Action:** Dismisses the modal popup (standard modal dismiss behavior).
 * **Backend / System Action:** Resets local modal visibility state.
#### D. Tap "Confirm" Button
 * **Frontend Action:**
   * Disables both modal buttons and shows a loading indicator inside the **"Confirm"** button.
   * On success, clears client-side credentials and redirects the user to Screen 2 (Welcome /
Authentication Gateway Screen).
Here is the detailed UI, front-end, and back-end breakdown for the My Profile Details screen:
## Screen 12: My Profile Details (6291.png)
> **Entry Point Note:** This page renders directly after the user clicks on the **"My Profile"**
menu item from the Account/Settings menu (Screen 10).
>
### 1. UI Elements (What the User Sees)
* **Top Navigation Bar:**
  * **Back Arrow Button:** Top-left navigation arrow (←).
  * **Header:** Bold page title reading **"My profile"**.
* **Profile Card Container:**
  * **Top Action:** Purple text button reading **"Edit"** on the top right of the card.
  * **Avatar Section:**
    * Centered large pink circular badge featuring the letter **"d"** in white.
    * Edit badge overlay: Small circular pencil icon badge attached to the bottom-right of the
avatar circle.
  * **User Display Name:** Bold centered text reading **"dennis mugu"**.
  * **Horizontal Divider:** Thin grey line separating the header metadata from detail fields.
  * **Personal Information Fields:**
    1. **First name:** Label with muted value dennis.
    2. **Last name:** Label with muted value mugu.
    3. **Email:** Label with muted value dennismugu7@gmail.com.
### 2. User Interactions & Action Flows
#### A. Initial Screen Load
* **Frontend Action:** Navigates from Screen 10, rendering the user's detailed account card in
a read-only view state.
* **Backend / System Action:**
#### B. Tap Back Arrow Button (←)
* **Frontend Action:** Pops the current screen off the navigation stack and returns to the
Account/Settings menu (Screen 10).
* **Backend / System Action:** Router back navigation (navigation.goBack()).
#### C. Tap Avatar Circle / Pencil Edit Icon
* **Frontend Action:** Opens native system file picker or camera modal to update profile
picture.
* **Backend / System Action:**
  * Selects media file (.jpg/.png).
 #### D. Tap "Edit" Text Button
* **Frontend Action:**
  * Toggles the card from read-only labels to active editable text input fields.
  * Replaces the **"Edit"** button with **"Cancel"** and **"Save"** controls.
* **Backend / System Action:** Switches local React component state to isEditing: true.
#### E. Saving Editable Fields (Post "Edit" Tap)
* **Frontend Action:** Validates inputs and shows a loading indicator during update submission.
My Services — Empty State
1. UI Elements (What the User Sees)

   ●​ Navigation: Back arrow icon (←) at the top-left corner, standalone.
   ●​ Title: Large bold page heading "My Services".
   ●​ Empty-State Illustration: Centered decorative graphic — a light blue circular backdrop
      containing a stylized card/panel illustration (mimicking a service listing card with title
      bars, list lines, and status dots), layered over a secondary faded card behind it, with
      small decorative circle and cloud accents scattered around.
   ●​ Empty-State Copy:
          ○​ Bold two-line heading "No service added to your menu".
          ○​ Italic gray subtext "Give your clients something new to book" — directly
               reinforcing that this list is what clients will browse.
   ●​ Floating Action Button (FAB): Circular teal button, bottom-right corner, containing a
      white "+" icon.

2. Layout Notes

This is the zero-state of the salon's service menu — the list of bookable services (haircuts,
treatments, etc., each presumably with name, duration, and price, matching the pattern already
seen on booking cards like "Haircut, Beard — 50 mins. — KES 140"). Once populated, this
screen would replace the illustration/empty-copy block with a scrollable list of service cards, and
this same data becomes what clients browse and select from on the webapp when starting a
booking — making this arguably the most foundational content in the entire onboarding/setup
set, since without it there's nothing for a client to book at all.

3. User Interactions & Action Flows

A. Tap Back Arrow (←)

   ●​ Frontend Action: Navigates back to the previous screen (likely a business/settings hub).
   ●​ Backend / System Action: None — pure navigation.

B. Tap the "+" Floating Action Button

   ●​ Frontend Action: Opens an "Add service" form/sheet — likely capturing fields such as
      service name, description, duration, price, and possibly a category or which team
      member(s) can perform it, given team members were set up as a separate onboarding
      step.
   ●​ Backend / System Action: None until the form is submitted on the next screen.

C. (On subsequent "Add service" submission, not shown in this mockup)

   ●​ Frontend Action: Validates required fields, disables form, shows loading state.
  ●​ Backend / System Action:
        ○​ API call creating the service record, associated with the business profile.
        ○​ Response Handling:
               ■​ Success: New service appears in the "My Services" list (replacing this
                   empty state once at least one exists), and becomes immediately (or per
                   publish rules) visible to clients on the webapp as a bookable option.
               ■​ Failure: Inline error on the relevant field, or a toast/banner for a save
                   failure.

4. Open Questions Worth Resolving

  ●​ Zero-services impact on the client webapp: Since this screen explicitly shows what
     happens when no services exist yet, worth confirming how the client-facing webapp
     behaves for a salon with an empty menu — likely needs to either hide the "Book now"
     entry point entirely or show its own appropriate empty/coming-soon state, rather than
     presenting a blank or broken booking flow.
  ●​ Ordering/visibility control: Not shown here, but once services exist, worth checking
     whether the owner can reorder, temporarily hide, or archive individual services without
     deleting them — relevant since clients are booking live off this list and a owner may want
     to pause a service without losing its history/configuration.
  ●​ Service-to-team-member association: Given the earlier team member setup step,
     unclear whether adding a service here also lets the owner specify which staff member(s)
     offer it, which would directly affect how the client webapp's booking flow presents staff
     selection per service.
UI & Functional Specification (928.png)

1. UI Elements (What the User Sees)

   ●​ Top Navigation Bar:
         ○​ Back Button: A left arrow icon (←) positioned at the top left.
         ○​ Page Title: Bold left-aligned header reading "My Services".
   ●​ Populated Service List (Card Stream):
         ○​ Card Container: A vertically stacked list of white rounded cards set against a
            off-white/light gray background.
         ○​ Card Details (per item):
                ■​ Service Title: Bold text (e.g., "Shaping & Defining The Beard").
                ■​ Duration: Muted gray body text underneath the title (e.g., "20 mins").
                ■​ Price: Bold text aligned below the duration displaying currency and

                                                     ✏️
                    amount (e.g., "KES 400").
                ■​ Edit Control: A pencil edit icon ( ) positioned at the top right inside
                    each card.
   ●​ Primary Action Control:
         ○​ Floating Action Button (FAB): A fixed cyan/turquoise circular button with a
            white plus icon (+) positioned at the bottom right.

2. User Interactions & Action Flows

A. Tap Back Arrow (←)

   ●​ Frontend: Navigates back to the previous screen (e.g., onboarding setup or main
      business settings dashboard).
   ●​ Backend / System: Retains current application state and performs router
      back-navigation.

B. Initial Screen Load (Populated State)

   ●​ Frontend: Requests the saved service collection and populates the list view
      dynamically.
   ●​ Backend / System:
         ○​

                        ✏️) on a Card
C. Tap Pencil Edit Icon (

   ●​ Frontend: Opens an "Edit Service" modal sheet pre-filled with the selected card's
      current values (title, duration, price, description).
   ●​

D. Tap Floating Action Button (+)
●​ Frontend: Opens an "Add New Service" form modal sheet to append a new item to the
   menu list.
●​
Settings Screen
1. UI Elements (What the User Sees)

   ●​ Navigation: Back arrow icon (←) at the top-left corner, standalone (no title bar/header
      row).
   ●​ Title: Large bold page heading "Settings", left-aligned below the back arrow.
   ●​ List Items: Three-row vertical list, each with a leading icon, label text, and trailing
      chevron (›):
          ○​ Change password — key icon, chevron indicates in-app navigation.
          ○​ Privacy policy — diagonal external-link arrow icon (↗), chevron indicates
              navigation.
          ○​ Terms of service — diagonal external-link arrow icon (↗), chevron indicates
              navigation.
   ●​ Destructive Action: Pill-shaped outlined button, bottom-center of screen, red/crimson
      text reading "Delete account" — visually separated from the list by a large empty vertical
      gap, pushing it toward the bottom of the screen as a deliberately isolated,
      low-prominence destructive action.

2. Layout Notes

The icon convention is meaningful: the key icon (Change password) signals an in-app screen
transition, while the diagonal arrow icon (Privacy policy, Terms of service) signals an
outbound/external navigation (webview or browser) — despite all three rows sharing the same
trailing chevron. This is a slightly inconsistent affordance pairing worth flagging (see below).

3. User Interactions & Action Flows

A. Tap Back Arrow (←)

   ●​ Frontend Action: Navigates back to the previous screen (likely Profile or Account tab).
   ●​ Backend / System Action: None — pure navigation.

B. Tap "Change password"

   ●​ Frontend Action: Navigates to a Change Password screen/sheet (current password, new
      password, confirm fields expected).
   ●​ Backend / System Action: None until form submission on the next screen; that
      submission would call an update-credentials endpoint.

C. Tap "Privacy policy"

   ●​ Frontend Action: Opens webview overlay or launches external browser to the privacy
      policy document.
   ●​ Backend / System Action: Fetches static content endpoint (matches the pattern from the
      Help Center legal links).

D. Tap "Terms of service"

   ●​ Frontend Action: Opens webview overlay or launches external browser to the terms of
      service document.
   ●​ Backend / System Action: Fetches static content endpoint.

E. Tap "Delete account"

   ●​ Frontend Action: Should trigger a confirmation step (modal/dialog) before proceeding —
      not shown in this mockup, but expected given the destructive/irreversible nature of the
      action. No inline spinner/disabled state visible here either.
   ●​ Backend / System Action:
          ○​ API call to account-deletion endpoint
          ○​ Response Handling:
                  ■​ Success: Clears local session/auth state, routes user to
                      logged-out/onboarding screen.
                  ■​ Failure: Displays inline error or toast (e.g., "Unable to delete account,
                      please try again").
   ●​
Change Password Screen
1. UI Elements (What the User Sees)

   ●​ Navigation: Back arrow icon (←) at the top-left corner, standalone.
   ●​ Title: Large bold page heading "Change password".
   ●​ Contextual Subtext: Two-line description confirming the account being modified — gray
      text "Please enter a new password for" followed by the user's email address in bold
      black on the next line (e.g., dennismugu7@gmail.com).
   ●​ Form Fields (three, all required, all with independent visibility toggles):
           ○​ Enter current password * — bordered input, currently shown in an
              active/focused state (purple border), trailing eye icon.
           ○​ Enter new password * — bordered input, default/unfocused gray border, trailing
              eye icon.
           ○​ Confirm new password * — bordered input, default/unfocused gray border,
              trailing eye icon.
   ●​ CTA Button: Full-width solid black pill-shaped button reading "Submit".
   ●​ Fallback Link: Below the button, plain text "If you forgot your password, " followed by an
      inline purple hyperlink "you can reset by clicking on this link."

2. Layout Notes

The focused-state styling on the first field (purple border) versus the neutral gray borders on the
other two fields shows the active input/focus ring treatment — useful as the reference style for
focus states across the app's form fields generally.

3. User Interactions & Action Flows

A. Tap Back Arrow (←)

   ●​ Frontend Action: Navigates back to the Settings screen.
   ●​ Backend / System Action: Clears any in-progress form state.

B. Tap Password Fields / Enter Details

   ●​ Frontend Action: Displays soft keyboard, applies focus ring (purple border) to active field,
      masks characters by default.
   ●​ Backend / System Action: Client-side validation — required-field checks, and likely a
      match check between "Enter new password" and "Confirm new password" before
      allowing submission.

C. Tap Eye Icon (any of the three fields)
   ●​ Frontend Action: Toggles that specific field's text between obscured and plain,
      independently of the other two fields.
   ●​ Backend / System Action: None (pure UI toggle).

D. Tap "Submit"

   ●​ Frontend Action: Disables form, renders inline spinner/loading state on the button,
      prevents duplicate submissions.
   ●​ Backend / System Action:
         ○​ API call re-authenticating with current password, then updating to the new
             password.
         ○​ Response Handling:
                ■​ Success (200): Displays success toast/confirmation, likely navigates back
                     to Settings or prompts re-login.
                ■​ Failure (401): Current password incorrect — inline error under "Enter
                     current password" field (e.g., "Current password is incorrect").
                ■​ Failure (400): New password fails strength requirements, or new/confirm
                     passwords don't match — inline errors under the relevant field(s).

E. Tap "you can reset by clicking on this link"

   ●​ Frontend Action: Navigates to the forgot-password / reset-password flow (likely
      requesting email confirmation, then a reset link/OTP).
   ●​ Backend / System Action: Triggers password-reset-request endpoint on the next screen,
      sends reset link to the user's email.
Delete Account — Exit Survey Screen
1. UI Elements (What the User Sees)

   ●​ Navigation: Close icon (×) at the top-right corner.
   ●​ Eyebrow/Context Label: Small gray text "Delete my account" positioned above the
      main heading, indicating the flow the user is in.
   ●​ Title: Large bold heading "We're sad to see you go!"
   ●​ Support Message: Gray body text offering an alternative to leaving — "If there's
      anything we could do to make things right, we'd love to hear from you. Reach out
      anytime at support@mugu-labs.com".
   ●​ Section Heading: Bold subheading "Help us improve".
   ●​ Survey Prompt: Gray instructional text "Please let us know the reason for deleting your
      account:".
   ●​ Radio Button List (single-select, four options):
          ○​ "I created this account by accident."
          ○​ "I found another app that better suits my needs" (two-line label).
          ○​ "The app is too complicated" (note: leading space before "The" in the source
              label).
          ○​ "Something else (Tell us more)" — implies a follow-up text field appears when
              selected.
   ●​ Divider: Thin horizontal rule separating the survey content from the CTA.
   ●​ CTA Button: Full-width solid black pill-shaped button reading "Continue →" (arrow icon
      included inline).

2. Layout Notes

This is a deliberate retention/off-ramp screen inserted between "Delete account" tap (from
Settings) and actual account deletion — good practice, giving the user a support contact and a
chance to reconsider before the irreversible action. This answers the earlier flag from the
Settings screen review: the confirmation/friction step does exist, it's just this screen rather than a
simple dialog.

3. User Interactions & Action Flows

A. Tap Close (×)

   ●​ Frontend Action: Dismisses the screen/modal, returns user to Settings without deleting
      the account.
   ●​ Backend / System Action: None — cancels the deletion flow, no API call.

B. Tap a Radio Button Option
   ●​ Frontend Action: Selects that option (fills the radio circle), deselects any previously
      chosen option (single-select behavior). If "Something else (Tell us more)" is selected,
      likely reveals an inline text input for free-form feedback (not shown in this mockup —
      needs definition).
   ●​ Backend / System Action: None yet — stores selection in local form state pending
      submission.

C. Tap "support@mugu-labs.com" (if tappable/hyperlinked)

   ●​ Frontend Action: Opens the device's default mail client with a pre-filled "To:" address, or
      copies the address to clipboard.
   ●​ Backend / System Action: None (client-side mailto action).

D. Tap "Continue →"

   ●​ Frontend Action: Validates that a reason is selected (button may be disabled/inactive
      until a selection is made — not visually indicated in this mockup); advances to the next
      step in the deletion flow (likely a final confirmation screen, e.g., "Are you absolutely
      sure?" or directly triggers the delete-account API call).
   ●​ Backend / System Action:
          ○​ Likely logs the selected deletion reason (analytics/product-feedback event)
               before or alongside the actual deletion call.
          ○​ If this is the final step: calls the delete-own-account Supabase Edge
               Function, clears session, routes to logged-out state.
          ○​ If not final: navigates to a subsequent confirmation screen.
Delete Account — Final Confirmation Screen
1. UI Elements (What the User Sees)

   ●​ Navigation: Back arrow icon (←) at the top-left, Close icon (×) at the top-right — both
      present on this screen.
   ●​ Eyebrow/Context Label: Small gray text "Delete my account" above the main heading,
      consistent with the previous survey screen.
   ●​ Title: Bold heading "Delete your Bookflow Account".
   ●​ Warning Text: Gray body copy explaining the consequence: "This action will delete your
      account and you won't be able to retrieve it. Please confirm you understand by ticking
      the below statement:"
   ●​ Confirmation Checkbox: Single unchecked checkbox paired with the label "I know I
      won't be able to access my client bookings." (two-line label).
   ●​ Divider: Thin horizontal rule separating the content from the CTA, matching the pattern
      from the previous screen.
   ●​ CTA Button: Full-width solid red pill-shaped button reading "Delete account" — color
      shift from black (seen on prior screens' CTAs) to red here, signaling the point of
      irreversible commitment.

2. Layout Notes

This directly answers the flag raised on the earlier survey screen — the "one more explicit
confirmation" step does exist, and it uses a gate-checkbox pattern (button likely disabled until
checkbox is ticked) rather than re-entering a password or typing "DELETE." Having both back
arrow and close icon on the same screen is slightly redundant — worth confirming both are
intentional or if one should be dropped for clarity, since they'd likely behave identically here
(return to Settings or the previous flow step).

3. User Interactions & Action Flows

A. Tap Back Arrow (←)

   ●​ Frontend Action: Returns to the previous screen in the deletion flow (the
      exit-survey/reason-selection screen).
   ●​ Backend / System Action: None — preserves or discards prior survey selection
      depending on desired flow behavior (worth defining).

B. Tap Close (×)

   ●​ Frontend Action: Dismisses the entire deletion flow, returns to Settings.
   ●​ Backend / System Action: None — cancels deletion, no account changes made.

C. Tap Checkbox
   ●​ Frontend Action: Toggles checked/unchecked state; likely enables the "Delete account"
      button only once checked (button should be disabled/inactive by default given the
      severity of the action).
   ●​ Backend / System Action: None — local form state only.

D. Tap "Delete account" (enabled state)

   ●​ Frontend Action: Disables the button, renders inline loading state, prevents duplicate
      taps.
   ●​ Backend / System Action:
         ○​ API call to the account-deletion endpoint, passing the authenticated user's
             identity.
         ○​ Response Handling:
                 ■​ Success: Clears local session/auth state and any cached user data,
                      routes to a logged-out confirmation screen or directly to onboarding/login.
                 ■​ Failure: Displays inline error or toast (e.g., "We couldn't delete your
                      account, please try again or contact support") — should not silently fail
                      given the user has explicitly opted to leave.
Account Deletion — Success Confirmation Screen
1. UI Elements (What the User Sees)

   ●​ No navigation icons: No back arrow or close icon present — this is a terminal state
      screen, deliberately removing any way to navigate backward into a now-deleted account.
   ●​ Status Icon: Large centered circular badge with a purple-to-magenta gradient fill and a
      white checkmark, signaling successful completion.
   ●​ Title: Bold two-line heading "Your account has been deleted".
   ●​ Body Message: Centered gray text — "We'll miss you around here! If you need
      anything at all before you head out, feel free to reach out to support@mugu-labs.com."
   ●​ Divider: Thin horizontal rule separating content from the CTA, consistent with the prior
      two screens in this flow.
   ●​ CTA Button: Full-width solid black pill-shaped button reading "Done".

2. Layout Notes

This screen closes out the full deletion flow (Settings → reason survey → confirmation checkbox
→ this success state) with a warm, low-friction sign-off rather than a cold system message —
consistent tone with the earlier "We're sad to see you go!" screen. The gradient checkmark
badge is a distinct visual treatment not seen elsewhere in the flows reviewed so far — worth
confirming this asset/style is reserved for terminal success states specifically, or if it's part of a
broader icon system.

3. User Interactions & Action Flows

A. Tap "Done"

   ●​ Frontend Action: Dismisses the screen and routes the user out of the app's
      authenticated context entirely — likely lands on the logged-out landing screen, login
      sheet, or onboarding entry point, since no valid session exists anymore.
   ●​ Backend / System Action: None required at this point — the account and session were
      already cleared in the previous step's API call. This tap is purely a navigation/UI action
      confirming the user has seen the message.

B. Tap "support@mugu-labs.com" (if tappable/hyperlinked)

   ●​ Frontend Action: Opens the device's default mail client with a pre-filled "To:" address, or
      copies the address to clipboard.
   ●​ Backend / System Action: None (client-side mailto action).
