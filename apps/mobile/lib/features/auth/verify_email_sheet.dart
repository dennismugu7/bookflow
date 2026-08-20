import 'package:bookflow/features/auth/auth_providers.dart';
import 'package:bookflow/features/auth/code_entry_sheet.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

/// Email verification — "Enter your code".
///
/// The field, the Verify button and the resend cooldown are `CodeEntrySheet`,
/// which recovery uses too. What is left here is the part that differs: the
/// copy, and the fact that this code goes to `verifySignupCode`.
///
/// ══ NOTHING HERE ROUTES ON SUCCESS ══════════════════════════════════════════
///
/// `verifyOTP` confirms the account **and returns a session**, which the
/// Supabase client persists through `SecureSessionStore` and announces on
/// `statusChanges()`. `appDestinationProvider` recomputes and the existing
/// redirect moves the user to `/setup` or `/home`. This sheet's only job on
/// success is to close itself.
class VerifyEmailSheet extends ConsumerWidget {
  const VerifyEmailSheet({
    required this.email,
    required this.onVerified,
    required this.onBackToSignIn,
    required this.onBack,
    super.key,
  });

  final String email;

  /// Called once the session exists. See the class comment: the caller closes
  /// the sheet, the router does the rest.
  final VoidCallback onVerified;

  final VoidCallback onBackToSignIn;
  final VoidCallback onBack;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final AsyncValue<void> submission = ref.watch(
      verifyEmailControllerProvider,
    );

    return CodeEntrySheet(
      title: 'Enter your code',
      message:
          'We sent a 6-digit code to $email. Enter it below to activate your '
          'account.',
      submission: submission,
      onBack: onBack,
      onVerify: (String code) async {
        await ref
            .read(verifyEmailControllerProvider.notifier)
            .verify(email: email, code: code);

        if (!context.mounted) return;
        if (ref.read(verifyEmailControllerProvider).hasError) return;

        onVerified();
      },
      onResend: () =>
          ref.read(verifyEmailControllerProvider.notifier).resend(email: email),
      footer: <Widget>[
        TextButton(
          key: const Key('verify-back-to-sign-in'),
          onPressed: submission.isLoading ? null : onBackToSignIn,
          child: const Text('Back to sign in'),
        ),
      ],
    );
  }
}
