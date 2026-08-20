import 'package:bookflow/theme/tokens.dart';
import 'package:flutter/material.dart';

/// Password reset — **the route exists, the flow does not**.
///
/// ══ WHY A PLACEHOLDER RATHER THAN NOTHING, AND RATHER THAN A GUESS ══════════
///
/// The login sheet needs somewhere for "Forgot password?" to go. Leaving the
/// link inert would repeat the defect this whole slice exists to remove — the
/// welcome screen shipped with two disabled buttons and no way into the app —
/// and building the reset flow here would mean writing the deep-link handling,
/// the recovery-OTP exchange and a new-password form, which is its own slice.
///
/// So this screen is honest about being unfinished instead of pretending
/// otherwise. It states what the user should do in the meantime, and it is one
/// file to delete when the real flow lands.
class ForgotPasswordScreen extends StatelessWidget {
  const ForgotPasswordScreen({super.key});

  @override
  Widget build(BuildContext context) {
    final ThemeData theme = Theme.of(context);

    return Scaffold(
      appBar: AppBar(title: const Text('Reset password')),
      body: SafeArea(
        child: Padding(
          padding: const EdgeInsets.all(BookflowSpacing.xl),
          child: Column(
            mainAxisAlignment: MainAxisAlignment.center,
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: <Widget>[
              Text(
                'Not built yet',
                key: const Key('forgot-password-placeholder'),
                style: theme.textTheme.titleLarge,
                textAlign: TextAlign.center,
              ),
              const SizedBox(height: BookflowSpacing.sm),
              Text(
                'Resetting your password from the app is coming next. For now, '
                'get in touch and we will sort it out.',
                style: theme.textTheme.bodyMedium,
                textAlign: TextAlign.center,
              ),
              const SizedBox(height: BookflowSpacing.xl),
              TextButton(
                onPressed: () => Navigator.of(context).pop(),
                child: const Text('Back'),
              ),
            ],
          ),
        ),
      ),
    );
  }
}
