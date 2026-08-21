import 'dart:convert';

import 'package:bookflow/features/business/business_models.dart';
import 'package:bookflow/features/business/business_repository.dart';
import 'package:bookflow_api/bookflow_api.dart';
import 'package:dio/dio.dart';
import 'package:flutter_test/flutter_test.dart';

/// The repository's problem-document mapping — criterion 63, K82.
///
/// ══ WHY THIS IS TESTED HERE AND NOT AT THE SCREEN ═══════════════════════════
///
/// `create_business_screen_test.dart` proves the screen shows the right sentence
/// for a `BusinessAlreadyExists`. It cannot prove that a real 409 from the API
/// becomes one, because a widget test hands the screen a stub. **The wire is
/// this file's subject**: a canned problem document, byte-shaped like the one
/// `apps/api/src/platform/problem.ts` emits, fed through the generated client.
///
/// ── THE DISCRIMINATOR IS THE `type` SLUG, NOT THE STATUS CODE ───────────────
///
/// ADR-014: *"the Flutter client branches on `type` (ADR-014) rather than on a
/// message"*, and `type` is "a stable, machine-readable slug and is part of the
/// contract". A status code is not — 409 is the conflict's transport, and a
/// second, different conflict on this endpoint would arrive wearing the same
/// number. The control test below is the one that holds this: a 409 whose slug
/// is something else must NOT become `BusinessAlreadyExists`.
void main() {
  late Dio dio;
  late ApiBusinessRepository repository;

  setUp(() {
    dio = Dio(BaseOptions(baseUrl: 'http://localhost:3000'));
    repository = ApiBusinessRepository(
      BookflowApi(dio: dio, serializers: standardSerializers),
    );
  });

  /// The shape `problemBody` produces: type, title, status, and nothing else.
  /// No `detail`, no `instance`, no echo of the submitted name — criteria 31
  /// and 32, asserted server-side and relied on here.
  String problem({
    required String slug,
    required int status,
    required String title,
  }) => jsonEncode(<String, dynamic>{
    'type': '/problems/$slug',
    'title': title,
    'status': status,
  });

  test(
    'criterion 63 — a business-already-exists problem becomes BusinessAlreadyExists',
    () async {
      dio.httpClientAdapter = _StubAdapter(
        statusCode: 409,
        body: problem(
          slug: 'business-already-exists',
          status: 409,
          title: 'Business already exists',
        ),
      );

      await expectLater(
        repository.create('Vera’s Salon'),
        throwsA(isA<BusinessAlreadyExists>()),
      );
    },
  );

  test(
    'criterion 63 — a 409 with a different slug is NOT the conflict',
    () async {
      // The control, and the reason this file exists. A repository keyed on the
      // status code passes the test above and fails here — which is exactly the
      // mistake ADR-014 forbids, and it is invisible without this case.
      dio.httpClientAdapter = _StubAdapter(
        statusCode: 409,
        body: problem(
          slug: 'some-other-conflict',
          status: 409,
          title: 'Conflict',
        ),
      );

      await expectLater(
        repository.create('Vera’s Salon'),
        throwsA(isA<DioException>()),
      );
    },
  );

  test(
    'criterion 63 — an unrelated failure is still rethrown untouched',
    () async {
      dio.httpClientAdapter = _StubAdapter(
        statusCode: 500,
        body: problem(
          slug: 'internal-error',
          status: 500,
          title: 'Something went wrong',
        ),
      );

      await expectLater(
        repository.create('Vera’s Salon'),
        throwsA(isA<DioException>()),
      );
    },
  );
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
