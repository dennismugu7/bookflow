/// ══ PHASE 3'S CRITICAL JOURNEY, NOW REACHED BY NAVIGATING ═══════════════════
///
/// **A session is injected, the owner taps their way from the dashboard to
/// screen #20, and it renders real data fetched from deployed staging**
/// (ADR-033's 2026-08-15 amendment).
///
/// This is the only test in the project that satisfies `DEFINITION_OF_DONE.md`'s
/// e2e item. ADR-033's exclusivity clause is unchanged: `integration_test`
/// driving a real build, and nothing else. `scripts/smoke-staging.mjs` is an
/// API-level smoke test and does not tick this box.
///
/// ── WHY THIS FILE CHANGED IN THE BUSINESS-SETUP SLICE ──────────────────────
///
/// **It used to land on screen #20 directly, and that stopped being true.** The
/// redirect resolved `member → /home`, and `/home` built `ProfileScreen`. Decision
/// 12 gave `/home` to the dashboard (screen #12) and moved the profile to
/// `/profile`, reachable only by tapping: **#12's avatar → #17 → Profile**.
///
/// So the old test would have waited ninety seconds for a first name on a screen
/// that renders "Bookflow" and "Finish setting up", then failed at `_pumpUntil`
/// with a message pointing at the deploy. **It was invisible to five green
/// `pull_request` runs**, because `e2e-staging` runs only on push-to-`main` or
/// `workflow_dispatch`, and `flutter test` does not include `integration_test/`.
/// The slice that moved the screen fixes the test.
///
/// ── WHAT IT EXERCISES, AND WHY THOSE LAYERS ────────────────────────────────
///
/// ADR-033 chose `integration_test` over an API-level harness for four named
/// layers. All four are live here, none stubbed:
///
///   deployed API  → the real Render service over the public internet
///   generated client → `package:bookflow_api`, the dart-dio output (ADR-025)
///   Riverpod graph → the real `providers.dart`, built by the real app
///   router        → `go_router`, the auth-aware redirect (ADR-028) **and
///                   ADR-042's push navigation**, which is new here
///
/// **The navigation is now part of what is under test, not a means to it.** The
/// test taps the avatar and the Profile row rather than deep-linking, because
/// that chain is what this slice built and a deep link would prove the screen
/// renders while saying nothing about whether an owner can reach it.
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
/// the redirect sends this account to `/setup` and neither the dashboard nor
/// screen #20 ever builds.
///
/// **The reason has changed and the override has not.** It used to be that no
/// endpoint could answer "does this user have a business". `GET /v1/me/business`
/// now does — and **this account must never have one**: K78's standing rule is
/// that the staging e2e account is never given a membership, because Phase 3's
/// gate depends on it being an owner without one. So the override supplies the
/// answer the account is forbidden from having naturally.
///
/// **It does not touch the data under test.** The profile still comes from
/// `GET /v1/me` on deployed staging, over the wire, and the navigation it makes
/// reachable is real. `business_setup_e2e_test.dart` on
/// `feat/business-setup-e2e` runs the *other* account with **no** override,
/// which is where the membership answer itself is under test.
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
/// ── CREDENTIALS: A TOKEN, NEVER THE PASSWORD ───────────────────────────────
///
/// **`--dart-define-from-file` compiles its values into the binary.** Verified,
/// not assumed: a throwaway value was built locally and recovered from
/// `kernel_blob.bin` with `grep -a`, alongside the email
/// (`docs/analysis/10-e2e-credential-in-artefact.md`). Protecting the defines
/// *file* protects the file, not the value.
///
/// So the password never reaches a build. **CI performs the password grant
/// itself**, against staging GoTrue, and passes only the resulting
/// `access_token`. What is compiled into the artefact is a bearer token that
/// **expires in one hour** (ADR-017), not a credential that works forever.
///
/// **No refresh token is compiled in either.** `setSession` requires a
/// non-empty refresh token but never uses it when the supplied access token is
/// unexpired — it calls `getUser(accessToken)` and builds the session directly.
/// So a literal placeholder is passed. That is not a trick to satisfy a
/// signature: it means this build **cannot** mint a new token, and if anything
/// ever tried to refresh, it would fail loudly rather than silently extending
/// the artefact's reach.
///
/// The token is still a real credential for up to an hour, and the file is still
/// kept out of argv and out of the workspace. What changed is the horizon.
library;

import 'package:bookflow/app.dart';
import 'package:bookflow/features/membership/membership_repository.dart';
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

  /// Minted by CI's password grant, one hour of life. See the header.
  const String accessToken = String.fromEnvironment('E2E_ACCESS_TOKEN');

  /// Deliberately not a token. `setSession` rejects an empty refresh token but
  /// never uses this one — the access token above is unexpired, so it takes the
  /// `getUser` path. Naming it in full means a leaked build carries a sentence
  /// explaining itself rather than an opaque string somebody might try.
  const String noRefreshToken = 'no-refresh-token-is-compiled-into-this-build';

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
        <String>[email, accessToken],
        everyElement(isNotEmpty),
        reason:
            'E2E_EMAIL and E2E_ACCESS_TOKEN must come from the defines file. '
            'E2E_PASSWORD is deliberately NOT among them — CI performs the '
            'grant so the password never reaches a build artefact.',
      );

      // ── 1. A real session, installed from a token CI minted ─────────────
      await Supabase.initialize(
        url: config.supabaseUrl,
        publishableKey: config.supabaseAnonKey,
        authOptions: FlutterAuthClientOptions(
          localStorage: SecureSessionStore(),
        ),
      );
      final SupabaseClient supabase = Supabase.instance.client;

      // `setSession` with an unexpired access token does NOT refresh: it calls
      // `getUser(accessToken)` against staging GoTrue and builds the session
      // from the response. So this is still a real round trip to real GoTrue
      // from the device — the token was minted elsewhere, the session is not.
      final AuthResponse auth = await supabase.auth.setSession(
        noRefreshToken,
        accessToken: accessToken,
      );
      final Session? session = auth.session;
      expect(
        session,
        isNotNull,
        reason:
            'the token CI minted did not produce a session. The likely causes, '
            'in order: the token expired between the grant and this line (it '
            'lives one hour and the build takes about ten minutes, so this '
            'means something stalled); staging GoTrue rejected it; or the '
            'account was deleted. It is NOT an unverified-email failure — the '
            'account is created confirmed (docs/ENVIRONMENT.md §3).',
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

      // ── 4. The owner lands on the DASHBOARD, not the profile ────────────
      //
      // `/home` builds screen #12 as of decision 12. Waiting for the setup
      // heading rather than for the profile is the first assertion that the
      // route move happened and that the redirect resolved `member → /home`.
      //
      // `pumpAndSettle` is wrong throughout: this frame graph is waiting on real
      // network, and settle would either return before the request lands or
      // throw on a timeout that says nothing useful. Polling reports what it was
      // waiting for.
      await _pumpUntil(
        tester,
        find.byKey(const Key('setup-continuation')),
        because:
            'the dashboard never rendered. `/home` builds screen #12 as of '
            'decision 12 — if screen #20 appeared here instead, the route move '
            'has been reverted',
      );

      // ── 5. Tap through the chain this slice built ───────────────────────
      //
      // #12's avatar pushes #17; #17's Profile row pushes #20. Tapped rather
      // than deep-linked: the navigation is what decision 12 added, and a deep
      // link would prove the screen renders while saying nothing about whether
      // an owner can reach it. This is also the only e2e coverage of ADR-042's
      // push navigation against a real build.
      await tester.tap(find.byKey(const Key('dashboard-avatar')));
      await _pumpUntil(
        tester,
        find.byKey(const Key('account-profile')),
        because:
            'screen #17 never appeared after tapping the dashboard avatar — '
            'ADR-042 level-2 push, or the avatar itself, is broken',
      );

      await tester.tap(find.byKey(const Key('account-profile')));
      await _pumpUntil(
        tester,
        find.text(expected.firstName),
        because:
            'screen #20 never rendered the first name from GET /v1/me after '
            'tapping Profile on screen #17',
      );

      // ── 6. What is on screen is what staging holds ──────────────────────
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

      // ── 7. Leave staging as it was found ────────────────────────────────
      //
      // The account is permanent and shared (docs/ENVIRONMENT.md §3); the
      // SESSION is not. This does more than tidy the emulator: it revokes the
      // session server-side, which kills the token compiled into THIS build —
      // so the artefact's one-hour credential is usually dead in under a
      // minute. The refresh token CI holds dies with it.
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
