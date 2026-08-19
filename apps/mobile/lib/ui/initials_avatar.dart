import 'package:bookflow/theme/tokens.dart';
import 'package:flutter/material.dart';

/// The green circle carrying an owner's initials.
///
/// ══ WHY THIS IS IN `ui/` RATHER THAN IN EACH FEATURE ════════════════════════
///
/// It was built three times before this file existed — screen #12's app-bar
/// badge, screen #17's header, and screen #20's card — in three commits over
/// two days. All three set the same `avatarGreen` circle, the same
/// `textOnBrand` glyphs and the same `w700`, and differed only in diameter and
/// text style. **Nothing decided that; it is what happens when the second copy
/// is written before anyone notices there is a first.**
///
/// ADR-039 makes this a design-system element rather than a screen detail:
/// green initials avatars are named as part of Generation A, *"which is what
/// the tokens are derived from"*. A token that three widgets each re-assemble
/// by hand is a token that can be changed without those widgets moving — the
/// failure `design_system_test.dart` exists to prevent, one level up from the
/// literals it checks.
///
/// ── WHAT IT DOES NOT DO ─────────────────────────────────────────────────────
///
/// **It computes nothing.** The initials come from `OwnerProfile.initials`,
/// which `profile_models.dart` already owns and which every caller already had.
/// This is presentation only, so the rule about where business logic lives is
/// unaffected — and a widget that derived initials would be a second place for
/// that derivation to drift.
///
/// **It has no loading or error state.** An avatar is not worth one:
/// `dashboard_screen.dart` degrades to an empty circle while the profile is in
/// flight, and `profile_models.dart` makes the same argument for a name that
/// cannot render yet. Callers pass whatever they have, including an empty
/// string.
class InitialsAvatar extends StatelessWidget {
  const InitialsAvatar({
    required this.initials,
    required this.diameter,
    this.textStyle,
    super.key,
  });

  /// Already derived — see the class comment.
  final String initials;

  /// From `BookflowSizes`. Required rather than defaulted: the three call sites
  /// genuinely differ, and a default would make one of them silently canonical.
  final double diameter;

  /// Defaults to `bodyMedium`, which is what the two small avatars use. Screen
  /// #20's larger badge passes `titleLarge`.
  final TextStyle? textStyle;

  @override
  Widget build(BuildContext context) {
    final TextStyle? base = textStyle ?? Theme.of(context).textTheme.bodyMedium;

    return Container(
      width: diameter,
      height: diameter,
      decoration: const BoxDecoration(
        color: BookflowColors.avatarGreen,
        shape: BoxShape.circle,
      ),
      alignment: Alignment.center,
      child: Text(
        initials,
        style: base?.copyWith(
          color: BookflowColors.textOnBrand,
          fontWeight: FontWeight.w700,
        ),
      ),
    );
  }
}
