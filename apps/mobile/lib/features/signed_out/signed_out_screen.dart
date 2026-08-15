import 'package:bookflow/theme/app_theme.dart';
import 'package:bookflow/theme/tokens.dart';
import 'package:flutter/material.dart';

/// The welcome / authentication gateway — screen #2, `native-01`.
///
/// PLACEHOLDER (PR 3a). What is real here is the shell: the hero gradient, the
/// green CTA in the one place §2 permits it, and the fact that this is where an
/// unauthenticated user lands. **Neither button does anything yet.**
///
/// - "Create for free" opens sign-up, which is NOT in this PR: ADR-037 routes
///   account creation through our API, and it arrives with the screens that
///   collect the fields.
/// - "Sign in" opens the login sheet, which is the next slice.
///
/// Both are deliberately present and inert rather than absent, because the point
/// of this screen in 3a is to prove the redirect reaches it.
class SignedOutScreen extends StatelessWidget {
  const SignedOutScreen({super.key});

  @override
  Widget build(BuildContext context) {
    final ThemeData theme = Theme.of(context);

    return Scaffold(
      body: DecoratedBox(
        decoration: const BoxDecoration(gradient: BookflowTheme.heroGradient),
        child: SafeArea(
          child: Padding(
            padding: const EdgeInsets.symmetric(horizontal: BookflowSpacing.lg),
            child: Column(
              mainAxisAlignment: MainAxisAlignment.center,
              children: <Widget>[
                Text(
                  'Bookflow',
                  style: theme.textTheme.displayLarge?.copyWith(
                    color: BookflowColors.textOnBrand,
                  ),
                ),
                const SizedBox(height: BookflowSpacing.sm),
                Text(
                  'Ready, set, book',
                  style: theme.textTheme.bodyMedium?.copyWith(
                    color: BookflowColors.textOnBrand,
                    fontStyle: FontStyle.italic,
                  ),
                ),
                const SizedBox(height: BookflowSpacing.xxl),
                FilledButton(
                  // The one place the green is allowed (§2: "should stay rare
                  // and reserved for primary conversion actions").
                  style: BookflowTheme.heroCtaStyle(context),
                  onPressed: null,
                  child: const Text('Create for free'),
                ),
                const SizedBox(height: BookflowSpacing.md),
                TextButton(
                  onPressed: null,
                  style: TextButton.styleFrom(
                    foregroundColor: BookflowColors.textOnBrand,
                  ),
                  child: const Text('Sign in'),
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }
}
