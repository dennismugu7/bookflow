import 'dart:async';

import 'package:bookflow/features/auth/auth_copy.dart';
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

/// The one code-entry sheet, used by both flows that mail a code.
///
/// ══ WHY THIS IS SHARED AND WHAT IS NOT ══════════════════════════════════════
///
/// Sign-up verification and password recovery collect the same thing in the
/// same way — one wide field, a Verify button, a resend link on a cooldown —
/// and differ only in their copy and in which gateway call the code goes to.
/// Two copies of the timer would be two timers to get wrong, and the second
/// would drift from the first the first time either was touched.
///
/// **What is NOT shared is the OTP type.** `signup` and `recovery` are
/// different operations with different consequences — one activates an account,
/// the other hands out a session that must be given straight back — so the
/// caller supplies [onVerify] and this widget never names either.
///
/// ── SIX DIGITS, NOT THE EIGHT THE DESIGN SAYS ───────────────────────────────
///
/// GoTrue issues six and the length is its setting rather than ours. The
/// design's copy reads "We sent a 8-digit code"; a screen that tells someone to
/// enter eight digits of a six-digit code instructs them to fail. Its own
/// Layout Notes flag the digit-counting concern with a single wide field, and
/// that concern was about eight.
class CodeEntrySheet extends ConsumerStatefulWidget {
  const CodeEntrySheet({
    required this.title,
    required this.message,
    required this.submission,
    required this.onVerify,
    required this.onResend,
    required this.onBack,
    this.footer = const <Widget>[],
    super.key,
  });

  final String title;

  /// The line above the field, already carrying the address. Passed in rather
  /// than built here so each flow can say what it actually did — one sent a
  /// code to activate an account, the other to prove an identity.
  final String message;

  final AsyncValue<void> submission;
  final Future<void> Function(String code) onVerify;
  final Future<void> Function() onResend;
  final VoidCallback onBack;

  /// Rendered under the resend row. The sign-up flow puts "Back to sign in"
  /// here; recovery has nowhere else to be.
  final List<Widget> footer;

  @override
  ConsumerState<CodeEntrySheet> createState() => _CodeEntrySheetState();
}

class _CodeEntrySheetState extends ConsumerState<CodeEntrySheet> {
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
    await widget.onVerify(code);
  }

  Future<void> _resend() async {
    // Started before the request, not after it: the cooldown exists to stop a
    // second tap, and a second tap happens while the first is in flight.
    _startCooldown();
    await widget.onResend();
  }

  @override
  Widget build(BuildContext context) {
    final ThemeData theme = Theme.of(context);
    final bool inFlight = widget.submission.isLoading;

    return AuthSheetScaffold(
      title: widget.title,
      onBack: inFlight ? null : widget.onBack,
      children: <Widget>[
        Text(widget.message, style: theme.textTheme.bodyMedium),
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
        if (widget.submission.hasError)
          AuthErrorText(message: authFailureMessage(widget.submission.error!)),
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
        ...widget.footer,
      ],
    );
  }
}
