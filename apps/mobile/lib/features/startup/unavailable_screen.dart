import 'package:bookflow/platform/providers.dart';
import 'package:bookflow/ui/async_value_view.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

/// Signed in, and we could not determine whether there is a business.
///
/// ── WHY THIS IS ITS OWN DESTINATION ─────────────────────────────────────────
///
/// The alternative is to treat "could not read membership" as "no membership"
/// and send the user to the setup stub. That tells an owner who already has a
/// business to go and create one — a confident, wrong answer produced by a
/// failure the app noticed and then ignored.
///
/// So the error keeps its own screen. It uses the shared `ErrorView`, like every
/// other error in the app, and its retry invalidates the membership provider —
/// which re-runs the read and lets the redirect move the user on by itself.
class UnavailableScreen extends ConsumerWidget {
  const UnavailableScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    return Scaffold(
      body: SafeArea(
        child: ErrorView(
          message: "We couldn't load your account.",
          onRetry: () => ref.invalidate(membershipStatusProvider),
        ),
      ),
    );
  }
}
