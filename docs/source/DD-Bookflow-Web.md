Bookflow Web — Salon Profile Page
(Client-Facing Landing)
Overall Page Structure
Single-column, mobile-first vertical layout (appears to target a max-width mobile viewport,
~420–480px, centered on larger screens). The page is divided into two clear zones:

   1.​ Hero/Gallery zone — full-bleed image banner filling the top ~55–60% of the first
       viewport
   2.​ Content card zone — a rounded-top "sheet" that overlaps the bottom of the hero image,
       containing all salon information, scrollable below

This overlapping-sheet pattern (image bleeding to the top edge, content card with large rounded
top corners floating over it) should be built as a fixed hero container with the content card given
a negative top margin (roughly 24–32px overlap) and a border-radius only on the
top-left/top-right corners (something like 24–32px radius).




1. Hero / Image Gallery Section
   ●​ Full-width image carousel/gallery, edge-to-edge (no side padding), fixed aspect ratio
      (roughly 4:3 or a bit taller — landscape-oriented photo of the salon interior).
   ●​ Swipeable/scrollable carousel — implied by the "1/6" counter badge, meaning there
      are 6 total images the client can swipe or arrow through.
           ○​ Counter badge: pill-shaped, positioned bottom-right of the image with padding
                inset from edges (~16–20px from right/bottom edge), small rounded-pill
                background with translucent/frosted look, white numeral text, small font size
                (~14px), format "current/total."
   ●​ Two partial/cropped thumbnail strips peeking in from the left and right edges of the
      hero image — these are the adjacent carousel images bleeding in at maybe 15–18%
      width each, giving a visual cue that there's more content to swipe to on either side (a
      "peek" carousel pattern, not a strict full-bleed single image). These side peeks should be
      rendered as a slightly shorter/inset rectangle near the top of the hero (not spanning the
      full image height) — roughly the top 20% height of the hero, positioned at the very
      top-left and top-right corners with a small margin from the top edge.
   ●​ Share icon button — top-right area of the hero, circular button (~56px diameter) with a
      solid filled circular background, drop shadow for elevation, containing a standard "share"
      icon (three connected nodes glyph). Tappable — triggers native share sheet or copy-link
      functionality. Positioned with consistent padding from the top and right edges
      (~20–24px), same vertical alignment as the left thumbnail peek.
   ●​ No back button or top nav visible in this shot — page likely reached via direct link/QR
      code, so no header chrome needed, or a back button exists above this scroll position.


2. Content Card (rounded-top sheet)
2a. Title Block

   ●​ Salon name — large, bold, serif-adjacent or heavy sans headline (largest text on page,
      ~36–40px), left-aligned, sits directly at the top of the card with generous top padding
      under the overlap curve.
   ●​ Tagline — directly below the name, rendered in an italic script/handwriting-style font
      (decorative, cursive), medium size (~24–28px), single line, left-aligned, adds a
      personal/branded touch distinct from all other typography on the page. This is a distinct
      font family from the rest of the UI — treat as a special "brand tagline" text style.
   ●​ Generous vertical spacing (~24–32px) after the tagline before the next section.

2b. Category Label

   ●​ Category/type tag ("Barber") — medium-weight, muted/secondary text treatment, larger
      than body text but clearly subordinate to the salon name (~24px), left-aligned,
      standalone on its own line, functions as a simple descriptor label rather than a
      chip/badge (no border or background — just text).

2c. Rating & Hours Row

Single horizontal row, left portion and right portion, space-between or left-clustered-with-gap
alignment:

   ●​ Rating cluster (leftmost):
         ○​ Star icon (filled star glyph, ~20–24px)
         ○​ Numeric rating (e.g. "5.0") — bold, medium size, immediately right of star
         ○​ Review count in parentheses (e.g. "(1,739)") — styled as a tappable link
             (distinct link-colored text, no underline), positioned right after the numeric rating
         ○​ This entire star+rating+count cluster is interactive: tapping the star (or the
             whole cluster) opens a rating modal/popover (see section 3 below).
   ●​ Hours cluster (right of rating, same row):
         ○​ Clock icon (outline circular clock glyph, ~20–24px)
         ○​ Status word ("Open") — bold, uses a semantic "positive/active" text treatment
             distinct from surrounding text (should read as a status indicator, e.g.
             green-equivalent semantic styling, but implementation detail of color is separate)
         ○​ Closing time text ("until 24:00") — secondary/muted weight, smaller emphasis
             than "Open," directly following
           ○​ This entire cluster is dynamic/live data — pulled from the salon owner's mobile
              app hours configuration; should reflect real-time open/closed status and update
              accordingly (e.g. "Closed · Opens at 9:00" as an alternate state).

2d. About Section

   ●​ Section header "About" — bold, medium-large (~24px), left-aligned, standalone
      heading style consistent with any future section headers on this page (establishes a
      pattern: bold sans headers for each content block).
   ●​ Body paragraph — regular weight, comfortable line-height for readability (~1.5),
      standard body copy size (~16–17px), left-aligned, multi-line, truncated after 4 lines with a
      "Read more" inline link appended directly after the ellipsis truncation point (not on its
      own line — flows inline at the end of the last visible line). Tapping "Read more" should
      expand the text in place (accordion-style) or open a modal/sheet with the full about text.
      The link text itself is bold and uses link-distinct styling.

2e. Divider

   ●​ A thin horizontal rule spanning most of the card width (with side margins, not
      full-bleed), separating the About section from the closing CTA block below. Simple 1–2px
      line weight.

2f. Bottom CTA Block

Two-part horizontal row, content left-aligned as a stacked two-line prompt, button right-aligned:

   ●​ Prompt text (left side): two lines of italic body text stacked tightly:
         ○​ Line 1: "Ready for a fresh look?"
         ○​ Line 2: "Check out our 5 services" — note the "5" is dynamic, pulled from the
            actual service count configured in the mobile app; this copy should be generated
            programmatically (e.g. Check out our {serviceCount} services)
         ○​ Both lines same size (~18–20px), italic style, left-aligned, tight line-height
            between the two lines (functions as one cohesive statement).
   ●​ "BOOK NOW" button (right side):
         ○​ Pill-shaped (fully rounded ends), solid dark/filled background with a
            bordered/outlined edge treatment (appears to have a subtle inset border creating
            a two-tone pill look)
         ○​ Bold, uppercase, letter-spaced label text
         ○​ Prominent shadow/elevation to make it pop as the primary CTA
         ○​ Compact height relative to width (~44–52px tall), fixed padding left/right
            (~24–28px)
         ○​ This is the primary action of the entire page — tapping should navigate to the
            services list / service selection screen (the natural next step in the booking flow),
            likely a slide-up sheet or new route (/salon/{id}/services or similar).
           ○​ Should remain easily tappable/thumb-reachable; consider whether this should
              also appear as a sticky/fixed footer button when the user scrolls further down
              the page (common pattern for booking flows — worth flagging to the developer
              as a UX consideration even though this screenshot shows it inline).




3. Rating Interaction (behavior spec, not visible in
screenshot but per your description)
Since this is functional spec rather than pure visual, describe as an interaction requirement:

   ●​ Trigger: tapping the star icon or the rating/count cluster in section 2c.
   ●​ Resulting UI: a modal or bottom sheet appears containing:
          ○​ A row of 5 selectable star icons (empty/outline by default, filling on tap/hover up
              to the selected value) — standard star-rating input component.
          ○​ Below the star selector, a call-to-action to leave feedback that composes a
              mailto: link — pre-addressed to the salon owner's email (sourced from the
              mobile app's business profile data), likely pre-filled with a subject line referencing
              the salon name and the selected star rating.
          ○​ Modal should have a clear dismiss affordance (close icon top-right or
              tap-outside-to-dismiss) and a primary submit/send button.
          ○​ Consider a lightweight confirmation state after the mail action is triggered
              ("Thanks for your feedback!") before closing.
   ●​ This modal's rating submission is presumably what aggregates into the "5.0 (1,739)"
      display value shown on the page — so the developer should treat the displayed
      rating/count as a computed aggregate from a ratings table, not static profile data.




Data Source Summary (for developer context)
To make the sync between mobile app and webapp explicit:

                   Element                                           Source

 Salon name, tagline, category, about text,       Synced from salon owner's mobile app
 gallery images, service count, hours             profile

 "Open/Closed until X"                            Computed live against current time vs.
                                                  mobile-app-configured business hours
Star rating average + review count            Aggregated from webapp client ratings (not
                                              mobile app)

Owner email for feedback mailto               Sourced from mobile app account/profile
                                              settings




Component Reusability Notes
  ●​ The rounded-pill button style (BOOK NOW) and counter badge style (1/6) look like
     they belong to a shared design system — worth building as reusable Pill/Badge
     components early since they'll likely recur on service-selection and booking-confirmation
     screens.
  ●​ The section header + body + optional divider pattern (as seen in "About") is likely a
     reusable ProfileSection block for future sections (e.g., Location, Reviews list,
     Team).
  ●​ The rating cluster and hours cluster should be built as small reusable inline
     components since they'll likely reappear in salon list/search cards elsewhere in the app.
Bookflow Web — Services Page
Overall Page Structure
Continuation of the same single-column, mobile-first layout established on the salon profile
page. This page is reached by tapping the persistent "BOOK NOW" button. It introduces the
primary in-page navigation pattern for the salon's public profile — a horizontal tab bar — that
presumably sits above all core profile sub-pages (Services, Team, Reviews, Portfolio).




1. Top Tab Navigation
   ●​ Horizontal tab bar, four items: "Services," "Team," "Reviews," "Portfolio."
   ●​ Left-aligned as a group, evenly spaced with comfortable gaps (~40–48px between
      labels) rather than stretched full-width or evenly distributed edge-to-edge — reads as a
      left-anchored cluster, not a full-width segmented control.
   ●​ Active tab indicator: the selected tab ("Services") is bold weight, with a short underline
      bar directly beneath just that label (not spanning the full tab bar width — the underline is
      scoped to the width of the active label only, positioned with a small gap below the text).
   ●​ Inactive tabs use regular/lighter font weight, same size as active tab, no underline.
   ●​ This should be built as a reusable ProfileTabs component that persists across
      Services/Team/Reviews/Portfolio routes, with the underline animating/sliding to the
      newly selected tab on click (standard tab-switcher behavior) — each tab navigates to its
      own route or swaps content in place via client-side routing.
   ●​ Sits at the very top of the content area with standard side padding matching the rest of
      the page content; no card/background treatment, just plain text on the page background.


2. Page Heading
   ●​ "Services" — large bold heading, same heading scale as other primary section headers
      established on the profile page, left-aligned, positioned below the tab bar with generous
      top spacing (~32–40px) separating it from the tabs above.


3. Services List Section
   ●​ The entire services list sits within a subtly shaded/inset background block — a
      full-width band with a faint background tint distinct from the pure-white page background,
      visually grouping the list of service cards as one section (like a "well" or "tray"). This
      band has padding on all sides containing the stacked cards.
  ●​ Service cards: vertically stacked, one per service, full-width within the shaded band,
     each with generous side/internal padding.
         ○​ Card shape: rounded rectangle (moderate corner radius, ~16–20px), white/light
             card surface with a thin border or subtle outline distinguishing it from the shaded
             band behind it (no heavy shadow — flat, bordered card style).
         ○​ Consistent vertical gap between stacked cards (~20–24px).
         ○​ Card internal layout, top to bottom on the left column:
                   1.​ Service name ("Shaping & Defining The Beard") — bold, largest text
                       within the card, left-aligned, top of card.
                   2.​ Duration ("20 mins") — secondary/muted weight and lighter tone than the
                       name, positioned directly below the name.
                   3.​ Price ("KES 400") — bold, larger than duration text, uses a distinct
                       semantic "price" color treatment differentiating it from the black name/gray
                       duration text (a green-family accent, though per your instruction I won't
                       dictate the exact color — just flag that price gets its own accent treatment
                       consistently across all cards).
         ○​ "Book" button — positioned top-right of each card, vertically centered against
             the service name (roughly aligned with the first line of text rather than the full card
             height). Pill-shaped (fully rounded), outlined/bordered style (transparent or white
             fill with a border, not solid-filled) — visually lighter-weight than the primary
             "BOOK NOW" CTA at the bottom of the page, marking it as a
             secondary/contextual action tied to that specific service.
         ○​ Tapping "Book" on a given card should carry that service's context (id, name,
             price, duration) forward into the next screen (the booking flow you'll show next)
             — so the component needs to pass service data on click, not just navigate blank.
         ○​ This card should be built as a reusable ServiceCard component, since the
             same "name / duration / price / book button" shape will likely repeat identically
             across however many services the salon has configured (data-driven list
             rendering from the mobile app's services array).
  ●​ List currently shows 3 example cards with identical placeholder content — treat as a
     .map() over a services array of arbitrary length (your reference text confirms "5
     services" total, so expect the shaded band to grow/scroll accordingly).


4. Divider
  ●​ Same thin horizontal rule style as seen on the profile page, spanning the width of the
     content area (with side margins), separating the services band from the bottom CTA
     block.


5. Bottom CTA Block (Persistent)
  ●​ Identical in style and layout to the profile page's bottom block: italic two-line prompt text
     on the left ("Ready for a fresh look? / Check out our {serviceCount} services") paired with
     the pill-shaped "BOOK NOW" button on the right.
  ●​ Per your note, this entire block (or at least the BOOK NOW button) persists across
     all client-facing pages except the Help Center. Implementation-wise this suggests:
         ○​ Build it as a shared layout-level component (e.g., a persistent footer/CTA bar
              rendered in a root layout wrapping all salon-profile routes), rather than duplicating
              it per-page.
         ○​ Should be excluded specifically on Help Center route — so the layout needs a
              conditional render based on current route/path.
         ○​ Worth flagging to the developer: decide whether this should become a
              sticky/fixed-position footer (always visible without scrolling) rather than an
              inline block repeated at the bottom of page content — given it's described as
              persistent and is the primary conversion action, a fixed footer bar is the more
              standard pattern and likely the intent here, especially once pages grow longer
              (Team/Reviews/Portfolio will have more content). I'd recommend flagging this
              decision back to you before implementation, since the screenshot shows it inline
              but the "persists across all pages" behavior strongly implies fixed positioning.




Component Reusability Notes (carried forward + new)
  ●​ ProfileTabs — new shared component for Services/Team/Reviews/Portfolio
     navigation, active-state underline logic.
  ●​ ServiceCard — new reusable card component, data-driven from mobile app services
     list.
  ●​ BookNowFooter — the persistent bottom CTA block, likely promoted to a layout-level
     fixed component, conditionally hidden on Help Center.
  ●​ Outlined pill button (secondary "Book" per-card) vs. filled pill button ("BOOK NOW"
     primary) — establish these as two distinct button variants (variant="outline" vs
     variant="solid") in the shared button component system, since both patterns will
     likely recur elsewhere (e.g., Team member "Book" actions).
Bookflow Web — Home/Overview Scroll
(Services Preview + Team Preview)
Context Note
This screen appears to be a different view from the full Services tab shown previously —
here only 2 service cards are shown (not the full list), followed by a "See all" button, and then a
Team preview section beneath it. This suggests the page structure is actually: a combined
overview/landing scroll (reached perhaps from the salon profile's "Book Now" or as the default
landing under the tab bar) that shows a truncated preview of each section (Services preview
→ Team preview → presumably Reviews preview → Portfolio preview further down), each
capped at a few items with a "See all" link to the corresponding full tab. Worth confirming with
you, but I'll describe it as such — a SectionPreview pattern reused across
Services/Team/Reviews/Portfolio.




1. Top Tab Navigation
   ●​ Identical to the previous page: "Services / Team / Reviews / Portfolio" horizontal tab bar,
      "Services" active with underline indicator. Same persistent component (ProfileTabs).


2. Services Preview Section (truncated)
   ●​ Same shaded/inset background band and ServiceCard component as previously
      described, but here limited to 2 cards rather than the full list (or all 5) — a deliberate
      truncation for the overview page.
   ●​ "See all" button — appears directly below the last service card, still within the shaded
      band:
          ○​ Full-width pill button (fully rounded ends), outlined style (border only, no fill) —
              matches the visual weight of the secondary "Book" buttons rather than the
              primary solid "BOOK NOW" CTA.
          ○​ Centered bold label text ("See all").
          ○​ Tapping this should navigate to the full Services tab (the page shown in the
              previous screenshot), i.e. this is the "expand to full list" action for the truncated
              preview.
          ○​ This button pattern (full-width outlined pill, "See all" label) should be built as a
              reusable SeeAllButton component since it will likely reappear identically for
              Reviews and Portfolio preview sections.
3. Section Divider
  ●​ A plain, full-width horizontal rule (no side margins this time — spans edge to edge)
     marking the transition from the shaded Services band into the plain-background Team
     section. Thinner/lighter weight than the divider used near the bottom CTA block —
     functions purely as a section boundary, not a strong visual separator.


4. Team Preview Section
4a. Section Header Row

  ●​ Horizontal row with two elements:
        ○​ "Team" — left-aligned, large bold heading, same heading scale as "Services"
            heading used elsewhere.
        ○​ "See all" — right-aligned on the same row as the heading, styled as a plain text
            link (distinct link color, no button chrome/border — different treatment from the
            full-width pill button used in the Services section above). Smaller/lighter weight
            than the "Team" heading itself.
        ○​ This header+see-all-link row pattern is worth building as a reusable
            SectionHeader component (label left, optional "See all" link right) since it'll
            likely repeat for Reviews and Portfolio sections too.

4b. Team Member Cards (horizontal row)

  ●​ Three team member items displayed side-by-side in a horizontal row (equal-width
     columns, evenly spaced), each consisting of:
         1.​ Circular profile photo — large circular avatar (roughly equal width across all
             three, sized to comfortably fill each column, ~110–120px diameter), photo
             cropped/masked to a perfect circle, headshot-style images (from mobile app
             team data).
         2.​ Rating badge — small pill-shaped badge overlapping the bottom edge of the
             circular photo (positioned so it sits partially on top of the avatar, bottom-center
             or bottom-left overlap), containing a small filled star icon + numeric rating (e.g.
             "4.9," "5.0"). White/light pill background with a border, creating a "floating badge"
             effect over the photo. This should be built as a small reusable RatingBadge
             component (same visual pattern as the star+number used on the main profile
             page rating cluster, but compact and pill-contained).
         3.​ Team member name — positioned below the photo/badge, centered under each
             avatar, medium-bold weight. Names include bilingual/dual-script text (Latin
             name followed by Arabic script, e.g. "Rifat / ‫ — )"رفعت‬the layout needs to support
             RTL script rendering inline after the LTR name, and should truncate gracefully
             with ellipsis if the name is long (visible in "Mouhamad…" being cut off) — so
             apply text-overflow: ellipsis with white-space: nowrap (or a
             max-line clamp) per column, since column width is fixed/equal regardless of
             name length.
         4.​ A thin underline appears beneath each name (visible in the screenshot as a
             horizontal rule directly under the row of names) — this could be a shared
             underline spanning the full row rather than per-name; worth implementing as a
             single full-width thin divider positioned just under the baseline of the names row,
             purely decorative/structural, closing off the Team section before the CTA block.
  ●​ Each team member card should be tappable — likely navigating to a team member
     detail/profile view or filtering the services/booking flow by that specific stylist (common
     pattern: "book with this person specifically"). Given the mobile-app-sourced data (photo,
     name, rating) and the booking-app context, I'd suggest flagging this to confirm expected
     tap behavior before implementation — it's not fully explicit from the screenshot alone, but
     "Book" flows for salons commonly let you pick a specific team member as a step.
  ●​ This entire 3-across layout should be built as a reusable TeamMemberCard component
     rendered in a horizontal scroll or fixed 3-column grid — worth checking whether more
     than 3 team members should scroll horizontally within this preview (likely, since "See all"
     implies more exist beyond these 3) versus wrapping to a new row (unlikely, given the
     preview/truncated nature of this section).


5. Bottom CTA Block (Persistent)
  ●​ Same "Ready for a fresh look? / Check out our 5 services" + "BOOK NOW" pill button
     block as previously described — consistent shared BookNowFooter component/layout
     element.




Data Source Summary Addition
             Element                                         Source

Team member photos, names,            Synced from salon owner's mobile app (owner
individual ratings                    adds/manages team roster)


Component Reusability Notes (carried forward + new)
  ●​ SectionPreview — wrapper pattern for a heading + limited items + "See all" action,
     reused across Services/Team/Reviews/Portfolio on this overview page.
  ●​ SeeAllButton — full-width outlined pill, used to expand a shaded/banded section (e.g.
     Services).
  ●​ SectionHeader — heading + optional "See all" text link, used for un-banded sections
     (e.g. Team).
●​ TeamMemberCard — circular photo + overlapping rating badge + bilingual name,
   equal-width column layout.
●​ RatingBadge — small star+number pill, distinct compact variant from the larger rating
   cluster on the main profile page — confirm whether these should literally be the same
   component at different sizes for consistency.
Bookflow Web — Full Profile Scroll: Team
→ Reviews → Portfolio → Opening Times
Structural Insight (important correction/confirmation)
Looking at all three screenshots together, this confirms the page is one continuous
vertically-scrolling page, not separate routed views. The tab bar ("Services / Team / Reviews /
Portfolio") functions as an anchor-link navigator — tapping a tab scrolls the page to that
section's position rather than routing to a new page. This is evidenced by each screenshot
showing the tail-end of the previous section bleeding into the top of the next (e.g., Image 1
shows Team + start of Reviews; Image 2 shows end of Reviews + start of Portfolio; Image 3
shows full Portfolio + Opening Times).

Implementation guidance for the developer: build this as a single scrollable page with
id-tagged section anchors (#services, #team, #reviews, #portfolio), and have the
ProfileTabs component scroll to (scrollIntoView) the matching section on click, while
also using an IntersectionObserver (or scroll-position tracking) to update which tab shows
as "active" as the user scrolls naturally — the underline indicator should track scroll position, not
just click state.




1. Team Section (full, in-page — extends earlier preview)
This is the same Team section described previously, but now shown as the actual full-detail
version sitting in-page (not a separate "Team tab page") — so the earlier "See all" button likely
also just scrolls/expands to this same anchor, or this is simply the true full section and the
"preview" on the overview page is a shortened duplicate. Worth flagging to confirm behavior, but
structurally:

   ●​ Same header row: "Team" (bold heading) + "See all" (link, right-aligned) — note "See
      all" persists here even in the full-detail view, suggesting it may link to a dedicated full
      team roster page (e.g., if there are more than 3 team members total) rather than being
      purely an anchor-scroll — worth confirming, but implement as a route link (/team) rather
      than anchor-scroll for this instance if the team roster can exceed 3.
   ●​ Same 3-column TeamMemberCard layout: circular photo, overlapping star-rating badge,
      bilingual name.
   ●​ New addition here: each card now includes a role/specialty label beneath the name
      (e.g., "Waxing & Nail …", "Barber," "Barber") — muted/secondary text weight, smaller
      than the name, centered, same truncation-with-ellipsis behavior as the name field for
      longer labels. This should be added as an optional role field on the TeamMemberCard
      component (present here, absent in the shorter preview version if that's confirmed to
      differ).
   ●​ Section closes with a plain horizontal divider (thin, light weight, full content-width with
      side margins) before the Reviews section begins.




2. Reviews Section
2a. Section Header Row

   ●​ Same SectionHeader pattern: "Reviews" (bold heading, left) + "See all" (link, right) —
      tapping "See all" here should navigate to a dedicated full reviews list page/route, since
      reviews will likely paginate beyond what fits inline.

2b. Aggregate Rating Display

   ●​ Row of 5 large filled star icons — full-size decorative stars (not interactive here, purely
      a visual summary — larger than the small rating-badge stars used elsewhere),
      left-aligned, evenly spaced.
   ●​ Below the stars: numeric average + review count ("5.0 (1,739)") — bold numeric
      rating, followed by the count in parentheses styled as a tappable link (link-colored,
      matching the same treatment as the rating cluster on the original profile page). This is
      the same aggregate value shown at the top of the salon profile page — should pull from
      the same computed source (single source of truth, not duplicated logic).
   ●​ A thin horizontal divider directly beneath this summary block, separating it from individual
      review entries.

2c. Individual Review List

Each review entry follows a consistent repeating pattern, stacked vertically with generous
spacing between entries:

   ●​ Avatar (left): circular avatar showing the reviewer's initials (e.g., "AH," "A," "S") rather
      than a photo — each avatar uses a distinct background color per reviewer (appears to
      be either a fixed per-user color or randomly/hash-assigned from a palette — recommend
      hashing the user's name/id to a consistent color so it's stable across visits, a common
      pattern for initial-avatars).
   ●​ Reviewer name (top-right of avatar): bold, medium weight.
   ●​ Timestamp (directly below name): muted/secondary text, formatted as full date + time
      (e.g., "Sat, 8 Aug 2026 at 20:56") — should be generated from a stored datetime and
      formatted consistently across all entries.
   ●​ Star rating for that specific review (below name/timestamp block): row of small filled
      stars representing that reviewer's individual rating (appears as 5 filled stars per example,
      but should support partial ratings 1–5).
   ●​ No written review text visible in these examples — either reviews are rating-only, or
      written comments are optional and simply absent here; worth confirming whether a
      text/comment field should be supported and rendered under the stars when present.
   ●​ This should be built as a reusable ReviewCard (or ReviewListItem) component:
      avatar (initials + color), name, timestamp, star row, optional comment text.
   ●​ Reviews appear ordered most-recent-first (descending by timestamp based on the dates
      shown).

2d. Add-a-Review Interaction (per your description)

Since this is behavior rather than pure visual, note as an interaction spec attached to this
section:

   ●​ The large 5-star row at the top of the Reviews section (2b) is the entry point for a
      client to leave their own review — clicking/tapping on it should open a review
      submission interface (likely a modal or inline expandable form) rather than being
      purely decorative.
   ●​ Submission flow should include:
          ○​ An interactive 5-star selector (tap to select 1–5 stars, filling stars up to the
               selected value on hover/tap — same pattern as the rating modal described on
               the original profile page).
          ○​ Likely an optional comment/text field for a written review, given the review list
               structure supports it.
          ○​ A submit action that appends the new review to the top of the list (optimistic UI
               update) and updates the aggregate average/count shown in 2b.
   ●​ Relationship to the earlier-described profile-page star click: on the original salon
      profile page you mentioned the star triggers a rating flow tied to a mailto for direct
      feedback to the owner — this Reviews-section star interaction is the on-platform public
      review counterpart (visible to other clients, contributes to the aggregate), which is a
      distinct flow from the private mailto feedback. Worth confirming with you whether these
      are meant to be the same modal/action or genuinely two separate features (private email
      feedback vs. public star review) — I'd flag this as a point to clarify before
      implementation, since they could easily be conflated by the developer otherwise.
   ●​ Consider whether an already-reviewed client should see their existing review
      pre-filled/editable versus being able to submit duplicate reviews — a business-logic
      decision worth deciding before building the submission flow.




3. Portfolio Section
3a. Section Header

  ●​ "Portfolio" heading (bold, same scale as other section headers) followed immediately
     by a count badge — small circular/pill outline containing the total image count ("9"),
     positioned right next to the heading text (inline, not right-aligned like the "See all" links
     elsewhere). This is a simple numeric indicator, not interactive.
  ●​ No "See all" link here since the full portfolio appears to render entirely in-section (all 9
     images shown at once via grid, not truncated).

3b. Image Grid

  ●​ 3-column square grid, 3 rows (9 images total matching the count badge), tight
     consistent gutters between cells (small gap, ~4–8px).
  ●​ Each grid cell: square aspect ratio, rounded corners (moderate radius, ~12–16px),
     image cropped/cover-fit to fill the square regardless of source aspect ratio.
  ●​ Images are synced from the mobile app — the salon owner uploads
     portfolio/work-sample photos via their mobile app management interface, and this grid
     should render them as a data-driven .map() over the portfolio images array (not
     hardcoded).
  ●​ Each grid image should be tappable, opening a full-screen lightbox/gallery viewer
     (swipeable through all 9 images) — a standard portfolio-grid interaction pattern;
     recommend building this as a reusable ImageGrid + Lightbox component pair since
     it's a common pattern likely reused if the app ever adds more image galleries elsewhere.
  ●​ Grid is followed by a thin horizontal divider before the Opening Times section.




4. Opening Times Section
4a. Section Header

  ●​ "Opening times" — bold heading, same scale as other section headers, left-aligned.

4b. Weekly Schedule List

  ●​ Vertical list, one row per day of the week (Monday, Tuesday, Wednesday shown —
     presumably continues through Sunday below the visible crop).
  ●​ Each row, left to right:
        1.​ Status dot — small filled circle indicating open/closed state for that day (appears
             as a positive/active-state color for open days; presumably a different/muted color
             or empty state for closed days — should be data-driven per day).
        2.​ Day name — medium weight, left-aligned, directly after the dot.
           3.​ Time range — right-aligned on the same row (e.g., "10:00 - 24:00"),
                regular/secondary weight, representing that day's open-to-close hours.
  ●​   This data is sourced from the salon owner's mobile app hours configuration (same
       source referenced for the "Open until 24:00" live status on the original profile page) —
       this section is the full weekly breakdown of that same underlying schedule data.
  ●​   For closed days, the row should have a clear alternate treatment (e.g., dot in an inactive
       state, time range replaced with "Closed" text) — not shown in this crop but should be
       handled as a data state.
  ●​   This should be built as a reusable OpeningHoursList component, iterating over a
       7-day schedule array from the mobile app data.
  ●​   Followed by the same thick horizontal divider style used elsewhere (matching the divider
       before the bottom CTA on the original profile page).




5. Bottom CTA Block (Persistent)
  ●​ Same "Ready for a fresh look?" + "BOOK NOW" pill button — consistent with the
     persistent BookNowFooter component described earlier, present at the true end of the
     full page scroll here.




Data Source Summary (additions)
                 Element                                          Source

Team member role/specialty label             Synced from mobile app (owner assigns roles to
                                             team members)

Portfolio images (9 shown)                   Synced from mobile app (owner uploads work
                                             samples)

Weekly opening hours (all 7 days)            Synced from mobile app business hours
                                             configuration

Individual client reviews                    Generated on the webapp — clients submit
(avatar/name/timestamp/stars)                these directly; not sourced from the mobile app

Aggregate rating (5.0 / 1,739)               Computed from the webapp reviews table,
                                             shared value with the top-of-profile rating cluster


Component Reusability Notes (carried forward + new)
●​ ReviewCard — initials avatar (hashed color), name, timestamp, star row, optional
   comment.
●​ ImageGrid + Lightbox — square-cropped grid with full-screen swipeable viewer,
   reusable for Portfolio and potentially future gallery features.
●​ OpeningHoursList — status dot + day + time range, 7-row data-driven list.
●​ Confirm/clarify: whether the star-click interactions on the top profile page (private mailto
   feedback) and the Reviews-section star click (public on-platform review) are the same or
   distinct flows — this affects whether one RatingModal component serves both
   purposes or two separate components/flows are needed.
Bookflow Web — Opening Times (full) +
Location Section
Structural Note
This screenshot reveals the tab bar now has a 5th tab, "Other" — currently active/underlined
— suggesting "Opening times" and "Location" (and possibly further content) live under this
"Other" anchor/section rather than being appended silently to the end of "Portfolio" as I
assumed in the previous description. Update the ProfileTabs component to include this 5th
tab, and treat "Opening Times" + "Location" as the content block anchored under #other,
following the same scroll-anchor navigation pattern as the rest of the tabs.




1. Top Tab Navigation (updated)
   ●​ Now five items: "Services / Team / Reviews / Portfolio / Other" — same horizontal,
      left-clustered layout, same active-tab bold+underline treatment, now applied to "Other."
   ●​ Same ProfileTabs component, just extended with one more entry — confirms this
      should be a data-driven list of section anchors rather than hardcoded tab markup, since
      the number of tabs may vary by salon/config.


2. Opening Times Section (full week)
   ●​ "Opening times" heading — same bold section-header scale used throughout.
   ●​ Full 7-row weekly list (Monday through Sunday), same row pattern described
      previously:
           ○​ Status dot (left) — filled circle, consistent "open" indicator color across all 7 days
               here (all appear active/open).
           ○​ Day name (left, next to dot).
           ○​ Time range (right-aligned).
   ●​ Current day emphasis: the row matching today's date ("Sunday" in this example,
      consistent with the stated current date) is visually emphasized — both the day name and
      its time range are rendered in bold weight, distinguishing it from the other six
      regular-weight rows. This is a dynamic/computed style, not static data — the bold row
      should shift to whichever day matches the client's current local date on page load,
      recalculated daily rather than hardcoded to "Sunday."
   ●​ Note the Friday row has a different opening time ("12:30 - 24:00" vs. "10:00 - 24:00"
      for all other days) — confirms each day's hours are independently configurable per the
      mobile app schedule data, not a uniform blanket time applied to all days. The
     OpeningHoursList component should render each day strictly from its own data entry,
     no shared defaults.
  ●​ Section closes with a thin horizontal divider (light weight, same as other minor section
     dividers) before the Location section.


3. Location Section
3a. Map Image

  ●​ Static map preview image (Google Maps embed/screenshot style), rounded rectangle
     corners (moderate radius, ~16px), roughly landscape aspect ratio, full content-width.
  ●​ Contains a custom map pin/marker: a dark rounded-pill/teardrop marker centered on
     the salon's location, displaying a small star icon + numeric rating ("5.0") inline within the
     pin itself — this is a custom-styled marker, not Google's default red pin, meaning the
     developer will need to use the Maps Static API (or embed) with a custom marker overlay,
     or approximate this with a styled HTML/CSS pin positioned over a static map image if
     using a simpler non-interactive map screenshot approach.
  ●​ The map should be centered/generated from latitude/longitude or an address string
     sourced from the salon owner's mobile app profile (the location the owner set up
     their business at).
  ●​ The map area itself is likely non-interactively-scrollable (a static preview) but the entire
     map image is tappable — per your note, tapping it opens the actual Google Maps link
     the salon owner provided/configured in the mobile app (i.e., not a generated coordinates
     link necessarily, but whatever direct Maps URL the owner entered — could be a Google
     Business Profile link, a maps.app.goo.gl short link, or a full maps.google.com URL).
     Opens in a new tab/window (target="_blank") since it's leaving the webapp entirely.
  ●​ Standard Google attribution ("Google" wordmark) appears bottom-left of the map image
     per Google Maps' usage terms — required if using their static map imagery, should not
     be removed/covered.

3b. Address + Directions Link

  ●​ Directly below the map image: a single line combining:
         ○​ Plain address text (e.g., "Delfon 8, Peristeri.") — regular weight, muted-adjacent
             but readable body text.
         ○​ "Get directions" — inline tappable link immediately following the address text on
             the same line, styled as a link (distinct link color, no underline), separated from
             the address by the period + a space.
         ○​ Both the address label and this "Get directions" link should trigger the same
             action as tapping the map image — opening the owner-provided Google Maps
             link in a new tab. Build as a single click handler shared across all three tappable
             targets (map image, address text if also meant to be clickable, and the "Get
             directions" link) rather than three separate implementations.
          ○​ The address text itself is likely also sourced from the mobile app profile
             (owner-entered address string), separate from but paired with the maps link.

3c. Divider

   ●​ Same prominent horizontal rule style used elsewhere as a stronger section-closing
      divider, positioned directly above the bottom CTA block — matches the weight/style of
      the divider seen closing out the "About" section on the original profile page (i.e., this is
      the "end of page content" divider, not a minor inter-section one).


4. Bottom CTA Block (Persistent)
   ●​ Same "Ready for a fresh look?" + "BOOK NOW" pill button, consistent BookNowFooter
      component, closing out the page.




Data Source Summary (additions)
                 Element                                           Source

Full weekly opening hours (all 7 days,       Synced from mobile app business hours
including per-day variation like Friday's    configuration
different start time)

"Today" bold-highlight row                   Computed client-side against the current date —
                                             not stored data

Map location / address / Google Maps         Owner-provided location details from the mobile
directions link                              app profile (address string + the actual Maps
                                             link/URL the owner set)


Component Reusability Notes (additions)
   ●​ OpeningHoursList — extend earlier note: needs a isToday computed flag per row
      to drive the bold styling, evaluated against the client's local current date on render.
   ●​ LocationCard — new component: static/custom-pinned map image + address line +
      "Get directions" link, all sharing one external-link click handler pointed at the owner's
      stored Maps URL. Should gracefully handle the case where the owner hasn't provided a
      Maps link yet (fallback: hide section, or show address-only with no map).
Bookflow Web — Booking Flow: Select
Services (Modal/Full-Screen Overlay)
Overall Structure
This screen represents the first step of the booking flow, triggered by tapping "Book" on any
individual service card (from the Services section shown earlier). Given the presence of a back
arrow and close (X) icon at the top, this should be built as either a full-screen overlay/route or
a modal that takes over the viewport — recommend implementing as a distinct route (e.g.,
/salon/{id}/book/services) that visually presents full-screen, since booking flows
typically benefit from being deep-linkable/back-button-navigable rather than trapped in a JS
modal state. The background shifts to a light gray/off-white tone here, distinguishing this flow
from the pure-white profile pages — worth noting as a deliberate context-switch cue even
though I won't specify exact colors.




1. Top Bar
   ●​ Back arrow (top-left) — simple chevron/arrow-left icon, no background/button chrome,
      tappable, navigates back to the previous screen (presumably the salon profile's Services
      section).
   ●​ Close (X) icon (top-right) — same plain icon treatment, no button chrome, tappable,
      exits the entire booking flow and returns to the salon profile page (distinct from "back,"
      which likely just goes one step back within the flow — here since this is step one, both
      back and close probably behave the same way, but the pattern should be built
      generically for later steps where back ≠ close).
   ●​ Both icons sit on the same horizontal row, comfortably sized for touch targets
      (~32–40px), with standard side padding matching the rest of the page content.


2. Page Heading
   ●​ "Select services" — large, bold heading, same heavy weight/scale as other primary
      page titles, left-aligned, positioned below the top bar with generous spacing.


3. Services List (selectable)
Reuses the same ServiceCard visual foundation from the earlier Services tab (name /
duration / price stacked left, action control top-right), but with modified interaction affordances
for the selection flow:

3a. Default (unselected) state

   ●​ Card appearance: same rounded-rectangle bordered card as before, thin neutral border,
      no special emphasis.
   ●​ Action control: replaces the earlier outlined "Book" pill button with a circular "+"
      button — small circle (~48px diameter), thin border outline, plus icon centered,
      positioned top-right of the card aligned with the service name. This signals "add to
      selection" rather than "book directly," reflecting the shift in this screen's purpose from
      browsing to actively building a booking.

3b. Selected state (per Image 2)

   ●​ Card border: the entire card gets a bold colored outline/border (thicker and more
      saturated than the default thin border) wrapping the full card perimeter — a clear "this is
      selected" visual state, using an accent color distinct from the rest of the page's neutral
      palette (an accent/brand color, consistent with whatever primary interactive color is used
      elsewhere like the "Read more"/"See all" links).
   ●​ Action control swaps: the "+" circle transforms into a filled circular checkmark badge
      — solid filled circle (same accent color as the border) containing a white checkmark
      glyph, replacing the outlined plus icon entirely. This is a state-swap on the same control,
      not an additional element.
   ●​ This selected/unselected toggle should be built as a single SelectableServiceCard
       component with a boolean selected prop driving both the border style and the
       icon-control swap (plus↔check), rather than two separate card variants.

3c. Selection Constraint (per your note)

   ●​ Only one service can be selected at a time — this is a single-select list, not
      multi-select, despite the "+" affordance visually resembling an "add to cart" pattern
      typically associated with multi-item selection. Implementation-wise: selecting a new card
      should automatically deselect any previously selected card (radio-button-like behavior
      under the hood, even though visually styled as checkboxes/plus-buttons). Worth flagging
      to the developer explicitly since the "+" icon is a common multi-select affordance and
      could easily be miscoded as such — the UI visually suggests "add multiple," but the
      actual behavior is exclusive/single-select. Recommend either keeping this as designed
      (visual affordance intentionally simple) or flagging back to you as a potential future UX
      improvement (e.g., a filled circle radio dot instead of "+") if multi-service booking isn't
      planned — but for now, implement strictly as single-select logic.
4. Sticky Bottom Summary Bar (appears only once a
service is selected)
Per Image 2, once a service is selected, a fixed/sticky footer bar appears at the bottom of the
viewport (not present in Image 1's empty-selection state) — this bar should be conditionally
rendered based on whether selectedService is non-null.

   ●​ Left side: two-line stacked summary:
          ○​ "from KES 400" — mixed-weight text: "from" in lighter/regular weight, the price
              value in bold with the same accent price-color treatment used elsewhere
              (matching the green-family price styling from the service cards). The word "from"
              is notable — suggesting price could vary (e.g., by team member selected later in
              the flow), so this label should remain even for single fixed-price services, sourced
              dynamically from the selected service's price.
          ○​ Cart summary line: small shopping-cart icon + "1 item · 10 mins" — item count
              and total duration, computed from the current selection (will need to recalculate if
              multi-service selection is ever enabled later, but for now reflects the single
              selected service's duration).
   ●​ Right side: "Continue →" button — solid filled pill button (dark/filled, matching the
      same visual weight as "BOOK NOW" elsewhere, establishing this as the primary CTA
      color), bold label with a trailing right-arrow icon, indicating forward progression in a
      multi-step flow.
          ○​ Tapping "Continue" should advance to the next step of the booking flow (likely
              team-member selection, date/time selection, or a summary/confirmation screen
              — not yet shown, so structure this as a multi-step wizard/flow with the selected
              service's data carried forward in state).
   ●​ This footer bar should sit above any device safe-area/notch padding, fixed to the
      viewport bottom, with a subtle top border or shadow separating it from the scrollable
      content behind it (elevation cue since content will scroll underneath it).
   ●​ Should be built as a reusable BookingSummaryBar component, since a similar
      "selection summary + continue" pattern will likely recur at subsequent steps of the
      booking flow (e.g., after selecting a team member, after selecting a date/time) —
      recommend designing it generically enough to accept different summary line content per
      step.




Component Reusability Notes (carried forward + new)
   ●​ SelectableServiceCard — new variant of the earlier ServiceCard, adds
       selected boolean prop controlling border emphasis + plus/check icon swap. Consider
       whether to formally merge this with the original ServiceCard (via a variant prop:
   browse vs select) or keep as a separate component — recommend merging for
   consistency, since the underlying data shape (name/duration/price) is identical.
●​ BookingSummaryBar — new sticky footer component for the booking flow, likely
   reused across multiple steps with varying content.
●​ This screen establishes the booking flow's visual language as distinct from the profile
   browsing pages (gray background, X-to-close pattern, sticky summary footer) — worth
   setting up as its own layout wrapper (e.g., BookingFlowLayout) that subsequent step
   screens (team selection, time selection, confirmation) will likely share.
Bookflow Web — Booking Flow: Select
Professional
Overall Structure
Second step of the booking flow, reached after tapping "Continue" from the Select Services
step. Same BookingFlowLayout shell as the previous screen: gray/off-white background,
back arrow + close (X) top bar, large bold page heading, and the same sticky bottom summary
bar pattern — confirming this is a shared wrapper across all booking-flow steps as anticipated.

Conditional step: per your note, this entire screen is skipped in the flow if the salon owner
hasn't configured any team members in the mobile app — meaning the booking flow's step
sequence should be dynamic/conditional (e.g., [services, professional?, datetime,
confirm]), not a fixed hardcoded set of steps. Recommend implementing the flow as an array
of active steps computed at flow-start based on salon config (does this salon have team
members configured?), rather than hardcoding "step 2 = professional" — this keeps
back/forward navigation and step-progress indicators (if any are added later) accurate
regardless of whether this step is present.




1. Top Bar
   ●​ Same back arrow (left) + close X (right), identical treatment to the Select Services
      screen. Back navigates to the previous step (Select Services); close exits the entire flow.


2. Page Heading
   ●​ "Select professional" — same large bold heading style/scale as "Select services,"
      left-aligned, positioned below the top bar.


3. Professional List (selectable)
Vertically stacked cards, same rounded-rectangle bordered card shape and spacing rhythm as
the service selection cards, but with a different internal content layout suited to people rather
than services.

3a. "Any professional" option (always first)
   ●​ Distinct from the rest of the list — this is a special/default entry rather than a real team
      member, always pinned to the top of the list regardless of sort order.
   ●​ Icon: circular avatar-shaped container (same size/shape as a real profile photo would
      occupy) but containing a shuffle/crossed-arrows icon instead of a photo, set against a
      soft tinted circular background (using the same accent color family as the selection-state
      border elsewhere, at a lighter/muted intensity) — visually signals "system pick" rather
      than a specific individual.
   ●​ Label: "Any professional" — bold, two-line title matching the same weight as real team
      member names.
   ●​ Subtitle: "Maximum availa…" (truncated) — muted/secondary text, appears to
      communicate something like "maximum availability" — i.e., choosing this option gives
      the client the widest range of open time slots since it's not constrained to one person's
      schedule. Full untruncated copy should be confirmed, but implement with the same
      ellipsis-truncation/line-clamp behavior as other secondary text fields.
   ●​ No "View profile" link and no rating badge on this entry, since it doesn't represent a
      real person — this row's layout should tolerate optional/missing fields (rating, profile link)
      rather than assuming every row has them.
   ●​ Select button/control behaves identically to a real team member row (see 3c below).

3b. Individual Team Member Rows

Each real team member row includes:

   ●​ Circular profile photo — same photo treatment as elsewhere, but now paired with an
      overlapping rating badge at the bottom edge (small pill, star icon + numeric rating,
      same RatingBadge component used on the salon profile's Team section) — this is the
      same underlying team data synced from the mobile app, just presented in this list-row
      format instead of the 3-column grid format shown earlier. Reuse the same data source
      and RatingBadge component.
   ●​ Name — bold, can wrap to two lines if long (visible in "Άρτεμις – Ευθυμία" wrapping
      across two lines in the unselected state, then collapsing to one line once the card is
      selected and gains more horizontal room from the layout shift — actually looking closer,
      the wrap behavior seems tied to available width changes between states; recommend
      just using standard text wrapping without forcing line counts, letting the name flow
      naturally within the available column width).
   ●​ Role/title — muted secondary text directly below the name (e.g., "Αισθητικός"), same
      treatment as the role label used in the salon profile's Team section, sourced from the
      same mobile-app-configured role field.
   ●​ "View profile" — tappable text link (link-colored, no button chrome) positioned below
      the role label, presumably opens a detail view/modal for that specific team member (bio,
      portfolio, more reviews) — not shown in these screenshots, so flag as a linked action
      needing its own destination to be defined (could reuse a lightweight profile modal or
      route).
3c. Select Control (same interaction pattern as service selection)

  ●​ Unselected state: pill-shaped "Select" button, outlined/bordered style (not filled),
     positioned right-aligned, vertically centered against the card content.
  ●​ Selected state: the "Select" button is replaced by a filled circular checkmark badge
     (identical pattern to the selected-service card control from the previous step) — solid
     accent-colored circle with a white checkmark, and the entire card gains the same bold
     accent-colored border outline as the selected service card.
  ●​ Single-select constraint applies here too (consistent with the services step) —
     selecting one professional deselects any previously selected one. Should reuse the
     same SelectableCard selection-state pattern/component established in the previous
     screen, just with different internal content (person vs. service).


4. Sticky Bottom Summary Bar
  ●​ Identical component and behavior to the previous step's BookingSummaryBar —
     "from KES 400" + cart icon with "1 item · 10 mins" on the left, "Continue →" filled pill
     button on the right.
  ●​ Notably, the summary content doesn't change based on professional selection (still
     reflects the selected service's price/duration, not the professional) — confirms this bar is
     scoped to the overall booking summary across the whole flow, not step-specific content.
     This reinforces treating it as a single persistent component fed by the flow's accumulated
     state (selected service + selected professional + eventually date/time), rendering only
     the fields relevant so far.
  ●​ Tapping "Continue" here should advance to the next step — presumably date/time
     selection (not yet shown).




Component Reusability Notes (carried forward + new)
  ●​ SelectableCard — confirm this should now be generalized as a base pattern used by
     both SelectableServiceCard (previous step) and this new
     SelectableProfessionalCard, sharing the border/checkmark-swap selection
     styling logic while allowing different internal content per use case.
  ●​ RatingBadge — same component reused here from the Team profile section,
     confirming it's genuinely shared across salon-profile browsing and the booking flow.
  ●​ BookingSummaryBar — confirmed persistent/shared across steps as anticipated;
     should be lifted to the BookingFlowLayout level so individual step screens don't need
     to re-implement it.
  ●​ Step-skip logic: implement the booking flow's step list as data-driven/conditional (skip
     "Select professional" entirely when the salon has zero configured team members), rather
than assuming a fixed step sequence — this affects both the back-navigation target from
the next step and the "Continue" destination from the Select Services step.
Bookflow Web — Booking Flow: Select
Date and Time
Overall Structure
Third step of the booking flow, reached after "Continue" from Select Professional (or directly
from Select Services if the professional step was skipped due to no configured team). Same
BookingFlowLayout shell: gray background, back arrow + close X top bar, bold page
heading.




1. Top Bar
   ●​ Same back arrow (left) + close X (right) as prior steps, same behavior — back returns to
      Select Professional (or Select Services if that step was skipped), close exits the flow
      entirely.


2. Page Heading
   ●​ "Select date and time" — same large bold heading scale as previous steps.


3. Professional Confirmation Chip + Calendar Shortcut
Row
Horizontal row directly below the heading, two elements:

   ●​ Selected professional chip (left): pill-shaped element combining:
         ○​ Small circular avatar photo of the previously selected professional
         ○​ Their name ("Άρτεμις – Ευθυμία")
         ○​ A chevron-down icon at the right end of the pill
         ○​ This entire chip is a dropdown/tappable control — reopens the professional
             selection (likely as a quick inline dropdown or re-navigates to the Select
             Professional step) allowing the client to change their pick without fully restarting
             the flow. Should carry forward the previously selected professional as the
             pre-selected default if reopened.
         ○​ If the professional step was skipped (no team configured), this chip should either
             be omitted entirely or default to a generic "Any professional"-equivalent state —
             needs a conditional render based on whether that step was applicable.
  ●​ Calendar icon button (right): separate circular/pill button, outlined style, containing a
     calendar glyph icon, positioned at the far right of the row, vertically aligned with the
     professional chip. Likely opens a full month-view calendar picker as an alternative to
     the horizontal date-strip below (useful for jumping to a date beyond what's visible in the
     scrollable strip, e.g., several weeks out) — should open a modal/popover calendar
     component, with the selection syncing back to the horizontal date strip's active state.


4. Date Selection Section
4a. Section Label

  ●​ "Select a date" — bold sub-heading, same weight/scale as "Pick a time" below it,
     left-aligned.

4b. Horizontal Scrollable Date Strip

  ●​ Row of date cards, horizontally scrollable (evidenced by a partially-cropped card
     bleeding off the left edge, indicating the strip can scroll left to reveal earlier/adjacent
     dates, though likely today is the earliest selectable date — the left-cropped card is
     probably just an artifact of the current scroll position rather than a genuinely earlier date,
     but worth confirming behavior: can users scroll to dates before today, or is that card
     simply off-screen padding?).
  ●​ Each date card: rounded-rectangle shape, fixed width, containing three stacked lines:
          1.​ Abbreviated day name ("Mon," "Tue," "Wed"...)
          2.​ Large bold day-of-month numeral ("10," "11," "12"...)
          3.​ Month name ("August")
  ●​ Selected state: the active date card gets a solid filled background (accent color) with
     all text inverted to a light/white tone for contrast — clearly distinguishing it from the
     surrounding unselected cards which have plain/neutral card backgrounds with dark text.
  ●​ Unselected state: neutral card background, muted/lighter text weight for the day name
     and month (secondary emphasis), with the day-of-month numeral in a bolder/darker
     weight than the day/month labels flanking it — establishing a consistent internal
     hierarchy even in the unselected state (numeral is always the most prominent element in
     each card).
  ●​ Should be built as a reusable DateCard component in a horizontally scrollable
     container (overflow-x: auto with scroll-snap for clean paging behavior on touch
     devices), data-driven from the salon's actual availability (dates with no availability might
     need a disabled/grayed-out state — not shown here but worth flagging as a state to
     handle).
  ●​ Tapping a date card updates the "Pick a time" section below with that date's available
     time slots.
5. Time Selection Section
5a. Section Label

  ●​ "Pick a time" — same bold sub-heading style as "Select a date."

5b. Time Slot Row(s)

  ●​ Currently shows a single time slot option ("16:00" with price "€9" right-aligned) —
     should be built as a list/grid of multiple time slot rows when more are available (this
     screenshot likely just shows a sparse/limited-availability example), each following the
     same row pattern: time on the left, price on the right, full-width rounded-rectangle row.
  ●​ Unselected state (Image 1): plain bordered row, neutral styling, no emphasis.
  ●​ Selected state (Image 2): the row gains the same bold accent-colored border outline
     used for selected cards throughout the booking flow (consistent with the selected-service
     and selected-professional card treatment) — reinforcing the single shared
     SelectableRow/SelectableCard visual language established across the whole flow.
     No checkmark icon here though (unlike the service/professional steps) — just the border
     highlight, since there's no icon-swap element in this row's layout (no leading icon/avatar
     to replace with a checkmark).
  ●​ Price note: displayed as "€9" here despite the summary bar showing "KES 400" — this
     is likely a placeholder/inconsistency in the mockup (different currency shown) rather
     than intentional; flag to the developer to ensure the time-slot price and the summary-bar
     price stay in the same currency and consistent value, pulling from the same source
     (the selected service's price, possibly adjusted per professional or time slot if pricing
     varies — worth clarifying with you whether price can actually vary by time
     slot/professional, or whether this "€9" is simply a mockup placeholder that should be
     corrected to match "KES 400" consistently).
  ●​ Should be built as a reusable TimeSlotRow component, data-driven from the salon's
     actual availability for the selected professional + date combination (i.e., time slots should
     dynamically refetch/recompute whenever the date or professional selection changes).


6. Waitlist Fallback Link
  ●​ Below the time slot list: "Can't find a suitable time? Join waitlist" — plain text
     followed by an inline tappable link (link-colored, no button chrome), left-aligned.
  ●​ This is a fallback/escape-hatch action for when no time slots work for the client —
     tapping "Join waitlist" should open a separate flow/modal for waitlist registration (not
     detailed in these screenshots, so flag as needing its own destination — likely collects
     preferred date range/time and notifies the client when a slot opens up, but exact
     behavior needs confirmation).
7. Sticky Bottom Summary Bar
  ●​ Same BookingSummaryBar component and behavior as previous steps — "from KES
     400" + cart icon "1 item · 10 mins" on the left, "Continue →" on the right.
  ●​ The bar only appears/becomes active once a time slot is selected (matching the
     pattern from the Select Services step, where the bar was absent until a selection was
     made) — before selecting a time, this bar is presumably hidden or the Continue button
     disabled; confirm this matches the same conditional-render pattern used in step 1.
  ●​ Tapping "Continue" advances to the next step — presumably a final booking
     summary/confirmation screen (not yet shown).




Component Reusability Notes (carried forward + new)
  ●​ DateCard — new component for the horizontal scrollable date strip; filled/accent
     selected state vs. neutral unselected state.
  ●​ TimeSlotRow — new component for time selection; reuses the same
     bordered-selection-outline pattern as SelectableCard but without an icon-swap
     element — consider whether to generalize SelectableCard's border-highlight styling
     into a shared base style/mixin that both the icon-based cards (service/professional) and
     icon-less rows (time slot) can share, avoiding duplicated selection-state CSS.
  ●​ Flag to confirm: currency inconsistency (€9 vs KES 400) between the time slot price
     and summary bar — likely needs correcting to a single consistent currency/value pulled
     from one source.
  ●​ Flag to confirm: exact behavior of "Join waitlist" and the professional-chip dropdown
     reopen behavior — both are interactive affordances without a shown destination screen
     yet.
Bookflow Web — Booking Flow: Review
and Continue
Overall Structure
Fourth step of the booking flow — a summary/review screen consolidating all prior selections
(date, time, service) before final confirmation. Same BookingFlowLayout shell: gray
background, back arrow + close X top bar, bold page heading, sticky bottom summary bar.




1. Top Bar
   ●​ Same back arrow (left) + close X (right), consistent with all prior steps. Back returns to
      Select Date and Time; close exits the flow.


2. Page Heading
   ●​ "Review and continue" — same large bold heading scale as previous step titles.


3. Booking Summary Card
A single white/light rounded-rectangle card (same card treatment as service/professional cards
elsewhere), containing all booking details in a structured, sectioned layout. Generous internal
padding on all sides.

3a. Date & Time Block (top of card)

   ●​ Two rows, each with a small leading icon + text, left-aligned:
         ○​ Calendar icon + "Monday 10 August" — the full selected date, spelled out
            (weekday + day + month), regular-to-medium weight text.
         ○​ Clock icon + "16:00–16:10 (10 mins duration)" — the selected time slot
            expressed as a start–end time range, with the duration spelled out in
            parentheses. Note: this now computes an end time (16:10) from the start time
            (16:00) + service duration, which the developer will need to calculate rather than
            just display the raw start time as shown in the previous step.
         ○​ Flag/inconsistency to confirm: the duration shown here is "10 mins", but the
            service itself was listed as "20 mins" everywhere else in the flow (service cards,
            summary bar "1 item · 10 mins" — wait, actually the summary bar has
            consistently shown "10 mins" throughout the whole flow, while the service card
             itself displays "20 mins"). This is a real discrepancy worth flagging to the
             developer/you: is the summary bar's duration meant to reflect actual booked
             duration (10 mins) versus the service's advertised/listed duration (20 mins), or is
             one of these simply a mockup error? Recommend clarifying which value is
             authoritative before wiring up the duration calculations, since this cascades into
             the end-time computation shown here (16:00 + duration = 16:10, using the
             10-min figure, not 20).
         ○​ Icons here (calendar, clock) are simple outline-style glyphs, consistent sizing
             (~20–24px), vertically centered against their adjacent text line.
  ●​ Both rows are followed by a thin horizontal divider separating this block from the service
     line-item below.

3b. Service Line Item

  ●​ Service name ("Shaping & Defining The Beard") — bold, left-aligned, paired with its
     price ("KES 400") right-aligned on the same row, using the same green-family
     price-accent treatment established throughout the app.
  ●​ Duration ("20 mins") directly below the service name — muted/secondary weight,
     left-aligned, matching the same duration-display pattern used on service cards
     elsewhere.
  ●​ Note a small stray/orphaned dot character appears beneath the duration text in the
     screenshot — this looks like a rendering artifact or leftover separator character (possibly
     intended to lead into professional name text, e.g. "20 mins · Άρτεμις – Ευθυμία" but the
     professional name is missing/not rendering). Flag this to the developer as likely a bug in
     the mockup rather than intentional — the selected professional's name should probably
     appear here (following the "·" separator pattern seen elsewhere, like "1 item · 10 mins"),
     especially since professional selection was a whole prior step and this summary should
     reflect it. Worth confirming with you whether professional name should be added to this
     line item.
  ●​ If multiple services could ever be selected (currently single-select per your earlier note),
     this section should be built to support a list of line items, each following this same
     name/price/duration row pattern, even though only one item is shown here.
  ●​ Followed by another thin horizontal divider before the total.

3c. Total Row

  ●​ "Total" — bold, left-aligned, larger/more prominent weight than the individual line-item
     service name above it (establishing clear visual hierarchy: line items are secondary, the
     total is the card's terminal/summary value).
  ●​ Total price ("KES 400") — right-aligned, same green price-accent styling, bold weight
     matching the "Total" label's emphasis.
  ●​ Since there's currently only one service, total equals the single line item's price — but
     this should be built as a computed sum (sum of all line items) rather than a
        hardcoded duplicate of the single service price, to correctly support future multi-item
        totals if that's ever enabled.


4. Sticky Bottom Summary Bar
  ●​ Same BookingSummaryBar component as all previous steps — "from KES 400" + cart
     icon "1 item · 10 mins" (again showing "10 mins," reinforcing the duration-discrepancy
     flag above) on the left, "Continue →" filled pill button on the right.
  ●​ Tapping "Continue" here should advance to the final step of the flow — presumably a
     contact-details/payment or final confirmation screen (not yet shown), since this "Review
     and continue" step reads as the last checkpoint before submitting the actual booking.




Data Source Summary (additions)
        Element                                           Source

Selected date/time,       Assembled from prior booking-flow steps (client-side flow state), not
service, professional     fetched fresh — this screen is purely a review/confirmation of
                          already-made selections

End time (16:10)          Computed client-side: start time + service duration

Total                     Computed client-side: sum of selected service price(s)


Component Reusability Notes (carried forward + new)
  ●​ BookingReviewCard — new component: date/time block + list of service line items +
     total row, likely the template for whatever final confirmation/receipt screen follows this
     step too (worth designing with reuse in mind, since a post-booking confirmation screen
     will probably show near-identical information).
  ●​ Flag to confirm before implementation:
          1.​ Duration inconsistency (10 mins vs. 20 mins) across the flow — needs a single
              source of truth.
          2.​ Missing professional name in the service line item (orphaned "·" character
              suggests it was intended but isn't rendering) — should the selected professional's
              name be added there?
Bookflow Web — Booking Flow:
Confirmation / Deposit Instructions
Overall Structure
Final step of the booking flow, reached after "Continue" from the Review and Continue screen.
Notable shift in tone and structure from all prior steps: this screen switches to a plain white
background (no gray booking-flow chrome), drops the close (X) icon and sticky bottom
summary bar entirely, and introduces a friendly illustration + celebratory copy — signaling
this is the flow's terminal/success state rather than another input step in the sequence. Only the
back arrow persists from the shared top bar.

This page combines: a success message, deposit-payment instructions (handled outside the
app, presumably via M-Pesa or similar given the KES currency and Kenya context), a
proof-of-payment upload mechanism, and a contact-details form to receive confirmation.




1. Top Bar
   ●​ Back arrow only (top-left), same plain icon treatment as prior steps — no close X here,
      since this is the flow's endpoint rather than a mid-flow step a user would want to
      abandon via a dedicated "close" affordance (back likely still returns to Review and
      Continue).


2. Illustration
   ●​ Hand-drawn/sketch-style illustration of a calendar with a large checkmark overlaid —
      whimsical, informal art style (visible pen-stroke texture, motion/sparkle lines radiating
      outward from the checkmark and calendar corners suggesting celebration/completion).
      Centered on the page, moderate size (roughly occupying the top quarter of the visible
      content).
   ●​ This illustration should be treated as a static decorative asset (SVG or PNG) — not
      dynamically generated — sourced as a fixed illustration file for this success state.
      Establishes a friendly/personal brand tone distinct from the more utilitarian booking-flow
      steps preceding it.


3. Success Headline
  ●​ "You're all set! 🎉 " — large, bold, centered heading with a trailing celebration emoji.
     Friendliest/most casual heading in the entire flow, matching the illustration's tone.


4. Deposit Instructions
  ●​ Two centered paragraph blocks, generous vertical spacing between them, regular
     body-text weight/size (larger than standard body copy elsewhere — reads more like a
     friendly announcement than dense informational text):
         1.​ "Just drop a KES 500 deposit to lock in your booking." — the deposit amount is
              bold/emphasized inline within the sentence, and should be a dynamic value
              (likely configured per-salon by the owner in the mobile app, or possibly a
              percentage/fixed value tied to the service price) rather than hardcoded — flag
              this as needing a data source: is the deposit amount owner-configured, or
              system-determined?
         2.​ "See you soon!" — standalone short centered line, purely a warm sign-off, no
              functional data.
  ●​ Notably, no in-app payment mechanism is shown here (no card form, no payment
     gateway UI) — the flow assumes the client pays the deposit through an external channel
     (e.g., M-Pesa till/paybill number, phone transfer) that isn't rendered on this screen. This
     is a significant workflow gap worth confirming with you: does the salon owner's payment
     details (M-Pesa number, etc.) need to be displayed somewhere on this screen for the
     client to know where to actually send the KES 500? As currently designed, the copy
     references a deposit but doesn't show payment instructions/destination — recommend
     flagging this before implementation, since without it the client has no way to know how to
     pay.


5. Upload Confirmation Message
  ●​ "Upload confirmation message [here]" — a line of centered text where "here" is styled
     as a distinct tappable link (bold, link-colored, matching the link treatment used elsewhere
     in the app like "Read more" and "See all").
  ●​ Per your description: tapping "here" triggers a file upload interaction — presumably
     opens the device's file picker / camera roll, allowing the client to select or capture a
     screenshot of their payment confirmation (e.g., an M-Pesa transaction confirmation SMS
     screenshot) as proof of the deposit payment.
  ●​ Implementation should use a hidden <input type="file" accept="image/*">
     triggered by the "here" link, with:
          ○​ A visible file-selected state after upload (e.g., a thumbnail preview, filename
             display, or a checkmark/confirmation indicator replacing or accompanying the
             "here" link) — not shown in this screenshot, so this state needs to be
             designed/added, since currently there's no visual feedback once a file is
             attached.
         ○​ Consider whether upload is required before the "Submit" button becomes active,
            given the whole point of this screen is depositing proof of payment —
            recommend making the form's submit action conditionally validate that a file has
            been attached (worth confirming this requirement with you).


6. Contact Details Form
  ●​ Three stacked input fields, full-width, consistent styling: rounded-rectangle bordered
     text inputs (thin border, generous padding, comfortable touch-target height), placeholder
     text shown in a muted tone within each empty field:
         1.​ Name field — placeholder "John Doe."
         2.​ Phone number field — placeholder "Phone number," should use a numeric/tel
             input type (type="tel") for appropriate mobile keyboard behavior.
        3.​ Email field — placeholder "address@mail.com," should use type="email" for
             validation and appropriate keyboard behavior.
  ●​ Consistent vertical spacing between the three fields (~16–20px gaps), same
     border-radius and height across all three for visual uniformity — build as a shared
     TextInput component reused three times with different type/placeholder/name
     props.
  ●​ Helper text below the fields: "Drop your email in here, and we'll ping you the booking
     confirmation!" — centered, regular weight, explains the purpose of the email field
     specifically (confirms this is where the confirmation email gets sent).


7. Submit Button
  ●​ "Submit" — solid filled rectangular button (not pill-shaped like other primary CTAs in the
     app — this one has slightly rounded corners rather than fully rounded ends, a notable
     style departure from "BOOK NOW" and "Continue" elsewhere), centered, comfortable
     padding, using a distinct accent color from the rest of the app's button palette (a
     blue-family tone here versus the dark/black CTAs used throughout the rest of the flow —
     flag this styling inconsistency to confirm whether it's intentional or should be unified with
     the rest of the app's button system for consistency).
  ●​ Tapping Submit should:
         1.​ Validate the form fields (name, phone, email — and possibly the uploaded file per
              the note above).
         2.​ Submit the booking + deposit-proof + contact details to the backend, finalizing the
              booking record (tying it to the salon owner's mobile app booking management
              system, per your original context that bookings are managed by the owner via the
              mobile app).
         3.​ Trigger the confirmation email to be sent to the entered email address.
         4.​ Navigate to some final "thank you"/receipt state, or simply show a success
              toast/inline confirmation — not shown in this screenshot, so this terminal
              behavior needs to be defined (does the client stay on this page with a success
              message, or get redirected somewhere, e.g., back to the salon profile?).




Data Source Summary (additions)
         Element                                          Source

Deposit amount ("KES          Unclear — flag to confirm whether owner-configured (mobile
500")                         app) or system-calculated

Uploaded confirmation         Client-uploaded on this screen, submitted alongside the
screenshot                    booking record

Name/phone/email              Client-entered on this screen; email specifically used to send
                              confirmation

Booking record itself         Written to the shared backend, visible to the salon owner via
                              their mobile app booking management


Component Reusability Notes (additions) + Flags for
Clarification
  ●​ TextInput — new shared form input component (bordered, rounded,
     placeholder-driven), likely reusable for any future forms in the app.
  ●​ FileUploadLink — new component: text-styled trigger opening a file picker, needs a
     defined "file attached" visual state (currently undesigned in this screenshot).
  ●​ Style inconsistency flag: the "Submit" button uses a different shape/color language
     (rectangular, blue) than the rest of the app's CTAs (pill-shaped, dark) — recommend
     confirming whether to unify this before implementation.
  ●​ Missing payment-destination info flag: no M-Pesa number/payment channel is shown
     for the KES 500 deposit — needs clarification on where/how the client actually sends the
     deposit before this screen can be considered complete.
  ●​ Missing post-submit state flag: no confirmation/success screen shown after tapping
     Submit — needs to be defined.
Bookflow Web — Team Member Profile
(View Profile Detail)
Context
This is the destination screen for the "View profile" link (seen both in the salon profile's Team
section and the "Select professional" booking step). Reuses the same overlapping hero/card
visual pattern established on the main salon profile page (rounded-top content sheet
overlapping a header zone), just restyled for an individual team member rather than the whole
salon.




1. Header Zone (gray background block)
   ●​ Full-width gray/off-white background band occupying the top portion of the screen
      (same tone as the booking-flow screens) — distinct from the pure-white content below,
      functioning as a "hero backdrop" for the profile photo rather than an image gallery this
      time (no photo carousel here, just a flat colored zone).
   ●​ The top corners of the overall page/card are rounded (large radius, matching the
      rounded-sheet pattern from the main salon profile page), suggesting this is presented as
      a modal or slide-up sheet overlaying the previous screen, rather than a full standalone
      page — consistent with it being reachable from within the booking flow's "Select
      professional" step as an in-context detail view.

1a. Close Button

   ●​ Close (X) icon — top-left this time (differs from the booking flow's top-right placement),
      plain icon treatment, no button chrome. Dismisses this profile detail view, returning to
      wherever it was launched from (Team section or Select Professional step) — should
      preserve the underlying screen's state (e.g., if launched from Select Professional, any
      prior selection should remain intact upon return).

1b. Profile Photo

   ●​ Large circular photo, significantly bigger than the small avatar treatments used
      elsewhere (Team grid, professional-selection list) — this is the dominant visual element
      of the header zone, centered horizontally, generous size (roughly 300px+ diameter
      based on proportions).
   ●​ Same circular-crop treatment as other team photos, sourced from the same
      mobile-app-provided team member data — just rendered at a larger display size here.
  ●​ No overlapping rating badge on the photo itself this time (unlike the Team grid/list
     treatments) — rating is instead shown as a standalone element below the name/role
     (see 1d).

1c. Name & Role

  ●​ Full name ("Anastacia Jeniffer") — large, bold, centered, directly below the photo.
     Notably in Latin script only here (no bilingual/Arabic pairing shown in this example,
     though the data model should still support it per the earlier bilingual name pattern
     observed in the Team grid — this particular team member's data may simply not include
     a secondary script).
  ●​ Role/title ("Hair stylist") — centered, regular weight, directly below the name, same
     secondary-emphasis treatment as role labels used elsewhere (lighter weight, clearly
     subordinate to the name).

1d. Rating Cluster

  ●​ Star icon + numeric rating + review count ("     ⭐    5.0 (183)") — centered below the role
     label, same visual pattern and interactive treatment as the aggregate rating cluster on
     the main salon profile page (filled star, bold numeric value, review count in parentheses
     styled as a tappable link in the accent link color).
  ●​ This is a per-individual rating, distinct from the salon's overall aggregate rating —
     presumably computed from reviews/ratings tied specifically to bookings with this team
     member. Given the established pattern on the main profile page where the star cluster is
     clickable and opens a rating/feedback modal, this element likely behaves the same way
     here — tapping it could let a client rate this specific stylist, though worth confirming
     whether that interaction is meant to apply at the individual level too, or whether it's purely
     a static display here (no click-to-rate) since individual-level reviews weren't part of the
     earlier Reviews section spec. Recommend flagging this for confirmation before
     implementation.


2. About Section (white background, below the header
zone)
  ●​ Standard content card area, transitions to a plain white background, marking the
     boundary between the "header/photo" zone and the "detail content" zone (consistent
     with the rounded-sheet-over-header pattern from the main salon profile page).
  ●​ "About" heading — same bold section-header styling used consistently throughout the
     app.
  ●​ Body paragraph — regular weight, comfortable line-height, describing the stylist's
     experience, specialties, and approach. This is owner-provided bio text from the
     mobile app (per your note), entered per team member when the owner adds them to
     their roster.
  ●​ Unlike the salon's own "About" section (which truncates with a "Read more" link), this
     paragraph appears to render in full here without truncation — though worth confirming
     whether long bios should also get the truncate/"Read more" treatment for consistency,
     especially if some team members have much longer bios than this example.




Data Source Summary (additions)
       Element                                         Source

Team member photo,         Synced from salon owner's mobile app (entered per team member
name, role, bio text       when added to roster)

Individual rating (5.0 /   Computed from webapp booking reviews tied to that specific team
183)                       member — same aggregation pattern as the salon-level rating, but
                           scoped per-person


Component Reusability Notes
  ●​ This screen shares strong structural DNA with the main salon profile page
     (rounded-sheet-over-header, name/role/rating cluster, About section) — consider
     building both from a shared ProfileHeaderSheet layout pattern (photo/image zone +
     overlapping rounded content card + name/subtitle/rating cluster + About section),
     parameterized for "salon" vs. "team member" context, rather than two entirely separate
     implementations.
  ●​ Flag to confirm: whether the rating cluster here is interactive (opens a rate/review
     modal scoped to this individual) or purely a static display — affects whether to wire up
     the same RatingModal component used on the main profile page or leave this element
     non-interactive.
  ●​ Flag to confirm: whether this screen is presented as a modal/sheet overlay (given the
     rounded-top-corner treatment suggesting an overlay) or a full route — affects routing
     structure and whether state needs to be preserved on close (especially important if
     launched from mid-flow in "Select professional").
