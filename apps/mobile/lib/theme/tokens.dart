/// Bookflow's design tokens — the single source of every colour, radius, size
/// and space in the app.
///
/// ══ HOW TO READ THIS FILE ═══════════════════════════════════════════════════
///
/// Every value carries one of three provenance markers, and the marker matters
/// more than the number:
///
///   • **MEASURED**  — sampled from a screenshot in `docs/designs/native/`. The
///                     file and the sampled share of the region are given. These
///                     are facts about the design as drawn.
///   • **DOCUMENTED** — taken from `docs/source/Styles-Reference.md`, with the
///                     section cited. Where that document gives a RANGE, the end
///                     chosen and the reason are stated — never picked silently.
///   • **INVENTED**   — the style document says nothing, or says something
///                     unquantified like "generous whitespace". Marked so a
///                     reviewer knows this is a proposal, not a reading.
///
/// **Where MEASURED and DOCUMENTED disagree, MEASURED wins** and the difference
/// is recorded in `docs/analysis/08-design-deviations.md`. The style document is
/// prose written *about* the screens; the screens are the artefact.
///
/// ── HOW THE MEASUREMENTS WERE TAKEN ─────────────────────────────────────────
///
/// The PNGs were decoded and their pixels counted, not eyeballed. A "63.4% of
/// the region" figure below means that colour occupies that share of the sampled
/// rectangle, which is how a flat fill is distinguished from an antialiasing
/// artefact. Anything reported as a single darkest pixel is called out as such.
library;

import 'package:flutter/widgets.dart';

/// Raw colour values. Nothing outside `app_theme.dart` should read these
/// directly — screens use the `ThemeData` built from them.
abstract final class BookflowColors {
  // ── Brand: the indigo hero gradient ───────────────────────────────────────
  //
  // Styles-Reference.md §2 describes "a soft radial or diagonal gradient …
  // moving between a deep blue-violet (roughly #2B1B7A–#3A2A9E) and a brighter
  // periwinkle-violet (roughly #5A3FD1–#6C4FE0)".
  //
  // **THE BRIGHT END IS NOT IN THE HERO SCREENS.** Sampled across
  // `native-00-…-splash` and `native-01-…-welcome`, the gradient runs entirely
  // within the DEEP range: #1D1066 at its darkest, #3D2C8F at its lightest. A
  // search of all 28 native screenshots for a pixel within 30 of #5A3FD1 found
  // matches in only three — and none of them is a hero background. So the
  // periwinkle end is documented but not drawn, and building it would produce a
  // gradient no screenshot shows. Deviation 2.

  /// MEASURED — `native-01`, top band, most frequent tone (#291D7F/#231973
  /// dominate). Sits inside the documented deep range, corroborating it.
  static const Color heroGradientStart = Color(0xFF231973);

  /// MEASURED — `native-01`, brightest violet band (mid-left), #3D2C8F.
  /// This is the real light end, not the documented periwinkle.
  static const Color heroGradientEnd = Color(0xFF3D2C8F);

  /// MEASURED — `native-01` darkest hero pixel, #1D1066. Used for the status
  /// bar and any surface that must read as "behind" the gradient.
  static const Color heroShadow = Color(0xFF1D1066);

  // ── Action colours ────────────────────────────────────────────────────────

  /// MEASURED — `native-01`, "Create for free" button: **63.4%** of the sampled
  /// region. DOCUMENTED as "roughly #3DD68C–#4CD98F" (§2), which is duller and
  /// yellower than what is drawn. Deviation 1.
  ///
  /// §2 is emphatic that this is reserved for "the single highest-priority
  /// action on a screen" and "should stay rare".
  static const Color ctaGreen = Color(0xFF2DE27E);

  /// MEASURED — `native-03`, "Verify" button: **24.4%** of the sampled region,
  /// with #0279FF and #0074FE making up most of the rest (a subtle vertical
  /// gradient or JPEG-ish noise in the source). DOCUMENTED as "roughly
  /// #1E7CF2–#2F80ED" (§2) — the drawn blue is purer and more saturated.
  /// Deviation 3.
  ///
  /// §2 makes this one colour do three jobs: primary buttons on white screens,
  /// input focus outlines, and every inline text link. It is NOT the hero CTA
  /// colour, and the two are never interchangeable.
  static const Color actionBlue = Color(0xFF0278FF);

  // ── Neutrals: surfaces ────────────────────────────────────────────────────

  /// MEASURED — `native-03`, 100% of a large sampled region. DOCUMENTED §2.
  static const Color surface = Color(0xFFFFFFFF);

  /// DOCUMENTED §2 — "Light gray (#F4F5F7–#F7F8FA) … for secondary surfaces".
  /// Low end taken, and CORROBORATED: exact #F4F5F7 pixels were found in
  /// `native-02`, `native-04` and `native-05`. The low end is also the safer
  /// choice — a secondary surface that is too close to white stops reading as a
  /// separate surface at all.
  static const Color surfaceMuted = Color(0xFFF4F5F7);

  // ── Neutrals: text ────────────────────────────────────────────────────────

  /// MEASURED — #3A3A3A is the dominant glyph fill on `native-02` (1.1% of the
  /// text band), `native-03` and `native-04` (3.9%). Thousands of pixels, so it
  /// is the fill and not an antialiasing edge.
  ///
  /// DOCUMENTED §2 says "near-black charcoal (#1A1A1A–#222222)". The screens are
  /// materially lighter than that. Deviation 4.
  static const Color textPrimary = Color(0xFF3A3A3A);

  /// DOCUMENTED §2 — "Secondary/body text: medium gray (#6B7280–#8A8F98)".
  ///
  /// **NOT CORROBORATED, and this is worth a reviewer's attention.** The screens
  /// sampled use `textPrimary` for body copy as well as headings; no distinct
  /// mid-gray body tone was found. The low (darker) end is taken because it is
  /// the only one that reaches WCAG AA on white for small text. Deviation 5.
  static const Color textSecondary = Color(0xFF6B7280);

  /// MEASURED — #AEAEAE, the third-most-common tone in `native-02`'s form band,
  /// which is where the placeholder text sits. DOCUMENTED §2 gives #A9AEB8;
  /// within three points, so the document is effectively right here.
  static const Color textPlaceholder = Color(0xFFAEAEAE);

  /// MEASURED — `native-01` and `native-03`, label text on the hero gradient.
  static const Color textOnBrand = Color(0xFFFFFFFF);

  // ── Neutrals: lines ───────────────────────────────────────────────────────

  /// MEASURED — `native-03`, the resting border of the verification input,
  /// #8BBEFD/#8FC1FE. DOCUMENTED §2 calls borders "pale gray-blue
  /// (#D6E0F0–#E2E8F0), thin (1px) hairlines" — far paler and greyer than what
  /// is drawn. Deviation 6.
  static const Color inputBorder = Color(0xFF8BBEFD);

  /// DOCUMENTED §2 — the pale end of the border range, for card and container
  /// hairlines. UNVERIFIED at the pixel level: card borders in the dashboard
  /// screenshots are sub-pixel at this resolution and could not be sampled
  /// honestly.
  static const Color borderSubtle = Color(0xFFE2E8F0);

  /// MEASURED — `native-03`, the bottom-sheet "grabber" bar: 92.3% of its
  /// region. DOCUMENTED §6 describes it as "a small horizontal gray grabber
  /// bar" without a value.
  static const Color sheetGrabber = Color(0xFFD0D0D0);

  // ── Identity ──────────────────────────────────────────────────────────────

  /// DOCUMENTED §2 — "a saturated grass/lime green circle (roughly
  /// #5FBF3F–#6FCB45)", explicitly "a distinct third green tone from the CTA
  /// mint green". Low end taken. APPROXIMATELY CORROBORATED: the avatars are
  /// small, and the nearest tones found were #60B04A (`native-02`) and #50C050
  /// (`native-12`) — the right family, too few pixels to call exactly.
  static const Color avatarGreen = Color(0xFF5FBF3F);
}

/// Corner radii. Styles-Reference.md §9: "Corner radii scale with element size
/// … but everything is rounded, never sharp-cornered."
abstract final class BookflowRadii {
  /// DOCUMENTED §5 — text fields, "corner radius ≈ 8–10px". Midpoint taken;
  /// the range is two pixels wide and nothing distinguishes its ends.
  static const double input = 9;

  /// DOCUMENTED §6 — cards, "radius ≈ 12–16px". Midpoint taken, same reasoning.
  static const double card = 14;

  /// DOCUMENTED §4 — the blue functional CTA, "large radius, ~24–28px".
  /// Midpoint taken.
  static const double button = 26;

  /// DOCUMENTED §6 — the bottom sheet's "rounded-top" panel. No value given;
  /// §9 places it at the large end of the scale alongside primary buttons, so
  /// it takes the same radius rather than inventing a new one.
  static const double sheet = 26;

  /// DOCUMENTED §4 — the hero CTA is a pill: "fully rounded ends (radius ≈ half
  /// the button height)". Expressed as a StadiumBorder in `app_theme.dart`
  /// rather than a number, because half-the-height is a shape, not a constant.
  static const double pill = 999;
}

/// Spacing.
///
/// **ENTIRELY INVENTED.** Styles-Reference.md §9 offers "generous whitespace",
/// "consistent vertical spacing" and "internal padding is generous" — three
/// statements of intent with no measurement anywhere in the document, and
/// spacing cannot be sampled from a screenshot with any honesty because the
/// layout is not on a visible grid.
///
/// A 4-point base is proposed because it is the common denominator of both
/// platforms' own guidance and divides cleanly at every step. **A reviewer
/// should treat these six numbers as a proposal to accept or replace**, not as
/// a reading of the design.
abstract final class BookflowSpacing {
  static const double xs = 4;
  static const double sm = 8;
  static const double md = 16;
  static const double lg = 24;
  static const double xl = 32;
  static const double xxl = 48;
}

/// Type scale.
///
/// Styles-Reference.md §3 describes "a fairly restrained hierarchy: one large
/// display size for the wordmark/marketing headlines, one mid-size for screen
/// titles, and one body size used for almost everything else, with bold/italic
/// doing most of the work to create emphasis rather than many distinct sizes."
///
/// It gives exactly one number in the whole section — body at "roughly 14–16px
/// equivalent". Everything else here is INVENTED to fit the shape it describes.
abstract final class BookflowTypeScale {
  /// INVENTED — the wordmark and marketing headline size. §3 says "large" and
  /// no more.
  static const double display = 40;

  /// INVENTED — screen titles ("Enter your code", "Change password").
  static const double title = 24;

  /// DOCUMENTED §3 — "roughly 14–16px equivalent". Midpoint taken.
  static const double body = 15;

  /// INVENTED — helper text and field labels, one step below body.
  static const double caption = 13;
}

/// Font families.
///
/// **The app ships no font assets, so both faces below are the platform
/// default** — Roboto on Android, San Francisco on iOS. That is a deliberate
/// match for §3's description of in-app type as "a clean, rounded-neutral
/// sans-serif (system-UI style, e.g., similar to SF Pro / Inter)".
///
/// **The wordmark face is NOT available.** §3 asks for "a rounded, geometric,
/// extra-bold sans-serif … similar in spirit to Poppins ExtraBold or Baloo",
/// which cannot be met without licensing and bundling a font file. Deviation 7,
/// and it is a real visual difference on the one screen that is pure brand.
abstract final class BookflowFonts {
  /// `null` means "whatever the platform provides", which is the intent.
  static const String? systemUi = null;
}
