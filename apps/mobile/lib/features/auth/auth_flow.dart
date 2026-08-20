import 'dart:async';

import 'package:bookflow/features/auth/auth_providers.dart';
import 'package:bookflow/features/auth/auth_sheet.dart';
import 'package:bookflow/features/auth/login_sheet.dart';
import 'package:bookflow/features/auth/reset_password_sheets.dart';
import 'package:bookflow/features/auth/signup_sheet.dart';
import 'package:bookflow/features/auth/verify_email_sheet.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

/// The entry flow's transitions, in one place.
///
/// ══ WHY THE SHEETS DO NOT KNOW ABOUT EACH OTHER ═════════════════════════════
///
/// Each sheet takes callbacks — `onVerify`, `onBackToSignIn`, `onSignedIn` —
/// and never opens or closes a route itself. A widget that pops its own route
/// and pushes another owns its presentation as well as its content, which makes
/// it untestable without a navigator and impossible to reuse anywhere else.
///
/// So the sheets describe *what happened* and this file decides *what happens
/// next*. The whole flow graph is the functions below, readable in one screen:
///
///   welcome ──"Create for free"──▶ sign-up ──accepted──▶ verify ──▶ (router)
///   welcome ──"Sign in"─────────▶ login   ──signed in─▶ (router)
///   login   ──unverified────────▶ verify
///   verify  ──"Back to sign in"─▶ login
///   login   ──"Forgot password?"▶ reset: address ─▶ code ─▶ new password ─▶ login
///
/// ══ CLOSING IS THIS FILE'S JOB, ROUTING IS THE ROUTER'S ═════════════════════
///
/// On success these pop the sheet and stop. They never navigate to `/home` or
/// `/setup`: the session change makes `appDestinationProvider` recompute and
/// the redirect in `router.dart` moves the user. Two things deciding where a
/// signed-in user belongs is exactly what ADR-028 puts the redirect on the
/// router to prevent.
Future<void> showSignupFlow(BuildContext context) {
  return showAuthSheet<void>(
    context: context,
    builder: (BuildContext sheetContext) => SignupSheet(
      onBack: () => Navigator.of(sheetContext).pop(),
      onVerify: (String email) {
        Navigator.of(sheetContext).pop();
        // The sheet's own context is dead the moment it pops, so the next one
        // is opened from the screen underneath.
        if (context.mounted) {
          unawaited(showVerifyEmailFlow(context, email: email));
        }
      },
    ),
  );
}

Future<void> showVerifyEmailFlow(
  BuildContext context, {
  required String email,
}) {
  return showAuthSheet<void>(
    context: context,
    builder: (BuildContext sheetContext) => VerifyEmailSheet(
      email: email,
      onBack: () => Navigator.of(sheetContext).pop(),
      // Verified means signed in. Close and let the redirect take over.
      onVerified: () => Navigator.of(sheetContext).pop(),
      onBackToSignIn: () {
        Navigator.of(sheetContext).pop();
        if (context.mounted) unawaited(showLoginFlow(context));
      },
    ),
  );
}

Future<void> showLoginFlow(BuildContext context, {String? notice}) {
  return showAuthSheet<void>(
    context: context,
    builder: (BuildContext sheetContext) => LoginSheet(
      notice: notice,
      onBack: () => Navigator.of(sheetContext).pop(),
      onSignedIn: () => Navigator.of(sheetContext).pop(),
      onVerifyEmail: (String email) {
        Navigator.of(sheetContext).pop();
        if (context.mounted) {
          unawaited(showVerifyEmailFlow(context, email: email));
        }
      },
      onForgotPassword: () {
        Navigator.of(sheetContext).pop();
        if (context.mounted) unawaited(showResetPasswordFlow(context));
      },
    ),
  );
}

/// The password-reset flow: address, then code, then the new password.
///
/// ══ THE MIDDLE OF THIS IS A SIGNED-IN WINDOW ════════════════════════════════
///
/// Verifying a recovery code buys a real session — it is what authorises the
/// password change, and GoTrue offers no way to prove the code without one. So
/// between step 2 and step 3 the app IS signed in as that user, and
/// `passwordRecoveryProvider` holds the router at the signed-out shell for the
/// duration. Every exit from step 3 therefore goes through `abandon()`, which
/// ends the session; leaving one open would be a stranger signed in as somebody
/// on an unlocked phone.
Future<void> showResetPasswordFlow(BuildContext context) {
  return showAuthSheet<void>(
    context: context,
    builder: (BuildContext sheetContext) => ResetRequestSheet(
      onBack: () => Navigator.of(sheetContext).pop(),
      onSent: (String email) {
        Navigator.of(sheetContext).pop();
        if (context.mounted) {
          unawaited(_showResetVerify(context, email: email));
        }
      },
    ),
  );
}

Future<void> _showResetVerify(BuildContext context, {required String email}) {
  return showAuthSheet<void>(
    context: context,
    builder: (BuildContext sheetContext) => ResetVerifySheet(
      email: email,
      onBack: () => Navigator.of(sheetContext).pop(),
      onVerified: () {
        Navigator.of(sheetContext).pop();
        if (context.mounted) {
          unawaited(_showNewPassword(context, email: email));
        }
      },
    ),
  );
}

Future<void> _showNewPassword(BuildContext context, {required String email}) {
  return showAuthSheet<void>(
    context: context,
    builder: (BuildContext sheetContext) => Consumer(
      builder: (BuildContext consumerContext, WidgetRef ref, Widget? _) {
        return NewPasswordSheet(
          email: email,
          onBack: () {
            Navigator.of(sheetContext).pop();
            unawaited(
              ref.read(resetPasswordControllerProvider.notifier).abandon(),
            );
          },
          onDone: () {
            Navigator.of(sheetContext).pop();
            // Straight back to login, with the one line that tells the user
            // what just happened — the reset succeeded and their session was
            // ended on purpose, which without saying so reads as being kicked
            // out.
            if (context.mounted) {
              unawaited(
                showLoginFlow(
                  context,
                  notice: 'Password updated — sign in with your new password.',
                ),
              );
            }
          },
        );
      },
    ),
  );
}
