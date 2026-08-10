> Derived analysis, not source. `docs/source/` is authoritative; where this file and the source disagree, the source wins.

# Open questions and ambiguities flagged by the design-doc author

Three screens carry a formal "4. Open Questions Worth Resolving" section — Opening Hours & Location, Calendar Tab, and My Services (empty state). Everything else is flagged inline. All quotes are verbatim from `docs/source/DD-Bookflow-Native.md`; line references are to that file.

Per `docs/README.md`: "Point 4 must be resolved by a human before the affected screen is built — these are not to be guessed at."

---

## Email Verification — "Enter your code"

- "worth confirming this is intentional given it's an 8-digit code (longer than the typical 4-6 digit OTP, making a single field more error-prone for the user to track digit count)" (`:122`)
- "**Possibly** client-side validation for exactly 8 numeric characters before enabling 'Verify'." (`:139`)
- "the pending unverified account **likely** remains in a 'pending' state server-side" (`:131`)
- "though this implies the user is abandoning activation of the account they just created, which may leave it in an unverified/pending state" (`:166`)
- "**Likely** disables the link temporarily and shows a cooldown state (e.g., 'Resend in 30s') to prevent spam-triggering new codes." (`:157`)

## Business Branding Onboarding

- "Worth clarifying whether this data becomes visible on the client webapp immediately upon save, or only once the full onboarding flow (all steps) is completed and the salon 'goes live' — an owner may not want a half-finished profile (no team members yet, no services yet) visible to real clients mid-setup." (`:240`)
- "Required-field validation — 'Next' **likely** disabled until non-empty, since the client-facing page presumably can't render a salon listing without a name." (`:211`)

## Team Member Onboarding

- "this is functionally closer to a required field than a cosmetic one — worth confirming with the team whether validation should enforce that, even though '(optional)' tagging isn't shown here." (`:292`)
- "If a team member has no photo uploaded, the client webapp needs a defined fallback (initials avatar, placeholder silhouette, etc.) rather than a broken image." (`:310`)
- "transitions to the next step — **likely** repeats this form to add another team member, or advances the wizard once the owner is done adding staff." (`:315`) — the mechanism for adding a *second* team member is never resolved.
- "worth checking whether the booking flow gracefully handles a salon with zero team members listed (e.g., defaults to 'any available staff' or hides staff selection entirely)." (`:334`)

## Portfolio Onboarding

- "This screen's layout doesn't show any indication of multi-image support (no grid of uploaded thumbnails, no '+' to add more, no counter like '3/10 photos')." (`:362`)
- "If multi-select is supported, the user could pick several images at once; if single-select, the button likely needs to be tapped repeatedly to build out a full portfolio, and the UI should then show a running grid/list of what's been added so far with remove/reorder affordances (not visible in this static mockup state)." (`:376`)
- "implying 'Next' with zero images may still be allowed — worth clarifying if that's the intent, or if 'Next' should require at least one photo given 'Skip' already covers the zero-photo path" (`:392`)
- "an owner skipping this step means the client webapp needs a defined empty state for a salon with no portfolio yet (e.g., hide the gallery section entirely rather than showing a blank/broken grid)." (`:410`)

## Opening Hours & Location Onboarding *(formal Open Questions section)*

- "**Pin input method ambiguity:** Unclear whether 'Google Maps pin' expects the owner to paste a shared Google Maps link or whether tapping the field opens an in-app map for dropping a pin directly — worth deciding, since a pasted-link flow risks user error (wrong link, expired share link, or a link to a different location than intended)." (`:490`)
- "**No day pre-population or duplicate-day prevention:** As flagged previously, unclear if the owner must manually add all 7 days one-by-one via '+', or if there's a smarter default or 'copy to all days' shortcut." (`:494`)
- "**Client webapp fallback for no location pin:** Since the pin is optional, the client-facing profile needs a defined state for a salon with no mapped location — e.g., hide the map/directions section entirely, or show the business address as plain text if one exists elsewhere in the profile data." (`:497`)
- Inline: "opens a native map picker for dropping a pin directly (interaction model still to be confirmed — see open questions)." (`:465`)

## Login Modal

- The forgot-password description is unfinished and self-contradictory: "Navigates to password reset flow. **The user is prompted to enter their password.** Upon submitting, the user sees a new screen open which is:" (`:546`) — the sentence ends on a dangling colon, and "password" appears where "email" is clearly meant, since the very next bullet reads "once email is submitted on the next screen".
- "**Failure (404 Not Found):** Displays error indicating no account exists for that email (or generically folded into the 401 message for security best practice)." (`:568`) — left undecided.

## Bookings Dashboard — "Bookings" tab

- Part 1 promises "the **finalized** cancellation email copy" (`:658`), but Part 2 still gives the dialog copy as placeholders: "(e.g., 'Are you sure you want to cancel this booking? The client will be notified by email.')", "(e.g., 'Yes, cancel booking')", and "(e.g., 'Go back' or 'Keep booking')" (`:641`). The reinstate affordance is likewise "A link or button (e.g., 'Reinstate booking?')" (`:646`).
- "likely also benefits from its own lightweight confirmation step given it re-activates a booking the client was already told was cancelled." (`:761`)
- "API call updating the booking record's status back to booked (or possibly straight to confirmed, if the deposit was already verified prior to cancellation — **worth deciding which state it should return to**)." (`:764`)
- "**Should** trigger a follow-up email to the client letting them know their booking has been reinstated, so they aren't left with stale 'this is cancelled' information — **exact copy to be defined**, but should mirror the tone/structure of the confirmation and cancellation templates." (`:767`)
- "**Fetches (or filters locally from)** bookings matching the selected status." (`:779`)

## Calendar Tab *(formal Open Questions section)*

- "**Sync timing between client bookings and this calendar:** Needs to be defined whether a new client booking appears here immediately (live sync) or only after a refresh/reload, since the owner may be actively viewing their day while a client books a conflicting or adjacent slot." (`:920`)
- "**Visual differentiation by booking status:** The single visible block is a flat blue color with no distinction shown for 'Booked' vs. 'Confirmed' vs. 'Cancelled' bookings (statuses established in the Bookings tab) — worth deciding whether the calendar should color-code or otherwise visually flag booking status here too, so the owner isn't just seeing undifferentiated time blocks." (`:924`)
- "**No label on the booking block:** At this zoom level the block shows no text (service/client/time) — needs a defined interaction (tap-to-expand, or a minimum block height before text renders) so the owner can identify what's booked without leaving the calendar view." (`:929`)
- "**Cancelled bookings' calendar treatment:** Given the reversible cancel/reinstate flow established in the Bookings tab, unclear whether a cancelled booking's time slot disappears from this calendar entirely, gets visually marked as cancelled but still shown, or is only removed once reinstatement is no longer possible." (`:933`)
- Inline: "**Likely** opens a view-mode switcher (Day / Week / Month / Agenda)" (`:899`); "(e.g., dots or highlights on days with bookings — not visible in this static crop but a common pattern worth considering)" (`:878`); "which may need a tap-to-reveal or hover/press interaction to surface details." (`:863`)

## Help Center

- "No sheet/modal chrome (no grab handle, no back arrow) — **this reads as a standalone web page, not a native app screen**, which tracks with the '@2026 mugu-labs.com' footer." (`:1016`) — leaves unresolved whether this is a native screen, a webview, or an external site.

## Log Out Confirmation Modal

- The author's own instruction in the section preamble: "**Kindly make corrections on color selection if you find any. Colors should be standard with the app theme and style.**" (`:1056`)

## My Services — Empty State *(formal Open Questions section)*

- "**Zero-services impact on the client webapp:** Since this screen explicitly shows what happens when no services exist yet, worth confirming how the client-facing webapp behaves for a salon with an empty menu — likely needs to either hide the 'Book now' entry point entirely or show its own appropriate empty/coming-soon state, rather than presenting a blank or broken booking flow." (`:1188`)
- "**Ordering/visibility control:** Not shown here, but once services exist, worth checking whether the owner can reorder, temporarily hide, or archive individual services without deleting them — relevant since clients are booking live off this list and a owner may want to pause a service without losing its history/configuration." (`:1193`)
- "**Service-to-team-member association:** Given the earlier team member setup step, unclear whether adding a service here also lets the owner specify which staff member(s) offer it, which would directly affect how the client webapp's booking flow presents staff selection per service." (`:1197`)
- Inline: "likely capturing fields such as service name, description, duration, price, and possibly a category or which team member(s) can perform it" (`:1168`)

## Settings Screen

- "This is a slightly inconsistent affordance pairing worth flagging (see below)." (`:1274`) — the key icon signals an in-app transition and the diagonal arrow an external one, yet all three rows share the same trailing chevron.
- "**Should** trigger a confirmation step (modal/dialog) before proceeding — not shown in this mockup, but expected given the destructive/irreversible nature of the action. No inline spinner/disabled state visible here either." (`:1305`) — later self-resolved by the exit-survey screen.

## Delete Account — Exit Survey

- "If 'Something else (Tell us more)' is selected, likely reveals an inline text input for free-form feedback (**not shown in this mockup — needs definition**)." (`:1424`)
- "Validates that a reason is selected (button may be disabled/inactive until a selection is made — **not visually indicated in this mockup**)" (`:1438`)
- "**If this is the final step:** calls the delete-own-account Supabase Edge Function, clears session, routes to logged-out state. **If not final:** navigates to a subsequent confirmation screen." (`:1445`)
- "(note: leading space before 'The' in the source label)" (`:1398`)
- "Tap 'support@mugu-labs.com' (**if tappable/hyperlinked**)" (`:1430`)

## Delete Account — Final Confirmation

- "Having both back arrow and close icon on the same screen is slightly redundant — worth confirming both are intentional or if one should be dropped for clarity, since they'd likely behave identically here (return to Settings or the previous flow step)." (`:1471`)
- On tapping back: "**Backend / System Action:** None — preserves or discards prior survey selection depending on desired flow behavior (**worth defining**)." (`:1482`)
- On the checkbox: "**likely** enables the 'Delete account' button only once checked (button should be disabled/inactive by default given the severity of the action)." (`:1491`)
- The layout note records what the author had to resolve by inference rather than by spec: "it uses a gate-checkbox pattern (button likely disabled until checkbox is ticked) rather than re-entering a password or typing 'DELETE.'" (`:1470`)
- Failure copy is a placeholder: "Displays inline error or toast (e.g., 'We couldn't delete your account, please try again or contact support') — should not silently fail given the user has explicitly opted to leave." (`:1506`)

## Account Deletion — Success Confirmation

- "The gradient checkmark badge is a distinct visual treatment not seen elsewhere in the flows reviewed so far — worth confirming this asset/style is reserved for terminal success states specifically, or if it's part of a broader icon system." (`:1528`)
- On tapping Done: "routes the user out of the app's authenticated context entirely — **likely** lands on the logged-out landing screen, login sheet, or onboarding entry point, since no valid session exists anymore." (`:1536`)
- "Tap 'support@mugu-labs.com' (**if tappable/hyperlinked**)" (`:1543`) — the same unresolved hedge as on the exit-survey screen.
