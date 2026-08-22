import 'package:bookflow_api/bookflow_api.dart';
import 'package:dio/dio.dart';

/// The client for **our API**, and nothing else.
///
/// See the boundary note in `auth_gateway.dart`: this never talks to GoTrue, and
/// GoTrue's client never comes here. The single crossing point is the access
/// token, attached below.
///
/// This file and the feature repositories are the only places
/// `package:bookflow_api` may be imported. ADR-028 forbids screens from
/// importing it, and `test/design_system_test.dart` enforces that by reading the
/// source tree.

/// Supplies the current access token, or null when signed out.
///
/// A function rather than a stored string, deliberately: `supabase_flutter`
/// refreshes tokens in the background, and anything holding a copy would
/// eventually attach an expired one and produce a 401 that looks like a bug in
/// authorisation rather than a stale cache.
typedef AccessTokenReader = String? Function();

/// Attaches `Authorization: Bearer …` to every outgoing request.
///
/// One interceptor, so no repository can forget. When there is no session the
/// header is omitted entirely rather than sent empty — `apps/api` answers
/// `missing-token` to a request with no header and `invalid-token` to one with a
/// malformed value, and the first is the truthful description of being signed
/// out.
class AccessTokenInterceptor extends Interceptor {
  AccessTokenInterceptor(this._readToken);

  final AccessTokenReader _readToken;

  @override
  void onRequest(RequestOptions options, RequestInterceptorHandler handler) {
    final String? token = _readToken();
    if (token != null && token.isNotEmpty) {
      options.headers['authorization'] = 'Bearer $token';
    }
    handler.next(options);
  }
}

/// Called when the API says the session is unusable. See the interceptor below.
typedef UnauthenticatedHandler = void Function();

/// Ends the session when our API answers **401**.
///
/// ══ WHY AN UNCONDITIONAL SIGN-OUT IS SAFE HERE ══════════════════════════════
///
/// "Sign the user out on any 401" is a dangerous rule in general, because in
/// most APIs a 401 can also mean "not this resource, for you" — and signing
/// someone out because they touched something that was not theirs is a bug that
/// looks like a session problem.
///
/// **It is safe against this API, because of a decision made one layer over.**
/// `apps/api` emits exactly three 401 slugs — `missing-token`, `invalid-token`
/// and `expired-token` (`platform/problem.ts`) — and all three mean the same
/// thing: the credential presented cannot be used. "Not yours" is **not** among
/// them. PR 2b made not-yours and does-not-exist **byte-identical 404s** so the
/// endpoint could not be used as an existence oracle, and that choice is what
/// leaves 401 meaning only one thing here.
///
/// **THIS STOPS BEING SAFE THE DAY A 401 MEANS ANYTHING ELSE.** If someone adds
/// a fourth 401 slug to `PROBLEM_TYPES` that does not mean "your session is
/// unusable" — an authorisation failure, a step-up-auth challenge, a per-
/// resource denial — they are changing this client's behaviour from here, and
/// they will not see this file while doing it. That is the trade for keeping
/// the check on the status code rather than parsing a slug out of every error
/// body: it is simpler and it is coupled to a contract, and the coupling is
/// written down rather than assumed.
///
/// Signing out is all this does. The router's redirect already routes a
/// signed-out session to the welcome shell (`platform/router.dart`), so there
/// is no navigation here and no screen has to know.
class UnauthenticatedInterceptor extends Interceptor {
  UnauthenticatedInterceptor(this._onUnauthenticated);

  final UnauthenticatedHandler _onUnauthenticated;

  @override
  void onError(DioException err, ErrorInterceptorHandler handler) {
    if (err.response?.statusCode == 401) {
      _onUnauthenticated();
    }
    // Passed on regardless: the caller still gets its error, and the repository
    // still decides what the screen shows. This interceptor observes; it does
    // not swallow.
    handler.next(err);
  }
}

/// Builds the generated client against our API.
///
/// The timeouts are not defaults: Dio's are unbounded, and an app that hangs on
/// a dead network shows a spinner forever, which is the worst of the three
/// `AsyncValue` states to be stuck in.
///
/// ══ 60 SECONDS, AND THE NUMBER CAME FROM A MEASUREMENT ══════════════════════
///
/// They were 10s connect and 20s receive, which are sensible figures for a
/// server that is awake. **The staging API is on Render's free plan and sleeps
/// after inactivity**: a device test measured `GET /health` returning HTTP 200
/// in **23.2 seconds** from cold.
///
/// So the old receive timeout abandoned the request while the server was still
/// booting. Every first sign-up after an idle period failed — and failed as the
/// UNCLASSIFIED error, "Something went wrong. Check your connection and try
/// again", because the client genuinely could not tell a cold start from a dead
/// network. The string was not wrong; the app was unusable.
///
/// 60s is roughly 2.5× the measured wake with headroom for a slow mobile
/// connection on top. It is deliberately generous rather than tight to the
/// measurement: a cold start that takes 30s on a bad day must not fail, and the
/// cost of the higher ceiling is bounded by the two things below.
///
/// ── WHAT MAKES A 60-SECOND CEILING TOLERABLE ───────────────────────────────
///
/// On its own it would be worse than the bug: a minute of silent spinner reads
/// as a hang, and a user force-quits at fifteen seconds. Two other changes carry
/// it:
///
///   * `warmup.dart` fires `GET /health` at launch, so the wake overlaps with
///     the welcome screen rather than with somebody's first submit.
///   * The auth sheets say so after ~8 seconds — see `PendingNotice`.
///
/// **This is a compensating control for a platform choice, not a fix.** A paid
/// Render instance does not sleep and these could go back to 10/20;
/// `docs/ENVIRONMENT.md` records that.
///
/// ── GOTRUE IS UNAFFECTED AND MUST NOT BE CHANGED ───────────────────────────
///
/// Supabase Auth is a hosted service that does not sleep. Login, verification
/// and password reset go through `supabase_flutter`'s own client, never this
/// one, and none of them was ever slow. Only calls to OUR API are.
///
/// **`validateStatus` is left at Dio's default (2xx only), deliberately.** An
/// earlier version accepted everything below 500 so that a repository could read
/// the RFC 9457 problem document off a normal response. That was wrong twice
/// over: the generated client would try to deserialise a problem document into
/// the endpoint's success model and fail with a `built_value` error rather than
/// a status, and — because a 401 was not an error — no error interceptor could
/// ever see one. Non-2xx now raises a `DioException` carrying the response, so
/// the problem document is still readable at `e.response?.data` and 401 is
/// observable.
BookflowApi createApiClient({
  required String baseUrl,
  required AccessTokenReader readToken,
  required UnauthenticatedHandler onUnauthenticated,
  Dio? dio,
}) {
  final Dio client =
      dio ??
      Dio(
        BaseOptions(
          baseUrl: baseUrl,
          // Both 60s. See the measured cold start above before lowering either.
          connectTimeout: const Duration(seconds: 60),
          receiveTimeout: const Duration(seconds: 60),
        ),
      );

  client.interceptors.addAll(<Interceptor>[
    AccessTokenInterceptor(readToken),
    UnauthenticatedInterceptor(onUnauthenticated),
  ]);

  return BookflowApi(dio: client, serializers: standardSerializers);
}
