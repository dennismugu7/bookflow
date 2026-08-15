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

    return OwnerProfile(
      id: profile.id,
      // RED PROOF, PR 4c — reverted in the next commit. Ignores the fetched
      // field and renders a constant, which is exactly the failure the e2e
      // exists to catch: the screen no longer shows what staging holds.
      firstName: 'Fixture',
      lastName: profile.lastName,
      avatarPath: profile.avatarPath,
    );
  }
}
