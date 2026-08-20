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

/// The password-reset flow's three steps.
///
/// **One controller for all three**, because they are one conversation about
/// one address and each step's error area replaces the last. Three controllers
/// would let a stale failure from step 1 sit under step 3's form.
class ResetPasswordController extends AutoDisposeNotifier<AsyncValue<void>> {
  @override
  AsyncValue<void> build() => const AsyncData<void>(null);

  /// Step 1. Succeeds whether or not the address has an account — see
  /// `AuthGateway.requestPasswordReset`.
  Future<void> request({required String email}) async {
    state = const AsyncLoading<void>();

    state = await AsyncValue.guard<void>(
      () => ref.read(authGatewayProvider).requestPasswordReset(email: email),
    );
  }

  /// Step 1 again, from the code screen's resend link.
  Future<void> resend({required String email}) => request(email: email);

  /// Step 2. **Opens a recovery session**, so the flag goes up FIRST — before
  /// the request, not after it — or the session would arrive while the router
  /// still thought it was a login and the shell would move.
  Future<void> verifyCode({required String email, required String code}) async {
    state = const AsyncLoading<void>();
    ref.read(passwordRecoveryProvider.notifier).begin();

    state = await AsyncValue.guard<void>(
      () => ref
          .read(authGatewayProvider)
          .verifyRecoveryCode(email: email, code: code),
    );

    // A code that was refused opened no session, so the flag must come back
    // down or the app is stuck at the signed-out shell with no way to leave it.
    if (state.hasError) ref.read(passwordRecoveryProvider.notifier).end();
  }

  /// Step 3. The gateway signs out after setting the password, so the flag ends
  /// with it — and only on success: a rejected password leaves the recovery
  /// session open on purpose so another can be tried without a new code.
  Future<void> setPassword({required String newPassword}) async {
    state = const AsyncLoading<void>();

    state = await AsyncValue.guard<void>(
      () => ref
          .read(authGatewayProvider)
          .setNewPassword(newPassword: newPassword),
    );

    if (!state.hasError) ref.read(passwordRecoveryProvider.notifier).end();
  }

  /// Leaving the flow with a recovery session open. Ends it, because a session
  /// nobody asked for outliving the screen that created it is how a stranger
  /// ends up signed in as somebody.
  Future<void> abandon() async {
    if (!ref.read(passwordRecoveryProvider)) return;
    try {
      await ref.read(authGatewayProvider).signOut();
    } on Object catch (_) {
      // The flag comes down either way: leaving it up strands the app at the
      // signed-out shell, which is worse than a session that expires by itself.
    }
    ref.read(passwordRecoveryProvider.notifier).end();
  }

  /// Clears a failure so the next step opens with a clean error area. Called
  /// when the flow advances, never on a retry within a step.
  void clear() => state = const AsyncData<void>(null);
}

final AutoDisposeNotifierProvider<ResetPasswordController, AsyncValue<void>>
resetPasswordControllerProvider =
    AutoDisposeNotifierProvider<ResetPasswordController, AsyncValue<void>>(
      ResetPasswordController.new,
    );

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
