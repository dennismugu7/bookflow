import 'package:bookflow/features/home/home_screen.dart';
import 'package:bookflow/features/membership/membership_repository.dart';
import 'package:bookflow/features/setup/setup_required_screen.dart';
import 'package:bookflow/features/signed_out/signed_out_screen.dart';
import 'package:bookflow/features/startup/startup_screen.dart';
import 'package:bookflow/features/startup/unavailable_screen.dart';
import 'package:bookflow/platform/auth_gateway.dart';
import 'package:bookflow/platform/providers.dart';
import 'package:flutter/widgets.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

/// Routing and the auth-aware redirect (ADR-028).
///
/// ══ ONE PLACE DECIDES WHERE A USER MAY BE ═══════════════════════════════════
///
/// ADR-028 requires the redirect to live on the router rather than as navigation
/// scattered through widgets. So no screen in this app pushes a route to keep an
/// unauthenticated user out, and no screen checks a session before rendering.
/// They render; the router decides whether they are reachable.
///
/// ══ THE SHELLS ══════════════════════════════════════════════════════════════
///
/// ADR-032 names three, and this implements five. The two extra are not scope
/// creep — they are what `AsyncValue` forces anyone to answer honestly:
///
///   /startup       LOADING. The session is being restored from the keystore and
///                  membership has not been read. Not a shell in ADR-032's
///                  sense; it is the state before there is an answer, and
///                  without it a cold start would flash the signed-out shell at
///                  a user who is signed in.
///   /welcome       SIGNED OUT.                                    (ADR-032, 1)
///   /setup         SIGNED IN, NO MEMBERSHIP — the stub.           (ADR-032, 2)
///   /home          SIGNED IN, WITH A MEMBERSHIP.                  (ADR-032, 3)
///   /unavailable   ERROR. Membership could not be determined.
///
/// **`/unavailable` is the one worth arguing about.** The alternative is to send
/// a user whose membership read failed to `/setup`, which is what "assume no
/// business" would do — and that shows an owner who HAS a business a screen
/// telling them to create one. Guessing wrong in that direction is worse than
/// saying "we could not load this" and offering a retry, so the error gets its
/// own destination rather than being folded into a shell that would lie.
enum AppDestination {
  startup('/startup'),
  signedOut('/welcome'),
  setupRequired('/setup'),
  home('/home'),
  unavailable('/unavailable');

  const AppDestination(this.path);

  final String path;
}

/// Where the current state says the user belongs.
///
/// Pure derivation from two providers, so it is unit-testable without a widget
/// tree, a navigator or a pumped frame — which is what makes the redirect tests
/// assertions about behaviour rather than about rendering.
final Provider<AppDestination> appDestinationProvider =
    Provider<AppDestination>((Ref ref) {
      final AsyncValue<SessionStatus> session = ref.watch(
        sessionStatusProvider,
      );

      return session.when(
        loading: () => AppDestination.startup,
        // Cannot prove a session, so there is not one. Failing towards
        // signed-out is the only safe direction: the opposite would show
        // owner screens to someone whose session could not be established.
        error: (Object _, StackTrace _) => AppDestination.signedOut,
        data: (SessionStatus status) {
          if (status == SessionStatus.signedOut) {
            return AppDestination.signedOut;
          }

          final AsyncValue<MembershipStatus> membership = ref.watch(
            membershipStatusProvider,
          );

          return membership.when(
            loading: () => AppDestination.startup,
            error: (Object _, StackTrace _) => AppDestination.unavailable,
            data: (MembershipStatus value) => switch (value) {
              MembershipStatus.member => AppDestination.home,
              MembershipStatus.none => AppDestination.setupRequired,
            },
          );
        },
      );
    });

/// Rebuilds the router's redirect when the destination changes.
///
/// `go_router` listens to a `Listenable`, and Riverpod speaks providers; this is
/// the adapter between them. Without it the redirect would run only on
/// navigation, so signing out in the background would leave the user sitting on
/// an owner screen until they happened to navigate.
class _DestinationNotifier extends ChangeNotifier {
  _DestinationNotifier(this._ref) {
    _subscription = _ref.listen<AppDestination>(appDestinationProvider, (
      AppDestination? previous,
      AppDestination next,
    ) {
      if (previous != next) notifyListeners();
    });
  }

  final Ref _ref;
  late final ProviderSubscription<AppDestination> _subscription;

  @override
  void dispose() {
    _subscription.close();
    super.dispose();
  }
}

final Provider<GoRouter> routerProvider = Provider<GoRouter>((Ref ref) {
  final _DestinationNotifier notifier = _DestinationNotifier(ref);
  ref.onDispose(notifier.dispose);

  return GoRouter(
    initialLocation: AppDestination.startup.path,
    refreshListenable: notifier,
    redirect: (BuildContext context, GoRouterState state) {
      final AppDestination destination = ref.read(appDestinationProvider);
      // Returning null means "stay put" — required, because returning the
      // current location unconditionally makes go_router loop.
      return state.matchedLocation == destination.path
          ? null
          : destination.path;
    },
    routes: <RouteBase>[
      GoRoute(
        path: AppDestination.startup.path,
        builder: (BuildContext context, GoRouterState state) =>
            const StartupScreen(),
      ),
      GoRoute(
        path: AppDestination.signedOut.path,
        builder: (BuildContext context, GoRouterState state) =>
            const SignedOutScreen(),
      ),
      GoRoute(
        path: AppDestination.setupRequired.path,
        builder: (BuildContext context, GoRouterState state) =>
            const SetupRequiredScreen(),
      ),
      GoRoute(
        path: AppDestination.home.path,
        builder: (BuildContext context, GoRouterState state) =>
            const HomeScreen(),
      ),
      GoRoute(
        path: AppDestination.unavailable.path,
        builder: (BuildContext context, GoRouterState state) =>
            const UnavailableScreen(),
      ),
    ],
  );
});
