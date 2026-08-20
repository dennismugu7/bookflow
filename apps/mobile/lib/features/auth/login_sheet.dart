import 'package:bookflow/features/auth/auth_copy.dart';
import 'package:bookflow/features/auth/auth_providers.dart';
import 'package:bookflow/features/auth/auth_sheet.dart';
import 'package:bookflow/platform/auth_failure.dart';
import 'package:bookflow/theme/tokens.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

/// The login sheet, for an owner who already has an account.
///
/// ══ ONE FAILURE HAS A WAY OUT, AND IT IS OFFERED ════════════════════════════
///
/// An unverified account is the one login failure the user can actually fix
/// from here: the code is already in their inbox. So `emailNotConfirmed` grows
/// a control beside its message that opens the verification sheet for the
/// address they just typed. Every other failure is a sentence, because there is
/// nothing to offer.
///
/// The social buttons the design draws are omitted here for the same reason as
/// on the sign-up sheet: no provider is configured, and a button that opens
/// nothing is worse than its absence.
class LoginSheet extends ConsumerStatefulWidget {
  const LoginSheet({
    required this.onSignedIn,
    required this.onVerifyEmail,
    required this.onForgotPassword,
    required this.onBack,
    super.key,
  });

  /// Called once the session exists. The sheet closes; the existing redirect in
  /// `router.dart` decides where the user goes.
  final VoidCallback onSignedIn;

  /// Called with the typed address when the account exists but is unverified.
  final void Function(String email) onVerifyEmail;

  final VoidCallback onForgotPassword;
  final VoidCallback onBack;

  @override
  ConsumerState<LoginSheet> createState() => _LoginSheetState();
}

class _LoginSheetState extends ConsumerState<LoginSheet> {
  final TextEditingController _email = TextEditingController();
  final TextEditingController _password = TextEditingController();

  bool _obscured = true;

  @override
  void dispose() {
    _email.dispose();
    _password.dispose();
    super.dispose();
  }

  Future<void> _submit() async {
    // No client-side format check, deliberately. On sign-up a malformed address
    // is worth catching before a round trip; here the only question is whether
    // these credentials match an account, and only the server can answer it.
    // Rejecting locally would also leak which addresses this app considers
    // possible.
    if (_email.text.trim().isEmpty || _password.text.isEmpty) return;

    await ref
        .read(loginControllerProvider.notifier)
        .submit(email: _email.text.trim(), password: _password.text);

    if (!mounted) return;
    if (ref.read(loginControllerProvider).hasError) return;

    widget.onSignedIn();
  }

  @override
  Widget build(BuildContext context) {
    final AsyncValue<void> submission = ref.watch(loginControllerProvider);
    final bool inFlight = submission.isLoading;

    final Object? error = submission.error;
    final bool unverified =
        error is AuthFailure && error.kind == AuthFailureKind.emailNotConfirmed;

    return AuthSheetScaffold(
      title: 'Welcome back',
      onBack: inFlight ? null : widget.onBack,
      children: <Widget>[
        TextField(
          key: const Key('login-email'),
          controller: _email,
          enabled: !inFlight,
          keyboardType: TextInputType.emailAddress,
          autocorrect: false,
          textInputAction: TextInputAction.next,
          decoration: const InputDecoration(
            labelText: 'Enter email:',
            hintText: 'address@mail.com',
          ),
        ),
        const SizedBox(height: BookflowSpacing.md),
        TextField(
          key: const Key('login-password'),
          controller: _password,
          enabled: !inFlight,
          obscureText: _obscured,
          autocorrect: false,
          enableSuggestions: false,
          textInputAction: TextInputAction.done,
          onSubmitted: (String _) => _submit(),
          decoration: InputDecoration(
            labelText: 'Password',
            hintText: 'Password',
            suffixIcon: IconButton(
              key: const Key('login-password-visibility'),
              onPressed: () => setState(() => _obscured = !_obscured),
              icon: Icon(_obscured ? Icons.visibility_off : Icons.visibility),
              tooltip: _obscured ? 'Show password' : 'Hide password',
            ),
          ),
        ),
        Align(
          alignment: Alignment.centerRight,
          child: TextButton(
            key: const Key('login-forgot-password'),
            onPressed: inFlight ? null : widget.onForgotPassword,
            child: const Text('Forgot password?'),
          ),
        ),
        const SizedBox(height: BookflowSpacing.sm),
        if (submission.hasError)
          AuthErrorText(
            message: authFailureMessage(error!),
            action: unverified
                ? Align(
                    alignment: Alignment.centerLeft,
                    child: TextButton(
                      key: const Key('login-verify-email'),
                      onPressed: () => widget.onVerifyEmail(_email.text.trim()),
                      child: const Text('Enter your code'),
                    ),
                  )
                : null,
          ),
        AuthSubmitButton(
          key: const Key('login-submit'),
          label: 'Continue',
          inFlight: inFlight,
          onPressed: _submit,
        ),
      ],
    );
  }
}
