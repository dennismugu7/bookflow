import 'package:bookflow/features/account/account_menu_screen.dart';
import 'package:bookflow/features/business/create_business_screen.dart';
import 'package:bookflow/features/dashboard/dashboard_screen.dart';
import 'package:bookflow/features/hours/hours_screen.dart';
import 'package:bookflow/features/media/portfolio_screen.dart';
import 'package:bookflow/features/membership/membership_repository.dart';
import 'package:bookflow/features/profile/profile_screen.dart';
import 'package:bookflow/features/services/services_screen.dart';
import 'package:bookflow/features/settings/change_password_screen.dart';
import 'package:bookflow/features/settings/delete_account_screen.dart';
import 'package:bookflow/features/settings/settings_screen.dart';
import 'package:bookflow/features/signed_out/signed_out_screen.dart';
import 'package:bookflow/features/startup/startup_screen.dart';
import 'package:bookflow/features/startup/unavailable_screen.dart';
import 'package:bookflow/features/team/team_screen.dart';
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
///   /home          SIGNED IN, WITH A MEMBERSHIP — screen #20.     (ADR-032, 3)
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
      // A recovery session is not a login. Checked BEFORE the session, because
      // the session is real — GoTrue hands one out in exchange for the recovery
      // code — and without this the redirect would move the shell out from
      // under someone half way through resetting a password they cannot yet
      // use. See `passwordRecoveryProvider`.
      if (ref.watch(passwordRecoveryProvider)) {
        return AppDestination.signedOut;
      }

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

/// ══ LEVEL 2 — ROUTES REACHED BY TAPPING (ADR-042) ═══════════════════════════
///
/// ADR-042 splits navigation in two. **Level 1**, which shell the user is in, is
/// computed from state and enforced by the redirect — that is `AppDestination`
/// above and it is unchanged. **Level 2** is movement *within* a shell, by push,
/// and this is where it is declared.
///
/// The boundary is ADR-042's question: *"A destination is a shell if the answer
/// to 'why am I here?' is a fact about the user's account that the app computed.
/// It is a pushed screen if the answer is 'because I tapped something.'"*
///
/// **Each pushed route declares which shell it belongs to**, which is what lets
/// the redirect ask "is this location within the currently-selected shell?"
/// rather than "does this location equal the destination?" — the change ADR-042
/// requires.
///
/// **The screens are not built yet.** `/account` is screen #17 and `/profile` is
/// screen #20 under decision 12; T7+T8 registers their `GoRoute`s and their
/// builders. The ownership map exists first because the redirect must tolerate
/// them before anything can navigate to one, and because R2 wanted this tested
/// before any widget exists.
const Map<String, AppDestination> pushedRouteShells = <String, AppDestination>{
  '/account': AppDestination.home,
  '/profile': AppDestination.home,
  // The configuration screens the dashboard's checklist opens. All three belong
  // to the HOME shell: an owner is on one because they tapped a row, and a
  // session ending must take them off it exactly as it takes them off
  // `/profile` — which is what listing them here buys.
  '/services': AppDestination.home,
  '/opening-hours': AppDestination.home,
  '/team': AppDestination.home,
  '/portfolio': AppDestination.home,
  // The settings branch, reached from the account menu. Same shell for the same
  // reason — an owner is on one of these because they tapped a row.
  '/settings': AppDestination.home,
  '/change-password': AppDestination.home,
  '/legal/privacy': AppDestination.home,
  '/legal/terms': AppDestination.home,
  // ── `/delete-account` IS A HOME ROUTE, AND THAT CONSTRAINS THE FLOW ──────
  //
  // Listing it here keeps a push from being undone, like every route above.
  // What it does NOT do — and an earlier version of this comment claimed it
  // did — is hold the screen once the session ends. Rule 2 only stays put when
  // the owning shell IS the computed destination; sign out and the destination
  // becomes `welcome`, the owner is still `home`, and the redirect wins. That
  // is ADR-042 working exactly as written: "Level 1 always overrides level 2."
  //
  // **The consequence lands on the deletion flow**: its terminal success screen
  // (#27) cannot be shown after the local session is cleared, because the
  // redirect would move off it in the same frame. So the session is cleared by
  // the Done button rather than on the API's success — see
  // `delete_account_screen.dart`, which explains what that costs.
  '/delete-account': AppDestination.home,
};

/// Where the router should send a user currently at `matchedLocation`, or
/// `null` for "stay put".
///
/// Pure, so the tests drive it without a widget tree, a navigator or a pumped
/// frame — the same property `appDestinationProvider` has and for the same
/// reason.
///
/// ── THE TWO RULES, IN ADR-042's ORDER ───────────────────────────────────────
///
/// 1. **Stay put if the location is the destination.** Unchanged, and still
///    required: returning the current location unconditionally makes `go_router`
///    loop.
/// 2. **Stay put if the location is a pushed route belonging to the shell the
///    state already selects.** This is the new half. Without it a push is
///    immediately undone — the pushed route is not the computed destination, so
///    the old redirect yanked the user straight back.
///
/// **Anything else is a shell change and wins.** ADR-042: *"If the session ends
/// while the profile is pushed, the redirect moves the user to the signed-out
/// shell and the stack is discarded. Level 1 always overrides level 2 — that is
/// what keeps ADR-028's guarantee intact."* So a pushed route whose owning shell
/// is no longer selected is left, not kept.
String? redirectFor({
  required String matchedLocation,
  required AppDestination destination,
}) {
  if (matchedLocation == destination.path) return null;

  final AppDestination? owner = pushedRouteShells[matchedLocation];
  if (owner == destination) return null;

  return destination.path;
}

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
      // The decision lives in `redirectFor`, which is pure and directly tested
      // (ADR-042). This closure only supplies the two inputs.
      return redirectFor(
        matchedLocation: state.matchedLocation,
        destination: ref.read(appDestinationProvider),
      );
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
        // Screen #5 replaces ADR-032's stub, which said in terms that it was
        // "deliberate debt … replaced by the onboarding slice". This is that
        // slice. `/setup` remains a computed shell (ADR-042 level 1): an owner
        // is here because they have no membership, not because they tapped.
        builder: (BuildContext context, GoRouterState state) =>
            const CreateBusinessScreen(),
      ),
      GoRoute(
        path: AppDestination.home.path,
        // Screen #12 takes the home shell (decision 12). Screen #20 moves to
        // `/profile` below — a change to an existing route, not an addition,
        // and the reason this landed as one commit with the account menu:
        // between the two, sign-out was reachable through neither screen.
        builder: (BuildContext context, GoRouterState state) =>
            const DashboardScreen(),
      ),
      // ── LEVEL 2 (ADR-042) — reached by tapping, not by state ──────────────
      //
      // Declared in `pushedRouteShells` above, which is what stops the redirect
      // pulling a pushed route straight back to `/home`.
      GoRoute(
        path: '/account',
        builder: (BuildContext context, GoRouterState state) =>
            const AccountMenuScreen(),
      ),
      GoRoute(
        path: '/profile',
        builder: (BuildContext context, GoRouterState state) =>
            const ProfileScreen(),
      ),
      GoRoute(
        path: '/services',
        builder: (BuildContext context, GoRouterState state) =>
            const ServicesScreen(),
      ),
      GoRoute(
        path: '/opening-hours',
        builder: (BuildContext context, GoRouterState state) =>
            const OpeningHoursScreen(),
      ),
      GoRoute(
        path: '/team',
        builder: (BuildContext context, GoRouterState state) =>
            const TeamScreen(),
      ),
      GoRoute(
        path: '/portfolio',
        builder: (BuildContext context, GoRouterState state) =>
            const PortfolioScreen(),
      ),
      GoRoute(
        path: '/settings',
        builder: (BuildContext context, GoRouterState state) =>
            const SettingsScreen(),
      ),
      GoRoute(
        path: '/change-password',
        builder: (BuildContext context, GoRouterState state) =>
            const ChangePasswordScreen(),
      ),
      // Two routes rather than one with a parameter: the set is closed at two
      // and always will be, and a `/legal/:slug` would need a not-found branch
      // for a slug nobody can type.
      GoRoute(
        path: '/legal/privacy',
        builder: (BuildContext context, GoRouterState state) =>
            const LegalDocumentScreen(document: LegalDocument.privacy),
      ),
      GoRoute(
        path: '/legal/terms',
        builder: (BuildContext context, GoRouterState state) =>
            const LegalDocumentScreen(document: LegalDocument.terms),
      ),
      GoRoute(
        path: '/delete-account',
        builder: (BuildContext context, GoRouterState state) =>
            const DeleteAccountScreen(),
      ),
      GoRoute(
        path: AppDestination.unavailable.path,
        builder: (BuildContext context, GoRouterState state) =>
            const UnavailableScreen(),
      ),
    ],
  );
});
