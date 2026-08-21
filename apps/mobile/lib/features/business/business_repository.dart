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

  /// Saves the business's editable profile and returns it as stored.
  ///
  /// ══ AN OMITTED FIELD IS UNCHANGED, NOT CLEARED ═══════════════════════════
  ///
  /// The API applies `coalesce(param, column)` to every optional field, so a
  /// field this does not send is left exactly as it was. **That is load-bearing
  /// here rather than a nicety**: `GET /v1/me/business` returns only
  /// `{id, name, published}`, so the app cannot prefill the profile fields —
  /// and if it sent every field on every save, an untouched blank input would
  /// wipe a tagline the owner set last week.
  ///
  /// So blank means "leave it alone", and the cost is that **there is no way to
  /// clear a field through this app**. Stated rather than discovered: the fix
  /// for both halves is the same one line in `businesses.routes.ts` adding
  /// these fields to `businessSchema`, after which the form can prefill and a
  /// deliberate clear becomes expressible.
  /// **No `bannerUrl` here, and that is the API's shape rather than an
  /// omission.** `RenameBusinessRequest` does not carry one: the upload
  /// endpoint writes `banner_url` on the business itself when the purpose is
  /// `banner`, so the banner is already saved by the time this could have sent
  /// it. A field here would be a second writer for one column.
  Future<OwnedBusiness> rename({
    required String id,
    required String name,
    String? tagline,
    String? about,
    String? category,
    String? address,
    String? mapsUrl,
  });

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
    String? tagline,
    String? about,
    String? category,
    String? address,
    String? mapsUrl,
  }) async {
    // Not caught. A rename failing IS a failure — a 404 here means the business
    // is not the caller's or does not exist, which is nothing like "you have
    // not made one yet", and the screen must show an error for it.
    final Response<Business> response = await _api
        .getBusinessesApi()
        .renameBusiness(
          businessId: id,
          renameBusinessRequestInput: RenameBusinessRequestInput((
            RenameBusinessRequestInputBuilder b,
          ) {
            b.name = name;
            // Only what was actually filled in. See the interface comment:
            // the app cannot read these back, so an empty input means
            // "unchanged" and sending `""` would wipe a value the owner set
            // and cannot currently see.
            if (tagline != null && tagline.isNotEmpty) b.tagline = tagline;
            if (about != null && about.isNotEmpty) b.about = about;
            if (category != null && category.isNotEmpty) {
              b.category = category;
            }
            if (address != null && address.isNotEmpty) b.address = address;
            if (mapsUrl != null && mapsUrl.isNotEmpty) b.mapsUrl = mapsUrl;
          }),
        );

    final Business? business = response.data;
    if (business == null) {
      throw StateError('PATCH /v1/businesses/{id} returned no body');
    }

    return _toModel(business);
  }

  /// ══ THE CONFLICT IS TRANSLATED; EVERYTHING ELSE IS STILL RETHROWN ═════════
  ///
  /// **This comment used to say the 409 was deliberately not caught, and that
  /// was correct when it was written.** A 409 here is a real failure, unlike the
  /// 404 in `fetchMine`, and catching a real failure to hand the screen
  /// something quieter would have been wrong. The reasoning held because
  /// **the screen had nothing to say about a conflict**: every failed submission
  /// rendered one string, so translating the error changed nothing an owner
  /// could see and only removed it from `AsyncValue.guard`'s reach.
  ///
  /// **What changed is the screen, not the verdict about 409.** Criterion 63
  /// and K82 — raised by the owner's review pass on PR #15 — require an owner
  /// whose creation is refused because they already have a business to be told
  /// that, rather than to be told to check their connection. Now that there is
  /// a distinct thing to show, the distinction has to survive the trip, and this
  /// is the only file allowed to know what a problem document is: ADR-028 keeps
  /// `package:bookflow_api` and Dio out of every screen.
  ///
  /// **It is still not a swallow.** `BusinessAlreadyExists` is thrown, not
  /// returned — it travels as an error, `AsyncValue.guard` still catches it, and
  /// the screen still renders its error state. Only the sentence differs. Every
  /// other `DioException`, including a 409 whose slug is anything else, is
  /// rethrown exactly as before.
  ///
  /// **The branch is on the `type` slug and never on the status code** (ADR-014:
  /// `type` is "a stable, machine-readable slug and is part of the contract").
  /// 409 is the conflict's transport, not its meaning, and a second conflict on
  /// this endpoint would arrive wearing the same number.
  @override
  Future<OwnedBusiness> create(String name) async {
    try {
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
    } on DioException catch (error) {
      if (_slugOf(error) == _businessAlreadyExists) {
        throw const BusinessAlreadyExists();
      }
      rethrow;
    }
  }

  static const String _businessAlreadyExists =
      '/problems/business-already-exists';

  /// The problem document's `type`, or null when the body is not one.
  ///
  /// Defensive by construction: a transport failure has no response, an error
  /// page is not a map, and a truncated body has no `type`. Every one of those
  /// yields null and the caller rethrows — the failure mode of this helper is
  /// "behave exactly as before", never "claim a conflict".
  static String? _slugOf(DioException error) {
    final Object? body = error.response?.data;
    if (body is! Map<String, dynamic>) {
      return null;
    }
    final Object? type = body['type'];
    return type is String ? type : null;
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
