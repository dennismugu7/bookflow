import 'package:bookflow/platform/auth_failure.dart';
import 'package:bookflow_api/bookflow_api.dart';
import 'package:dio/dio.dart';

/// Knows the data source and nothing else (ADR-028).
///
/// ══ SIGN-UP IS THE ONE MEDIATED PATH ════════════════════════════════════════
///
/// Everything else in the entry flow — login, verification, resend — goes to
/// GoTrue through `AuthGateway`. **Account creation does not, and must not.**
/// ADR-037 puts it behind `POST /v1/auth/signup` on our API, because a consent
/// record the subject controls is not a consent record. So this repository
/// exists for exactly one call.
///
/// **This is the only file in `features/auth/` that may import
/// `package:bookflow_api`**, and `test/design_system_test.dart` enforces it by
/// filename.
abstract interface class AuthRepository {
  /// Creates an owner account and triggers the confirmation email.
  ///
  /// Throws [AuthFailure] and nothing else.
  Future<void> signUp({
    required String email,
    required String password,
    required String firstName,
    required String lastName,
  });
}

class ApiAuthRepository implements AuthRepository {
  const ApiAuthRepository(this._api);

  final BookflowApi _api;

  /// ══ SUCCESS AND "ALREADY REGISTERED" ARE THE SAME RESPONSE ════════════════
  ///
  /// The endpoint answers identically whether it created an account or found
  /// the address already taken — no account enumeration. There is therefore
  /// **nothing here to branch on**, and the screen that calls this must not try:
  /// its copy has to be true for both, which is why it says "check your email"
  /// rather than "account created".
  ///
  /// The design's Screen 3 expects a 409 for a duplicate and inline copy saying
  /// "Email already registered". That response does not exist and will not; the
  /// design predates the decision.
  @override
  Future<void> signUp({
    required String email,
    required String password,
    required String firstName,
    required String lastName,
  }) async {
    try {
      await _api.getAuthApi().signUp(
        signupRequestInput: SignupRequestInput(
          (SignupRequestInputBuilder b) => b
            ..email = email
            ..password = password
            ..firstName = firstName
            ..lastName = lastName,
        ),
      );
    } on DioException catch (error) {
      throw AuthFailure(_kindOf(error));
    } on Object catch (_) {
      throw const AuthFailure(AuthFailureKind.unavailable);
    }
  }

  /// The problem document's `type` slug, reduced to a kind the screen has copy
  /// for.
  ///
  /// **Branches on `type` and never on the status code** (ADR-014: `type` is "a
  /// stable, machine-readable slug and is part of the contract"). Both
  /// `validation-failed` and `password-rejected` are 400 and mean entirely
  /// different things to the person filling in the form.
  ///
  /// Defensive by construction: no response, a non-map body or a missing `type`
  /// all fall through to [AuthFailureKind.unavailable], which is the honest
  /// answer when we cannot tell.
  static AuthFailureKind _kindOf(DioException error) {
    final Object? body = error.response?.data;
    final Object? type = body is Map<String, dynamic> ? body['type'] : null;

    return switch (type) {
      '/problems/password-rejected' => AuthFailureKind.passwordRejected,
      '/problems/validation-failed' => AuthFailureKind.rejected,
      '/problems/rate-limited' => AuthFailureKind.rateLimited,
      _ => AuthFailureKind.unavailable,
    };
  }
}
