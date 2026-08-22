import 'package:bookflow/features/profile/profile_models.dart'
    show OwnerProfile, ReauthenticationFailed;
import 'package:bookflow/features/profile/profile_providers.dart';
import 'package:bookflow/features/profile/profile_repository.dart';
import 'package:bookflow/features/settings/delete_account_screen.dart';
import 'package:bookflow/features/settings/settings_screen.dart';
import 'package:bookflow/platform/auth_gateway.dart';
import 'package:bookflow/platform/providers.dart';
import 'package:bookflow/theme/app_theme.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:go_router/go_router.dart';

/// The settings branch — screens #23 and #25–#27.
///
/// ══ WHY THESE AND NOT THE REST ══════════════════════════════════════════════
///
/// Most of these screens are rows and copy. What is worth driving is where a
/// mistake is IRREVERSIBLE or invisible:
///
///   1. **The deletion gate.** A Delete button enabled before the checkbox is
///      ticked erases an account somebody never confirmed erasing. There is no
///      undo, and no test after the fact can help.
///   2. **The survey gate.** Continue enabled with nothing selected walks
///      straight past the retention screen the design put there on purpose.
///   3. **The legal rows lead somewhere.** The whole reason they exist rather
///      than being omitted is that the tap must not be dead.
void main() {
  /// A tall, phone-shaped surface.
  ///
  /// ── THE DEFAULT 800×600 IS LANDSCAPE AND SHORTER THAN ANY PHONE ──────────
  ///
  /// The survey screen is a heading, three paragraphs, four radio rows, a
  /// divider and a button — Continue lands well below 600px, and
  /// `tester.widget` on it throws `Bad state: No element` rather than saying
  /// "off screen", which is an hour of looking in the wrong place.
  ///
  /// `business_section_test.dart` hit the same wall and records the same fix.
  /// Sizing the surface removes the artefact instead of scrolling around it:
  /// these tests are about gates, not about scrolling.
  void usePhoneViewport(WidgetTester tester) {
    tester.view.physicalSize = const Size(1200, 4200);
    tester.view.devicePixelRatio = 3;
    // Restored per test, or a later file in the same process inherits a
    // surface it never asked for.
    addTearDown(tester.view.reset);
  }

  Widget host(Widget child, {List<Override> overrides = const <Override>[]}) {
    return ProviderScope(
      overrides: overrides,
      child: MaterialApp(theme: BookflowTheme.light(), home: child),
    );
  }

  /// The same host, but with a real router in context.
  ///
  /// ── ONLY THE TERMINAL SCREEN NEEDS THIS, AND IT GENUINELY NEEDS IT ───────
  ///
  /// `_Done`'s button calls `context.go('/')`, which throws "No GoRouter found
  /// in context" under a plain `MaterialApp`. The fix is a router rather than a
  /// null-check in the screen: the navigation is real behaviour, and guarding
  /// it away would be weakening the thing under test to suit the harness.
  ///
  /// Two routes and nothing else — enough for `go('/')` to resolve.
  Widget routedHost(
    Widget child, {
    List<Override> overrides = const <Override>[],
  }) {
    final GoRouter router = GoRouter(
      initialLocation: '/delete-account',
      routes: <RouteBase>[
        GoRoute(
          path: '/',
          builder: (BuildContext context, GoRouterState state) =>
              const Scaffold(body: Text('welcome')),
        ),
        GoRoute(
          path: '/delete-account',
          builder: (BuildContext context, GoRouterState state) => child,
        ),
      ],
    );
    addTearDown(router.dispose);

    return ProviderScope(
      overrides: overrides,
      child: MaterialApp.router(
        theme: BookflowTheme.light(),
        routerConfig: router,
      ),
    );
  }

  group('settings', () {
    testWidgets('every row leads somewhere, including the legal two', (
      WidgetTester tester,
    ) async {
      await tester.pumpWidget(host(const SettingsScreen()));
      await tester.pumpAndSettle();

      for (final String key in <String>[
        'settings-change-password',
        'settings-privacy',
        'settings-terms',
      ]) {
        final ListTile row = tester.widget<ListTile>(find.byKey(Key(key)));
        expect(row.onTap, isNotNull, reason: '$key leads nowhere');
      }

      final OutlinedButton delete = tester.widget<OutlinedButton>(
        find.byKey(const Key('settings-delete-account')),
      );
      expect(delete.onPressed, isNotNull);
    });

    testWidgets('the legal placeholder says the document is coming', (
      WidgetTester tester,
    ) async {
      await tester.pumpWidget(
        host(const LegalDocumentScreen(document: LegalDocument.privacy)),
      );
      await tester.pumpAndSettle();

      // ── IT MUST NOT LOOK LIKE A POLICY ────────────────────────────────
      //
      // The screen exists so the tap is not dead. What it must never do is
      // present generated text AS a privacy policy — that is a legal
      // undertaking nobody with authority made. So the assertion is that it
      // says the document is coming.
      expect(find.byKey(const Key('legal-placeholder')), findsOneWidget);
      expect(find.textContaining('on its way'), findsOneWidget);
    });
  });

  group('deleting an account', () {
    testWidgets('Continue is disabled until a reason is chosen', (
      WidgetTester tester,
    ) async {
      usePhoneViewport(tester);
      await tester.pumpWidget(host(const DeleteAccountScreen()));
      await tester.pumpAndSettle();

      FilledButton continueButton() => tester.widget<FilledButton>(
        find.byKey(const Key('delete-survey-continue')),
      );

      // The retention screen the design inserted on purpose. Enabled from the
      // start would let somebody tap straight through it.
      expect(continueButton().onPressed, isNull);

      await tester.tap(find.byKey(const Key('delete-reason-accident')));
      await tester.pumpAndSettle();

      expect(continueButton().onPressed, isNotNull);
    });

    testWidgets('“Something else” reveals a field, and nothing else does', (
      WidgetTester tester,
    ) async {
      usePhoneViewport(tester);
      await tester.pumpWidget(host(const DeleteAccountScreen()));
      await tester.pumpAndSettle();

      expect(find.byKey(const Key('delete-reason-detail')), findsNothing);

      await tester.tap(find.byKey(const Key('delete-reason-accident')));
      await tester.pumpAndSettle();
      expect(find.byKey(const Key('delete-reason-detail')), findsNothing);

      await tester.tap(find.byKey(const Key('delete-reason-somethingElse')));
      await tester.pumpAndSettle();
      expect(find.byKey(const Key('delete-reason-detail')), findsOneWidget);
    });

    testWidgets('the Delete button is gated on the checkbox', (
      WidgetTester tester,
    ) async {
      final _RecordingProfile repository = _RecordingProfile();

      usePhoneViewport(tester);
      await tester.pumpWidget(
        host(
          const DeleteAccountScreen(),
          overrides: <Override>[
            profileRepositoryProvider.overrideWithValue(repository),
            authGatewayProvider.overrideWithValue(_FakeGateway()),
          ],
        ),
      );
      await tester.pumpAndSettle();

      await tester.tap(find.byKey(const Key('delete-reason-accident')));
      await tester.pumpAndSettle();
      await tester.tap(find.byKey(const Key('delete-survey-continue')));
      await tester.pumpAndSettle();

      FilledButton deleteButton() => tester.widget<FilledButton>(
        find.byKey(const Key('delete-confirm-submit')),
      );

      // ── THE ASSERTION THAT MATTERS MOST IN THIS FILE ──────────────────
      //
      // Disabled, and nothing sent. An enabled button here erases an account
      // somebody never confirmed erasing, and there is no undo.
      expect(deleteButton().onPressed, isNull);
      expect(repository.deleted, isFalse);

      // Ticking the box is NOT enough on its own any more. The password gate
      // is the one that resists a stolen token; the checkbox only resists a
      // mistake, and a version that forgot the first would pass a test that
      // only ticked the second.
      await tester.tap(find.byKey(const Key('delete-confirm-gate')));
      await tester.pumpAndSettle();
      expect(deleteButton().onPressed, isNull);

      await tester.enterText(
        find.byKey(const Key('delete-password')),
        'hunter2',
      );
      await tester.pumpAndSettle();

      expect(deleteButton().onPressed, isNotNull);
    });

    testWidgets('a password alone does not open the gate either', (
      WidgetTester tester,
    ) async {
      final _RecordingProfile repository = _RecordingProfile();

      usePhoneViewport(tester);
      await tester.pumpWidget(
        host(
          const DeleteAccountScreen(),
          overrides: <Override>[
            profileRepositoryProvider.overrideWithValue(repository),
            authGatewayProvider.overrideWithValue(_FakeGateway()),
          ],
        ),
      );
      await tester.pumpAndSettle();

      await tester.tap(find.byKey(const Key('delete-reason-accident')));
      await tester.pumpAndSettle();
      await tester.tap(find.byKey(const Key('delete-survey-continue')));
      await tester.pumpAndSettle();

      await tester.enterText(
        find.byKey(const Key('delete-password')),
        'hunter2',
      );
      await tester.pumpAndSettle();

      // The mirror of the test above. Both gates, independently — the checkbox
      // answers "do you understand what you lose" and the password answers "are
      // you the owner", and neither substitutes for the other.
      final FilledButton button = tester.widget<FilledButton>(
        find.byKey(const Key('delete-confirm-submit')),
      );
      expect(button.onPressed, isNull);
      expect(repository.deleted, isFalse);
    });

    testWidgets('a wrong password reports on the field and deletes nothing', (
      WidgetTester tester,
    ) async {
      final _RecordingProfile repository = _RecordingProfile(
        wrongPassword: true,
      );

      usePhoneViewport(tester);
      await tester.pumpWidget(
        host(
          const DeleteAccountScreen(),
          overrides: <Override>[
            profileRepositoryProvider.overrideWithValue(repository),
            authGatewayProvider.overrideWithValue(_FakeGateway()),
          ],
        ),
      );
      await tester.pumpAndSettle();

      await tester.tap(find.byKey(const Key('delete-reason-accident')));
      await tester.pumpAndSettle();
      await tester.tap(find.byKey(const Key('delete-survey-continue')));
      await tester.pumpAndSettle();
      await tester.tap(find.byKey(const Key('delete-confirm-gate')));
      await tester.pumpAndSettle();
      await tester.enterText(find.byKey(const Key('delete-password')), 'wrong');
      await tester.pumpAndSettle();
      await tester.tap(find.byKey(const Key('delete-confirm-submit')));
      await tester.pumpAndSettle();

      // On the FIELD, with the specific sentence — not the generic failure
      // banner, which would send somebody looking for a second problem.
      expect(find.text('That password is incorrect.'), findsOneWidget);
      expect(find.byKey(const Key('delete-error')), findsNothing);

      // Still on the confirmation step, with something to retype.
      expect(find.byKey(const Key('delete-done-title')), findsNothing);
      expect(find.byKey(const Key('delete-password')), findsOneWidget);
    });

    testWidgets(
      'deleting sends the chosen reason and ends on the terminal screen',
      (WidgetTester tester) async {
        final _RecordingProfile repository = _RecordingProfile();
        final _FakeGateway gateway = _FakeGateway();

        usePhoneViewport(tester);
        await tester.pumpWidget(
          // Routed, because this is the one test that presses Done.
          routedHost(
            const DeleteAccountScreen(),
            overrides: <Override>[
              profileRepositoryProvider.overrideWithValue(repository),
              authGatewayProvider.overrideWithValue(gateway),
            ],
          ),
        );
        await tester.pumpAndSettle();

        await tester.tap(find.byKey(const Key('delete-reason-tooComplicated')));
        await tester.pumpAndSettle();
        await tester.tap(find.byKey(const Key('delete-survey-continue')));
        await tester.pumpAndSettle();
        await tester.tap(find.byKey(const Key('delete-confirm-gate')));
        await tester.pumpAndSettle();
        await tester.enterText(
          find.byKey(const Key('delete-password')),
          'hunter2',
        );
        await tester.pumpAndSettle();
        await tester.tap(find.byKey(const Key('delete-confirm-submit')));
        await tester.pumpAndSettle();

        // The password reaches the API. It is what the server re-authenticates
        // against, so a screen that collected it and did not send it would be a
        // field that looks like a control and is not one.
        expect(repository.password, 'hunter2');

        // The SENTENCE, not the enum name. A log read to learn why people leave
        // is not helped by `tooComplicated`.
        expect(repository.reason, 'The app is too complicated');

        // Screen #27, and no way backward — the design is explicit that this is
        // a terminal state.
        expect(find.byKey(const Key('delete-done-title')), findsOneWidget);
        expect(find.byKey(const Key('delete-back')), findsNothing);
        expect(find.byKey(const Key('delete-close')), findsNothing);

        // ── THE SIGN-OUT HAS NOT HAPPENED YET, AND THAT IS DELIBERATE ─────
        //
        // Clearing the session on the API's success would fire the router's
        // redirect in the same frame and this screen would never be seen
        // (ADR-042 — level 1 overrides level 2). Done is what signs out.
        expect(gateway.signOutCalls, 0);

        await tester.tap(find.byKey(const Key('delete-done')));
        await tester.pumpAndSettle();

        expect(gateway.signOutCalls, 1);
      },
    );

    testWidgets('a failed deletion stays put and says so', (
      WidgetTester tester,
    ) async {
      final _RecordingProfile repository = _RecordingProfile(fails: true);

      usePhoneViewport(tester);
      await tester.pumpWidget(
        host(
          const DeleteAccountScreen(),
          overrides: <Override>[
            profileRepositoryProvider.overrideWithValue(repository),
            authGatewayProvider.overrideWithValue(_FakeGateway()),
          ],
        ),
      );
      await tester.pumpAndSettle();

      await tester.tap(find.byKey(const Key('delete-reason-accident')));
      await tester.pumpAndSettle();
      await tester.tap(find.byKey(const Key('delete-survey-continue')));
      await tester.pumpAndSettle();
      await tester.tap(find.byKey(const Key('delete-confirm-gate')));
      await tester.pumpAndSettle();
      await tester.enterText(
        find.byKey(const Key('delete-password')),
        'hunter2',
      );
      await tester.pumpAndSettle();
      await tester.tap(find.byKey(const Key('delete-confirm-submit')));
      await tester.pumpAndSettle();

      // Not advanced to the terminal screen — which would tell somebody their
      // account was gone when it is not. The API's ordering makes a retry safe.
      expect(find.byKey(const Key('delete-error')), findsOneWidget);
      expect(find.byKey(const Key('delete-done-title')), findsNothing);
      expect(find.byKey(const Key('delete-confirm-submit')), findsOneWidget);
    });
  });
}

class _RecordingProfile implements ProfileRepository {
  _RecordingProfile({this.fails = false, this.wrongPassword = false});

  final bool fails;
  final bool wrongPassword;
  bool deleted = false;
  String? reason;
  String? password;

  @override
  Future<void> deleteAccount({
    required String password,
    required String? reason,
  }) async {
    this.reason = reason;
    this.password = password;
    if (wrongPassword) throw const ReauthenticationFailed();
    if (fails) throw StateError('deletion failed');
    deleted = true;
  }

  @override
  Future<OwnerProfile> fetchMine() =>
      throw UnimplementedError('this flow never reads the profile');

  @override
  Future<OwnerProfile> rename({
    required String firstName,
    required String lastName,
  }) => throw UnimplementedError('this flow never renames');
}

class _FakeGateway implements AuthGateway {
  int signOutCalls = 0;

  @override
  Future<void> signOut() async => signOutCalls += 1;

  @override
  SessionStatus get status => SessionStatus.signedIn;

  @override
  Stream<SessionStatus> statusChanges() => const Stream<SessionStatus>.empty();

  @override
  String? currentAccessToken() => 'token';

  @override
  String? currentEmail() => 'owner@example.com';

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
  Future<void> changePassword({
    required String currentPassword,
    required String newPassword,
  }) => throw UnimplementedError();
}
