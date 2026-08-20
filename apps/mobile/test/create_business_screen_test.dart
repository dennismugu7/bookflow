import 'dart:async';

import 'package:bookflow/features/business/business_models.dart';
import 'package:bookflow/features/business/business_providers.dart';
import 'package:bookflow/features/business/business_repository.dart';
import 'package:bookflow/features/business/create_business_screen.dart';
import 'package:bookflow/platform/auth_gateway.dart';
import 'package:bookflow/platform/providers.dart';
import 'package:bookflow/theme/app_theme.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';

/// Screen #5 — `native-04`, at `/setup`.
///
/// ══ EACH STATE IS DRIVEN, NOT CAUGHT ONCE ═══════════════════════════════════
///
/// A spinner asserted only while loading passes against one that never clears;
/// an error asserted only after a failure passes against one always on screen.
/// So every state test asserts its own absence first, then its presence, and
/// where it matters its absence again.
void main() {
  Widget screenWith({
    required BusinessRepository repository,
    AuthGateway? gateway,
  }) {
    return ProviderScope(
      overrides: <Override>[
        businessRepositoryProvider.overrideWithValue(repository),
        authGatewayProvider.overrideWithValue(gateway ?? _FakeGateway()),
      ],
      child: MaterialApp(
        theme: BookflowTheme.light(),
        home: const CreateBusinessScreen(),
      ),
    );
  }

  testWidgets('criterion 29 — presents no back arrow', (
    WidgetTester tester,
  ) async {
    await tester.pumpWidget(screenWith(repository: _StubRepository()));
    await tester.pumpAndSettle();

    // Both forms: the widget Flutter would insert, and the icon it draws.
    expect(find.byType(BackButton), findsNothing);
    expect(find.byIcon(Icons.arrow_back), findsNothing);
  });

  testWidgets('criterion 30 — does not submit an empty name', (
    WidgetTester tester,
  ) async {
    final _StubRepository repository = _StubRepository();
    await tester.pumpWidget(screenWith(repository: repository));
    await tester.pumpAndSettle();

    // Empty: the control is disabled, and tapping it calls nothing.
    await tester.tap(find.byKey(const Key('create-business-submit')));
    await tester.pumpAndSettle();
    expect(repository.createCalls, 0);

    // Whitespace only is still empty — the same rule the server applies, so the
    // client does not send a request it knows will be refused.
    await tester.enterText(
      find.byKey(const Key('create-business-name')),
      '   ',
    );
    await tester.pumpAndSettle();
    await tester.tap(find.byKey(const Key('create-business-submit')));
    await tester.pumpAndSettle();
    expect(repository.createCalls, 0);

    // And the other half: with a real name it DOES submit. Without this, the
    // assertions above are satisfied by a button that never works.
    await tester.enterText(
      find.byKey(const Key('create-business-name')),
      'Vera’s Salon',
    );
    await tester.pumpAndSettle();
    await tester.tap(find.byKey(const Key('create-business-submit')));
    await tester.pumpAndSettle();
    expect(repository.createCalls, 1);
  });

  testWidgets(
    'criterion 43, 33 — loading appears while in flight, then clears',
    (WidgetTester tester) async {
      final Completer<OwnedBusiness> pending = Completer<OwnedBusiness>();
      await tester.pumpWidget(
        screenWith(repository: _StubRepository(createFuture: pending.future)),
      );
      await tester.pumpAndSettle();

      expect(find.byKey(const Key('create-business-loading')), findsNothing);

      await tester.enterText(
        find.byKey(const Key('create-business-name')),
        'Vera’s Salon',
      );
      await tester.pumpAndSettle();
      await tester.tap(find.byKey(const Key('create-business-submit')));
      await tester.pump();

      // In flight — and the field is still mounted, which is why this is not an
      // AsyncValueView.
      expect(find.byKey(const Key('create-business-loading')), findsOneWidget);
      expect(find.byKey(const Key('create-business-name')), findsOneWidget);

      pending.complete(
        const OwnedBusiness(id: 'b', name: 'Vera’s Salon', published: false),
      );
      await tester.pumpAndSettle();

      // Criterion 33's half: it does not stay loading forever.
      expect(find.byKey(const Key('create-business-loading')), findsNothing);
    },
  );

  testWidgets(
    'criterion 44, 33 — a failure shows an error, keeps the typed name, and stays submittable',
    (WidgetTester tester) async {
      final _StubRepository repository = _StubRepository(failCreate: true);
      await tester.pumpWidget(screenWith(repository: repository));
      await tester.pumpAndSettle();

      expect(find.byKey(const Key('create-business-error')), findsNothing);

      await tester.enterText(
        find.byKey(const Key('create-business-name')),
        'Vera’s Salon',
      );
      await tester.pumpAndSettle();
      await tester.tap(find.byKey(const Key('create-business-submit')));
      await tester.pumpAndSettle();

      // The error is shown and the screen was NOT replaced — ErrorView would
      // have taken the field and the typed value with it.
      expect(find.byKey(const Key('create-business-error')), findsOneWidget);
      expect(find.byKey(const Key('create-business-name')), findsOneWidget);
      expect(find.text('Vera’s Salon'), findsOneWidget);
      expect(find.byKey(const Key('create-business-loading')), findsNothing);

      // Submitting again works — the assertion that fails if anyone later
      // disables the control on error.
      final int before = repository.createCalls;
      await tester.tap(find.byKey(const Key('create-business-submit')));
      await tester.pumpAndSettle();
      expect(repository.createCalls, before + 1);
    },
  );

  testWidgets('criterion 61 — an owner with no business can reach sign-out', (
    WidgetTester tester,
  ) async {
    // The design specifies NO exit from native-04 but a back arrow, which
    // decision 6 removed. `/setup` is the only destination the redirect allows
    // an owner without a business, so without this control they cannot leave
    // the app at all. Recorded as the sixth design deviation.
    final _FakeGateway gateway = _FakeGateway();
    await tester.pumpWidget(
      screenWith(repository: _StubRepository(), gateway: gateway),
    );
    await tester.pumpAndSettle();

    expect(gateway.signOutCalls, 0);

    // It asks first now (Screen 11). Tapping the control opens the
    // confirmation and signs nobody out — which matters more here than on the
    // account menu, because this is the ONLY control an owner with no business
    // has and a mistap used to end their session outright.
    await tester.tap(find.byKey(const Key('create-business-sign-out')));
    await tester.pumpAndSettle();
    expect(find.text('Log out?'), findsOneWidget);
    expect(gateway.signOutCalls, 0);

    await tester.tap(find.byKey(const Key('logout-go-back')));
    await tester.pumpAndSettle();
    expect(find.text('Log out?'), findsNothing);
    expect(gateway.signOutCalls, 0, reason: 'declining must not sign out');

    await tester.tap(find.byKey(const Key('create-business-sign-out')));
    await tester.pumpAndSettle();
    await tester.tap(find.byKey(const Key('logout-confirm')));
    await tester.pumpAndSettle();

    expect(
      gateway.signOutCalls,
      1,
      reason: 'the only exit an owner without a business has',
    );
  });
}

class _StubRepository implements BusinessRepository {
  _StubRepository({this.createFuture, this.failCreate = false});

  /// Supplied only where the test needs to control WHEN the submission settles.
  final Future<OwnedBusiness>? createFuture;

  /// A flag rather than a pre-built `Future.error`: an error future constructed
  /// at setup is unhandled until awaited, and the framework fails the test
  /// before the assertion under test runs.
  final bool failCreate;

  int createCalls = 0;

  @override
  Future<OwnedBusiness> create(String name) {
    createCalls += 1;
    if (failCreate) {
      return Future<OwnedBusiness>.error(StateError('create failed'));
    }
    return createFuture ??
        Future<OwnedBusiness>.value(
          OwnedBusiness(id: 'created', name: name, published: false),
        );
  }

  @override
  Future<BusinessStatus> fetchMine() async => const NoBusinessYet();

  @override
  Future<OwnedBusiness> rename({
    required String id,
    required String name,
    String? tagline,
    String? about,
    String? category,
    String? address,
    String? mapsUrl,
  }) => throw UnimplementedError('creation never renames');

  // A throw rather than a canned salon: a fake that quietly published would let
  // a test pass while asserting nothing about the real repository.
  @override
  Future<PublishedSalon> publish() =>
      throw UnimplementedError('creation never publishes');
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
