import 'package:bookflow/platform/providers.dart';
import 'package:bookflow/theme/tokens.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

/// Signed in, with a business — the third shell (ADR-032).
///
/// PLACEHOLDER (PR 3a). The dashboard this becomes — the three tab pills, the
/// avatar, the bookings list — is a later slice, and screen #20 (My Profile
/// Details), which ADR-032 makes Phase 3's "one true page", is **PR 3b**.
///
/// **Nothing in production can currently reach this screen**, because nothing
/// can create a business — see `membership_repository.dart`. It is reachable in
/// tests by overriding the membership repository, which is how the redirect's
/// third branch is proved rather than assumed.
class HomeScreen extends ConsumerWidget {
  const HomeScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final ThemeData theme = Theme.of(context);

    return Scaffold(
      appBar: AppBar(title: const Text('Bookflow')),
      body: Center(
        child: Padding(
          padding: const EdgeInsets.all(BookflowSpacing.lg),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: <Widget>[
              Text(
                'Signed in',
                style: theme.textTheme.titleLarge,
                textAlign: TextAlign.center,
              ),
              const SizedBox(height: BookflowSpacing.sm),
              Text(
                'The dashboard lands in a later slice. Screen #20 is PR 3b.',
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
