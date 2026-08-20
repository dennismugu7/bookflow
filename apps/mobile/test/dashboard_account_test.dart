import 'dart:async';

import 'package:bookflow/features/account/account_menu_screen.dart';
import 'package:bookflow/features/business/business_models.dart';
import 'package:bookflow/features/business/business_providers.dart';
import 'package:bookflow/features/business/business_repository.dart';
import 'package:bookflow/features/dashboard/dashboard_screen.dart';
import 'package:bookflow/features/profile/profile_models.dart';
import 'package:bookflow/features/profile/profile_providers.dart';
import 'package:bookflow/features/profile/profile_repository.dart';
import 'package:bookflow/features/profile/profile_screen.dart';
import 'package:bookflow/platform/auth_gateway.dart';
import 'package:bookflow/platform/providers.dart';
import 'package:bookflow/platform/router.dart';
import 'package:bookflow/theme/app_theme.dart';
import 'package:bookflow/ui/async_value_view.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:go_router/go_router.dart';

/// Screens #12 and #17, and the navigation chain decision 12 built.
///
/// ══ THE ABSENCES ARE THE ASSERTIONS ═════════════════════════════════════════
///
/// Criterion 46 and criteria 27, 28 and 56 are all about what is NOT drawn.
/// A test that only checks the presence of the right thing passes against a
/// screen that draws the right thing AND the wrong one, which is exactly the
/// failure K47's answer exists to prevent.
void main() {
  const OwnedBusiness vera = OwnedBusiness(
    id: 'b1',
    name: 'Vera’s Salon',
    published: false,
  );
  Widget dashboardWith({
    required BusinessRepository business,
    ProfileRepository? profile,
  }) {
    return ProviderScope(
      overrides: <Override>[
        businessRepositoryProvider.overrideWithValue(business),
        profileRepositoryProvider.overrideWithValue(
          profile ?? const _StubProfile(),
        ),
        authGatewayProvider.overrideWithValue(_FakeGateway()),
      ],
      child: MaterialApp(
        theme: BookflowTheme.light(),
        home: const DashboardScreen(),
      ),
    );
  }

  group('screen #12 — the dashboard', () {
    testWidgets('criterion 26, 47 — shows the setup-continuation state', (
      WidgetTester tester,
    ) async {
      await tester.pumpWidget(
        dashboardWith(business: _StubBusiness(status: const HasBusiness(vera))),
      );
      await tester.pumpAndSettle();

      expect(find.byKey(const Key('setup-continuation')), findsOneWidget);
      // What remains — the point of the state, not decoration.
      expect(find.text('Add your services'), findsOneWidget);
      expect(find.text('Publish your booking page'), findsOneWidget);
    });

    testWidgets(
      'criterion 27, 28 — no bookings empty state and no share-link prompt',
      (WidgetTester tester) async {
        await tester.pumpWidget(
          dashboardWith(
            business: _StubBusiness(status: const HasBusiness(vera)),
          ),
        );
        await tester.pumpAndSettle();

        // The designed empty state and its CTA, both absent while unpublished.
        expect(find.text('No Bookings yet'), findsNothing);
        expect(find.textContaining('Share your booking link'), findsNothing);
        expect(find.textContaining('booking link'), findsNothing);
      },
    );

    testWidgets(
      'the seventh deviation — no Bookings, Contacts or Calendar tabs',
      (WidgetTester tester) async {
        // `native-11` draws all three. They lead to a dashboard this slice
        // excludes, so they are omitted rather than drawn inert — decision 12's
        // rule for #17's rows, applied here.
        await tester.pumpWidget(
          dashboardWith(
            business: _StubBusiness(status: const HasBusiness(vera)),
          ),
        );
        await tester.pumpAndSettle();

        expect(find.text('Bookings'), findsNothing);
        expect(find.text('Contacts'), findsNothing);
        expect(find.text('Calendar'), findsNothing);
      },
    );

    testWidgets('criterion 45 — a loading state, which then clears', (
      WidgetTester tester,
    ) async {
      final _StubBusiness repository = _StubBusiness(
        status: const HasBusiness(vera),
        hold: true,
      );
      await tester.pumpWidget(dashboardWith(business: repository));
      await tester.pump();

      expect(find.byType(LoadingView), findsOneWidget);
      // And NOT the content, which would mean the state was guessed.
      expect(find.byKey(const Key('setup-continuation')), findsNothing);

      repository.release();
      await tester.pumpAndSettle();

      expect(find.byType(LoadingView), findsNothing);
      expect(find.byKey(const Key('setup-continuation')), findsOneWidget);
    });

    testWidgets(
      'criterion 46 — a failed load shows an error and NEITHER other state',
      (WidgetTester tester) async {
        await tester.pumpWidget(
          dashboardWith(business: _StubBusiness(failRead: true)),
        );
        await tester.pumpAndSettle();

        expect(find.byType(ErrorView), findsOneWidget);

        // The whole criterion. Both assert something about a business whose
        // state is unknown, and showing either would be a guess.
        expect(
          find.byKey(const Key('setup-continuation')),
          findsNothing,
          reason: 'the setup state asserts the business exists',
        );
        expect(
          find.text('No Bookings yet'),
          findsNothing,
          reason: 'the bookings empty state asserts it is ready for bookings',
        );
      },
    );
  });

  group('screen #17 — the account menu', () {
    Widget menuWith({ProfileRepository? profile, AuthGateway? gateway}) {
      return ProviderScope(
        overrides: <Override>[
          profileRepositoryProvider.overrideWithValue(
            profile ?? const _StubProfile(),
          ),
          authGatewayProvider.overrideWithValue(gateway ?? _FakeGateway()),
        ],
        child: MaterialApp(
          theme: BookflowTheme.light(),
          home: const AccountMenuScreen(),
        ),
      );
    }

    testWidgets(
      'criterion 56 — shows no row whose destination does not exist',
      (WidgetTester tester) async {
        await tester.pumpWidget(menuWith());
        await tester.pumpAndSettle();

        // Present.
        expect(find.text('Profile'), findsOneWidget);
        expect(find.text('Log out'), findsOneWidget);
        // Absent — #21/#22, #23 and #18 do not exist.
        expect(find.text('My services'), findsNothing);
        expect(find.text('Settings'), findsNothing);
        expect(find.text('Support'), findsNothing);
      },
    );

    testWidgets('criterion 59 — a loading header leaves the rows working', (
      WidgetTester tester,
    ) async {
      await tester.pumpWidget(menuWith(profile: _StubProfile(hold: true)));
      await tester.pump();

      expect(find.byKey(const Key('account-header-loading')), findsOneWidget);
      // The point: Log out survives a header that has not loaded.
      expect(find.text('Log out'), findsOneWidget);
      expect(find.text('Profile'), findsOneWidget);
    });

    testWidgets('criterion 57, 60 — a failed header leaves Log out working', (
      WidgetTester tester,
    ) async {
      final _FakeGateway gateway = _FakeGateway();
      await tester.pumpWidget(
        menuWith(profile: _StubProfile(fail: true), gateway: gateway),
      );
      await tester.pumpAndSettle();

      expect(find.byKey(const Key('account-header-error')), findsOneWidget);
      expect(find.text('Log out'), findsOneWidget);

      // Driven, not merely present: it must actually sign out. This is what
      // fails if anyone later wraps the screen in `AsyncValueView`.
      //
      // Through the confirmation now (Screen 11) — which is also the assertion
      // that the modal can still be reached and answered when the header above
      // it has failed, the exact case this test exists for.
      expect(gateway.signOutCalls, 0);
      await tester.tap(find.byKey(const Key('account-log-out')));
      await tester.pumpAndSettle();
      expect(find.text('Log out?'), findsOneWidget);
      expect(gateway.signOutCalls, 0);

      await tester.tap(find.byKey(const Key('logout-confirm')));
      await tester.pumpAndSettle();
      expect(gateway.signOutCalls, 1);
    });
  });

  group('the chain', () {
    // NAMED WRONGLY WHEN WRITTEN, and the grep caught it: this was
    // '55, 58 — …', without the word "criterion", so the mapping query in
    // `01-acceptance-criteria.md` could not see it. A criterion the grep cannot
    // see is a criterion the DoD cannot count.
    //
    // **Only 55 is claimed.** The earlier name also said 58, and that would
    // have been a FALSE mapping: this test pushes a profile STUB, not the real
    // `ProfileScreen`, so it cannot assert anything about #20's back
    // affordance. The naming rule warns about exactly this — a number in a test
    // name is a claim, and a false one is worse than no mapping.
    testWidgets('criterion 55 — dashboard to account to profile is reachable', (
      WidgetTester tester,
    ) async {
      final GoRouter router = GoRouter(
        initialLocation: '/home',
        routes: <RouteBase>[
          GoRoute(
            path: '/home',
            builder: (BuildContext c, GoRouterState s) =>
                const DashboardScreen(),
          ),
          GoRoute(
            path: '/account',
            builder: (BuildContext c, GoRouterState s) =>
                const AccountMenuScreen(),
          ),
          GoRoute(
            path: '/profile',
            builder: (BuildContext c, GoRouterState s) => const Scaffold(
              body: Center(child: Text('My profile', key: Key('profile-stub'))),
            ),
          ),
        ],
      );
      addTearDown(router.dispose);

      await tester.pumpWidget(
        ProviderScope(
          overrides: <Override>[
            businessRepositoryProvider.overrideWithValue(
              _StubBusiness(status: const HasBusiness(vera)),
            ),
            profileRepositoryProvider.overrideWithValue(const _StubProfile()),
            authGatewayProvider.overrideWithValue(_FakeGateway()),
          ],
          child: MaterialApp.router(
            theme: BookflowTheme.light(),
            routerConfig: router,
          ),
        ),
      );
      await tester.pumpAndSettle();

      // Criterion 55: screen #20 is reachable from where an owner lands.
      await tester.tap(find.byKey(const Key('dashboard-avatar')));
      await tester.pumpAndSettle();
      expect(find.text('Account'), findsOneWidget);

      await tester.tap(find.byKey(const Key('account-profile')));
      await tester.pumpAndSettle();
      expect(find.byKey(const Key('profile-stub')), findsOneWidget);

      // Criterion 58 is asserted below, on the REAL screen — this one pushes a
      // stub, so it can say nothing about #20's back affordance.
    });

    // FOUND BY A PROBE, NOT BY READING. Before this test existed the arrow on
    // #17 was real but undeclared — `AppBar.automaticallyImplyLeading` supplies
    // one when the route can pop, so the screen worked and nothing held it
    // that way. The probe counted `backButtons=1` with `onAccount=1` as its
    // control; the affordance is now explicit and this asserts it.
    //
    // **It asserts the ARRIVAL, not the tap.** A test that only tapped back
    // would pass against a control that pops to anywhere, including nowhere.
    testWidgets('criterion 62 — screen #17 returns to screen #12', (
      WidgetTester tester,
    ) async {
      final GoRouter router = GoRouter(
        initialLocation: '/home',
        routes: <RouteBase>[
          GoRoute(
            path: '/home',
            builder: (BuildContext c, GoRouterState s) =>
                const DashboardScreen(),
          ),
          GoRoute(
            path: '/account',
            builder: (BuildContext c, GoRouterState s) =>
                const AccountMenuScreen(),
          ),
        ],
      );
      addTearDown(router.dispose);

      await tester.pumpWidget(
        ProviderScope(
          overrides: <Override>[
            businessRepositoryProvider.overrideWithValue(
              _StubBusiness(status: const HasBusiness(vera)),
            ),
            profileRepositoryProvider.overrideWithValue(const _StubProfile()),
            authGatewayProvider.overrideWithValue(_FakeGateway()),
          ],
          child: MaterialApp.router(
            theme: BookflowTheme.light(),
            routerConfig: router,
          ),
        ),
      );
      await tester.pumpAndSettle();

      // The dashboard first, so "we got back" means something. Without this the
      // final assertion is satisfied by never having left.
      expect(find.byKey(const Key('setup-continuation')), findsOneWidget);

      await tester.tap(find.byKey(const Key('dashboard-avatar')));
      await tester.pumpAndSettle();
      expect(find.text('Account'), findsOneWidget);
      expect(find.byKey(const Key('setup-continuation')), findsNothing);

      await tester.tap(find.byKey(const Key('account-back')));
      await tester.pumpAndSettle();

      // Back on #12, and not signed out — the two ways this could go wrong.
      expect(find.byKey(const Key('setup-continuation')), findsOneWidget);
      expect(find.text('Account'), findsNothing);
    });

    testWidgets(
      'criterion 58 — screen #20 back returns to #17 and does not sign out',
      (WidgetTester tester) async {
        final _FakeGateway gateway = _FakeGateway();
        final GoRouter router = GoRouter(
          initialLocation: '/account',
          routes: <RouteBase>[
            GoRoute(
              path: '/account',
              builder: (BuildContext c, GoRouterState s) =>
                  const AccountMenuScreen(),
            ),
            GoRoute(
              path: '/profile',
              // The real screen, because the assertion is about ITS back
              // affordance and a stub would prove nothing.
              builder: (BuildContext c, GoRouterState s) =>
                  const ProfileScreen(),
            ),
          ],
        );
        addTearDown(router.dispose);

        await tester.pumpWidget(
          ProviderScope(
            overrides: <Override>[
              businessRepositoryProvider.overrideWithValue(
                _StubBusiness(status: const HasBusiness(vera)),
              ),
              profileRepositoryProvider.overrideWithValue(const _StubProfile()),
              authGatewayProvider.overrideWithValue(gateway),
              sessionEmailProvider.overrideWithValue('owner@bookflow.test'),
            ],
            child: MaterialApp.router(
              theme: BookflowTheme.light(),
              routerConfig: router,
            ),
          ),
        );
        await tester.pumpAndSettle();

        await tester.tap(find.byKey(const Key('account-profile')));
        await tester.pumpAndSettle();
        expect(find.text('My profile'), findsOneWidget);

        await tester.tap(find.byKey(const Key('profile-back')));
        await tester.pumpAndSettle();

        // Back to #17 …
        expect(find.text('Account'), findsOneWidget);
        expect(find.text('My profile'), findsNothing);
        // … and NOT signed out. This is the half that fails if the old
        // sign-out callback survives the change: the user would appear to have
        // "gone back" while their session ended underneath them.
        expect(
          gateway.signOutCalls,
          0,
          reason: 'back must navigate, not end the session',
        );
      },
    );
  });

  test('the pushed routes are declared to the redirect (ADR-042)', () {
    // Registering a GoRoute without adding it to `pushedRouteShells` would let
    // the redirect pull the user straight back to /home. This is the assertion
    // that catches that omission.
    expect(pushedRouteShells['/account'], AppDestination.home);
    expect(pushedRouteShells['/profile'], AppDestination.home);
  });
}

class _StubBusiness implements BusinessRepository {
  _StubBusiness({this.status, this.failRead = false, this.hold = false});

  final BusinessStatus? status;
  final bool failRead;
  final bool hold;

  final Completer<BusinessStatus> _gate = Completer<BusinessStatus>();

  void release() => _gate.complete(status ?? const NoBusinessYet());

  @override
  Future<BusinessStatus> fetchMine() {
    if (failRead) {
      return Future<BusinessStatus>.error(StateError('read failed'));
    }
    if (hold) return _gate.future;
    return Future<BusinessStatus>.value(status ?? const NoBusinessYet());
  }

  @override
  Future<OwnedBusiness> create(String name) =>
      throw UnimplementedError('not used here');

  @override
  Future<OwnedBusiness> rename({required String id, required String name}) =>
      throw UnimplementedError('not used here');

  @override
  Future<PublishedSalon> publish() => throw UnimplementedError('not used here');
}

class _StubProfile implements ProfileRepository {
  const _StubProfile({this.fail = false, this.hold = false});

  final bool fail;
  final bool hold;

  @override
  Future<OwnerProfile> fetchMine() {
    if (fail) return Future<OwnerProfile>.error(StateError('profile failed'));
    if (hold) return Completer<OwnerProfile>().future;
    return Future<OwnerProfile>.value(
      const OwnerProfile(id: 'u1', firstName: 'Ada', lastName: 'Lovelace'),
    );
  }
}

class _FakeGateway implements AuthGateway {
  int signOutCalls = 0;

  // The entry flow's operations. This fake does not perform them, and a throw
  // says so at the line rather than letting a test pass on a fake success.
  @override
  Future<void> signInWithPassword({
    required String email,
    required String password,
  }) => throw UnimplementedError();

  @override
  Future<void> verifySignupCode({
    required String email,
    required String code,
  }) => throw UnimplementedError();

  @override
  Future<void> resendSignupCode({required String email}) =>
      throw UnimplementedError();

  @override
  Future<void> requestPasswordReset({required String email}) =>
      throw UnimplementedError();

  @override
  Future<void> verifyRecoveryCode({
    required String email,
    required String code,
  }) => throw UnimplementedError();

  @override
  Future<void> setNewPassword({required String newPassword}) =>
      throw UnimplementedError();

  @override
  SessionStatus get status => SessionStatus.signedIn;

  @override
  Stream<SessionStatus> statusChanges() => const Stream<SessionStatus>.empty();

  @override
  String? currentAccessToken() => 'token';

  @override
  String? currentEmail() => 'owner@bookflow.test';

  @override
  Future<void> signOut() async => signOutCalls += 1;
}
