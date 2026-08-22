import 'dart:async';

import 'package:bookflow/platform/config.dart';
import 'package:dio/dio.dart';

/// Wakes the API, and does not care whether it worked.
///
/// ══ WHY THIS EXISTS: THE FREE PLAN SLEEPS ═══════════════════════════════════
///
/// The staging API is on Render's free instance type, which sleeps after
/// inactivity. A device test measured `GET /health` returning 200 in **23.2
/// seconds** from cold.
///
/// `api_client.dart` now allows 60 seconds for that, which stops the request
/// failing — but it does not stop it being slow, and where the wait LANDS is
/// what the user experiences. Without this, it lands on their first submit:
/// they fill in a sign-up form, press the button, and wait most of a minute.
///
/// **Fired at launch, that same wake overlaps with them reading the welcome
/// screen.** By the time they have typed an email and a password the service is
/// usually already up, and the submit is fast. Nothing is guaranteed — they may
/// be quick, or the wake may be slower than usual — which is why the 60-second
/// ceiling and the "still working" notice both stay.
///
/// ══ FIRE AND FORGET, LITERALLY ══════════════════════════════════════════════
///
/// The result is discarded and every failure is swallowed. That is the whole
/// contract, and each half matters:
///
///   * **Nothing waits for it.** `main` does not await it and the router does
///     not gate on it. A warm-up that could delay the first frame would be a
///     worse bug than the one it fixes.
///   * **A failure means nothing.** No network at the airport, a DNS miss, the
///     service genuinely down — none of it is information the app can act on at
///     launch, and all of it will be discovered properly by the first real
///     request, which has a screen to report it on.
///
/// ── ITS OWN DIO, NOT THE GENERATED CLIENT ──────────────────────────────────
///
/// `/health` is outside the versioned surface (the ADR-014 amendment puts
/// probes there), so the generated client has no method for it. A bare `Dio`
/// also keeps this off the interceptor chain — the 401 interceptor ends the
/// session, and a warm-up must never be able to sign somebody out.
///
/// **This does not touch GoTrue.** Supabase Auth is a hosted service that does
/// not sleep; only our own API does.
Future<void> warmUpApi(AppConfig config) async {
  final Dio dio = Dio(
    BaseOptions(
      baseUrl: config.apiBaseUrl,
      // The same 60 seconds the real client allows. A shorter timeout here
      // would abandon the wake part-way — which does not cancel it server-side,
      // but does mean this returns before the service is up and the log line
      // says "failed" for a wake that succeeded.
      connectTimeout: const Duration(seconds: 60),
      receiveTimeout: const Duration(seconds: 60),
    ),
  );

  try {
    await dio.get<void>('/health');
  } on Object catch (_) {
    // Deliberately empty. See the contract above: there is nothing to report
    // and nobody to report it to.
  } finally {
    dio.close();
  }
}

/// Starts the warm-up without waiting for it.
///
/// A separate function so the call site in `main` reads as what it is — a
/// deliberate non-await — rather than as a forgotten one. `unawaited` on its
/// own at a call site is easy to mistake for an oversight; this name is not.
void startApiWarmUp(AppConfig config) {
  unawaited(warmUpApi(config));
}
