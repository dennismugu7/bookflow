import 'dart:convert';

import 'package:bookflow_api/bookflow_api.dart';
import 'package:dio/dio.dart';
import 'package:flutter_test/flutter_test.dart';

/// Proves the generated client is usable, not merely present.
///
/// The assertion that matters is deserialisation: a canned `/health` payload,
/// byte-identical to what the Fastify route returns, is fed through the
/// generated Dio client and must come back as a typed `HealthResponse` with a
/// typed enum member — not a Map, not a String.
///
/// That is the contract ADR-014 exists to protect. TypeScript and Dart share no
/// type system, so nothing else in the toolchain checks that the server's shape
/// and the client's parser agree. If the Zod schema changes and the client is
/// not regenerated, this test is one of the two things that notices (the other
/// is CI's drift check, which notices sooner).
///
/// Nothing here is hand-written model code, which ADR-014 prohibits. The test
/// only constructs the generated client and reads the generated type.
void main() {
  late Dio dio;
  late BookflowApi client;

  setUp(() {
    dio = Dio(BaseOptions(baseUrl: 'http://localhost:3000'));
    client = BookflowApi(dio: dio, serializers: standardSerializers);
  });

  test('deserialises a canned /health payload into HealthResponse', () async {
    // The exact bytes apps/api returns for GET /health.
    dio.httpClientAdapter = _StubAdapter(
      statusCode: 200,
      body: jsonEncode(<String, dynamic>{'status': 'ok'}),
    );

    final Response<HealthResponse> response = await client
        .getHealthApi()
        .getHealth();

    expect(response.statusCode, 200);

    final HealthResponse? health = response.data;
    expect(health, isNotNull);

    // Typed, not stringly. `status` is an enum class the generator derived
    // from the Zod literal, so this would not compile if the contract said
    // something else.
    expect(health!.status, HealthResponseStatusEnum.ok);
    expect(health.status.name, 'ok');
  });

  test(
    'surfaces a malformed payload as an error rather than a silent null',
    () async {
      // A server that answered with the wrong shape must not deserialise into a
      // half-built object. built_value throws on a missing required field, and
      // the client is expected to let that surface.
      dio.httpClientAdapter = _StubAdapter(
        statusCode: 200,
        body: jsonEncode(<String, dynamic>{'wrong': 'shape'}),
      );

      expect(
        () async => client.getHealthApi().getHealth(),
        throwsA(isA<Object>()),
      );
    },
  );
}

/// Returns a canned response without touching the network.
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
