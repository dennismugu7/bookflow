import 'package:bookflow/features/auth/auth_repository.dart';
import 'package:bookflow/platform/providers.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

/// Holds what logic this feature has — state derivation and orchestration,
/// never business rules, which are server-side (ADR-028).

final Provider<AuthRepository> authRepositoryProvider =
    Provider<AuthRepository>(
      (Ref ref) => ApiAuthRepository(ref.watch(apiClientProvider)),
    );

/// ══ WHY EVERY CONTROLLER HERE IS A SUBMISSION, NOT A READ ═══════════════════
///
/// `business_providers.dart` sets the precedent and the reasoning is identical:
/// a form must stay on screen with what the user typed while the request runs,
/// with the spinner on the control alone — and on failure it must keep the
/// typed value and let them try again, not swap itself for a full-page error
/// whose retry button has forgotten the input.
///
/// So each `AsyncValue` below is held here and consumed *inside* the sheet,
/// rather than handed to `AsyncValueView`. ADR-028's exhaustiveness is intact —
/// loading, error and data are all handled — just within one sheet.
///
/// **None of them routes on success.** The session lands in the Supabase client
/// and the existing redirect moves the user (`router.dart`). A controller that
/// navigated would be a second thing deciding where a signed-in user belongs.
class SignupController extends AutoDisposeNotifier<AsyncValue<void>> {
  @override
  AsyncValue<void> build() => const AsyncData<void>(null);

  Future<void> submit({
    required String email,
    required String password,
    required String firstName,
    required String lastName,
  }) async {
    state = const AsyncLoading<void>();

    // `AsyncValue.guard` rather than try/catch: it captures the error AND the
    // stack, which a bare catch drops.
    state = await AsyncValue.guard<void>(
      () => ref
          .read(authRepositoryProvider)
          .signUp(
            email: email,
            password: password,
            firstName: firstName,
            lastName: lastName,
          ),
    );
  }
}

/// Verification and resend, together, because they act on one address and the
/// sheet shows one error area for both.
class VerifyEmailController extends AutoDisposeNotifier<AsyncValue<void>> {
  @override
  AsyncValue<void> build() => const AsyncData<void>(null);

  Future<void> verify({required String email, required String code}) async {
    state = const AsyncLoading<void>();

    state = await AsyncValue.guard<void>(
      () => ref
          .read(authGatewayProvider)
          .verifySignupCode(email: email, code: code),
    );
  }

  Future<void> resend({required String email}) async {
    state = const AsyncLoading<void>();

    state = await AsyncValue.guard<void>(
      () => ref.read(authGatewayProvider).resendSignupCode(email: email),
    );
  }
}

class LoginController extends AutoDisposeNotifier<AsyncValue<void>> {
  @override
  AsyncValue<void> build() => const AsyncData<void>(null);

  Future<void> submit({required String email, required String password}) async {
    state = const AsyncLoading<void>();

    state = await AsyncValue.guard<void>(
      () => ref
          .read(authGatewayProvider)
          .signInWithPassword(email: email, password: password),
    );
  }
}

final AutoDisposeNotifierProvider<SignupController, AsyncValue<void>>
signupControllerProvider =
    AutoDisposeNotifierProvider<SignupController, AsyncValue<void>>(
      SignupController.new,
    );

final AutoDisposeNotifierProvider<VerifyEmailController, AsyncValue<void>>
verifyEmailControllerProvider =
    AutoDisposeNotifierProvider<VerifyEmailController, AsyncValue<void>>(
      VerifyEmailController.new,
    );

final AutoDisposeNotifierProvider<LoginController, AsyncValue<void>>
loginControllerProvider =
    AutoDisposeNotifierProvider<LoginController, AsyncValue<void>>(
      LoginController.new,
    );
