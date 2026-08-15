import 'dart:async';
import 'dart:convert';

import 'package:bookflow/platform/auth_gateway.dart';
import 'package:bookflow/platform/config.dart';
import 'package:bookflow/platform/providers.dart';
import 'package:bookflow_api/bookflow_api.dart';
import 'package:dio/dio.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';

/// The client boundary: what gets attached going out, and what happens coming
/// back.
///
/// These drive `apiClientProvider` rather than `createApiClient` directly, on
/// purpose. Both defects these tests exist for lived in the PROVIDER — the
/// wiring between the gateway and the client — not in the interceptors, and a
/// test that constructed the client itself would have passed against both.
void main() {
  ProviderContainer containerWith(AuthGateway gateway) {
    final ProviderContainer container = ProviderContainer(
      overrides: <Override>[
        appConfigProvider.overrideWithValue(
          const AppConfig(
            supabaseUrl: 'http://localhost:54321',
            supabaseAnonKey: 'anon',
            apiBaseUrl: 'http://localhost:3000',
          ),
        ),
        authGatewayProvider.overrideWithValue(gateway),
      ],
    );
    addTearDown(container.dispose);
    return container;
  }

  group('the access token is attached', () {
    test('for a gateway that is NOT SupabaseAuthGateway', () async {
      // ── THE REGRESSION THIS FILE EXISTS FOR ────────────────────────────────
      //
      // `apiClientProvider` used to read the token through a
      // `gateway is SupabaseAuthGateway` test. Any other implementation — this
      // fake, a future one, a decorator — produced null, so every request went
      // out unauthenticated and NOTHING reported it. The API would answer
      // `missing-token` and it would present as "signed in, but nothing loads".
      //
      // `currentAccessToken()` is on the interface now, so this fake supplies a
      // token the same way the real gateway does.
      final _FakeAuthGateway gateway = _FakeAuthGateway(token: 'token-abc123');
      final ProviderContainer container = containerWith(gateway);

      final BookflowApi api = container.read(apiClientProvider);
      final _CapturingAdapter adapter = _CapturingAdapter(
        statusCode: 200,
        body: jsonEncode(<String, dynamic>{'status': 'ok'}),
      );
      api.dio.httpClientAdapter = adapter;

      await api.getHealthApi().getHealth();

      expect(
        adapter.lastHeaders['authorization'],
        'Bearer token-abc123',
        reason: 'the token must be attached whatever implements AuthGateway',
      );
    });

    test('and omitted entirely when there is no session', () async {
      // Not sent empty: `apps/api` answers `missing-token` to a request with no
      // header and `invalid-token` to one carrying a malformed value, and the
      // first is the truthful description of being signed out.
      final ProviderContainer container = containerWith(
        _FakeAuthGateway(token: null),
      );

      final BookflowApi api = container.read(apiClientProvider);
      final _CapturingAdapter adapter = _CapturingAdapter(
        statusCode: 200,
        body: jsonEncode(<String, dynamic>{'status': 'ok'}),
      );
      api.dio.httpClientAdapter = adapter;

      await api.getHealthApi().getHealth();

      expect(adapter.lastHeaders.containsKey('authorization'), isFalse);
    });

    test('freshly on every request, never captured', () async {
      // ADR-017: one-hour access tokens, refreshed in the background. A client
      // that captured the token at construction would work for an hour and then
      // fail every request — presenting as the app breaking overnight.
      final _FakeAuthGateway gateway = _FakeAuthGateway(token: 'first');
      final ProviderContainer container = containerWith(gateway);

      final BookflowApi api = container.read(apiClientProvider);
      final _CapturingAdapter adapter = _CapturingAdapter(
        statusCode: 200,
        body: jsonEncode(<String, dynamic>{'status': 'ok'}),
      );
      api.dio.httpClientAdapter = adapter;

      await api.getHealthApi().getHealth();
      expect(adapter.lastHeaders['authorization'], 'Bearer first');

      // The background refresh.
      gateway.token = 'second';

      await api.getHealthApi().getHealth();
      expect(
        adapter.lastHeaders['authorization'],
        'Bearer second',
        reason: 'the token is read per request, not held from construction',
      );
    });
  });

  group('a 401 from our API ends the session', () {
    Future<_FakeAuthGateway> requestReturning(int statusCode) async {
      final _FakeAuthGateway gateway = _FakeAuthGateway(token: 'token-abc123');
      final ProviderContainer container = containerWith(gateway);

      final BookflowApi api = container.read(apiClientProvider);
      api.dio.httpClientAdapter = _CapturingAdapter(
        statusCode: statusCode,
        // What apps/api actually returns: an RFC 9457 problem document.
        body: jsonEncode(<String, dynamic>{
          'type': '/problems/expired-token',
          'title': 'Session expired',
          'status': statusCode,
        }),
      );

      try {
        await api.getMeApi().getMe();
      } on Object {
        // Expected for every non-2xx — `validateStatus` is Dio's default, so a
        // non-2xx raises rather than deserialising a problem document into the
        // endpoint's success model.
      }
      await pumpEventQueue();

      return gateway;
    }

    test('401 signs out', () async {
      final _FakeAuthGateway gateway = await requestReturning(401);

      expect(
        gateway.signOutCount,
        1,
        reason:
            'every 401 this API emits — missing-token, invalid-token, '
            'expired-token — means the session is unusable',
      );
      expect(gateway.status, SessionStatus.signedOut);
    });

    test('404 does NOT sign out', () async {
      // The case that makes an unconditional sign-out safe: PR 2b made
      // "not yours" and "does not exist" byte-identical 404s, so a resource the
      // caller may not see never arrives as a 401. If that ever changes, this
      // test still passes and the behaviour is still wrong — which is why the
      // reasoning is written in `api_client.dart` rather than only here.
      final _FakeAuthGateway gateway = await requestReturning(404);

      expect(gateway.signOutCount, 0);
      expect(gateway.status, SessionStatus.signedIn);
    });

    test('500 does NOT sign out', () async {
      // A server fault is not a session fault. Signing the user out because the
      // API had a bad minute would lose their session for someone else's bug.
      final _FakeAuthGateway gateway = await requestReturning(500);

      expect(gateway.signOutCount, 0);
      expect(gateway.status, SessionStatus.signedIn);
    });
  });
}

class _FakeAuthGateway implements AuthGateway {
  _FakeAuthGateway({required this.token});

  String? token;
  int signOutCount = 0;

  @override
  SessionStatus status = SessionStatus.signedIn;

  final StreamController<SessionStatus> _controller =
      StreamController<SessionStatus>.broadcast();

  @override
  String? currentAccessToken() => token;

  @override
  Stream<SessionStatus> statusChanges() => _controller.stream;

  @override
  Future<void> signOut() async {
    signOutCount += 1;
    status = SessionStatus.signedOut;
    token = null;
    _controller.add(SessionStatus.signedOut);
  }
}

/// Records the outgoing request and returns a canned response.
class _CapturingAdapter implements HttpClientAdapter {
  _CapturingAdapter({required this.statusCode, required this.body});

  final int statusCode;
  final String body;
  Map<String, String> lastHeaders = <String, String>{};

  @override
  Future<ResponseBody> fetch(
    RequestOptions options,
    Stream<List<int>>? requestStream,
    Future<void>? cancelFuture,
  ) async {
    lastHeaders = options.headers.map(
      (String key, dynamic value) =>
          MapEntry<String, String>(key.toLowerCase(), '$value'),
    );

    return ResponseBody.fromString(
      body,
      statusCode,
      headers: <String, List<String>>{
        Headers.contentTypeHeader: <String>[Headers.jsonContentType],
      },
    );
  }

  @override
  void close({bool force = false}) {}
}
