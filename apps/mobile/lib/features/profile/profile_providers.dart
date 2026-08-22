import 'package:bookflow/features/profile/profile_models.dart';
import 'package:bookflow/features/profile/profile_repository.dart';
import 'package:bookflow/platform/providers.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

/// Holds what logic this feature has — state derivation and orchestration, never
/// business rules, which are server-side (ADR-028).
///
/// There is little to derive here, and that is the point of the one true page:
/// screen #20 exercises every layer without any of them having to be clever.

final Provider<ProfileRepository> profileRepositoryProvider =
    Provider<ProfileRepository>(
      (Ref ref) => ApiProfileRepository(ref.watch(apiClientProvider)),
    );

/// The caller's own profile.
///
/// A `FutureProvider`, so the three `AsyncValue` states arrive without this file
/// managing any of them: loading while the request is in flight, error if it
/// throws, data on success. The screen renders all three through
/// `AsyncValueView` (ADR-028).
///
/// **Errors are not caught here.** A `DioException` from a 401 has already
/// ended the session by the time it lands — the interceptor in
/// `platform/api_client.dart` runs first — and the router moves the user to the
/// welcome shell. Catching it here would leave them looking at an error screen
/// for a session that no longer exists.
final FutureProvider<OwnerProfile> myProfileProvider =
    FutureProvider<OwnerProfile>(
      (Ref ref) => ref.watch(profileRepositoryProvider).fetchMine(),
    );

/// The rename submission (screen #20's Edit toggle).
///
/// Held here and consumed inside the card rather than handed to
/// `AsyncValueView`, for the reason `business_providers.dart` sets out at
/// length: a form must stay on screen with what the owner typed while the
/// request runs, and on failure it must keep the typed value rather than swap
/// itself for a full-page error whose retry has forgotten the input.
class RenameProfileController extends AutoDisposeNotifier<AsyncValue<void>> {
  @override
  AsyncValue<void> build() => const AsyncData<void>(null);

  Future<void> rename({
    required String firstName,
    required String lastName,
  }) async {
    state = const AsyncLoading<void>();

    state = await AsyncValue.guard<void>(() async {
      await ref
          .read(profileRepositoryProvider)
          .rename(firstName: firstName, lastName: lastName);

      // Refreshed so the card shows the STORED name rather than the typed one.
      // They differ whenever the server trims, and showing the typed value
      // would quietly hide that — the same reason the business rename refetches.
      ref.invalidate(myProfileProvider);
      await ref.read(myProfileProvider.future);
    });
  }
}

final AutoDisposeNotifierProvider<RenameProfileController, AsyncValue<void>>
renameProfileControllerProvider =
    AutoDisposeNotifierProvider<RenameProfileController, AsyncValue<void>>(
      RenameProfileController.new,
    );

/// The account deletion (screens #25–#27).
///
/// ══ THIS DELETES AND DOES NOT SIGN OUT ══════════════════════════════════════
///
/// The obvious shape is delete-then-sign-out here, and it does not work: the
/// router's redirect would move off `/delete-account` in the same frame the
/// session ends, and the owner would never see screen #27's confirmation that
/// their account is gone. `router.dart` explains the mechanism at the
/// `/delete-account` entry.
///
/// So signing out belongs to the Done button, and `delete_account_screen.dart`
/// records what the gap costs.
///
/// **The API call must come first regardless.** Signing out before it would
/// take the token with it, the deletion would answer 401, and the account would
/// survive while the owner was shown a success screen.
class DeleteAccountController extends AutoDisposeNotifier<AsyncValue<void>> {
  @override
  AsyncValue<void> build() => const AsyncData<void>(null);

  Future<void> delete({
    required String password,
    required String? reason,
  }) async {
    state = const AsyncLoading<void>();

    state = await AsyncValue.guard<void>(
      () => ref
          .read(profileRepositoryProvider)
          .deleteAccount(password: password, reason: reason),
    );
  }
}

final AutoDisposeNotifierProvider<DeleteAccountController, AsyncValue<void>>
deleteAccountControllerProvider =
    AutoDisposeNotifierProvider<DeleteAccountController, AsyncValue<void>>(
      DeleteAccountController.new,
    );
