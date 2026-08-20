import 'package:bookflow/features/services/services_models.dart';
import 'package:bookflow_api/bookflow_api.dart';
// `BuiltList` is the generated client's collection type — it is what
// `listMyServices` returns, so a repository that unwraps it has to name it.
// Nothing outside this file does, which is the point of ADR-028's rule.
import 'package:built_collection/built_collection.dart';
import 'package:dio/dio.dart';

/// Knows the data source and nothing else (ADR-028).
///
/// **The only file in `features/services/` that may import
/// `package:bookflow_api`**, and `test/design_system_test.dart` enforces it by
/// filename.
abstract interface class ServicesRepository {
  Future<List<SalonService>> list();

  /// Throws [ServiceNameTaken] when the salon already has that name.
  Future<SalonService> create({
    required String name,
    required int durationMinutes,
    required int priceKes,
  });

  /// Only the fields that are present are changed. Throws [ServiceNameTaken].
  Future<SalonService> update({
    required String id,
    required String name,
    required int durationMinutes,
    required int priceKes,
  });

  Future<void> delete(String id);
}

class ApiServicesRepository implements ServicesRepository {
  const ApiServicesRepository(this._api);

  final BookflowApi _api;

  @override
  Future<List<SalonService>> list() async {
    final Response<BuiltList<Service>> response = await _api
        .getServicesApi()
        .listMyServices();

    // An empty list is a 200 with `[]`, not a 404 — an account with no services
    // has not failed at anything. A null body would be a contract violation, so
    // it falls through to an empty list rather than throwing: there is nothing
    // a screen could do differently, and the empty state is already the right
    // thing to render.
    return (response.data ?? BuiltList<Service>()).map(_toModel).toList();
  }

  @override
  Future<SalonService> create({
    required String name,
    required int durationMinutes,
    required int priceKes,
  }) async {
    try {
      final Response<Service> response = await _api
          .getServicesApi()
          .createService(
            createServiceRequestInput: CreateServiceRequestInput(
              (CreateServiceRequestInputBuilder b) => b
                ..name = name
                ..durationMinutes = durationMinutes
                ..priceKes = priceKes,
            ),
          );

      final Service? created = response.data;
      if (created == null) {
        throw StateError('POST /v1/me/business/services returned no body');
      }
      return _toModel(created);
    } on DioException catch (error) {
      throw _translate(error);
    }
  }

  @override
  Future<SalonService> update({
    required String id,
    required String name,
    required int durationMinutes,
    required int priceKes,
  }) async {
    try {
      // Every field is sent, always. The API treats an absent field as
      // unchanged, and the editor sheet holds the whole service — so sending a
      // partial body would mean deciding here which of the user's edits count,
      // which is a rule, and rules do not live in a repository.
      final Response<Service> response = await _api
          .getServicesApi()
          .updateService(
            serviceId: id,
            updateServiceRequestInput: UpdateServiceRequestInput(
              (UpdateServiceRequestInputBuilder b) => b
                ..name = name
                ..durationMinutes = durationMinutes
                ..priceKes = priceKes,
            ),
          );

      final Service? updated = response.data;
      if (updated == null) {
        throw StateError(
          'PATCH /v1/me/business/services/{id} returned no body',
        );
      }
      return _toModel(updated);
    } on DioException catch (error) {
      throw _translate(error);
    }
  }

  @override
  Future<void> delete(String id) async {
    await _api.getServicesApi().deleteService(serviceId: id);
  }

  /// The problem document's `type`, translated. Never the status code.
  ///
  /// ADR-014 makes `type` "a stable, machine-readable slug and … part of the
  /// contract"; 409 is the conflict's transport, and the API already has three
  /// distinct 409s. Anything unrecognised is rethrown untouched so
  /// `AsyncValue.guard` and the 401 interceptor still see it.
  static Object _translate(DioException error) {
    final Object? body = error.response?.data;
    final Object? type = body is Map<String, dynamic> ? body['type'] : null;

    return type == '/problems/duplicate-name'
        ? const ServiceNameTaken()
        : error;
  }

  static SalonService _toModel(Service service) => SalonService(
    id: service.id,
    name: service.name,
    durationMinutes: service.durationMinutes,
    priceKes: service.priceKes,
    position: service.position,
  );
}
