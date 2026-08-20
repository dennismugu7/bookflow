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

  /// Creates the caller's business and returns it as stored.
  Future<OwnedBusiness> create(String name);

  /// Publishes the salon and returns its permanent public address.
  ///
  /// **Idempotent** — publishing an already-published salon returns the handle
  /// it already has and never mints a second (ADR-021).
  ///
  /// Throws [PublishRequirementsNotMet] when there is no service or no opening
  /// hours yet.
  Future<PublishedSalon> publish();
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

  @override
  Future<OwnedBusiness> create(String name) async {
    // Not caught. A 409 here means the account already has one — a real
    // failure for a screen whose whole purpose is creating the first, and
    // nothing like the 404 above that means "not yet".
    final Response<Business> response = await _api
        .getBusinessesApi()
        .createBusiness(
          createBusinessRequestInput: CreateBusinessRequestInput(
            (CreateBusinessRequestInputBuilder b) => b.name = name,
          ),
        );

    final Business? business = response.data;
    if (business == null) {
      throw StateError('POST /v1/businesses returned no body');
    }

    return _toModel(business);
  }

  /// ══ THIS IS ALSO HOW THE DASHBOARD LEARNS ITS OWN HANDLE ═══════════════════
  ///
  /// **`GET /v1/me/business` does not return the handle.** Its response schema
  /// is `{id, name, published}` and only the publish response carries
  /// `handle` — so an owner reopening the app on an already-published salon has
  /// no other way to find the address of their own booking page.
  ///
  /// Calling this is safe for that purpose because the endpoint is idempotent
  /// BY DESIGN and documents itself as such: an already-published salon is
  /// confirmed published and handed back the handle it has, and no second
  /// handle is ever minted. It is not a workaround built on an accident.
  ///
  /// **It is still the wrong shape, and the right fix is one line in the API:**
  /// add `handle` to `businessSchema` in `apps/api/src/modules/businesses/
  /// businesses.routes.ts` and this call disappears from the read path. Until
  /// then there is one edge it cannot cover — a published salon whose services
  /// were all deleted fails the requirements check and answers 409, so its own
  /// dashboard cannot show its link.
  @override
  Future<PublishedSalon> publish() async {
    try {
      final Response<PublishedBusiness> response = await _api
          .getPublishingApi()
          .publishMyBusiness();

      final PublishedBusiness? published = response.data;
      if (published == null) {
        throw StateError('POST /v1/me/business/publish returned no body');
      }

      return PublishedSalon(name: published.name, handle: published.handle);
    } on DioException catch (error) {
      // Branches on the problem `type` slug and never on 409 — the API has
      // three distinct 409s and ADR-014 makes `type` the contract.
      final Object? body = error.response?.data;
      final Object? type = body is Map<String, dynamic> ? body['type'] : null;

      if (type == '/problems/publish-requirements-not-met') {
        throw const PublishRequirementsNotMet();
      }
      rethrow;
    }
  }

  static OwnedBusiness _toModel(Business business) => OwnedBusiness(
    id: business.id,
    name: business.name,
    published: business.published,
  );
}
