import 'package:bookflow/features/auth/auth_copy.dart';
import 'package:bookflow/features/auth/auth_providers.dart';
import 'package:bookflow/features/auth/auth_sheet.dart';
import 'package:bookflow/features/auth/code_entry_sheet.dart';
import 'package:bookflow/theme/tokens.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

/// The password-reset flow's three sheets.
///
///   1. [ResetRequestSheet]   — which address?
///   2. [ResetVerifySheet]    — the code from that address
///   3. [NewPasswordSheet]    — the new password, twice
///
/// They share one controller, because it is one conversation about one address,
/// and each step's error area replaces the last rather than accumulating.

/// Step 1 — "Reset your password". Asks for the address and mails a code.
///
/// ══ IT SAYS THE SAME THING WHETHER OR NOT THE ACCOUNT EXISTS ════════════════
///
/// GoTrue does not distinguish and neither does this. A screen that said "no
/// account for that address" is an account-enumeration oracle: anyone could
/// test addresses against it all day. So the copy on the next sheet is
/// conditional — "if that address has an account" — and it is true either way.
class ResetRequestSheet extends ConsumerStatefulWidget {
  const ResetRequestSheet({
    required this.onSent,
    required this.onBack,
    super.key,
  });

  /// Called with the trimmed address once the request is away.
  final void Function(String email) onSent;

  final VoidCallback onBack;

  @override
  ConsumerState<ResetRequestSheet> createState() => _ResetRequestSheetState();
}

class _ResetRequestSheetState extends ConsumerState<ResetRequestSheet> {
  final TextEditingController _email = TextEditingController();
  String? _emailError;

  @override
  void dispose() {
    _email.dispose();
    super.dispose();
  }

  Future<void> _submit() async {
    final String email = _email.text.trim();
    setState(() {
      _emailError = email.isEmpty
          ? 'Enter your email address.'
          : emailLooksValid(email)
          ? null
          : 'That does not look like an email address.';
    });
    if (_emailError != null) return;

    await ref
        .read(resetPasswordControllerProvider.notifier)
        .request(email: email);

    if (!mounted) return;
    if (ref.read(resetPasswordControllerProvider).hasError) return;

    ref.read(resetPasswordControllerProvider.notifier).clear();
    widget.onSent(email);
  }

  @override
  Widget build(BuildContext context) {
    final ThemeData theme = Theme.of(context);
    final AsyncValue<void> submission = ref.watch(
      resetPasswordControllerProvider,
    );
    final bool inFlight = submission.isLoading;

    return AuthSheetScaffold(
      title: 'Reset your password',
      onBack: inFlight ? null : widget.onBack,
      children: <Widget>[
        Text(
          'Tell us the address on your account and we will send a code to it.',
          style: theme.textTheme.bodyMedium,
        ),
        const SizedBox(height: BookflowSpacing.lg),
        TextField(
          key: const Key('reset-email'),
          controller: _email,
          enabled: !inFlight,
          keyboardType: TextInputType.emailAddress,
          autocorrect: false,
          textInputAction: TextInputAction.done,
          onSubmitted: (String _) => _submit(),
          decoration: InputDecoration(
            labelText: 'Enter email:',
            hintText: 'address@mail.com',
            errorText: _emailError,
          ),
        ),
        const SizedBox(height: BookflowSpacing.lg),
        if (submission.hasError)
          AuthErrorText(message: authFailureMessage(submission.error!)),
        AuthSubmitButton(
          key: const Key('reset-request-submit'),
          label: 'Send code',
          inFlight: inFlight,
          onPressed: _submit,
        ),
      ],
    );
  }
}

/// Step 2 — "Please verify your identity".
///
/// The field, the button and the resend cooldown are `CodeEntrySheet`, the same
/// widget sign-up verification uses. What differs is the copy and where the
/// code goes: this one buys a **recovery session** rather than activating an
/// account, which is why the controller raises the recovery flag around it.
class ResetVerifySheet extends ConsumerWidget {
  const ResetVerifySheet({
    required this.email,
    required this.onVerified,
    required this.onBack,
    super.key,
  });

  final String email;
  final VoidCallback onVerified;
  final VoidCallback onBack;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final AsyncValue<void> submission = ref.watch(
      resetPasswordControllerProvider,
    );

    return CodeEntrySheet(
      title: 'Please verify your identity',
      // Conditional on purpose — see `ResetRequestSheet`. The request succeeds
      // for an address with no account, and this sentence must still be true.
      message:
          'If that address has an account, we have sent it a 6-digit code. '
          'Enter it below to continue.',
      submission: submission,
      onBack: onBack,
      onVerify: (String code) async {
        await ref
            .read(resetPasswordControllerProvider.notifier)
            .verifyCode(email: email, code: code);

        if (!context.mounted) return;
        if (ref.read(resetPasswordControllerProvider).hasError) return;

        ref.read(resetPasswordControllerProvider.notifier).clear();
        onVerified();
      },
      onResend: () => ref
          .read(resetPasswordControllerProvider.notifier)
          .resend(email: email),
    );
  }
}

/// Step 3 — the new password, twice.
///
/// ══ SIGNING OUT AFTERWARDS IS THE POINT, NOT A LOOSE END ════════════════════
///
/// The gateway ends the recovery session the moment the password is set, and
/// the flow lands the user on the login sheet. The design asks for it, and it
/// is the only thing that makes the user find out straight away whether the
/// password they just set is the one they think they set.
class NewPasswordSheet extends ConsumerStatefulWidget {
  const NewPasswordSheet({
    required this.email,
    required this.onDone,
    required this.onBack,
    super.key,
  });

  final String email;

  /// Called once the password is set and the session is gone.
  final VoidCallback onDone;

  /// Leaving with a recovery session open. The flow ends it — see
  /// `ResetPasswordController.abandon`.
  final VoidCallback onBack;

  @override
  ConsumerState<NewPasswordSheet> createState() => _NewPasswordSheetState();
}

class _NewPasswordSheetState extends ConsumerState<NewPasswordSheet> {
  final TextEditingController _password = TextEditingController();
  final TextEditingController _confirm = TextEditingController();

  /// Independent toggles, as the design's three-field Change-password screen
  /// specifies: "Toggles that specific field's text … independently of the
  /// other two."
  bool _passwordObscured = true;
  bool _confirmObscured = true;

  String? _passwordError;
  String? _confirmError;

  @override
  void dispose() {
    _password.dispose();
    _confirm.dispose();
    super.dispose();
  }

  bool _validate() {
    setState(() {
      _passwordError = _password.text.length < passwordMinLength
          ? 'Use at least $passwordMinLength characters.'
          : null;
      _confirmError = _confirm.text == _password.text
          ? null
          : 'Those do not match.';
    });
    return _passwordError == null && _confirmError == null;
  }

  Future<void> _submit() async {
    if (!_validate()) return;

    await ref
        .read(resetPasswordControllerProvider.notifier)
        .setPassword(newPassword: _password.text);

    if (!mounted) return;
    if (ref.read(resetPasswordControllerProvider).hasError) return;

    widget.onDone();
  }

  @override
  Widget build(BuildContext context) {
    final ThemeData theme = Theme.of(context);
    final AsyncValue<void> submission = ref.watch(
      resetPasswordControllerProvider,
    );
    final bool inFlight = submission.isLoading;

    return AuthSheetScaffold(
      title: 'Reset your password',
      onBack: inFlight ? null : widget.onBack,
      children: <Widget>[
        Text(
          'Please enter a new password for',
          style: theme.textTheme.bodySmall,
        ),
        Text(
          widget.email,
          style: theme.textTheme.bodyMedium?.copyWith(
            fontWeight: FontWeight.bold,
          ),
        ),
        const SizedBox(height: BookflowSpacing.lg),
        TextField(
          key: const Key('reset-new-password'),
          controller: _password,
          enabled: !inFlight,
          obscureText: _passwordObscured,
          autocorrect: false,
          enableSuggestions: false,
          textInputAction: TextInputAction.next,
          decoration: InputDecoration(
            labelText: 'Enter new password',
            errorText: _passwordError,
            suffixIcon: IconButton(
              key: const Key('reset-new-password-visibility'),
              onPressed: () =>
                  setState(() => _passwordObscured = !_passwordObscured),
              icon: Icon(
                _passwordObscured ? Icons.visibility_off : Icons.visibility,
              ),
              tooltip: _passwordObscured ? 'Show password' : 'Hide password',
            ),
          ),
        ),
        const SizedBox(height: BookflowSpacing.md),
        TextField(
          key: const Key('reset-confirm-password'),
          controller: _confirm,
          enabled: !inFlight,
          obscureText: _confirmObscured,
          autocorrect: false,
          enableSuggestions: false,
          textInputAction: TextInputAction.done,
          onSubmitted: (String _) => _submit(),
          decoration: InputDecoration(
            labelText: 'Confirm new password',
            errorText: _confirmError,
            suffixIcon: IconButton(
              key: const Key('reset-confirm-password-visibility'),
              onPressed: () =>
                  setState(() => _confirmObscured = !_confirmObscured),
              icon: Icon(
                _confirmObscured ? Icons.visibility_off : Icons.visibility,
              ),
              tooltip: _confirmObscured ? 'Show password' : 'Hide password',
            ),
          ),
        ),
        const SizedBox(height: BookflowSpacing.lg),
        if (submission.hasError)
          AuthErrorText(message: authFailureMessage(submission.error!)),
        AuthSubmitButton(
          key: const Key('reset-submit'),
          label: 'Submit',
          inFlight: inFlight,
          onPressed: _submit,
        ),
      ],
    );
  }
}
