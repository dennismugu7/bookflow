/// ══ PHASE 3'S CRITICAL JOURNEY ══════════════════════════════════════════════
///
/// **A session is injected, and screen #20 renders real data fetched from
/// deployed staging** (ADR-033's 2026-08-15 amendment).
///
/// This is the only test in the project that satisfies `DEFINITION_OF_DONE.md`'s
/// e2e item. ADR-033's exclusivity clause is unchanged: `integration_test`
/// driving a real build, and nothing else. `scripts/smoke-staging.mjs` is an
/// API-level smoke test and does not tick this box.
///
/// ── WHAT IT EXERCISES, AND WHY THOSE LAYERS ────────────────────────────────
///
/// ADR-033 chose `integration_test` over an API-level harness for four named
/// layers. All four are live here, none stubbed:
///
///   deployed API  → the real Render service over the public internet
///   generated client → `package:bookflow_api`, the dart-dio output (ADR-025)
///   Riverpod graph → the real `providers.dart`, built by the real app
///   router        → `go_router` and the auth-aware redirect (ADR-028)
///
/// ── WHAT IT GIVES UP, STATED HERE TOO ──────────────────────────────────────
///
/// It does **not** prove a new owner can get in. Sign-up, verification and login
/// are not exercised: staging's sender reaches exactly one inbox (E14), so no
/// automated run can receive a verification mail, and there are no sign-up or
/// login screens yet to drive. The full journey belongs to the slice that builds
/// them. This gate is a floor, not a substitute.
///
/// ── THE TWO OVERRIDES, AND WHY EACH IS HONEST ──────────────────────────────
///
/// **1. The session is injected, not typed.** There is no login screen to drive,
/// so the test signs in through `supabase_flutter` directly — a real password
/// grant against staging GoTrue, producing a real ES256 access token (ADR-017).
/// What is skipped is a screen that does not exist, not a layer that does.
///
/// **2. `membershipRepositoryProvider` is overridden to `member`.** Without it
/// the redirect sends every signed-in user to `/setup` and screen #20 never
/// builds. That is correct production behaviour today, not a bug:
/// `NoBusinessYetMembershipRepository` is a documented constant because
/// **`apps/api` has no endpoint that answers "does this user have a business"**
/// and business creation does not exist. The override supplies the one answer no
/// data source can yet give. **It does not touch the data under test** — the
/// profile still comes from `GET /v1/me` on deployed staging, over the wire.
///
/// ── HOW IT KNOWS THE DATA IS REAL AND NOT A FIXTURE ────────────────────────
///
/// This is the assertion that matters, so the mechanism is spelled out.
///
/// **The expected strings are nowhere in this repository.** They are not in this
/// file, not in the app, not in a fixture, and not in the CI workflow. They live
/// in exactly two places: staging's `user_profiles` row, and whatever this test
/// fetches at run time.
///
/// **The test fetches them itself, over a second connection it opens.** Before
/// the app is built, it calls `GET /v1/me` on deployed staging with a plain Dio
/// client — not the generated client, not through any provider, not sharing a
/// single object with the app's graph. Those values become the expectation.
///
/// So the test cannot pass unless **two independent paths to deployed staging
/// agree on a value neither the test nor the app knew beforehand**. A hardcoded
/// constant in the app would have to coincidentally equal a string containing a
/// random token generated when the account was provisioned. The account's last
/// name carries that token precisely so this argument holds
/// (`docs/ENVIRONMENT.md` §3).
///
/// **This is checkable, not merely asserted:** grep the repository for the
/// rendered surname. Zero hits is the property. If a future change hardcodes an
/// expectation here, that grep starts returning one, and this comment becomes
/// false in a visible way.
///
/// ── WHAT WOULD MAKE IT PASS DISHONESTLY, AND WHAT PREVENTS THAT ────────────
///
/// The one hole a differential check cannot close by itself: if the screen
/// stopped reading the fetched field and rendered something else that happened
/// to match, both paths would still agree. That is why PR 4c's red proof breaks
/// **a field the screen actually reads** — `firstName` in `ApiProfileRepository`
/// — rather than the base URL. Pointing the client at a dead host proves only
/// that the test can fail. See `docs/analysis/09-phase3-close.md` §7.
///
/// ── CREDENTIALS ────────────────────────────────────────────────────────────
///
/// Supplied by `--dart-define-from-file`, whose contents CI writes from Actions
/// secrets. **Never a process argument** — `--dart-define=PASSWORD=…` would put
/// the value in the command line of every `flutter` and `gradle` child process
/// and into any log that echoes a command. The file is written from the job's
/// environment and removed in the same step.
library;

import 'package:bookflow/app.dart';
import 'package:bookflow/features/membership/membership_repository.dart';
import 'package:bookflow/platform/auth_gateway.dart';
import 'package:bookflow/platform/config.dart';
import 'package:bookflow/platform/providers.dart';
import 'package:bookflow/platform/secure_session_store.dart';
import 'package:dio/dio.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:integration_test/integration_test.dart';
import 'package:supabase_flutter/supabase_flutter.dart';

/// What the deployed API says this account's profile is, right now.
///
/// Deliberately a bare record read over a bare Dio client: the point is that
/// this path shares nothing with the app's graph but the token.
typedef LiveProfile = ({String id, String firstName, String lastName});

void main() {
  IntegrationTestWidgetsFlutterBinding.ensureInitialized();

  const AppConfig config = AppConfig(
    supabaseUrl: String.fromEnvironment('SUPABASE_URL'),
    supabaseAnonKey: String.fromEnvironment('SUPABASE_ANON_KEY'),
    apiBaseUrl: String.fromEnvironment('API_BASE_URL'),
  );
  const String email = String.fromEnvironment('E2E_EMAIL');
  const String password = String.fromEnvironment('E2E_PASSWORD');

  testWidgets(
    'screen #20 renders the profile that deployed staging holds for this session',
    (WidgetTester tester) async {
      // ── 0. Configuration, failing with a sentence rather than an empty string
      expect(
        config.missingKeys(),
        isEmpty,
        reason:
            'build-time configuration is missing — pass it with '
            '--dart-define-from-file, never --dart-define for the credential',
      );
      expect(
        <String>[email, password],
        everyElement(isNotEmpty),
        reason: 'E2E_EMAIL and E2E_PASSWORD must come from the defines file',
      );

      // ── 1. A real session, from real staging GoTrue ─────────────────────
      await Supabase.initialize(
        url: config.supabaseUrl,
        publishableKey: config.supabaseAnonKey,
        authOptions: FlutterAuthClientOptions(
          localStorage: SecureSessionStore(),
        ),
      );
      final SupabaseClient supabase = Supabase.instance.client;

      final AuthResponse auth = await supabase.auth.signInWithPassword(
        email: email,
        password: password,
      );
      final Session? session = auth.session;
      expect(
        session,
        isNotNull,
        reason:
            'the staging e2e account could not sign in. It is created CONFIRMED '
            'through the admin path precisely so this cannot be an unverified-email '
            'failure (docs/ENVIRONMENT.md §3). If the password is wrong, rotate it — '
            'the secret cannot be read back by design.',
      );

      // ── 2. The expectation, fetched independently ───────────────────────
      //
      // A separate Dio, a separate connection, no provider, no generated client.
      // This is the whole basis of the not-a-fixture claim above.
      final LiveProfile expected = await _fetchProfileDirectly(
        baseUrl: config.apiBaseUrl,
        accessToken: session!.accessToken,
      );

      // The values must be real ones, not empty strings that would make the
      // comparison below vacuous — `find.text('')` finding nothing would fail,
      // but an empty expectation deserves its own message.
      expect(expected.firstName, isNotEmpty);
      expect(expected.lastName, isNotEmpty);

      // ── 3. The real app, over the real graph ────────────────────────────
      await tester.pumpWidget(
        ProviderScope(
          overrides: <Override>[
            appConfigProvider.overrideWithValue(config),
            authGatewayProvider.overrideWithValue(
              SupabaseAuthGateway(supabase),
            ),
            // See the header: supplies the only answer no data source can give
            // yet. Everything asserted below still comes over the wire.
            membershipRepositoryProvider.overrideWithValue(
              const _MemberOfSomeBusiness(),
            ),
          ],
          child: const BookflowApp(),
        ),
      );

      // ── 4. The journey completes ────────────────────────────────────────
      //
      // `pumpAndSettle` is wrong here: this frame graph is waiting on real
      // network, and settle would either return before the request lands or
      // throw on a timeout that says nothing useful. Polling reports what it was
      // waiting for.
      await _pumpUntil(
        tester,
        find.text(expected.firstName),
        because: 'screen #20 never rendered the first name from GET /v1/me',
      );

      // ── 5. What is on screen is what staging holds ──────────────────────
      expect(find.text('My profile'), findsOneWidget);
      expect(find.text(expected.firstName), findsWidgets);
      expect(find.text(expected.lastName), findsWidgets);
      expect(
        find.text('${expected.firstName} ${expected.lastName}'),
        findsOneWidget,
      );

      // The email comes from the SESSION, not from GET /v1/me — `user_profiles`
      // deliberately does not mirror it (ADR-027), so this asserts a second,
      // different source reached the same screen.
      expect(find.text(email), findsOneWidget);

      // Initials are derived client-side from the fetched names (ADR-028: what
      // logic the client has is derivation). Asserting them proves the screen
      // computed from live data rather than displaying a string it was handed.
      final String initials =
          '${expected.firstName[0].toUpperCase()}${expected.lastName[0].toUpperCase()}';
      expect(find.text(initials), findsOneWidget);

      // ── 6. Leave staging as it was found ────────────────────────────────
      //
      // The account is permanent and shared (docs/ENVIRONMENT.md §3); the
      // SESSION is not. Signing out revokes the refresh token (ADR-017) so a
      // failed run does not leave a live one behind on the emulator image.
      await supabase.auth.signOut();
    },
    timeout: const Timeout(Duration(minutes: 4)),
  );
}

/// `GET /v1/me` over a client that shares nothing with the app.
Future<LiveProfile> _fetchProfileDirectly({
  required String baseUrl,
  required String accessToken,
}) async {
  final Dio dio = Dio(
    BaseOptions(
      baseUrl: baseUrl,
      // The free Render instance sleeps after 15 minutes and takes about a
      // minute to wake, so the first request of a run pays a cold start —
      // the same allowance `scripts/smoke-staging.mjs` makes, for the same
      // reason.
      connectTimeout: const Duration(seconds: 120),
      receiveTimeout: const Duration(seconds: 120),
    ),
  );

  try {
    final Response<Map<String, dynamic>> response = await dio
        .get<Map<String, dynamic>>(
          '/v1/me',
          options: Options(
            headers: <String, String>{'authorization': 'Bearer $accessToken'},
          ),
        );

    final Map<String, dynamic> body = response.data!;
    return (
      id: body['id'] as String,
      firstName: body['firstName'] as String,
      lastName: body['lastName'] as String,
    );
  } finally {
    dio.close();
  }
}

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

/// Supplies the membership answer no endpoint can give yet. See the header.
class _MemberOfSomeBusiness implements MembershipRepository {
  const _MemberOfSomeBusiness();

  @override
  Future<MembershipStatus> currentStatus() async => MembershipStatus.member;
}
