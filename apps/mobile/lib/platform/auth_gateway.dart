/// ══ THE CLIENT BOUNDARY, WHICH IS THE POINT OF THIS FILE ════════════════════
///
/// This app talks to **two** servers, and they are never the same one:
///
///   ┌─ GoTrue (Supabase Auth) ── this file, via `supabase_flutter`
///   │    login, session restore, refresh, logout.
///   │    ADR-017: ES256 tokens, one-hour access, refresh revoked on logout.
///   │    It NEVER calls our API.
///   │
///   └─ apps/api ─────────────── `api_client.dart`, via the generated Dio client
///        every business read and write.
///        It NEVER talks to GoTrue.
///
/// The one thing that crosses between them is the access token: minted here,
/// attached to outgoing API requests by the interceptor in `api_client.dart`.
/// That is a deliberate, single, visible seam.
///
/// **Sign-up is not here, and that is not an omission.** ADR-037 makes account
/// creation mediated by our API — the client must not call GoTrue's signup
/// endpoint, because a consent record the subject controls is not a consent
/// record. Sign-up therefore goes out through the generated client like any
/// other API call, and it arrives with the screens that collect the fields.
library;

import 'package:bookflow/platform/auth_failure.dart';
import 'package:supabase_flutter/supabase_flutter.dart';

/// Whether there is a usable session, from the router's point of view.
///
/// Two values, not three: "restoring" is the absence of an answer rather than an
/// answer, and it is modelled by `AsyncValue` in the provider instead of by a
/// third enum member that every `switch` would then have to handle.
enum SessionStatus { signedIn, signedOut }

/// What the app needs from an authentication provider.
///
/// An interface rather than `SupabaseClient` directly, for one reason that
/// matters more than testability: it is the list of things this app is allowed
/// to do to a session. Anything not on it — creating a user, changing an email,
/// resetting a password — is either forbidden here (ADR-037) or belongs to a
/// later slice, and adding it means adding a line to this file where a reviewer
/// will see it.
abstract interface class AuthGateway {
  /// The current status, synchronously, for the router's redirect.
  SessionStatus get status;

  /// Emits on sign-in, sign-out, and token refresh.
  Stream<SessionStatus> statusChanges();

  /// The access token to attach to API requests, or null when signed out.
  ///
  /// **On the interface, not on the Supabase implementation.** It lived on the
  /// concrete class, and `providers.dart` reached it through a
  /// `gateway is SupabaseAuthGateway` test — so any other implementation, the
  /// fakes in this project's own tests included, silently produced `null` and
  /// every request went out unauthenticated with nothing logged. That is the
  /// same silent-failure class as caching the token, and it would have first
  /// bitten in PR 3b when a real request finally happened.
  ///
  /// Read per request, never cached: ADR-017 makes access tokens live one hour
  /// and `supabase_flutter` refreshes in the background, so a copy goes stale
  /// exactly when it matters.
  String? currentAccessToken();

  /// The signed-in owner's email address, or null when signed out.
  ///
  /// **From the session, because GoTrue owns it.** ADR-027 puts the `auth.users`
  /// row inside Supabase Auth, and `user_profiles` deliberately does not mirror
  /// the email — so `GET /v1/me` does not return one and screen #20 could not
  /// show the address the design puts on it without reading the session.
  ///
  /// Read live rather than cached, for the same reason as the token: an email
  /// change would leave a copy stale.
  String? currentEmail();

  /// Ends the session. ADR-017: this revokes the refresh token, and the access
  /// token already issued stays valid until it expires — at most one hour.
  Future<void> signOut();

  /// Signs an existing owner in.
  ///
  /// **Returns nothing on purpose.** The session lands in the Supabase client,
  /// which persists it through `SecureSessionStore` and emits on
  /// [statusChanges]; `appDestinationProvider` recomputes and the existing
  /// redirect moves the user. A caller that took a session object back would be
  /// tempted to route on it, and then two things would decide where a signed-in
  /// user belongs.
  ///
  /// Throws [AuthFailure] and nothing else.
  Future<void> signInWithPassword({
    required String email,
    required String password,
  });

  /// Exchanges the emailed signup code for a session.
  ///
  /// GoTrue's OTP path: on success the user is confirmed **and signed in**, so
  /// this is the last step of sign-up rather than a separate one before login.
  ///
  /// Throws [AuthFailure] and nothing else.
  Future<void> verifySignupCode({required String email, required String code});

  /// Sends the signup confirmation email again, invalidating the previous code.
  ///
  /// Throws [AuthFailure] and nothing else.
  Future<void> resendSignupCode({required String email});

  /// Emails a recovery code.
  ///
  /// **Succeeds whether or not the address has an account.** GoTrue does not
  /// distinguish, and it should not: an endpoint that answered differently for
  /// a registered address is an account-enumeration oracle. The screen's copy
  /// has to be true either way — "if that address has an account".
  ///
  /// Throws [AuthFailure] and nothing else.
  Future<void> requestPasswordReset({required String email});

  /// Exchanges the recovery code for a **recovery session**.
  ///
  /// ══ THIS SIGNS THE USER IN, AND THAT IS NOT A CHOICE ════════════════════
  ///
  /// GoTrue's recovery OTP is single-use and the session it returns is what
  /// authorises the password change. There is no way to prove the code without
  /// holding a session afterwards, and no way to change the password without
  /// one — so the window between this and [setNewPassword] is inherent to the
  /// flow rather than a shortcut taken here.
  ///
  /// **A recovery session is not a login**, and the app must not treat it as
  /// one: `passwordRecoveryProvider` holds the destination at the signed-out
  /// shell for its duration, so the redirect does not haul a half-way-through
  /// user to `/home`. Whoever calls this owns closing the window — with
  /// [setNewPassword] or with [signOut].
  ///
  /// Throws [AuthFailure] and nothing else.
  Future<void> verifyRecoveryCode({
    required String email,
    required String code,
  });

  /// Sets the password on the current session, then ends it.
  ///
  /// **The sign-out is the design's, not a technicality**: the user proves the
  /// new password by signing in with it, which is also how they find out
  /// immediately whether it is the one they think it is.
  ///
  /// Throws [AuthFailure] and nothing else.
  Future<void> setNewPassword({required String newPassword});

  /// Changes the password of a signed-in owner (screen #24).
  ///
  /// ══ RE-AUTHENTICATES FIRST, AND THAT IS THE POINT ═════════════════════════
  ///
  /// `updateUser(password:)` alone would change the password of whoever holds
  /// the session — which is exactly the wrong guarantee for an unattended
  /// phone. Anyone who picks up an unlocked device could lock the owner out of
  /// their own salon without knowing a thing.
  ///
  /// So the current password is verified by signing in with it before anything
  /// is written. That is what makes screen #24's "Enter current password" field
  /// load-bearing rather than a formality, and what lets a wrong entry produce
  /// [AuthFailureKind.invalidCredentials] with nothing changed.
  ///
  /// **Distinct from [setNewPassword]**, which serves the RESET flow: that one
  /// runs inside a recovery session minted from an emailed code, where the code
  /// was the proof and there is no old password to know.
  Future<void> changePassword({
    required String currentPassword,
    required String newPassword,
  });
}

/// The real one, over `supabase_flutter`.
class SupabaseAuthGateway implements AuthGateway {
  SupabaseAuthGateway(this._client);

  final SupabaseClient _client;

  @override
  SessionStatus get status => _client.auth.currentSession == null
      ? SessionStatus.signedOut
      : SessionStatus.signedIn;

  @override
  Stream<SessionStatus> statusChanges() {
    return _client.auth.onAuthStateChange.map(
      (AuthState state) => state.session == null
          ? SessionStatus.signedOut
          : SessionStatus.signedIn,
    );
  }

  @override
  Future<void> signOut() => _client.auth.signOut();

  @override
  String? currentAccessToken() => _client.auth.currentSession?.accessToken;

  @override
  String? currentEmail() => _client.auth.currentUser?.email;

  @override
  Future<void> signInWithPassword({
    required String email,
    required String password,
  }) async {
    try {
      await _client.auth.signInWithPassword(email: email, password: password);
    } on AuthException catch (error) {
      throw AuthFailure(_kindOf(error, wrongCredentialFallback: true));
    } on Object catch (_) {
      // A socket failure, a DNS failure, a malformed response. None of them is
      // a statement about the password.
      throw const AuthFailure(AuthFailureKind.unavailable);
    }
  }

  @override
  Future<void> verifySignupCode({
    required String email,
    required String code,
  }) async {
    try {
      await _client.auth.verifyOTP(
        type: OtpType.signup,
        email: email,
        token: code,
      );
    } on AuthException catch (error) {
      throw AuthFailure(_kindOf(error, wrongCodeFallback: true));
    } on Object catch (_) {
      throw const AuthFailure(AuthFailureKind.unavailable);
    }
  }

  @override
  Future<void> resendSignupCode({required String email}) async {
    try {
      await _client.auth.resend(type: OtpType.signup, email: email);
    } on AuthException catch (error) {
      throw AuthFailure(_kindOf(error));
    } on Object catch (_) {
      throw const AuthFailure(AuthFailureKind.unavailable);
    }
  }

  @override
  Future<void> requestPasswordReset({required String email}) async {
    try {
      await _client.auth.resetPasswordForEmail(email);
    } on AuthException catch (error) {
      throw AuthFailure(_kindOf(error));
    } on Object catch (_) {
      throw const AuthFailure(AuthFailureKind.unavailable);
    }
  }

  @override
  Future<void> verifyRecoveryCode({
    required String email,
    required String code,
  }) async {
    try {
      await _client.auth.verifyOTP(
        type: OtpType.recovery,
        email: email,
        token: code,
      );
    } on AuthException catch (error) {
      throw AuthFailure(_kindOf(error, wrongCodeFallback: true));
    } on Object catch (_) {
      throw const AuthFailure(AuthFailureKind.unavailable);
    }
  }

  @override
  Future<void> setNewPassword({required String newPassword}) async {
    try {
      await _client.auth.updateUser(UserAttributes(password: newPassword));
    } on AuthException catch (error) {
      // The recovery session stays open on a REJECTED password, deliberately:
      // "too short" and "in a breach corpus" are both retryable, and ending the
      // session would make the user request a whole new code to try a different
      // one. The caller signs out if they give up.
      throw AuthFailure(_kindOf(error));
    } on Object catch (_) {
      throw const AuthFailure(AuthFailureKind.unavailable);
    }

    // The password IS changed by the time this runs. A sign-out that failed and
    // threw would report the reset as failed, and the user would go on trying
    // the old password against an account that no longer accepts it — a worse
    // outcome than a session that outlives its welcome by an hour, which
    // ADR-017 already bounds.
    try {
      await _client.auth.signOut();
    } on Object catch (_) {
      // Deliberately swallowed. See above.
    }
  }

  @override
  Future<void> changePassword({
    required String currentPassword,
    required String newPassword,
  }) async {
    // ── THE EMAIL COMES FROM THE SESSION, NEVER FROM THE FORM ──────────────
    //
    // Screen #24 shows the address but has no field for it, and that is right:
    // an email the caller could supply would turn this into a login attempt
    // against an arbitrary account, with the "current password" as the guess.
    final String? email = _client.auth.currentUser?.email;
    if (email == null) {
      // No session, or a session with no email. Neither is reachable from a
      // screen behind the auth redirect; reported as unavailable rather than as
      // a wrong password, because it says nothing about what was typed.
      throw const AuthFailure(AuthFailureKind.unavailable);
    }

    // ── STEP ONE: PROVE THEY KNOW THE CURRENT PASSWORD ────────────────────
    //
    // A successful sign-in replaces the session with an equivalent one, which
    // is harmless — it is the same user on the same device. A FAILED one throws
    // before anything is written, which is the whole guarantee.
    try {
      await _client.auth.signInWithPassword(
        email: email,
        password: currentPassword,
      );
    } on AuthException catch (error) {
      throw AuthFailure(_kindOf(error, wrongCredentialFallback: true));
    } on Object catch (_) {
      throw const AuthFailure(AuthFailureKind.unavailable);
    }

    // ── STEP TWO: WRITE THE NEW ONE ───────────────────────────────────────
    //
    // **No sign-out afterwards, unlike `setNewPassword`.** That one ends the
    // recovery session because a code-minted session has served its purpose and
    // should not linger. This is an ordinary signed-in owner changing their
    // password mid-session; throwing them back to the welcome screen for
    // succeeding would be a punishment for good security hygiene.
    try {
      await _client.auth.updateUser(UserAttributes(password: newPassword));
    } on AuthException catch (error) {
      // `passwordRejected` reaches the screen intact — ADR-030's breach check
      // is the one input error the client cannot predict locally, and the
      // owner needs to be told which of the two things went wrong.
      throw AuthFailure(_kindOf(error));
    } on Object catch (_) {
      throw const AuthFailure(AuthFailureKind.unavailable);
    }
  }

  /// GoTrue's error vocabulary, reduced to the kinds a screen has copy for.
  ///
  /// **Branches on `code` first, and on the status only as a fallback.** The
  /// codes are GoTrue's stable, documented identifiers; the message is prose
  /// that changes between releases and must never be matched on.
  ///
  /// The two `*Fallback` flags are what an unrecognised 400/403 means *on that
  /// call*: on a sign-in it is bad credentials, on a verification it is a bad
  /// code. Without them both would land on `unavailable`, which tells the user
  /// to check their connection when the real answer is "that is the wrong
  /// password".
  static AuthFailureKind _kindOf(
    AuthException error, {
    bool wrongCredentialFallback = false,
    bool wrongCodeFallback = false,
  }) {
    switch (error.code) {
      case 'invalid_credentials':
      case 'invalid_grant':
        return AuthFailureKind.invalidCredentials;
      case 'email_not_confirmed':
        return AuthFailureKind.emailNotConfirmed;
      case 'otp_expired':
        return AuthFailureKind.expiredCode;
      case 'over_email_send_rate_limit':
      case 'over_request_rate_limit':
      case 'over_sms_send_rate_limit':
        return AuthFailureKind.rateLimited;
      case 'weak_password':
        return AuthFailureKind.passwordRejected;
    }

    if (error.statusCode == '429') return AuthFailureKind.rateLimited;

    final bool refused =
        error.statusCode == '400' ||
        error.statusCode == '401' ||
        error.statusCode == '403';
    if (refused && wrongCredentialFallback) {
      return AuthFailureKind.invalidCredentials;
    }
    if (refused && wrongCodeFallback) return AuthFailureKind.invalidCode;

    return AuthFailureKind.unavailable;
  }
}
