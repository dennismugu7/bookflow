import 'package:bookflow/features/media/media_models.dart';
// Both names exist on both sides. The generated ones are hidden here and
// reached under `api.` where they are genuinely needed, so this file can talk
// about the feature's models by their plain names — and no other file in the
// app can see the generated pair at all.
import 'package:bookflow_api/bookflow_api.dart'
    hide UploadedImage, PortfolioImage;
import 'package:bookflow_api/bookflow_api.dart' as api show PortfolioImage;
import 'package:built_collection/built_collection.dart';
import 'package:dio/dio.dart';

/// Knows the data source and nothing else (ADR-028).
///
/// **The only file in `features/media/` that may import
/// `package:bookflow_api`**, and — see below — the only file in the app that
/// hand-writes an HTTP call.
abstract interface class MediaRepository {
  Future<List<PortfolioImage>> listPortfolio();

  /// Uploads [bytes] and returns its public URL.
  ///
  /// Throws [UploadRejected] for a file the server will not take and
  /// [UploadUnavailable] when object storage is the problem.
  Future<UploadedImage> upload({
    required ImagePurpose purpose,
    required List<int> bytes,
    required String filename,
  });

  Future<void> deletePortfolioImage(String id);
}

class ApiMediaRepository implements MediaRepository {
  const ApiMediaRepository(this._api);

  final BookflowApi _api;

  @override
  Future<List<PortfolioImage>> listPortfolio() async {
    final Response<BuiltList<api.PortfolioImage>> response = await _api
        .getMediaApi()
        .listMyPortfolioImages();

    return (response.data ?? BuiltList<api.PortfolioImage>())
        .map(
          (api.PortfolioImage image) => PortfolioImage(
            id: image.id,
            imageUrl: image.imageUrl,
            position: image.position,
          ),
        )
        .toList();
  }

  /// ══ THE ONE HAND-WRITTEN HTTP CALL IN THIS APP, AND WHY IT EXISTS ═════════
  ///
  /// ADR-014 prohibits hand-written request models and the generated client is
  /// the rule everywhere else. **The generator cannot express this one.**
  ///
  /// `POST /v1/me/business/images` is `multipart/form-data`, and the route
  /// declares no Zod request body — deliberately, because a Zod body schema
  /// would tell `fastify-type-provider-zod` to parse a JSON body that does not
  /// exist. So the OpenAPI operation has `consumes: multipart/form-data` and no
  /// request schema, and `openapi-generator` produced
  /// `uploadBusinessImage()` **with no parameters at all** — a call that posts
  /// an empty body. Read from the generated source rather than assumed.
  ///
  /// The choices were to hand-write the multipart body or to change the API's
  /// contract to describe something Zod cannot validate. This is the smaller
  /// exception, and it is contained: it uses the generated client's OWN `Dio`
  /// instance, so the access-token interceptor and the 401 handling in
  /// `api_client.dart` apply exactly as they do to every generated call. It is
  /// not a second HTTP client.
  ///
  /// **The response IS still the generated model's shape**, parsed by hand from
  /// the same JSON the spec describes — so a contract change that renamed a
  /// field breaks here loudly rather than silently returning null.
  @override
  Future<UploadedImage> upload({
    required ImagePurpose purpose,
    required List<int> bytes,
    required String filename,
  }) async {
    try {
      final FormData form = FormData.fromMap(<String, dynamic>{
        'purpose': purpose.wire,
        // The field name the route reads, and the filename is what the server
        // derives the extension from for logging — the stored key's extension
        // comes from the content type, not from this.
        'file': MultipartFile.fromBytes(bytes, filename: filename),
      });

      final Response<dynamic> response = await _api.dio.post<dynamic>(
        '/v1/me/business/images',
        data: form,
      );

      final Object? body = response.data;
      if (body is! Map<String, dynamic>) {
        throw StateError('POST /v1/me/business/images returned no body');
      }

      final Object? url = body['url'];
      if (url is! String) {
        throw StateError('POST /v1/me/business/images returned no url');
      }

      final Object? portfolioImageId = body['portfolioImageId'];
      return UploadedImage(
        url: url,
        portfolioImageId: portfolioImageId is String ? portfolioImageId : null,
      );
    } on DioException catch (error) {
      throw _translate(error);
    }
  }

  @override
  Future<void> deletePortfolioImage(String id) async {
    await _api.getMediaApi().deletePortfolioImage(imageId: id);
  }

  /// The problem document's `type`, translated. Never the status code.
  ///
  /// `upload-rejected` and `validation-failed` are both 400 and mean different
  /// things to the owner; `storage-unavailable` is a 503 they can retry. ADR-014
  /// makes `type` the contract, and anything unrecognised is rethrown untouched
  /// so `AsyncValue.guard` and the 401 interceptor still see it.
  static Object _translate(DioException error) {
    final Object? body = error.response?.data;
    final Object? type = body is Map<String, dynamic> ? body['type'] : null;

    return switch (type) {
      '/problems/upload-rejected' => const UploadRejected(),
      '/problems/validation-failed' => const UploadRejected(),
      '/problems/storage-unavailable' => const UploadUnavailable(),
      _ => error,
    };
  }
}
