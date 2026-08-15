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

  /// Ends the session. ADR-017: this revokes the refresh token, and the access
  /// token already issued stays valid until it expires — at most one hour.
  Future<void> signOut();
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

  /// The token the API interceptor attaches. Read on every request rather than
  /// cached, because `supabase_flutter` refreshes in the background and a cached
  /// copy would go stale exactly when it matters.
  String? currentAccessToken() => _client.auth.currentSession?.accessToken;
}
