import 'dart:async';

import 'package:bookflow/features/account/account_menu_screen.dart';
import 'package:bookflow/features/business/business_models.dart';
import 'package:bookflow/features/business/business_providers.dart';
import 'package:bookflow/features/business/business_repository.dart';
import 'package:bookflow/features/dashboard/dashboard_screen.dart';
import 'package:bookflow/features/profile/profile_models.dart';
import 'package:bookflow/features/profile/profile_providers.dart';
import 'package:bookflow/features/profile/profile_repository.dart';
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
      expect(gateway.signOutCalls, 0);
      await tester.tap(find.byKey(const Key('account-log-out')));
      await tester.pumpAndSettle();
      expect(gateway.signOutCalls, 1);
    });
  });

  group('the chain — criteria 55, 58', () {
    testWidgets('55, 58 — dashboard to account to profile, and back again', (
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

      // Criterion 58's half is asserted on the real screen in
      // `profile_screen_test.dart`; here the chain is what matters — that the
      // avatar leads somewhere and the menu leads on.
    });
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
