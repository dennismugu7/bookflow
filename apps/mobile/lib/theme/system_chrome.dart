import 'package:bookflow/theme/tokens.dart';
// `services`, not `material`: `SystemUiOverlayStyle` and `Brightness` both come
// from here, and nothing in this file is a widget.
import 'package:flutter/services.dart';

/// The status bar and navigation bar, as two declarative styles.
///
/// ══ `AnnotatedRegion`, NEVER `SystemChrome.setSystemUIOverlayStyle` ═════════
///
/// The imperative call is the obvious approach and it is the wrong one. It sets
/// a global, so:
///
///   * it is order-dependent — whichever screen called it last wins, including
///     a screen the user has already navigated away from;
///   * **it does not revert.** Push the welcome screen's brand chrome, go back
///     to a white screen, and the status bar stays indigo with white icons over
///     white content. That failure is invisible in a widget test and obvious on
///     a device.
///
/// `AnnotatedRegion` is scoped to the subtree that declares it and is undone
/// when that subtree leaves. A screen's chrome is then decided where the screen
/// is, and nowhere else.
///
/// ── THE ICON BRIGHTNESS NAMES ARE BACKWARDS, AND THAT IS ANDROID'S FAULT ───
///
/// `statusBarIconBrightness` is the brightness OF THE ICONS: `Brightness.light`
/// means light-coloured icons, for a dark background. `statusBarBrightness` is
/// the brightness of the BACKGROUND and is read on iOS only.
///
/// Both are set on each style below even though this project is Android-only
/// (ADR-043) — they cost nothing, and setting one and not the other is the
/// mistake somebody makes at 2am when iOS comes back.
///
/// ── NO EDGE-TO-EDGE ────────────────────────────────────────────────────────
///
/// Colour only. `SystemUiMode.edgeToEdge` would put content UNDER the bars and
/// require every screen to handle its own insets — a layout change, on every
/// screen, to fix a colour problem.
abstract final class BookflowSystemChrome {
  /// For the two full-bleed brand screens: startup and welcome.
  ///
  /// The bars take the gradient's dark end rather than its midpoint. The
  /// gradient runs top-left to bottom-right, so the top of the screen — which
  /// is what the status bar sits against — is `heroGradientStart`, and matching
  /// the midpoint would leave a visible seam at the very top.
  static const SystemUiOverlayStyle brand = SystemUiOverlayStyle(
    statusBarColor: BookflowColors.heroGradientStart,
    statusBarIconBrightness: Brightness.light,
    statusBarBrightness: Brightness.dark,
    systemNavigationBarColor: BookflowColors.heroGradientEnd,
    systemNavigationBarIconBrightness: Brightness.light,
  );

  /// For every ordinary screen: white surface, dark icons.
  static const SystemUiOverlayStyle light = SystemUiOverlayStyle(
    statusBarColor: BookflowColors.surface,
    statusBarIconBrightness: Brightness.dark,
    statusBarBrightness: Brightness.light,
    systemNavigationBarColor: BookflowColors.surface,
    systemNavigationBarIconBrightness: Brightness.dark,
  );
}
