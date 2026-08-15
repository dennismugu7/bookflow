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

/// Builds the generated client against our API.
///
/// The timeouts are not defaults: Dio's are unbounded, and an app that hangs on
/// a dead network shows a spinner forever, which is the worst of the three
/// `AsyncValue` states to be stuck in.
BookflowApi createApiClient({
  required String baseUrl,
  required AccessTokenReader readToken,
  Dio? dio,
}) {
  final Dio client =
      dio ??
      Dio(
        BaseOptions(
          baseUrl: baseUrl,
          connectTimeout: const Duration(seconds: 10),
          receiveTimeout: const Duration(seconds: 20),
          // The API answers `application/problem+json` for errors (ADR-014).
          // Dio must not treat that as a transport failure before the
          // repository has had a chance to read the problem document.
          validateStatus: (int? status) => status != null && status < 500,
        ),
      );

  client.interceptors.add(AccessTokenInterceptor(readToken));

  return BookflowApi(dio: client, serializers: standardSerializers);
}
