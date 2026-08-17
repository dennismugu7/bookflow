import 'dart:io';

import 'package:bookflow/features/business/business_models.dart';
import 'package:bookflow_api/bookflow_api.dart';
import 'package:dio/dio.dart';

/// Knows the data source and nothing else (ADR-028).
///
/// **This is the only file in `features/business/` that may import
/// `package:bookflow_api`**, and `test/design_system_test.dart` enforces it. The
/// client is regenerated wholesale on every schema change (ADR-025), so the
/// generator's naming and its `built_value` builders are contained here.
abstract interface class BusinessRepository {
  /// The caller's business, or the fact that they have none.
  Future<BusinessStatus> fetchMine();

  /// Renames the caller's business and returns it as stored.
  Future<OwnedBusiness> rename({required String id, required String name});
}

class ApiBusinessRepository implements BusinessRepository {
  const ApiBusinessRepository(this._api);

  final BookflowApi _api;

  /// ══ THE ONE PLACE A 404 IS DATA RATHER THAN A FAILURE ═════════════════════
  ///
  /// `GET /v1/me/business` answers **404 when the account has not created a
  /// business yet**. ADR-014 fixes that a single resource is returned as itself,
  /// so there is no `{ business: null }` envelope available without deviating,
  /// and `GET /v1/me` already sets the precedent of `not-found` for a missing
  /// singleton.
  ///
  /// **That 404 is mapped to `NoBusinessYet` and NOT rethrown. Every other
  /// failure is rethrown untouched.**
  ///
  /// ── WHY THIS EXCEPTION IS NARROW, AND WHY IT EXISTS AT ALL ────────────────
  ///
  /// `profile_repository.dart` states the convention this departs from: errors
  /// "are deliberately NOT caught", because two things outside the method need
  /// to see them — the 401 interceptor, which ends the session, and
  /// `AsyncValue.guard`, which turns a failure into the error state every screen
  /// renders the same way.
  ///
  /// **Neither reasoning extends to a 404 meaning "nothing here yet."** There is
  /// no session to end and no failure to report. Having no business is the
  /// ordinary condition of a brand-new account.
  ///
  /// **What breaks if this is removed:** the dashboard renders its ERROR state
  /// for every owner who has just signed up, and the router sends a user with no
  /// business to `/unavailable` rather than to setup. One status code, one
  /// repository, everything else rethrown — the narrowness is the safety.
  @override
  Future<BusinessStatus> fetchMine() async {
    try {
      final Response<Business> response = await _api.getMeApi().getMyBusiness();
      final Business? business = response.data;

      if (business == null) {
        // A 2xx with no body. The contract says this cannot happen; if it does,
        // failing is right — the alternative is rendering a business that is
        // not there.
        throw StateError('GET /v1/me/business returned no body');
      }

      return HasBusiness(_toModel(business));
    } on DioException catch (error) {
      if (error.response?.statusCode == HttpStatus.notFound) {
        return const NoBusinessYet();
      }
      rethrow;
    }
  }

  @override
  Future<OwnedBusiness> rename({
    required String id,
    required String name,
  }) async {
    // Not caught. A rename failing IS a failure — a 404 here means the business
    // is not the caller's or does not exist, which is nothing like "you have
    // not made one yet", and the screen must show an error for it.
    final Response<Business> response = await _api
        .getBusinessesApi()
        .renameBusiness(
          businessId: id,
          renameBusinessRequestInput: RenameBusinessRequestInput(
            (RenameBusinessRequestInputBuilder b) => b.name = name,
          ),
        );

    final Business? business = response.data;
    if (business == null) {
      throw StateError('PATCH /v1/businesses/{id} returned no body');
    }

    return _toModel(business);
  }

  static OwnedBusiness _toModel(Business business) => OwnedBusiness(
    id: business.id,
    name: business.name,
    published: business.published,
  );
}
