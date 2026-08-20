import 'package:bookflow/platform/auth_failure.dart';

/// What the user reads when an attempt fails.
///
/// ══ ONE MAP, SO THE TONE CANNOT DRIFT ═══════════════════════════════════════
///
/// Three sheets can fail in overlapping ways and each writing its own strings
/// would produce three slightly different apologies for the same event. The
/// established shared lines — *"Something went wrong."* and *"Check your
/// connection and try again."* — live in `ui/async_value_view.dart`, and the
/// unavailable case below deliberately reuses the second of them verbatim
/// rather than inventing a fourth way to say it.
///
/// **Anything that is not an [AuthFailure] gets the general line.** A screen
/// cannot know what an unexpected exception was, and guessing produces a
/// confident sentence that happens to be false.
String authFailureMessage(Object error) {
  if (error is! AuthFailure) {
    return 'Something went wrong. Check your connection and try again.';
  }

  return switch (error.kind) {
    AuthFailureKind.invalidCredentials => 'Incorrect email or password.',
    // The one message with a next step, which the login sheet renders as a
    // control beside it rather than as more prose.
    AuthFailureKind.emailNotConfirmed =>
      'This email has not been verified yet.',
    AuthFailureKind.invalidCode =>
      'That code is not right. Check and try again.',
    AuthFailureKind.expiredCode => 'That code has expired. Send a new one.',
    AuthFailureKind.passwordRejected =>
      'That password appears in known breaches — choose another',
    // No field is named, because the response does not name one. See
    // `AuthFailureKind.rejected`.
    AuthFailureKind.rejected => 'Check the details you entered and try again.',
    AuthFailureKind.rateLimited => 'Too many attempts, wait a moment',
    AuthFailureKind.unavailable =>
      'Something went wrong. Check your connection and try again.',
  };
}

/// Whether [value] is worth sending to the server.
///
/// **A deliberately loose check.** It exists to catch a typo before a round
/// trip, not to decide what an address is — RFC 5322 is far wider than any
/// regexp people paste around, and a client that rejects a valid address is a
/// worse failure than one that lets the server answer. The server validates
/// with `z.email()` regardless, and that is the authority.
bool emailLooksValid(String value) {
  final String trimmed = value.trim();
  if (trimmed.contains(' ')) return false;

  final int at = trimmed.indexOf('@');
  if (at <= 0 || at != trimmed.lastIndexOf('@')) return false;

  final String domain = trimmed.substring(at + 1);
  return domain.contains('.') &&
      !domain.startsWith('.') &&
      !domain.endsWith('.');
}

/// Mirrors `PASSWORD_MIN_LENGTH` in `apps/api/src/modules/auth/auth.schema.ts`
/// (ADR-030: a length floor and no composition rules).
///
/// Duplicated rather than derived, and that is a real cost: if the API's
/// minimum moves this does not follow. The alternative is a round trip to
/// discover a rule the user could have been told about while typing, and the
/// server still enforces the real one — a client that is out of step here
/// annoys, it does not admit anything.
const int passwordMinLength = 8;
