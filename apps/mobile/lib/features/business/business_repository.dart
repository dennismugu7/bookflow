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
  /// ══ EVERY FIELD, EVERY TIME — AND AN EMPTY ONE CLEARS ════════════════════
  ///
  /// **This used to send only what was filled in.** The API applied
  /// `coalesce(param, column)`, so an omitted field was left alone, and the
  /// client depended on that because `GET /v1/me/business` returned neither the
  /// tagline nor anything else the form edits. A form that cannot show a stored
  /// value must not send a blank over it.
  ///
  /// It worked and it had a cost that could not be paid off from this side:
  /// **nothing could ever be cleared.** An owner who pasted the wrong maps link
  /// could replace it and never remove it.
  ///
  /// The read returns all five now. The form prefills from them, so a blank box
  /// is a box the owner emptied, and this sends the whole set on every save —
  /// `''` where they cleared something, which the API stores as NULL.
  ///
  /// **The parameters are non-nullable for that reason.** A `String?` would
  /// reintroduce exactly the ambiguity just removed: null would have to mean
  /// either "unchanged" or "clear", and the caller could not say which.
  ///
  /// **No `bannerUrl` here, and that is the API's shape rather than an
  /// omission.** `RenameBusinessRequest` does not carry one: the upload
  /// endpoint writes `banner_url` on the business itself when the purpose is
  /// `banner`, so the banner is already saved by the time this could have sent
  /// it. A field here would be a second writer for one column.
  Future<OwnedBusiness> rename({
    required String id,
    required String name,
    required String tagline,
    required String about,
    required String category,
    required String address,
    required String mapsUrl,
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
    required String tagline,
    required String about,
    required String category,
    required String address,
    required String mapsUrl,
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
            // ── ALL OF THEM, UNCONDITIONALLY ────────────────────────────────
            //
            // The `if (x.isNotEmpty)` guards that used to stand here were the
            // client half of blank-means-unchanged. They are gone with it: the
            // form prefills from the stored values now, so an empty string is
            // the owner having emptied a box and the API clears the column.
            //
            // Re-adding a guard would break the clear silently — the save would
            // report success and the field would come back on the next read.
            b.name = name;
            b.tagline = tagline;
            b.about = about;
            b.category = category;
            b.address = address;
            b.mapsUrl = mapsUrl;
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

  /// ══ THIS IS NO LONGER ON A READ PATH, AND THAT MATTERS ═════════════════════
  ///
  /// **This used to be called to LEARN the handle**, because `GET /v1/me
  /// /business` returned `{id, name, published}` and only the publish response
  /// carried one. It was safe — the endpoint is idempotent by design — but it
  /// had an edge it could not cover: a published salon whose services were all
  /// deleted fails the requirements check and answers 409, so its own dashboard
  /// could not show its own link.
  ///
  /// `handle` is on `businessSchema` now, so `fetchMine` carries it and that
  /// call site is gone. **This method is only ever invoked by an owner tapping
  /// Publish**, which is what it always claimed to be for.
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
    handle: business.handle,
    tagline: business.tagline,
    about: business.about,
    category: business.category,
    address: business.address,
    mapsUrl: business.mapsUrl,
    bannerUrl: business.bannerUrl,
  );
}
