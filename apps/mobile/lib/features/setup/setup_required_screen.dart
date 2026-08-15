import 'package:bookflow/platform/providers.dart';
import 'package:bookflow/theme/tokens.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

/// Signed in, no business yet — ADR-032's stubbed "finish setting up" screen,
/// and the UI half of I10.
///
/// ══ THIS IS DELIBERATE DEBT, AND ADR-032 SAYS SO ════════════════════════════
///
/// "The zero-membership stub is deliberate debt. It will look unfinished because
/// it is unfinished, and it is replaced by the onboarding slice."
///
/// It exists because ADR-031 makes a user with no membership "a real,
/// representable state, not an edge case discovered later" — a `user_profiles`
/// row with no `memberships` row. Every account created by ADR-037's sign-up is
/// in exactly this state until onboarding exists, so this is currently the
/// screen almost every real user would see.
///
/// **It is a truthful holding state, not the real onboarding.** It says what is
/// true — the account exists, the business does not — and offers the one action
/// that works today, which is signing out.
class SetupRequiredScreen extends ConsumerWidget {
  const SetupRequiredScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final ThemeData theme = Theme.of(context);

    return Scaffold(
      appBar: AppBar(title: const Text('Finish setting up')),
      body: Center(
        child: Padding(
          padding: const EdgeInsets.all(BookflowSpacing.lg),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: <Widget>[
              Text(
                'Your account is ready',
                style: theme.textTheme.titleLarge,
                textAlign: TextAlign.center,
              ),
              const SizedBox(height: BookflowSpacing.sm),
              Text(
                "You haven't set up a business yet. That step is coming soon.",
                style: theme.textTheme.bodyMedium,
                textAlign: TextAlign.center,
              ),
              const SizedBox(height: BookflowSpacing.xl),
              TextButton(
                onPressed: () async => ref.read(authGatewayProvider).signOut(),
                child: const Text('Sign out'),
              ),
            ],
          ),
        ),
      ),
    );
  }
}
