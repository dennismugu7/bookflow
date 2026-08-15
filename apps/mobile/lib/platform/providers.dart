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
    readToken: () =>
        gateway is SupabaseAuthGateway ? gateway.currentAccessToken() : null,
  );
});

/// See `membership_repository.dart` for why the default returns `none`.
final Provider<MembershipRepository> membershipRepositoryProvider =
    Provider<MembershipRepository>(
      (Ref ref) => const NoBusinessYetMembershipRepository(),
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
