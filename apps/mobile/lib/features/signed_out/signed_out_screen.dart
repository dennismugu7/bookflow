import 'package:bookflow/features/auth/auth_flow.dart';
import 'package:bookflow/theme/app_theme.dart';
import 'package:bookflow/theme/tokens.dart';
import 'package:flutter/material.dart';

/// The welcome / authentication gateway — screen #2, `native-01`.
///
/// Deep purple gradient, the Bookflow wordmark, and the two ways in. **Both
/// buttons work now.** They were inert from PR 3a until the entry flow landed,
/// which meant a real user could open this app and get no further — the gap
/// this slice closes.
///
/// - "Create for free" opens the sign-up sheet (Screen 3), which posts to our
///   API. ADR-037: account creation is mediated and never goes to GoTrue.
/// - "Sign in" opens the login sheet, which goes to GoTrue through
///   `AuthGateway`.
///
/// The screen holds no auth logic and no navigation of its own — it opens a
/// sheet and the flow in `auth_flow.dart` does the rest, which is why this file
/// is still a `StatelessWidget` with no `ref`.
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
                  key: const Key('welcome-create-account'),
                  // The one place the green is allowed (§2: "should stay rare
                  // and reserved for primary conversion actions").
                  style: BookflowTheme.heroCtaStyle(context),
                  onPressed: () => showSignupFlow(context),
                  child: const Text('Create for free'),
                ),
                const SizedBox(height: BookflowSpacing.md),
                TextButton(
                  key: const Key('welcome-sign-in'),
                  onPressed: () => showLoginFlow(context),
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
