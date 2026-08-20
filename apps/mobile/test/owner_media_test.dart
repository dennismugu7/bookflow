import 'dart:convert';

import 'package:bookflow/features/media/media_models.dart';
import 'package:bookflow/features/media/media_providers.dart';
import 'package:bookflow/features/media/media_repository.dart';
import 'package:bookflow/features/team/team_models.dart';
// The generated package defines `UploadedImage` and `TeamMember` too. Both are
// hidden so this file talks about the app's own models by their plain names —
// the same collision `media_repository.dart` resolves the same way.
import 'package:bookflow_api/bookflow_api.dart' hide UploadedImage, TeamMember;
import 'package:dio/dio.dart';
import 'package:flutter_test/flutter_test.dart';

/// The media path's two genuinely risky pieces.
///
/// ══ WHY THESE AND NOT A TEST PER SCREEN ═════════════════════════════════════
///
/// The screens are a grid and a form. What is worth pinning is the ONE
/// hand-written HTTP call in the app — everything else goes through the
/// generated client, which the contract check already guards — and the error
/// translation behind it, where two different 400s have to produce two
/// different sentences.
void main() {
  late Dio dio;
  late ApiMediaRepository repository;
  late _CapturingAdapter adapter;

  setUp(() {
    dio = Dio(BaseOptions(baseUrl: 'http://localhost:3000'));
    adapter = _CapturingAdapter();
    dio.httpClientAdapter = adapter;
    repository = ApiMediaRepository(
      BookflowApi(dio: dio, serializers: standardSerializers),
    );
  });

  group('the hand-written multipart upload', () {
    test('sends the purpose and the file as form fields', () async {
      adapter.respond(
        statusCode: 201,
        body: jsonEncode(<String, dynamic>{
          'url': 'https://example.invalid/object.jpg',
          'purpose': 'portfolio',
          'portfolioImageId': 'e7d2d1f0-0000-4000-8000-00000000000a',
        }),
      );

      final UploadedImage uploaded = await repository.upload(
        purpose: ImagePurpose.portfolio,
        bytes: <int>[1, 2, 3],
        filename: 'cut.jpg',
      );

      // ── THE ASSERTION THE GENERATED CLIENT CANNOT MAKE FOR US ─────────────
      //
      // `uploadBusinessImage()` was generated with NO parameters — the route
      // has no Zod request body, so the spec describes nothing to send. This
      // call is hand-written for that reason, which means nothing but a test
      // checks that it sends the right parts. A missing `purpose` is a 400 the
      // owner reads as "use a JPG or PNG", which is a confusing way to be told
      // the client forgot a field.
      final Object? sent = adapter.lastOptions?.data;
      expect(sent, isA<FormData>());

      final FormData form = sent! as FormData;
      expect(
        form.fields.map((MapEntry<String, String> f) => f.key).toList(),
        contains('purpose'),
      );
      expect(
        form.fields
            .firstWhere((MapEntry<String, String> f) => f.key == 'purpose')
            .value,
        'portfolio',
      );
      expect(
        form.files.map((MapEntry<String, MultipartFile> f) => f.key),
        <String>['file'],
      );

      expect(uploaded.url, 'https://example.invalid/object.jpg');
      expect(uploaded.portfolioImageId, isNotNull);
    });

    test(
      'carries no portfolio id for a banner, which creates no row',
      () async {
        adapter.respond(
          statusCode: 201,
          body: jsonEncode(<String, dynamic>{
            'url': 'https://example.invalid/banner.png',
            'purpose': 'banner',
            'portfolioImageId': null,
          }),
        );

        final UploadedImage uploaded = await repository.upload(
          purpose: ImagePurpose.banner,
          bytes: <int>[1],
          filename: 'banner.png',
        );

        // A banner is a column on the business and a team photo is a column on
        // the member; only a portfolio upload creates a row of its own.
        expect(uploaded.portfolioImageId, isNull);
      },
    );
  });

  group('the problem document decides the sentence, not the status', () {
    Future<Object> uploadAgainst({
      required int statusCode,
      required String slug,
    }) async {
      adapter.respond(
        statusCode: statusCode,
        body: jsonEncode(<String, dynamic>{
          'type': '/problems/$slug',
          'title': 'Refused',
          'status': statusCode,
        }),
      );

      try {
        await repository.upload(
          purpose: ImagePurpose.portfolio,
          bytes: <int>[1],
          filename: 'x.jpg',
        );
        fail('the upload should not have succeeded');
      } on Object catch (error) {
        return error;
      }
    }

    test(
      'upload-rejected and validation-failed are both 400 and both the user’s to fix',
      () async {
        // Awaited one at a time: the helper mutates the shared adapter, and two
        // overlapping calls would have the second's response answer the first.
        expect(
          await uploadAgainst(statusCode: 400, slug: 'upload-rejected'),
          isA<UploadRejected>(),
        );
        expect(
          await uploadAgainst(statusCode: 400, slug: 'validation-failed'),
          isA<UploadRejected>(),
        );
      },
    );

    test(
      'storage-unavailable is a 503 and is retryable, which is a different sentence',
      () async {
        expect(
          await uploadAgainst(statusCode: 503, slug: 'storage-unavailable'),
          isA<UploadUnavailable>(),
        );
      },
    );

    test('an unrecognised slug is rethrown untouched, not guessed at', () async {
      // Rethrown so `AsyncValue.guard` and the 401 interceptor still see it. A
      // repository that swallowed every failure into one of its own types would
      // stop a session ending when the API says the token is dead.
      expect(
        await uploadAgainst(statusCode: 418, slug: 'something-new'),
        isA<DioException>(),
      );
    });

    test(
      'each kind has its own sentence, and only one is about the connection',
      () {
        expect(
          uploadFailureMessage(const UploadRejected()),
          'Use a JPG or PNG under 5 MB.',
        );
        expect(
          uploadFailureMessage(const UploadUnavailable()),
          'Could not upload right now. Try again.',
        );
        // The fallback keeps the app's established shared line rather than
        // inventing a fourth way to say it.
        expect(
          uploadFailureMessage(StateError('anything else')),
          'Something went wrong. Check your connection and try again.',
        );
      },
    );
  });

  group('a team member’s initials', () {
    // ADR-005 gives a team member ONE name field, so the initials cannot come
    // from a first and a last name the way `OwnerProfile`'s do. These are the
    // cases that shape has and the two-field one does not.
    test('takes the first letter of the first two words', () {
      expect(_named('Vera Achieng').initials, 'VA');
      expect(_named('grace wanjiru mbeki').initials, 'GW');
    });

    test('survives a single word and a single letter', () {
      expect(_named('Grace').initials, 'G');
      // A one-letter name is a real name, and slicing two characters off it
      // would throw rather than render.
      expect(_named('X').initials, 'X');
    });

    test('survives padding and an empty name', () {
      expect(_named('   Vera   Achieng  ').initials, 'VA');
      // The API requires a name, so this is defence rather than a case the
      // server can produce — and an empty avatar beats a crash either way.
      expect(_named('   ').initials, '');
    });
  });
}

TeamMember _named(String name) => TeamMember(
  id: 'm',
  name: name,
  role: null,
  about: null,
  photoUrl: null,
  position: 0,
);

/// Answers with a canned response and keeps the request that produced it.
///
/// The capture is the point: `api_client_test.dart`'s stub only answers, and
/// the assertion this file needs is about what was SENT.
class _CapturingAdapter implements HttpClientAdapter {
  int _statusCode = 200;
  String _body = '{}';

  RequestOptions? lastOptions;

  void respond({required int statusCode, required String body}) {
    _statusCode = statusCode;
    _body = body;
  }

  @override
  Future<ResponseBody> fetch(
    RequestOptions options,
    Stream<List<int>>? requestStream,
    Future<void>? cancelFuture,
  ) async {
    lastOptions = options;
    return ResponseBody.fromString(
      _body,
      _statusCode,
      headers: <String, List<String>>{
        Headers.contentTypeHeader: <String>[Headers.jsonContentType],
      },
    );
  }

  @override
  void close({bool force = false}) {}
}
