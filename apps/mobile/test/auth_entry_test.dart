import 'dart:convert';

import 'package:bookflow/features/auth/auth_copy.dart';
import 'package:bookflow/features/auth/auth_providers.dart';
import 'package:bookflow/features/auth/auth_repository.dart';
import 'package:bookflow/features/auth/code_entry_sheet.dart';
import 'package:bookflow/features/auth/signup_sheet.dart';
import 'package:bookflow/features/auth/verify_email_sheet.dart';
import 'package:bookflow/platform/auth_failure.dart';
import 'package:bookflow/platform/auth_gateway.dart';
import 'package:bookflow/platform/providers.dart';
import 'package:bookflow/theme/app_theme.dart';
import 'package:bookflow_api/bookflow_api.dart';
import 'package:dio/dio.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';

/// The entry flow's three pieces of logic that are not obvious by reading.
///
/// Deliberately not a test per widget: the sheets are forms, and a test that
/// types into a field and asserts the field holds it proves nothing. What is
/// worth pinning is where a wrong answer would be silent — an error mapped from
/// the wrong part of the response, a handoff that fires on failure, and a timer.
void main() {
  group('the API problem document maps by type, never by status', () {
    late Dio dio;
    late ApiAuthRepository repository;

    setUp(() {
      dio = Dio(BaseOptions(baseUrl: 'http://localhost:3000'));
      repository = ApiAuthRepository(
        BookflowApi(dio: dio, serializers: standardSerializers),
      );
    });

    Future<AuthFailureKind> signUpAgainst({
      required int statusCode,
      required String slug,
    }) async {
      dio.httpClientAdapter = _StubAdapter(
        statusCode: statusCode,
        body: jsonEncode(<String, dynamic>{
          'type': '/problems/$slug',
          'title': 'Refused',
          'status': statusCode,
        }),
      );

      try {
        await repository.signUp(
          email: 'owner@example.com',
          password: 'a-long-enough-password',
          firstName: 'Vera',
          lastName: 'Achieng',
        );
        fail('the request should not have succeeded');
      } on AuthFailure catch (failure) {
        return failure.kind;
      }
    }

    // Awaited one at a time, never with two un-awaited `expect`s in a row: the
    // helper mutates `dio.httpClientAdapter`, so two overlapping calls have the
    // second's adapter answer the first's request. That produced a green-looking
    // mismatch on the first run of this file.
    test(
      'password-rejected and validation-failed are both 400 and differ',
      () async {
        // The reason this file exists. Both arrive as 400; one means "that
        // password is in a breach corpus" and the other means "the form is
        // wrong", and a client keyed on the status shows the same sentence for
        // both while looking entirely correct.
        expect(
          await signUpAgainst(statusCode: 400, slug: 'password-rejected'),
          AuthFailureKind.passwordRejected,
        );
        expect(
          await signUpAgainst(statusCode: 400, slug: 'validation-failed'),
          AuthFailureKind.rejected,
        );
      },
    );

    test('rate-limited is carried through', () async {
      expect(
        await signUpAgainst(statusCode: 429, slug: 'rate-limited'),
        AuthFailureKind.rateLimited,
      );
    });

    test('an unrecognised slug is unavailable rather than a guess', () async {
      expect(
        await signUpAgainst(statusCode: 400, slug: 'something-new'),
        AuthFailureKind.unavailable,
      );
    });

    test('a body that is not a problem document is unavailable', () async {
      // A proxy's HTML error page, a truncated response. The mapper must not
      // find a `type` in it and must not claim one.
      dio.httpClientAdapter = _StubAdapter(
        statusCode: 502,
        body: '<html>gateway</html>',
      );

      await expectLater(
        repository.signUp(
          email: 'owner@example.com',
          password: 'a-long-enough-password',
          firstName: 'Vera',
          lastName: 'Achieng',
        ),
        throwsA(
          isA<AuthFailure>().having(
            (AuthFailure failure) => failure.kind,
            'kind',
            AuthFailureKind.unavailable,
          ),
        ),
      );
    });
  });

  group('the email check is loose on purpose', () {
    test('accepts ordinary addresses, including the awkward ones', () {
      expect(emailLooksValid('owner@example.com'), isTrue);
      expect(emailLooksValid('vera+bookings@salon.co.ke'), isTrue);
      expect(emailLooksValid("o'brien@example.com"), isTrue);
    });

    test('rejects only what is definitely not an address', () {
      expect(emailLooksValid('owner'), isFalse);
      expect(emailLooksValid('@example.com'), isFalse);
      expect(emailLooksValid('owner@example'), isFalse);
      expect(emailLooksValid('owner@@example.com'), isFalse);
      expect(emailLooksValid('owner @example.com'), isFalse);
      expect(emailLooksValid('owner@.com'), isFalse);
    });
  });

  group('the sign-up handoff', () {
    testWidgets('carries the email onward only when the API accepted it', (
      WidgetTester tester,
    ) async {
      final List<String> handed = <String>[];
      final _RecordingAuthRepository repository = _RecordingAuthRepository();

      await tester.pumpWidget(
        _host(
          overrides: <Override>[
            authRepositoryProvider.overrideWithValue(repository),
          ],
          child: SignupSheet(onBack: () {}, onVerify: handed.add),
        ),
      );

      Future<void> fillAndSubmit() async {
        await tester.enterText(
          find.byKey(const Key('signup-first-name')),
          'Vera',
        );
        await tester.enterText(
          find.byKey(const Key('signup-last-name')),
          'Achieng',
        );
        await tester.enterText(
          find.byKey(const Key('signup-email')),
          '  owner@example.com  ',
        );
        await tester.enterText(
          find.byKey(const Key('signup-password')),
          'a-long-enough-password',
        );
        await tester.tap(find.byKey(const Key('signup-submit')));
        await tester.pumpAndSettle();
      }

      repository.failure = const AuthFailure(AuthFailureKind.passwordRejected);
      await fillAndSubmit();

      // The half that would be silent if it broke: a handoff that fires on
      // failure sends the user to a verification sheet for an account that was
      // never created, and the code never arrives.
      expect(handed, isEmpty);
      expect(
        find.text('That password appears in known breaches — choose another'),
        findsOneWidget,
      );

      repository.failure = null;
      await fillAndSubmit();

      // Trimmed, because that is the address the request was sent with — the
      // verification sheet must ask GoTrue about the same string.
      expect(handed, <String>['owner@example.com']);
      expect(repository.emails.last, 'owner@example.com');
    });
  });

  group('the resend cooldown', () {
    testWidgets('disables the link for its full duration and then restores it', (
      WidgetTester tester,
    ) async {
      final _RecordingGateway gateway = _RecordingGateway();

      await tester.pumpWidget(
        _host(
          overrides: <Override>[authGatewayProvider.overrideWithValue(gateway)],
          child: VerifyEmailSheet(
            email: 'owner@example.com',
            onVerified: () {},
            onBackToSignIn: () {},
            onBack: () {},
          ),
        ),
      );

      final Finder resend = find.byKey(const Key('verify-resend'));
      expect(tester.widget<TextButton>(resend).onPressed, isNotNull);

      await tester.tap(resend);
      await tester.pump();

      expect(gateway.resendCalls, 1);
      expect(find.text('Resend in 30s'), findsOneWidget);
      expect(tester.widget<TextButton>(resend).onPressed, isNull);

      // One second short of the cooldown: still disabled. Without this the test
      // passes against a cooldown of any length at all, including zero.
      await tester.pump(resendCooldown - const Duration(seconds: 1));
      expect(tester.widget<TextButton>(resend).onPressed, isNull);

      await tester.pump(const Duration(seconds: 1));
      expect(find.text('Resend'), findsOneWidget);
      expect(tester.widget<TextButton>(resend).onPressed, isNotNull);
    });
  });
}

Widget _host({required List<Override> overrides, required Widget child}) {
  return ProviderScope(
    overrides: overrides,
    child: MaterialApp(
      theme: BookflowTheme.light(),
      home: Scaffold(body: SingleChildScrollView(child: child)),
    ),
  );
}

class _RecordingAuthRepository implements AuthRepository {
  final List<String> emails = <String>[];

  /// Set to make the next call fail. A flag rather than a pre-built error
  /// future: an error future constructed at setup is unhandled until awaited,
  /// and the framework fails the test before the assertion under test runs.
  AuthFailure? failure;

  @override
  Future<void> signUp({
    required String email,
    required String password,
    required String firstName,
    required String lastName,
  }) async {
    emails.add(email);
    final AuthFailure? pending = failure;
    if (pending != null) throw pending;
  }
}

class _RecordingGateway implements AuthGateway {
  int resendCalls = 0;

  @override
  Future<void> resendSignupCode({required String email}) async {
    resendCalls += 1;
  }

  @override
  Future<void> verifySignupCode({
    required String email,
    required String code,
  }) async {}

  @override
  Future<void> signInWithPassword({
    required String email,
    required String password,
  }) async {}

  @override
  Future<void> requestPasswordReset({required String email}) async {}

  @override
  Future<void> verifyRecoveryCode({
    required String email,
    required String code,
  }) async {}

  @override
  Future<void> setNewPassword({required String newPassword}) async {}

  @override
  Future<void> changePassword({
    required String currentPassword,
    required String newPassword,
  }) => throw UnimplementedError();

  @override
  SessionStatus get status => SessionStatus.signedOut;

  @override
  Stream<SessionStatus> statusChanges() => const Stream<SessionStatus>.empty();

  @override
  String? currentAccessToken() => null;

  @override
  String? currentEmail() => null;

  @override
  Future<void> signOut() async {}
}

/// Returns a canned response without touching the network. Same shape as
/// `api_client_test.dart`'s, which is where this pattern is established.
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
