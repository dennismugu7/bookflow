/// ══ THE BUSINESS-SETUP CRITICAL JOURNEY ═════════════════════════════════════
///
/// **An owner with no business creates one through screen #5, and the app
/// carries them to the dashboard on their own credential.**
///
/// Business setup is a critical journey by ADR-033's own test — *"one whose
/// failure prevents an owner from taking a booking"* — ruled by Dennis on
/// 2026-08-19 and recorded in that ADR's amendment of the same date. Every
/// bookable thing is a child of `public.businesses`, so an owner who cannot
/// create one takes no bookings. `DEFINITION_OF_DONE.md` line 21 therefore
/// applies to this slice, and ADR-040 §4 makes this test **unbuilt rather than
/// waivable**: writing it is expensive and entirely possible, which is the one
/// thing that ADR does not authorise skipping.
///
/// Designed before it was written: `docs/features/01-business-setup/08-e2e-design.md`.
///
/// ── WHAT IT EXERCISES ──────────────────────────────────────────────────────
///
/// The four layers ADR-033 named, none stubbed:
///
///   deployed API     → the real Render service over the public internet
///   generated client → `package:bookflow_api`, the dart-dio output (ADR-025)
///   Riverpod graph   → the real `providers.dart`, built by the real app
///   router           → `go_router` and ADR-042's two-level redirect
///
/// ── THE OVERRIDE THIS TEST DOES NOT USE, WHICH IS THE POINT ────────────────
///
/// `profile_e2e_test.dart` overrides `membershipRepositoryProvider` to `member`,
/// because when it was written **no endpoint answered "does this user have a
/// business"** and `NoBusinessYetMembershipRepository` was a documented
/// constant.
///
/// **That reason has expired and this test must not carry the override.**
/// `GET /v1/me/business` exists, and `providers.dart` now wires
/// `ApiMembershipRepository(ref.watch(businessRepositoryProvider))`. Criteria 41
/// and 42 are precisely the claim that **the membership answer comes from the
/// API** — an override would pin that answer locally and assert it against
/// itself. The redirect moving off `/setup` here is caused by a real
/// `GET /v1/me/business` returning a real business.
///
/// `profile_e2e_test.dart` keeps its override correctly: it runs on the *other*
/// staging account, which K78 forbids ever giving a membership.
///
/// ── HOW IT KNOWS THE DATA IS REAL ──────────────────────────────────────────
///
/// **The business name is generated at run time and exists nowhere before the
/// run begins** — a fixed prefix plus a token from the clock and a random
/// integer. It is typed into screen #5's field, submitted through the app's own
/// graph, and then read back over **a second Dio client that shares nothing
/// with the app** but the token.
///
/// So the assertion is that **two independent paths agree on a value neither
/// knew beforehand**, which is `profile_e2e_test.dart`'s property. It is
/// stronger here in one respect: that test reads a value it did not create,
/// while this one creates the value through the UI, so the whole write path —
/// widget, provider, generated client, deployed API, Zod trim, insert — has to
/// work for the read to match.
///
/// ── WHERE THE ORACLE IS WEAKER, STATED RATHER THAN GLOSSED ─────────────────
///
/// **1. The same run both writes and verifies.** `profile_e2e_test.dart`
/// asserts against data it did not create, so a bug that made the app render
/// its own input would fail it. A test that types a name and then looks for
/// that name is, in that narrow sense, checking its own homework. What protects
/// it is that the value must survive the entire round trip and come back from a
/// connection the app does not share — not independence of origin.
///
/// **2. The read-back is HTTP, not SQL.** The design (§4) called for reading the
/// row over the `STAGING_APP_DATABASE_URL` connection already open for cleanup.
/// **That is not available from here** — the Dart process has no Postgres
/// driver and holds no database URL, and it must not: the only channel into the
/// build is `--dart-define-from-file`, which constant-folds its values into the
/// binary (`docs/analysis/10-e2e-credential-in-artefact.md`). So the second path
/// is `GET /v1/me/business` over a bare Dio. It is genuinely independent of the
/// app's graph and genuinely not the app's client; it is **not** independent of
/// the API, which SQL would have been. The design's §8 records the same
/// constraint for the cleanup step; §4 was written before that was settled.
///
/// ── WHAT IT STILL GIVES UP ─────────────────────────────────────────────────
///
/// **The session is injected. There is no login screen in this journey**, for
/// the same reason `profile_e2e_test.dart` has none: E14 means staging's sender
/// reaches exactly one inbox, so no automated run can receive a verification
/// mail, and the login screen belongs to a later slice.
///
/// **The account is not new.** A genuinely first-time owner — sign-up through
/// verification through first login — remains untestable from CI. This journey
/// simulates the *state* of a new owner because CI clears their rows before the
/// run, not because they are one.
///
/// ── WHY THE ROWS ARE CLEARED, AND WHERE ────────────────────────────────────
///
/// `uq_memberships_one_owner_per_user` means creation succeeds **exactly once**
/// for a permanent account. Without cleanup, run 1 asserts creation and run 2
/// silently asserts the 409 conflict path while still being named after
/// creation — a test whose meaning changes between runs, which is worse than
/// one that fails. CI deletes this account's membership and business **before**
/// the build, scoped to the id derived from its own session. Step 0 below
/// asserts that the clean slate actually happened rather than assuming it.
library;

import 'dart:math';

import 'package:bookflow/app.dart';
import 'package:bookflow/platform/auth_gateway.dart';
import 'package:bookflow/platform/config.dart';
import 'package:bookflow/platform/providers.dart';
import 'package:bookflow/platform/secure_session_store.dart';
import 'package:dio/dio.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:integration_test/integration_test.dart';
import 'package:supabase_flutter/supabase_flutter.dart';

void main() {
  IntegrationTestWidgetsFlutterBinding.ensureInitialized();

  const AppConfig config = AppConfig(
    supabaseUrl: String.fromEnvironment('SUPABASE_URL'),
    supabaseAnonKey: String.fromEnvironment('SUPABASE_ANON_KEY'),
    apiBaseUrl: String.fromEnvironment('API_BASE_URL'),
  );
  const String accessToken = String.fromEnvironment('E2E_ACCESS_TOKEN');

  /// See `profile_e2e_test.dart`: `setSession` requires a non-empty refresh
  /// token and never uses it when the access token is unexpired. Naming it in
  /// full means a leaked build carries a sentence rather than an opaque string.
  const String noRefreshToken = 'no-refresh-token-is-compiled-into-this-build';

  testWidgets(
    'criterion 1, 3, 25, 41, 42 — an owner creates a business and the app '
    'carries them past the setup screen on their own credential',
    (WidgetTester tester) async {
      expect(
        config.missingKeys(),
        isEmpty,
        reason:
            'build-time configuration is missing — pass it with '
            '--dart-define-from-file, never --dart-define for the credential',
      );
      expect(
        accessToken,
        isNotEmpty,
        reason:
            'E2E_ACCESS_TOKEN must come from the defines file. The password is '
            'deliberately not among them: CI performs the grant so it never '
            'reaches a build artefact (K78).',
      );

      // ── 1. A real session, from a token CI minted ───────────────────────
      await Supabase.initialize(
        url: config.supabaseUrl,
        publishableKey: config.supabaseAnonKey,
        authOptions: FlutterAuthClientOptions(
          localStorage: SecureSessionStore(),
        ),
      );
      final SupabaseClient supabase = Supabase.instance.client;

      final AuthResponse auth = await supabase.auth.setSession(
        noRefreshToken,
        accessToken: accessToken,
      );
      final Session? session = auth.session;
      expect(
        session,
        isNotNull,
        reason:
            'the token CI minted did not produce a session — see '
            'profile_e2e_test.dart for the likely causes, in order',
      );

      final String token = session!.accessToken;

      // ── 0. THE CLEAN SLATE IS ASSERTED, NOT ASSUMED ─────────────────────
      //
      // CI's cleanup step ran before this build. If it silently did nothing,
      // this account still has a business, the redirect sends us to /home, and
      // every assertion below would be about the wrong journey. A 404 here is
      // the ordinary "no business yet" answer (§B.7) and the precondition.
      final int? existing = await _businessStatus(
        baseUrl: config.apiBaseUrl,
        accessToken: token,
      );
      expect(
        existing,
        404,
        reason:
            'this account already has a business, so the cleanup step did not '
            'run or did not match. Creation succeeds exactly once per account '
            '(uq_memberships_one_owner_per_user), so without a clean slate '
            'this test would assert the 409 conflict path under a name that '
            'says it asserts creation.',
      );

      // ── 2. A name that exists nowhere before this moment ────────────────
      final String businessName =
          'E2E Salon '
          '${DateTime.now().microsecondsSinceEpoch}'
          '-${Random().nextInt(1 << 32)}';

      // ── 3. The real app, with the REAL membership repository ────────────
      //
      // Only two overrides, and neither touches the data or the membership
      // answer: configuration, and the auth gateway holding the session
      // installed above. See the header for why the third override
      // `profile_e2e_test.dart` needs is absent here.
      await tester.pumpWidget(
        ProviderScope(
          overrides: <Override>[
            appConfigProvider.overrideWithValue(config),
            authGatewayProvider.overrideWithValue(
              SupabaseAuthGateway(supabase),
            ),
          ],
          child: const BookflowApp(),
        ),
      );

      // ── 4. The redirect puts an owner with no business on screen #5 ─────
      await _pumpUntil(
        tester,
        find.byKey(const Key('create-business-name')),
        because:
            'screen #5 never appeared. The membership status is read from '
            'GET /v1/me/business by ApiMembershipRepository; if that call '
            'failed the redirect would send us to /unavailable instead.',
      );

      // ── 5. Type it and submit — the click the manual asks for ───────────
      await tester.enterText(
        find.byKey(const Key('create-business-name')),
        businessName,
      );
      await tester.pump();
      await tester.tap(find.byKey(const Key('create-business-submit')));

      // ── 6. CRITERION 25 AND 41 — off /setup, because the API says so ────
      //
      // The setup-continuation heading is screen #12's. Reaching it means the
      // membership status changed from `none` to `member`, and with no override
      // that answer can only have come from GET /v1/me/business.
      await _pumpUntil(
        tester,
        find.byKey(const Key('setup-continuation')),
        because:
            'the owner never left /setup. Either POST /v1/businesses failed, or '
            'the membership status did not change — criteria 25 and 41 are '
            'exactly this transition.',
      );
      expect(find.byKey(const Key('create-business-name')), findsNothing);

      // ── 7. CRITERION 1 AND 3 — read back over an independent path ───────
      //
      // A separate Dio, not the app's generated client and not through any
      // provider. The name it returns must be the name typed into the widget.
      final String? stored = await _storedBusinessName(
        baseUrl: config.apiBaseUrl,
        accessToken: token,
      );
      expect(
        stored,
        businessName,
        reason:
            'the business readable over a second connection is not the one '
            'typed into screen #5 — criteria 1 and 3',
      );

      // ── 8. CRITERION 42 — the status survives a restart ─────────────────
      //
      // A fresh widget tree on the same session: every provider is rebuilt, so
      // nothing carries over in memory. The owner must land on the dashboard,
      // which means the status was fetched again rather than remembered.
      await tester.pumpWidget(
        ProviderScope(
          overrides: <Override>[
            appConfigProvider.overrideWithValue(config),
            authGatewayProvider.overrideWithValue(
              SupabaseAuthGateway(supabase),
            ),
          ],
          child: const BookflowApp(),
        ),
      );
      await _pumpUntil(
        tester,
        find.byKey(const Key('setup-continuation')),
        because:
            'after a restart the owner was not recognised as having a business '
            '— criterion 42. A pass here that came from memory rather than the '
            'API would be the regression this criterion exists to catch.',
      );
      expect(find.byKey(const Key('create-business-name')), findsNothing);

      // ── 9. Revoke the session, killing the compiled token ───────────────
      await supabase.auth.signOut();
    },
    timeout: const Timeout(Duration(minutes: 5)),
  );
}

/// The status code of `GET /v1/me/business`, over a bare client.
///
/// 404 is a data answer, not a failure (§B.7) — it means the account has no
/// business yet, which is this test's precondition.
Future<int?> _businessStatus({
  required String baseUrl,
  required String accessToken,
}) async {
  final Dio dio = _bareClient(baseUrl);
  try {
    final Response<Map<String, dynamic>> response = await dio
        .get<Map<String, dynamic>>(
          '/v1/me/business',
          options: Options(
            headers: <String, String>{'authorization': 'Bearer $accessToken'},
            validateStatus: (int? status) => true,
          ),
        );
    return response.statusCode;
  } finally {
    dio.close();
  }
}

/// The stored name of the caller's business, or null if there is none.
Future<String?> _storedBusinessName({
  required String baseUrl,
  required String accessToken,
}) async {
  final Dio dio = _bareClient(baseUrl);
  try {
    final Response<Map<String, dynamic>> response = await dio
        .get<Map<String, dynamic>>(
          '/v1/me/business',
          options: Options(
            headers: <String, String>{'authorization': 'Bearer $accessToken'},
          ),
        );
    return response.data?['name'] as String?;
  } finally {
    dio.close();
  }
}

/// Shares nothing with the app's graph. The timeouts are the cold-start
/// allowance the free Render instance needs, as in `profile_e2e_test.dart`.
Dio _bareClient(String baseUrl) => Dio(
  BaseOptions(
    baseUrl: baseUrl,
    connectTimeout: const Duration(seconds: 120),
    receiveTimeout: const Duration(seconds: 120),
  ),
);

/// Pumps until [finder] matches, or fails saying what it was waiting for.
Future<void> _pumpUntil(
  WidgetTester tester,
  Finder finder, {
  required String because,
  Duration timeout = const Duration(seconds: 90),
}) async {
  final DateTime deadline = DateTime.now().add(timeout);

  while (DateTime.now().isBefore(deadline)) {
    await tester.pump(const Duration(milliseconds: 250));
    if (finder.evaluate().isNotEmpty) return;
  }

  fail(
    '$because — timed out after ${timeout.inSeconds}s. This is the layer that '
    'cannot tell code from deploy (ADR-033): check the staging deploy and '
    'scripts/smoke-staging.mjs before suspecting this diff.',
  );
}
