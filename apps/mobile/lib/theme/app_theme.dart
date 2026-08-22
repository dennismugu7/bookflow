import 'package:bookflow/theme/system_chrome.dart';
import 'package:bookflow/theme/tokens.dart';
import 'package:flutter/material.dart';

/// The `ThemeData` every screen inherits, built from `tokens.dart`.
///
/// ══ WHY THIS FILE EXISTS ════════════════════════════════════════════════════
///
/// So that no screen ever names a colour, a radius or a font size. A screen that
/// writes `Color(0xFF0278FF)` has forked the design system: the token can be
/// changed and that screen will not move, and nothing will report it. Pushing
/// every value through `ThemeData` makes the theme the only way to be styled,
/// and `test/design_system_test.dart` enforces it.
///
/// The proposed wording for `CLAUDE.md` §5 is in that test file, beside the code
/// that would enforce it.
abstract final class BookflowTheme {
  /// The hero gradient (Styles-Reference.md §2, §8).
  ///
  /// Reserved for brand moments — splash, the auth landing, the profile banner
  /// — and explicitly NOT for functional screens, which are white. Exposed as a
  /// gradient rather than a colour because it is never a flat fill.
  ///
  /// Diagonal rather than radial: §2 says "a soft radial or diagonal gradient"
  /// and the screenshots show the light region drifting across the frame rather
  /// than sitting concentrically, which a linear sweep approximates far better
  /// than a radial one at this level of fidelity.
  static const LinearGradient heroGradient = LinearGradient(
    begin: Alignment.topRight,
    end: Alignment.bottomLeft,
    colors: <Color>[
      BookflowColors.heroGradientStart,
      BookflowColors.heroGradientEnd,
    ],
  );

  static ThemeData light() {
    final ColorScheme scheme =
        ColorScheme.fromSeed(
          seedColor: BookflowColors.heroGradientStart,
          brightness: Brightness.light,
        ).copyWith(
          // The three colours the design actually names, pinned rather than left to
          // the seed algorithm — which would produce tonally "correct" values that
          // are not the ones in the screenshots.
          primary: BookflowColors.actionBlue,
          onPrimary: BookflowColors.textOnBrand,
          secondary: BookflowColors.ctaGreen,
          onSecondary: BookflowColors.textOnBrand,
          surface: BookflowColors.surface,
          onSurface: BookflowColors.textPrimary,
          outline: BookflowColors.borderSubtle,
        );

    final TextTheme textTheme = _textTheme();

    return ThemeData(
      useMaterial3: true,
      colorScheme: scheme,
      scaffoldBackgroundColor: BookflowColors.surface,
      fontFamily: BookflowFonts.systemUi,
      textTheme: textTheme,

      // ── Buttons ─────────────────────────────────────────────────────────
      // Two named styles, because the design has exactly two primary buttons
      // and they are not interchangeable (§4): blue on white functional
      // screens, green on the hero. `filledButtonTheme` is the blue one because
      // it is the common case; the green pill is `heroCtaStyle` below, applied
      // deliberately at the one place it belongs.
      filledButtonTheme: FilledButtonThemeData(
        style: FilledButton.styleFrom(
          backgroundColor: BookflowColors.actionBlue,
          foregroundColor: BookflowColors.textOnBrand,
          minimumSize: const Size.fromHeight(_buttonHeight),
          textStyle: textTheme.labelLarge,
          shape: RoundedRectangleBorder(
            borderRadius: BorderRadius.circular(BookflowRadii.button),
          ),
        ),
      ),

      // §4: "Secondary/text actions — no fill, no border — just colored text …
      // Underlines are not used; color alone signals interactivity."
      textButtonTheme: TextButtonThemeData(
        style: TextButton.styleFrom(
          foregroundColor: BookflowColors.actionBlue,
          textStyle: textTheme.labelLarge,
        ),
      ),

      // ── Inputs (§5) ─────────────────────────────────────────────────────
      inputDecorationTheme: InputDecorationTheme(
        filled: true,
        fillColor: BookflowColors.surface,
        // §5: "roughly 44–48px height for good tap targets". Midpoint, via
        // padding rather than a fixed height so the field still grows with the
        // platform's text scaling instead of clipping.
        contentPadding: const EdgeInsets.symmetric(
          horizontal: BookflowSpacing.md,
          vertical: 14,
        ),
        hintStyle: textTheme.bodyMedium?.copyWith(
          color: BookflowColors.textPlaceholder,
        ),
        border: _inputBorder(BookflowColors.inputBorder),
        enabledBorder: _inputBorder(BookflowColors.inputBorder),
        // §5: the border "appears to intensify to full blue on focus".
        focusedBorder: _inputBorder(BookflowColors.actionBlue, width: 2),
        errorBorder: _inputBorder(scheme.error),
        focusedErrorBorder: _inputBorder(scheme.error, width: 2),
      ),

      // ── Cards (§6) ──────────────────────────────────────────────────────
      // "white rounded rectangles … with a very thin light-gray border and a
      // soft, barely-there drop shadow". Elevation 1, not 0 and not 4.
      cardTheme: CardThemeData(
        color: BookflowColors.surface,
        elevation: 1,
        margin: EdgeInsets.zero,
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.circular(BookflowRadii.card),
          side: const BorderSide(color: BookflowColors.borderSubtle),
        ),
      ),

      // §6: the bottom-sheet pattern auth and onboarding are presented in.
      bottomSheetTheme: const BottomSheetThemeData(
        backgroundColor: BookflowColors.surface,
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.vertical(
            top: Radius.circular(BookflowRadii.sheet),
          ),
        ),
      ),

      dividerTheme: const DividerThemeData(
        color: BookflowColors.borderSubtle,
        thickness: 1,
        space: 1,
      ),

      // §7: "simple, single-weight line icons — minimal, rounded-stroke,
      // monochrome (black or dark gray), no fills."
      iconTheme: const IconThemeData(color: BookflowColors.textPrimary),

      appBarTheme: AppBarTheme(
        backgroundColor: BookflowColors.surface,
        foregroundColor: BookflowColors.textPrimary,
        elevation: 0,
        centerTitle: true,
        titleTextStyle: textTheme.titleLarge,
        // ── THE LIGHT CHROME, FOR EVERY SCREEN THAT HAS AN APP BAR ──────────
        //
        // Material applies this per-AppBar, which makes it scoped and
        // reverting in the same way `AnnotatedRegion` is — and unlike a
        // `SystemChrome.setSystemUIOverlayStyle` call, which is global and does
        // not undo itself when a screen is popped.
        //
        // Declared here rather than repeated on the fifteen screens that would
        // otherwise all say the same thing: it is the DEFAULT, and the two
        // screens that differ are the ones that annotate. Those two —
        // `startup_screen` and `signed_out_screen` — are full-bleed gradient
        // and have no AppBar to carry this, which is why they use
        // `AnnotatedRegion` explicitly. `unavailable_screen` does the same for
        // the light style, being the one ordinary screen with no AppBar.
        systemOverlayStyle: BookflowSystemChrome.light,
      ),
    );
  }

  /// The green pill, for the single highest-priority action on a hero screen.
  ///
  /// Deliberately NOT the default `FilledButton` style. §2 says this colour "is
  /// the most visually loud element in the app, so it should stay rare and
  /// reserved for primary conversion actions" — making it the default would
  /// guarantee the opposite. A screen opts into it explicitly, which is a
  /// decision someone can see in a diff.
  static ButtonStyle heroCtaStyle(BuildContext context) {
    return FilledButton.styleFrom(
      backgroundColor: BookflowColors.ctaGreen,
      foregroundColor: BookflowColors.textOnBrand,
      minimumSize: const Size.fromHeight(_buttonHeight),
      textStyle: Theme.of(context).textTheme.labelLarge,
      // §4: "fully rounded ends (radius ≈ half the button height)". A stadium
      // is that shape by definition, so the radius never has to be kept in step
      // with the height by hand.
      shape: const StadiumBorder(),
    );
  }

  /// §5: "roughly 44–48px height for good tap targets". Midpoint.
  static const double _buttonHeight = 46;

  static OutlineInputBorder _inputBorder(Color color, {double width = 1}) {
    return OutlineInputBorder(
      borderRadius: BorderRadius.circular(BookflowRadii.input),
      borderSide: BorderSide(color: color, width: width),
    );
  }

  /// §3's "restrained hierarchy": one display size, one title size, one body
  /// size, and bold doing the rest of the work.
  ///
  /// Only the slots the app actually uses are defined. Material's full 15-slot
  /// text theme would mean inventing eleven more sizes the design does not have,
  /// which is precisely the "many distinct sizes" §3 says the design avoids.
  static TextTheme _textTheme() {
    return const TextTheme(
      displayLarge: TextStyle(
        fontSize: BookflowTypeScale.display,
        fontWeight: FontWeight.w800,
        color: BookflowColors.textPrimary,
        height: 1.1,
      ),
      titleLarge: TextStyle(
        fontSize: BookflowTypeScale.title,
        fontWeight: FontWeight.w500,
        color: BookflowColors.textPrimary,
        height: 1.3,
      ),
      bodyMedium: TextStyle(
        fontSize: BookflowTypeScale.body,
        fontWeight: FontWeight.w400,
        color: BookflowColors.textPrimary,
        // §3: "generous line height".
        height: 1.5,
      ),
      bodySmall: TextStyle(
        fontSize: BookflowTypeScale.caption,
        fontWeight: FontWeight.w400,
        color: BookflowColors.textSecondary,
        height: 1.4,
      ),
      labelLarge: TextStyle(
        fontSize: BookflowTypeScale.body,
        fontWeight: FontWeight.w700,
        height: 1.2,
      ),
    );
  }
}
