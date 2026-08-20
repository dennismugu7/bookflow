import 'dart:async';
import 'dart:convert';

import 'package:bookflow/app.dart';
import 'package:bookflow/features/membership/membership_repository.dart';
import 'package:bookflow/features/profile/profile_models.dart';
import 'package:bookflow/features/profile/profile_providers.dart';
import 'package:bookflow/features/profile/profile_repository.dart';
import 'package:bookflow/features/profile/profile_screen.dart';
import 'package:bookflow/platform/api_client.dart';
import 'package:bookflow/platform/auth_gateway.dart';
import 'package:bookflow/platform/config.dart';
import 'package:bookflow/platform/providers.dart';
import 'package:bookflow/theme/app_theme.dart';
import 'package:bookflow/theme/tokens.dart';
import 'package:bookflow/ui/async_value_view.dart';
import 'package:dio/dio.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';

/// Screen #20 — every `AsyncValue` state, and the 401 path end to end.
void main() {
  Widget screenWith(List<Override> overrides) {
    return ProviderScope(
      overrides: <Override>[
        authGatewayProvider.overrideWithValue(_FakeAuthGateway()),
        ...overrides,
      ],
      child: MaterialApp(
        theme: BookflowTheme.light(),
        home: const ProfileScreen(),
      ),
    );
  }

  const OwnerProfile ada = OwnerProfile(
    id: '00000000-0000-4000-8000-000000000001',
    firstName: 'Ada',
    lastName: 'Lovelace',
  );

  group('the three AsyncValue states', () {
    testWidgets('loading renders the shared spinner, not its own', (
      WidgetTester tester,
    ) async {
      final Completer<OwnerProfile> pending = Completer<OwnerProfile>();
      await tester.pumpWidget(
        screenWith(<Override>[
          profileRepositoryProvider.overrideWithValue(
            _StubRepository(future: pending.future),
          ),
        ]),
      );
      await tester.pump();

      // The one spinner in the app (ADR-028, ui/async_value_view.dart).
      expect(find.byType(LoadingView), findsOneWidget);
      expect(find.byType(CircularProgressIndicator), findsOneWidget);

      pending.complete(ada);
      await tester.pumpAndSettle();
    });

    testWidgets('error renders the shared error view with a retry', (
      WidgetTester tester,
    ) async {
      await tester.pumpWidget(
        screenWith(<Override>[
          profileRepositoryProvider.overrideWithValue(
            _StubRepository(error: StateError('the API is unreachable')),
          ),
        ]),
      );
      await tester.pumpAndSettle();

      expect(find.byType(ErrorView), findsOneWidget);
      expect(find.text('Something went wrong.'), findsOneWidget);
      expect(find.text('Try again'), findsOneWidget);

      // The exception itself is never rendered: it is a DioException or a stack
      // trace, and neither belongs in front of a salon owner.
      expect(find.textContaining('unreachable'), findsNothing);
    });

    testWidgets('data renders the card from a real response shape', (
      WidgetTester tester,
    ) async {
      // Driven through the REAL repository against the REAL generated client,
      // with only the HTTP adapter stubbed — so the bytes `apps/api` returns for
      // GET /v1/me are deserialised by the generated model, not hand-built.
      final Dio dio = Dio(BaseOptions(baseUrl: 'http://localhost:3000'));
      dio.httpClientAdapter = _StubAdapter(
        statusCode: 200,
        body: jsonEncode(<String, dynamic>{
          'id': '00000000-0000-4000-8000-000000000001',
          'firstName': 'Dennis',
          'lastName': 'Mugu',
          'avatarPath': null,
        }),
      );

      await tester.pumpWidget(
        screenWith(<Override>[
          appConfigProvider.overrideWithValue(_config),
          apiClientProviderOverride(dio),
        ]),
      );
      await tester.pumpAndSettle();

      expect(find.text('Dennis Mugu'), findsOneWidget);
      expect(find.text('First name'), findsOneWidget);
      expect(find.text('Dennis'), findsOneWidget);
      expect(find.text('Last name'), findsOneWidget);
      expect(find.text('Mugu'), findsOneWidget);
      expect(find.text('Email'), findsOneWidget);
      expect(find.text('owner@bookflow.test'), findsOneWidget);

      // Generation A, not the screenshot: TWO UPPERCASE initials on a green
      // circle (ADR-039, Styles-Reference §7). `native-20` shows one lowercase
      // letter on pink.
      expect(find.text('DM'), findsOneWidget);
      final Container avatar = tester.widget<Container>(
        find
            .ancestor(of: find.text('DM'), matching: find.byType(Container))
            .first,
      );
      expect(
        (avatar.decoration! as BoxDecoration).color,
        BookflowColors.avatarGreen,
      );
    });
  });

  testWidgets('no Edit affordance is rendered', (WidgetTester tester) async {
    // Deliberate: there is no PATCH /v1/me. A visible control that does nothing
    // is a promise the app does not keep, so it is absent until the
    // profile-editing slice builds it.
    await tester.pumpWidget(
      screenWith(<Override>[
        profileRepositoryProvider.overrideWithValue(
          const _StubRepository(value: ada),
        ),
      ]),
    );
    await tester.pumpAndSettle();

    expect(find.text('Edit'), findsNothing);
    expect(find.byIcon(Icons.edit), findsNothing);
  });

  testWidgets('a 401 from the API ends with the user on the signed-out shell', (
    WidgetTester tester,
  ) async {
    // ── PR 3a's INTERCEPTOR, EXERCISED END TO END FOR THE FIRST TIME ─────────
    //
    // The whole chain, with only the socket replaced: the screen asks for the
    // profile → the generated client issues a real request → the adapter
    // answers 401 with an RFC 9457 problem document → the interceptor signs the
    // session out → the session stream emits → the router's redirect moves the
    // user → the welcome shell renders.
    //
    // Nothing in the middle is stubbed, which is the point. Until now the
    // interceptor was tested in isolation and the redirect was tested in
    // isolation, and nothing proved they were connected.
    final _FakeAuthGateway gateway = _FakeAuthGateway();
    final Dio dio = Dio(BaseOptions(baseUrl: 'http://localhost:3000'));
    dio.httpClientAdapter = _StubAdapter(
      statusCode: 401,
      body: jsonEncode(<String, dynamic>{
        'type': '/problems/expired-token',
        'title': 'Session expired',
        'status': 401,
      }),
    );

    await tester.pumpWidget(
      ProviderScope(
        overrides: <Override>[
          appConfigProvider.overrideWithValue(_config),
          authGatewayProvider.overrideWithValue(gateway),
          membershipRepositoryProvider.overrideWithValue(
            const _MemberRepository(),
          ),
          apiClientProviderOverride(dio),
        ],
        // The whole app, so the router is real.
        child: const BookflowApp(),
      ),
    );
    await tester.pumpAndSettle();

    expect(
      gateway.signOutCount,
      greaterThan(0),
      reason: 'the 401 interceptor must have ended the session',
    );
    expect(find.text('Create for free'), findsOneWidget);
    expect(find.text('My profile'), findsNothing);
  });
}

const AppConfig _config = AppConfig(
  supabaseUrl: 'http://localhost:54321',
  supabaseAnonKey: 'anon',
  apiBaseUrl: 'http://localhost:3000',
);

/// Rebuilds the client over a stubbed transport, keeping BOTH real interceptors
/// in the path — the token attach and the 401 sign-out.
///
/// This repeats the wiring in `platform/providers.dart` rather than reusing the
/// provider, because the provider builds its own `Dio` and there is no seam to
/// hand it one. The consequence is stated plainly: **these tests do not cover
/// providers.dart's wiring**; `api_client_auth_test.dart` does, by driving the
/// real provider and swapping the adapter afterwards. What these cover is
/// everything downstream of it.
Override apiClientProviderOverride(Dio dio) {
  return apiClientProvider.overrideWith((Ref ref) {
    final AuthGateway gateway = ref.watch(authGatewayProvider);
    return createApiClient(
      baseUrl: _config.apiBaseUrl,
      readToken: gateway.currentAccessToken,
      onUnauthenticated: () => unawaited(gateway.signOut()),
      dio: dio,
    );
  });
}

class _StubRepository implements ProfileRepository {
  const _StubRepository({this.value, this.error, this.future});

  final OwnerProfile? value;
  final Object? error;
  final Future<OwnerProfile>? future;

  @override
  Future<OwnerProfile> fetchMine() {
    final Future<OwnerProfile>? pending = future;
    if (pending != null) return pending;
    final Object? failure = error;
    if (failure != null) return Future<OwnerProfile>.error(failure);
    return Future<OwnerProfile>.value(value);
  }
}

class _MemberRepository implements MembershipRepository {
  const _MemberRepository();

  @override
  Future<MembershipStatus> currentStatus() async => MembershipStatus.member;
}

class _FakeAuthGateway implements AuthGateway {
  int signOutCount = 0;

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
  SessionStatus status = SessionStatus.signedIn;

  final StreamController<SessionStatus> _controller =
      StreamController<SessionStatus>.broadcast();

  @override
  String? currentAccessToken() =>
      status == SessionStatus.signedIn ? 'fake-token' : null;

  @override
  String? currentEmail() =>
      status == SessionStatus.signedIn ? 'owner@bookflow.test' : null;

  @override
  Stream<SessionStatus> statusChanges() => _controller.stream;

  @override
  Future<void> signOut() async {
    signOutCount += 1;
    status = SessionStatus.signedOut;
    _controller.add(SessionStatus.signedOut);
  }
}

class _StubAdapter implements HttpClientAdapter {
  _StubAdapter({required this.statusCode, required this.body});

  final int statusCode;
  final String body;

  @override
  Future<ResponseBody> fetch(
    RequestOptions options,
    Stream<List<int>>? requestStream,
    Future<void>? cancelFuture,
  ) async {
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
