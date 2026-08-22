import 'package:bookflow/features/profile/profile_models.dart';
import 'package:bookflow_api/bookflow_api.dart';
import 'package:dio/dio.dart';

/// Knows the data source and nothing else (ADR-028).
///
/// **This is the only file in `features/profile/` that may import
/// `package:bookflow_api`**, and `test/design_system_test.dart` enforces it. The
/// reason is blast radius: the client is regenerated wholesale on every schema
/// change (ADR-025), so the generator's naming, its null handling and its
/// `built_value` builders are contained here and nothing else in the feature
/// moves when the API adds a field.
///
/// No membership scoping rule applies: `GET /v1/me` is keyed by the caller's own
/// token, so the scope IS the credential. Every OTHER repository in this project
/// takes a scope (`CLAUDE.md` §5), and the absence here is deliberate rather
/// than forgotten.
abstract interface class ProfileRepository {
  Future<OwnerProfile> fetchMine();

  /// Saves the owner's own name (screen #20's Edit toggle).
  ///
  /// **Both names are required**, matching `PATCH /v1/me`. There is no
  /// blank-means-unchanged here and there must not be: the form prefills from
  /// `fetchMine` and edits two adjacent inputs, so an empty box is one the owner
  /// emptied — and the API rejects it, because neither column is nullable.
  ///
  /// The email is not a parameter. It belongs to Supabase Auth (ADR-027) and
  /// changing it is a verification flow rather than a field edit, which is why
  /// screen #20 draws it read-only.
  Future<OwnerProfile> rename({
    required String firstName,
    required String lastName,
  });

  /// Deletes the account, permanently (screens #25–#27).
  ///
  /// The API erases the business, its storage objects, the profile and the auth
  /// user — in that order, so a partial failure leaves an account that can
  /// retry. **This does not clear the local session**; the caller does that
  /// after a success, because the session is the platform's rather than this
  /// repository's.
  ///
  /// [reason] is the exit survey's answer. It reaches a log and no table.
  ///
  /// ── [password] IS REQUIRED, AND THE SERVER IS WHAT ENFORCES IT ───────────
  ///
  /// A bearer token is valid for up to an hour with no denylist (ADR-017), and
  /// this request erases a salon's entire booking history. The API verifies the
  /// password before deleting anything, so the check cannot be skipped by
  /// calling the endpoint directly — this parameter is how the app participates
  /// in it, not where it is enforced.
  ///
  /// Throws [ReauthenticationFailed] when the password is wrong. Nothing is
  /// deleted in that case.
  Future<void> deleteAccount({
    required String password,
    required String? reason,
  });
}

class ApiProfileRepository implements ProfileRepository {
  const ApiProfileRepository(this._api);

  final BookflowApi _api;

  @override
  Future<OwnerProfile> fetchMine() async {
    // Errors are deliberately NOT caught. A `DioException` carries the status
    // and the RFC 9457 problem document, and the two things that need to see it
    // both sit outside this method: the 401 interceptor, which ends the session
    // (`platform/api_client.dart`), and `AsyncValue.guard` in the controller,
    // which turns it into the error state every screen renders the same way.
    // Swallowing it here would break both.
    final Response<Profile> response = await _api.getMeApi().getMe();
    final Profile? profile = response.data;

    if (profile == null) {
      // A 2xx with no body. The contract says this cannot happen; if it does,
      // failing is right — the alternative is rendering a profile screen with
      // nobody on it.
      throw StateError('GET /v1/me returned no body');
    }

    return _toModel(profile);
  }

  @override
  Future<OwnerProfile> rename({
    required String firstName,
    required String lastName,
  }) async {
    // Not caught, for `fetchMine`'s reason: the 401 interceptor and
    // `AsyncValue.guard` both need to see a failure, and this one has no status
    // that means something other than "it did not save".
    final Response<Profile> response = await _api.getMeApi().updateMe(
      updateProfileRequestInput: UpdateProfileRequestInput((
        UpdateProfileRequestInputBuilder b,
      ) {
        b.firstName = firstName;
        b.lastName = lastName;
      }),
    );

    final Profile? profile = response.data;
    if (profile == null) {
      throw StateError('PATCH /v1/me returned no body');
    }

    return _toModel(profile);
  }

  @override
  Future<void> deleteAccount({
    required String password,
    required String? reason,
  }) async {
    try {
      await _api.getMeApi().deleteMe(
        deleteAccountRequestInput: DeleteAccountRequestInput((
          DeleteAccountRequestInputBuilder b,
        ) {
          b.password = password;
          // Sent only when there is one. An empty string would be a survey
          // answer of "" in the log, which is noise where absence is
          // information.
          if (reason != null && reason.isNotEmpty) b.reason = reason;
        }),
      );
    } on DioException catch (error) {
      // ── TRANSLATED, AND THE SLUG IS WHY THIS IS SAFE TO CATCH ────────────
      //
      // A 401 normally ends the session — `platform/api_client.dart`'s
      // interceptor sees it first and signs the user out. **That is exactly
      // wrong here**: the session is fine, the password was mistyped, and
      // ejecting somebody to the welcome screen for a typo would be baffling.
      //
      // The API answers a DISTINCT slug for this reason: `invalid-token` means
      // the session is bad, `reauthentication-failed` means the person could
      // not prove they own the account. Branching on the slug rather than the
      // status is ADR-014's rule and is what keeps the two apart.
      if (_slugOf(error) == '/problems/reauthentication-failed') {
        throw const ReauthenticationFailed();
      }
      rethrow;
    }
  }

  /// The problem document's `type`, or null when the body is not one.
  ///
  /// Defensive by construction, like `business_repository.dart`'s: a transport
  /// failure has no response, a gateway error page is not a map, a truncated
  /// body has no `type`. Every one yields null and the caller rethrows — the
  /// failure mode is "behave exactly as before", never "claim a wrong password".
  static String? _slugOf(DioException error) {
    final Object? body = error.response?.data;
    if (body is! Map<String, dynamic>) return null;
    final Object? type = body['type'];
    return type is String ? type : null;
  }

  static OwnerProfile _toModel(Profile profile) => OwnerProfile(
    id: profile.id,
    firstName: profile.firstName,
    lastName: profile.lastName,
    avatarPath: profile.avatarPath,
  );
}
