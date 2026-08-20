import 'dart:async';

import 'package:bookflow/features/auth/auth_copy.dart';
import 'package:bookflow/features/auth/auth_providers.dart';
import 'package:bookflow/features/auth/auth_sheet.dart';
import 'package:bookflow/theme/tokens.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

/// How long the resend link stays disabled after a send.
///
/// The design asks for a cooldown and names 30 seconds ("Resend in 30s"). It is
/// a courtesy rather than a control: GoTrue rate-limits server-side regardless,
/// and this only stops a user generating a refusal by tapping twice.
const Duration resendCooldown = Duration(seconds: 30);

/// Email verification — "Enter your code".
///
/// ══ THE CODE IS SIX DIGITS, NOT EIGHT ═══════════════════════════════════════
///
/// The design says eight and the copy on it reads "We sent a 8-digit code".
/// **GoTrue issues six**, and the length is its setting rather than ours. The
/// copy below therefore says six, because a screen that tells someone to enter
/// eight digits of a six-digit code is instructing them to fail.
///
/// The design's single wide field is kept over the segmented per-digit pattern —
/// its own Layout Notes flag the concern about digit-counting, and that concern
/// was about eight.
///
/// ══ NOTHING HERE ROUTES ON SUCCESS ══════════════════════════════════════════
///
/// `verifyOTP` confirms the account **and returns a session**, which the
/// Supabase client persists through `SecureSessionStore` and announces on
/// `statusChanges()`. `appDestinationProvider` recomputes and the existing
/// redirect moves the user to `/setup` or `/home`. This sheet's only job on
/// success is to close itself.
class VerifyEmailSheet extends ConsumerStatefulWidget {
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
  ConsumerState<VerifyEmailSheet> createState() => _VerifyEmailSheetState();
}

class _VerifyEmailSheetState extends ConsumerState<VerifyEmailSheet> {
  final TextEditingController _code = TextEditingController();

  /// Seconds left before the resend link is offered again. Local state and a
  /// local timer, because it is a property of this sheet being open — leaving
  /// and returning legitimately starts a fresh one, and hoisting it into a
  /// provider would outlive the sheet for no benefit.
  int _cooldown = 0;
  Timer? _ticker;

  @override
  void dispose() {
    _ticker?.cancel();
    _code.dispose();
    super.dispose();
  }

  void _startCooldown() {
    _ticker?.cancel();
    setState(() => _cooldown = resendCooldown.inSeconds);
    _ticker = Timer.periodic(const Duration(seconds: 1), (Timer timer) {
      if (!mounted) {
        timer.cancel();
        return;
      }
      setState(() => _cooldown -= 1);
      if (_cooldown <= 0) timer.cancel();
    });
  }

  Future<void> _verify() async {
    final String code = _code.text.trim();
    if (code.isEmpty) return;

    await ref
        .read(verifyEmailControllerProvider.notifier)
        .verify(email: widget.email, code: code);

    if (!mounted) return;
    if (ref.read(verifyEmailControllerProvider).hasError) return;

    widget.onVerified();
  }

  Future<void> _resend() async {
    // Started before the request, not after it: the cooldown exists to stop a
    // second tap, and a second tap happens while the first is in flight.
    _startCooldown();
    await ref
        .read(verifyEmailControllerProvider.notifier)
        .resend(email: widget.email);
  }

  @override
  Widget build(BuildContext context) {
    final ThemeData theme = Theme.of(context);
    final AsyncValue<void> submission = ref.watch(
      verifyEmailControllerProvider,
    );
    final bool inFlight = submission.isLoading;

    return AuthSheetScaffold(
      title: 'Enter your code',
      onBack: inFlight ? null : widget.onBack,
      children: <Widget>[
        Text(
          'We sent a 6-digit code to ${widget.email}. Enter it below to '
          'activate your account.',
          style: theme.textTheme.bodyMedium,
        ),
        const SizedBox(height: BookflowSpacing.lg),
        TextField(
          key: const Key('verify-code'),
          controller: _code,
          enabled: !inFlight,
          keyboardType: TextInputType.number,
          autocorrect: false,
          enableSuggestions: false,
          textInputAction: TextInputAction.done,
          onSubmitted: (String _) => _verify(),
          decoration: const InputDecoration(labelText: 'Verification code'),
        ),
        const SizedBox(height: BookflowSpacing.lg),
        if (submission.hasError)
          AuthErrorText(message: authFailureMessage(submission.error!)),
        AuthSubmitButton(
          key: const Key('verify-submit'),
          label: 'Verify',
          inFlight: inFlight,
          onPressed: _verify,
        ),
        const SizedBox(height: BookflowSpacing.md),
        Row(
          mainAxisAlignment: MainAxisAlignment.center,
          children: <Widget>[
            Text("Didn't get a code? ", style: theme.textTheme.bodySmall),
            TextButton(
              key: const Key('verify-resend'),
              onPressed: (_cooldown > 0 || inFlight) ? null : _resend,
              child: Text(_cooldown > 0 ? 'Resend in ${_cooldown}s' : 'Resend'),
            ),
          ],
        ),
        TextButton(
          key: const Key('verify-back-to-sign-in'),
          onPressed: inFlight ? null : widget.onBackToSignIn,
          child: const Text('Back to sign in'),
        ),
      ],
    );
  }
}
