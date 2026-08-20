import 'dart:async';

// Mutual with `business_providers.dart`, which imports this file for
// `apiClientProvider`. Dart permits it and there is no initialisation cycle:
// a provider's closure runs on first read, not at library load. The
// alternative — building the business repository here from `apiClientProvider`
// directly — would mean a test overriding `businessRepositoryProvider` did not
// affect the membership status, so the two could report different answers
// about the same account.
import 'package:bookflow/features/business/business_providers.dart';
import 'package:bookflow/features/membership/membership_repository.dart';
import 'package:bookflow/platform/api_client.dart';
import 'package:bookflow/platform/auth_gateway.dart';
import 'package:bookflow/platform/config.dart';
import 'package:bookflow_api/bookflow_api.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

/// The dependency graph.
///
/// ADR-028: Riverpod is state **and** injection, one concept. There is no
/// service locator, nothing reaches into a global registry, and a test replaces
/// a dependency by overriding the provider that supplies it — which is why every
/// provider below that touches the outside world is declared here rather than
/// constructed where it is used.

/// Build-time configuration. Overridden in tests so no `--dart-define` is needed
/// to run them.
final Provider<AppConfig> appConfigProvider = Provider<AppConfig>(
  (Ref ref) => AppConfig.fromEnvironment(),
);

/// The authentication gateway.
///
/// **Throws unless overridden, on purpose.** The real implementation needs
/// `Supabase.initialize()` to have run, which touches platform channels and the
/// keystore; a default that constructed one would make every widget test either
/// hit the platform or fail confusingly. `main.dart` overrides it after
/// initialising Supabase, and tests override it with a fake. A provider that
/// cannot be used by accident is better than one that can.
final Provider<AuthGateway> authGatewayProvider = Provider<AuthGateway>(
  (Ref ref) => throw UnimplementedError(
    'authGatewayProvider must be overridden — in main.dart with the Supabase '
    'gateway, or in a test with a fake. See platform/auth_gateway.dart.',
  ),
);

/// Whether a **recovery session** is open — the window between a recovery code
/// being verified and the new password being set.
///
/// ══ A RECOVERY SESSION IS NOT A LOGIN ═══════════════════════════════════════
///
/// GoTrue's recovery OTP is single-use and the session it returns is what
/// authorises `updateUser`, so the app is genuinely signed in for the length of
/// the reset form. Without this flag `appDestinationProvider` would see a
/// session, decide the user belongs at `/setup` or `/home`, and the redirect
/// would move the shell out from under someone who is half way through
/// resetting a password they cannot yet use.
///
/// **So the fact is stated rather than inferred.** A session plus this flag
/// means "proving an identity"; a session without it means "signed in". The two
/// are different states and the router now has both.
class PasswordRecovery extends Notifier<bool> {
  @override
  bool build() => false;

  void begin() => state = true;

  void end() => state = false;
}

final NotifierProvider<PasswordRecovery, bool> passwordRecoveryProvider =
    NotifierProvider<PasswordRecovery, bool>(PasswordRecovery.new);

/// The current session, starting from what the gateway already knows.
///
/// The first `yield` matters: a bare `statusChanges()` stream would leave the
/// app in `loading` until Supabase emitted, so a user with a restored session
/// would see the splash flash on every cold start.
final StreamProvider<SessionStatus> sessionStatusProvider =
    StreamProvider<SessionStatus>((Ref ref) async* {
      final AuthGateway gateway = ref.watch(authGatewayProvider);
      yield gateway.status;
      yield* gateway.statusChanges();
    });

/// The signed-in owner's email, from the session.
///
/// Watches `sessionStatusProvider` so it re-reads when the session changes —
/// otherwise a sign-out would leave the previous user's address on screen until
/// something else happened to rebuild.
final Provider<String?> sessionEmailProvider = Provider<String?>((Ref ref) {
  ref.watch(sessionStatusProvider);
  return ref.watch(authGatewayProvider).currentEmail();
});

/// Our API's client, with the token interceptor already attached.
///
/// Depends on the auth gateway only for the token reader — a function, so the
/// token is read per request rather than captured. See `api_client.dart`.
final Provider<BookflowApi> apiClientProvider = Provider<BookflowApi>((
  Ref ref,
) {
  final AppConfig config = ref.watch(appConfigProvider);
  final AuthGateway gateway = ref.watch(authGatewayProvider);

  return createApiClient(
    baseUrl: config.apiBaseUrl,
    // A tear-off of the INTERFACE method. This was a
    // `gateway is SupabaseAuthGateway ? … : null` test, which silently attached
    // no token to any request when the gateway was any other implementation.
    readToken: gateway.currentAccessToken,
    // The API said the session is unusable. Ending it is enough — the redirect
    // in `router.dart` watches the session and moves the user to the welcome
    // shell by itself. See `UnauthenticatedInterceptor` for why an
    // unconditional sign-out is safe against this particular API.
    onUnauthenticated: () => unawaited(gateway.signOut()),
  );
});

/// Whether the signed-in owner has a business, derived from the API.
final Provider<MembershipRepository> membershipRepositoryProvider =
    Provider<MembershipRepository>(
      // Was `const NoBusinessYetMembershipRepository()` — a constant whose own
      // comment said it "becomes a lie the moment business creation ships".
      // It has shipped. The status now derives from `GET /v1/me/business`,
      // through the repository that owns the 404-as-data-answer rule.
      (Ref ref) =>
          ApiMembershipRepository(ref.watch(businessRepositoryProvider)),
    );

/// Whether the signed-in owner has a business.
///
/// Depends on the session so that signing out invalidates it — otherwise the
/// next user to sign in on the same device would inherit the previous one's
/// answer, which is a data leak between accounts rather than a caching quirk.
final FutureProvider<MembershipStatus> membershipStatusProvider =
    FutureProvider<MembershipStatus>((Ref ref) async {
      final SessionStatus session = await ref.watch(
        sessionStatusProvider.future,
      );
      if (session == SessionStatus.signedOut) {
        return MembershipStatus.none;
      }
      return ref.watch(membershipRepositoryProvider).currentStatus();
    });
