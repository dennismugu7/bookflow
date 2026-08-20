import 'package:bookflow/features/auth/auth_copy.dart';
import 'package:bookflow/features/auth/auth_providers.dart';
import 'package:bookflow/features/auth/auth_sheet.dart';
import 'package:bookflow/theme/tokens.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

/// Screen 3 — "Create your Bookflow", the account-creation sheet.
///
/// ══ TWO DEPARTURES FROM THE DESIGN, BOTH FORCED ═════════════════════════════
///
/// **It collects a first and last name, which the design does not draw.**
/// `POST /v1/auth/signup` requires both — they are non-null in `user_profiles`
/// and ADR-005 (J2) is explicit that the owner's own account carries them
/// separately, because screen #20 shows two fields. A sheet built exactly as
/// drawn could not complete a single sign-up, and the alternative to asking is
/// fabricating a name from the address, which puts invented data on the
/// owner's profile.
///
/// **The social buttons are omitted, not stubbed.** The design draws Google and
/// Facebook; neither provider is configured and a button that opens nothing is
/// a promise the app does not keep — the same reasoning `04-phase3-close.md`
/// records for the unbuilt Edit affordance on screen #20.
///
/// ══ THE RESPONSE CANNOT TELL YOU IF THE ACCOUNT IS NEW ══════════════════════
///
/// The endpoint answers identically for "created" and "already registered", so
/// success here means *the request was accepted* and nothing more. The copy on
/// the next sheet has to be true either way, which is why it says a code was
/// sent rather than that an account was made.
class SignupSheet extends ConsumerStatefulWidget {
  const SignupSheet({required this.onVerify, required this.onBack, super.key});

  /// Called with the submitted address once the API accepts it. The sheet does
  /// not open the next one itself: it does not own its own presentation, and a
  /// widget that pops its own route and pushes another is hard to reuse and
  /// harder to test.
  final void Function(String email) onVerify;

  final VoidCallback onBack;

  @override
  ConsumerState<SignupSheet> createState() => _SignupSheetState();
}

class _SignupSheetState extends ConsumerState<SignupSheet> {
  final TextEditingController _email = TextEditingController();
  final TextEditingController _password = TextEditingController();
  final TextEditingController _firstName = TextEditingController();
  final TextEditingController _lastName = TextEditingController();

  bool _obscured = true;

  /// Set only on a submit attempt, never while typing. Marking a field invalid
  /// as someone types their address tells them they are wrong before they have
  /// finished being right.
  String? _emailError;
  String? _passwordError;
  String? _firstNameError;
  String? _lastNameError;

  @override
  void dispose() {
    _email.dispose();
    _password.dispose();
    _firstName.dispose();
    _lastName.dispose();
    super.dispose();
  }

  /// Runs the checks the client can make honestly. The server re-runs all of
  /// them and is the authority; this only saves a round trip.
  bool _validate() {
    final String email = _email.text.trim();
    final String password = _password.text;

    setState(() {
      _emailError = email.isEmpty
          ? 'Enter your email address.'
          : emailLooksValid(email)
          ? null
          : 'That does not look like an email address.';
      _passwordError = password.length < passwordMinLength
          ? 'Use at least $passwordMinLength characters.'
          : null;
      _firstNameError = _firstName.text.trim().isEmpty
          ? 'Enter your first name.'
          : null;
      _lastNameError = _lastName.text.trim().isEmpty
          ? 'Enter your last name.'
          : null;
    });

    return _emailError == null &&
        _passwordError == null &&
        _firstNameError == null &&
        _lastNameError == null;
  }

  Future<void> _submit() async {
    if (!_validate()) return;

    final String email = _email.text.trim();
    await ref
        .read(signupControllerProvider.notifier)
        .submit(
          email: email,
          password: _password.text,
          firstName: _firstName.text.trim(),
          lastName: _lastName.text.trim(),
        );

    if (!mounted) return;
    if (ref.read(signupControllerProvider).hasError) return;

    widget.onVerify(email);
  }

  @override
  Widget build(BuildContext context) {
    final ThemeData theme = Theme.of(context);
    final AsyncValue<void> submission = ref.watch(signupControllerProvider);
    final bool inFlight = submission.isLoading;

    return AuthSheetScaffold(
      title: 'Create your Bookflow',
      onBack: inFlight ? null : widget.onBack,
      children: <Widget>[
        Row(
          children: <Widget>[
            Expanded(
              child: TextField(
                key: const Key('signup-first-name'),
                controller: _firstName,
                enabled: !inFlight,
                textCapitalization: TextCapitalization.words,
                textInputAction: TextInputAction.next,
                decoration: InputDecoration(
                  labelText: 'First name',
                  errorText: _firstNameError,
                ),
              ),
            ),
            const SizedBox(width: BookflowSpacing.md),
            Expanded(
              child: TextField(
                key: const Key('signup-last-name'),
                controller: _lastName,
                enabled: !inFlight,
                textCapitalization: TextCapitalization.words,
                textInputAction: TextInputAction.next,
                decoration: InputDecoration(
                  labelText: 'Last name',
                  errorText: _lastNameError,
                ),
              ),
            ),
          ],
        ),
        const SizedBox(height: BookflowSpacing.md),
        TextField(
          key: const Key('signup-email'),
          controller: _email,
          enabled: !inFlight,
          keyboardType: TextInputType.emailAddress,
          autocorrect: false,
          textInputAction: TextInputAction.next,
          decoration: InputDecoration(
            labelText: 'Enter email:',
            hintText: 'address@mail.com',
            errorText: _emailError,
          ),
        ),
        const SizedBox(height: BookflowSpacing.md),
        TextField(
          key: const Key('signup-password'),
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
            errorText: _passwordError,
            suffixIcon: IconButton(
              key: const Key('signup-password-visibility'),
              onPressed: () => setState(() => _obscured = !_obscured),
              icon: Icon(_obscured ? Icons.visibility_off : Icons.visibility),
              tooltip: _obscured ? 'Show password' : 'Hide password',
            ),
          ),
        ),
        const SizedBox(height: BookflowSpacing.lg),
        if (submission.hasError)
          AuthErrorText(message: authFailureMessage(submission.error!)),
        AuthSubmitButton(
          key: const Key('signup-submit'),
          label: 'Create for free',
          inFlight: inFlight,
          onPressed: _submit,
        ),
        const SizedBox(height: BookflowSpacing.md),
        // The links are inert for now — there is no hosted policy document to
        // open, and a link to nothing is worse than text.
        Text(
          'By proceeding, you agree to the Terms of Service and Privacy '
          'Policy.',
          style: theme.textTheme.bodySmall,
          textAlign: TextAlign.center,
        ),
      ],
    );
  }
}
