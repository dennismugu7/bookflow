/// Why an authentication attempt did not work, in terms a screen can act on.
///
/// ══ ONE FAILURE TYPE ACROSS TWO SERVERS ═════════════════════════════════════
///
/// The entry flow crosses both of this app's backends: sign-up goes to our API
/// (ADR-037), while login, verification and resend go to GoTrue. Their error
/// shapes are nothing alike — an RFC 9457 problem document with a `type` slug on
/// one side, an `AuthException` with a `code` string on the other.
///
/// Both are translated here, at the layer that knows the wire, so **no widget
/// ever sees a `DioException` or an `AuthException`**. A screen switches on
/// [AuthFailureKind] and nothing else, which is what keeps the copy in one place
/// and keeps `supabase_flutter` and `bookflow_api` out of `features/`.
///
/// Anything unrecognised becomes [AuthFailureKind.unavailable] rather than being
/// guessed at. A wrong specific message is worse than an honest general one.
library;

/// The kinds a screen has distinct copy for. Nothing here is a transport
/// detail: a 429 and a GoTrue `over_email_send_rate_limit` are the same fact to
/// a user, and both arrive as [rateLimited].
enum AuthFailureKind {
  /// Login: the email and password did not match an account. Deliberately not
  /// split into "no such user" and "wrong password" — that distinction is an
  /// account-enumeration oracle, and GoTrue does not offer it either.
  invalidCredentials,

  /// Login: the account exists but its email was never confirmed. The one
  /// failure with a next step attached, so the screen can offer it.
  emailNotConfirmed,

  /// Verification: the code did not match.
  invalidCode,

  /// Verification: the code was right once and has expired. Separate from
  /// [invalidCode] because the remedy differs — resend, rather than retype.
  expiredCode,

  /// Sign-up: the password satisfied our schema and the identity provider still
  /// refused it. ADR-030 turns on GoTrue's breach check, so this is the one
  /// input error the client cannot predict locally.
  passwordRejected,

  /// Sign-up: the API rejected the submission as malformed.
  ///
  /// **The response does not say which field.** `problem.ts` carries no
  /// `detail` and no field list on purpose — "a reflected value is how an error
  /// response becomes a probe" — so the screen cannot mark an input from this
  /// and says something general instead. Per-field marks come from the client's
  /// own validation, which runs before the request.
  rejected,

  /// Too many attempts, from either server.
  rateLimited,

  /// Everything else: no network, a 500, an unrecognised code. The screen says
  /// the established shared line and offers a retry.
  unavailable,
}

/// The one exception the entry flow throws.
class AuthFailure implements Exception {
  const AuthFailure(this.kind);

  final AuthFailureKind kind;

  @override
  String toString() => 'AuthFailure(${kind.name})';
}
