import 'dart:async';

import 'package:bookflow/features/auth/auth_copy.dart';
import 'package:bookflow/features/auth/auth_flow.dart';
import 'package:bookflow/platform/auth_failure.dart';
import 'package:bookflow/platform/providers.dart';
import 'package:bookflow/theme/tokens.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

/// Screen #24 — Change password, pushed from Settings.
///
/// ══ THREE FIELDS, THREE INDEPENDENT VISIBILITY TOGGLES ══════════════════════
///
/// The design draws an eye on each field and specifies they work
/// "independently of the other two". That is not fussiness: somebody checking a
/// typo in the new password should not simultaneously reveal their current one
/// to whoever is standing behind them.
///
/// ══ THE CURRENT PASSWORD IS VERIFIED SERVER-SIDE, NOT DECORATIVE ════════════
///
/// `AuthGateway.changePassword` signs in with it before writing anything — see
/// that method for why. So a wrong entry produces
/// [AuthFailureKind.invalidCredentials] with the password unchanged, and this
/// screen renders it **under the current-password field** rather than as a
/// general error, because that is the field to correct.
class ChangePasswordScreen extends ConsumerStatefulWidget {
  const ChangePasswordScreen({super.key});

  @override
  ConsumerState<ChangePasswordScreen> createState() =>
      _ChangePasswordScreenState();
}

class _ChangePasswordScreenState extends ConsumerState<ChangePasswordScreen> {
  final TextEditingController _current = TextEditingController();
  final TextEditingController _next = TextEditingController();
  final TextEditingController _confirm = TextEditingController();

  bool _currentHidden = true;
  bool _nextHidden = true;
  bool _confirmHidden = true;

  bool _submitting = false;

  /// Under the current-password field. The one failure with a specific home.
  String? _currentError;

  /// Under the confirm field, or under the new-password field for a rejection.
  String? _confirmError;
  String? _nextError;

  @override
  void dispose() {
    _current.dispose();
    _next.dispose();
    _confirm.dispose();
    super.dispose();
  }

  bool get _complete =>
      _current.text.isNotEmpty &&
      _next.text.isNotEmpty &&
      _confirm.text.isNotEmpty;

  Future<void> _submit() async {
    setState(() {
      _currentError = null;
      _nextError = null;
      // ── THE MATCH IS CHECKED HERE, BEFORE ANY REQUEST ──────────────────
      //
      // The server cannot check it: only ONE new password is sent, so a
      // mistyped confirmation is indistinguishable server-side from a
      // deliberate one. This is the only validation on this screen that has to
      // be local, and it is the most common mistake.
      _confirmError = _next.text == _confirm.text
          ? null
          : 'Those passwords do not match.';
    });
    if (_confirmError != null) return;

    setState(() => _submitting = true);

    try {
      await ref
          .read(authGatewayProvider)
          .changePassword(
            currentPassword: _current.text,
            newPassword: _next.text,
          );

      if (!mounted) return;
      ScaffoldMessenger.of(
        context,
      ).showSnackBar(const SnackBar(content: Text('Password changed.')));
      // Back to Settings. The session survives — see `changePassword` for why
      // this does not sign out the way the reset flow does.
      context.pop();
    } on AuthFailure catch (failure) {
      if (!mounted) return;
      setState(() {
        _submitting = false;
        if (failure.kind == AuthFailureKind.invalidCredentials) {
          // Placed on the field it is about, per the design: "inline error
          // under 'Enter current password' field".
          _currentError = 'Current password is incorrect.';
        } else {
          // Everything else is about the NEW password or the connection —
          // `authFailureMessage` already has copy for each, including ADR-030's
          // breach rejection, which is the one input error the client cannot
          // predict locally.
          _nextError = authFailureMessage(failure);
        }
      });
    } on Object {
      if (!mounted) return;
      setState(() {
        _submitting = false;
        _nextError = 'That did not save. Check your connection and try again.';
      });
    }
  }

  @override
  Widget build(BuildContext context) {
    final ThemeData theme = Theme.of(context);
    // From the session rather than a field. The design shows the address and
    // gives no input for it — see `changePassword`, where an editable email
    // would turn this into a login attempt against an arbitrary account.
    final String? email = ref.read(authGatewayProvider).currentEmail();

    return Scaffold(
      appBar: AppBar(
        leading: IconButton(
          key: const Key('change-password-back'),
          icon: const Icon(Icons.arrow_back),
          onPressed: () => context.pop(),
          tooltip: 'Back',
        ),
        title: const Text('Change password'),
      ),
      body: SafeArea(
        child: ListView(
          padding: const EdgeInsets.all(BookflowSpacing.xl),
          children: <Widget>[
            Text(
              'Please enter a new password for',
              style: theme.textTheme.bodyMedium,
            ),
            if (email != null)
              Text(
                email,
                key: const Key('change-password-email'),
                style: theme.textTheme.bodyMedium?.copyWith(
                  fontWeight: FontWeight.w700,
                ),
              ),
            const SizedBox(height: BookflowSpacing.xl),

            _PasswordField(
              fieldKey: const Key('change-password-current'),
              controller: _current,
              label: 'Enter current password',
              hidden: _currentHidden,
              enabled: !_submitting,
              errorText: _currentError,
              onToggle: () => setState(() => _currentHidden = !_currentHidden),
            ),
            const SizedBox(height: BookflowSpacing.md),
            _PasswordField(
              fieldKey: const Key('change-password-new'),
              controller: _next,
              label: 'Enter new password',
              hidden: _nextHidden,
              enabled: !_submitting,
              errorText: _nextError,
              onToggle: () => setState(() => _nextHidden = !_nextHidden),
            ),
            const SizedBox(height: BookflowSpacing.md),
            _PasswordField(
              fieldKey: const Key('change-password-confirm'),
              controller: _confirm,
              label: 'Confirm new password',
              hidden: _confirmHidden,
              enabled: !_submitting,
              errorText: _confirmError,
              onToggle: () => setState(() => _confirmHidden = !_confirmHidden),
            ),

            const SizedBox(height: BookflowSpacing.xl),
            FilledButton(
              key: const Key('change-password-submit'),
              onPressed: (!_complete || _submitting) ? null : _submit,
              child: _submitting
                  ? const SizedBox(
                      key: Key('change-password-loading'),
                      width: BookflowSizes.inlineSpinner,
                      height: BookflowSizes.inlineSpinner,
                      child: CircularProgressIndicator.adaptive(strokeWidth: 2),
                    )
                  : const Text('Submit'),
            ),
            const SizedBox(height: BookflowSpacing.lg),
            // The design's fallback link. It matters for the case this screen
            // cannot serve: somebody who does not KNOW their current password
            // cannot change it here at all, and the reset flow is the only way
            // through.
            Center(
              child: TextButton(
                key: const Key('change-password-forgot'),
                onPressed: _submitting
                    ? null
                    : () {
                        // Popped first so the reset sheets open over Settings
                        // rather than over a half-filled form the owner would
                        // return to on cancel.
                        context.pop();
                        unawaited(showResetPasswordFlow(context));
                      },
                child: const Text('I forgot my password'),
              ),
            ),
          ],
        ),
      ),
    );
  }
}

class _PasswordField extends StatelessWidget {
  const _PasswordField({
    required this.fieldKey,
    required this.controller,
    required this.label,
    required this.hidden,
    required this.enabled,
    required this.errorText,
    required this.onToggle,
  });

  final Key fieldKey;
  final TextEditingController controller;
  final String label;
  final bool hidden;
  final bool enabled;
  final String? errorText;
  final VoidCallback onToggle;

  @override
  Widget build(BuildContext context) {
    return TextField(
      key: fieldKey,
      controller: controller,
      obscureText: hidden,
      // Disabled rather than removed while submitting: removing the field would
      // drop what was typed, which is what the whole shape protects.
      enabled: enabled,
      autocorrect: false,
      enableSuggestions: false,
      decoration: InputDecoration(
        labelText: label,
        errorText: errorText,
        suffixIcon: IconButton(
          onPressed: onToggle,
          icon: Icon(hidden ? Icons.visibility_off : Icons.visibility),
          tooltip: hidden ? 'Show password' : 'Hide password',
        ),
      ),
    );
  }
}
