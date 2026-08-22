import 'package:bookflow/features/auth/auth_sheet.dart';
import 'package:bookflow/platform/api_client.dart';
import 'package:bookflow/theme/app_theme.dart';
import 'package:bookflow_api/bookflow_api.dart';
import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';

/// The cold-start compensations.
///
/// ══ WHAT IS WORTH DRIVING HERE ══════════════════════════════════════════════
///
/// The staging API sleeps on Render's free plan and took a measured 23.2s to
/// wake. Three changes carry that, and two of them are only correct in ways a
/// reading cannot settle:
///
///   1. **The timeouts are actually 60s.** A number in a comment is not a
///      number in a `BaseOptions`, and this is the one that decides whether the
///      request fails at all.
///   2. **The notice appears late and leaves on time.** It must not show on an
///      ordinary fast submit — a notice that appears every time stops being
///      read — and it must not outlive the request, or it becomes a claim about
///      something that has already finished.
///
/// The warm-up is not tested: its entire contract is "does nothing observable,
/// swallows everything", so there is nothing to assert that would not be
/// asserting the absence of behaviour.
void main() {
  group('the client waits long enough for a cold start', () {
    test('both timeouts are 60 seconds', () {
      // ── NO `dio:` ARGUMENT, AND THAT IS THE POINT ─────────────────────────
      //
      // `createApiClient` applies its `BaseOptions` only when it CONSTRUCTS the
      // Dio; a caller-supplied one is taken as-is. The first draft of this test
      // passed its own and asserted null timeouts — testing the injection seam
      // rather than the production path.
      //
      // Worth knowing beyond this test: `api_client_auth_test.dart` injects a
      // Dio to stub the adapter, so those tests run with no timeouts at all.
      // Harmless there — nothing reaches a socket — and misleading if anybody
      // reads them as evidence about timeouts.
      final BookflowApi api = createApiClient(
        baseUrl: 'http://localhost',
        readToken: () => null,
        onUnauthenticated: () {},
      );

      // The measured wake was 23.2s. The old receive timeout was 20s, which is
      // why every first request after an idle period failed.
      expect(api.dio.options.connectTimeout, const Duration(seconds: 60));
      expect(api.dio.options.receiveTimeout, const Duration(seconds: 60));
      expect(
        api.dio.options.receiveTimeout!.inSeconds,
        greaterThan(24),
        reason: 'must exceed the measured 23.2s cold start with headroom',
      );
    });
  });

  group('a slow submission explains itself', () {
    Widget host({required bool inFlight}) {
      return MaterialApp(
        theme: BookflowTheme.light(),
        home: Scaffold(
          body: AuthSubmitButton(
            label: 'Continue',
            inFlight: inFlight,
            onPressed: () {},
          ),
        ),
      );
    }

    testWidgets('says nothing on an ordinary fast submit', (
      WidgetTester tester,
    ) async {
      await tester.pumpWidget(host(inFlight: false));
      await tester.pump();

      // In flight, but only briefly — the case that must stay silent.
      await tester.pumpWidget(host(inFlight: true));
      await tester.pump(const Duration(seconds: 3));

      expect(find.byKey(const Key('auth-submit-loading')), findsOneWidget);
      expect(
        find.byKey(const Key('auth-submit-slow')),
        findsNothing,
        reason: 'a notice that appears on every submit stops being read',
      );

      // Settles before the threshold. The timer must not fire afterwards.
      await tester.pumpWidget(host(inFlight: false));
      await tester.pump(const Duration(seconds: 10));

      expect(find.byKey(const Key('auth-submit-slow')), findsNothing);
    });

    testWidgets('explains the wait after about eight seconds', (
      WidgetTester tester,
    ) async {
      await tester.pumpWidget(host(inFlight: false));
      await tester.pump();
      await tester.pumpWidget(host(inFlight: true));
      await tester.pump();

      expect(find.byKey(const Key('auth-submit-slow')), findsNothing);

      await tester.pump(const Duration(seconds: 9));

      // ── THE ASSERTION THE WHOLE THING EXISTS FOR ────────────────────────
      //
      // Without this the 60-second ceiling is a 60-second silent spinner, and
      // people force-quit at about fifteen seconds — which would make the fix
      // worse than the failure it replaced.
      expect(find.byKey(const Key('auth-submit-slow')), findsOneWidget);
      expect(find.textContaining('waking up'), findsOneWidget);
    });

    testWidgets('clears the notice the moment the request settles', (
      WidgetTester tester,
    ) async {
      await tester.pumpWidget(host(inFlight: false));
      await tester.pump();
      await tester.pumpWidget(host(inFlight: true));
      await tester.pump(const Duration(seconds: 9));
      expect(find.byKey(const Key('auth-submit-slow')), findsOneWidget);

      await tester.pumpWidget(host(inFlight: false));
      await tester.pump();

      // A notice explaining a wait must not outlive the wait — otherwise it is
      // a claim about a request that has already finished.
      expect(find.byKey(const Key('auth-submit-slow')), findsNothing);
      expect(find.text('Continue'), findsOneWidget);
    });

    testWidgets('a retry gets its own eight seconds', (
      WidgetTester tester,
    ) async {
      await tester.pumpWidget(host(inFlight: false));
      await tester.pump();

      // First attempt runs long enough to show the notice, then fails.
      await tester.pumpWidget(host(inFlight: true));
      await tester.pump(const Duration(seconds: 9));
      expect(find.byKey(const Key('auth-submit-slow')), findsOneWidget);
      await tester.pumpWidget(host(inFlight: false));
      await tester.pump();

      // Second attempt starts clean rather than inheriting the first's elapsed
      // time — which would show the notice instantly on every retry.
      await tester.pumpWidget(host(inFlight: true));
      await tester.pump(const Duration(seconds: 3));
      expect(find.byKey(const Key('auth-submit-slow')), findsNothing);

      await tester.pump(const Duration(seconds: 6));
      expect(find.byKey(const Key('auth-submit-slow')), findsOneWidget);

      // Settled, so the pending timer does not outlive the test.
      await tester.pumpWidget(host(inFlight: false));
      await tester.pump();
    });
  });
}
