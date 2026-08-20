import 'dart:async';

import 'package:bookflow/features/auth/auth_sheet.dart';
import 'package:bookflow/features/auth/login_sheet.dart';
import 'package:bookflow/features/auth/signup_sheet.dart';
import 'package:bookflow/features/auth/verify_email_sheet.dart';
import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';

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
/// next*. The whole flow graph is the four functions below, readable in one
/// screen:
///
///   welcome ──"Create for free"──▶ sign-up ──accepted──▶ verify ──▶ (router)
///   welcome ──"Sign in"─────────▶ login   ──signed in─▶ (router)
///   login   ──unverified────────▶ verify
///   verify  ──"Back to sign in"─▶ login
///   login   ──"Forgot password?"▶ /forgot-password
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

Future<void> showLoginFlow(BuildContext context) {
  return showAuthSheet<void>(
    context: context,
    builder: (BuildContext sheetContext) => LoginSheet(
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
        // A route rather than a sheet: password reset leaves the app and comes
        // back through an emailed link, so it needs somewhere to return to.
        if (context.mounted) unawaited(context.push<void>('/forgot-password'));
      },
    ),
  );
}
