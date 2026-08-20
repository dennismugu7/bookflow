import 'package:bookflow/features/business/business_models.dart';
import 'package:bookflow/features/business/business_repository.dart';
import 'package:bookflow/platform/providers.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

/// Holds what logic this feature has — state derivation and orchestration,
/// never business rules, which are server-side (ADR-028).

final Provider<BusinessRepository> businessRepositoryProvider =
    Provider<BusinessRepository>(
      (Ref ref) => ApiBusinessRepository(ref.watch(apiClientProvider)),
    );

/// The caller's business, or the fact that they have none.
///
/// A `FutureProvider`, so the three `AsyncValue` states arrive without this file
/// managing any of them — the same shape as `myProfileProvider`.
///
/// **Note what is NOT an error here.** Having no business resolves to
/// `NoBusinessYet` in the data branch, because the repository maps that 404 to
/// an answer. The error branch is reserved for things that actually went wrong,
/// which is what lets a screen distinguish "you have not set up yet" from "we
/// could not find out".
final FutureProvider<BusinessStatus> myBusinessProvider =
    FutureProvider<BusinessStatus>(
      (Ref ref) => ref.watch(businessRepositoryProvider).fetchMine(),
    );

/// The rename submission.
///
/// ── A SUBMISSION IS NOT A READ, AND THE DIFFERENCE IS THE WHOLE POINT ───────
///
/// `myBusinessProvider` owns a screen: while it loads there is nothing to show,
/// so `AsyncValueView` can replace the whole thing with a spinner.
///
/// A rename cannot work that way. The form must stay on screen with what the
/// owner typed still in it, while a spinner appears on the control alone — and
/// on failure the screen must keep the typed value and let them try again, not
/// swap itself for a full-page error with a retry button that has forgotten the
/// input.
///
/// So the submission's `AsyncValue` is held here and consumed *within* the
/// section, rather than being handed to `AsyncValueView`. The exhaustiveness
/// that ADR-028 wants is unchanged — the screen still handles loading, error and
/// data — it just does so inside one card instead of across the whole page.
class RenameBusinessController extends AutoDisposeNotifier<AsyncValue<void>> {
  @override
  AsyncValue<void> build() => const AsyncData<void>(null);

  /// Renames, then refreshes the read so the section shows the stored name
  /// rather than the typed one. They differ whenever the server trims
  /// (decision 9), and showing the typed value would quietly hide that.
  Future<void> rename({required String id, required String name}) async {
    state = const AsyncLoading<void>();

    // `AsyncValue.guard` rather than try/catch: it captures the error AND the
    // stack, which a bare catch drops.
    state = await AsyncValue.guard<void>(() async {
      await ref.read(businessRepositoryProvider).rename(id: id, name: name);
      ref.invalidate(myBusinessProvider);
      await ref.read(myBusinessProvider.future);
    });
  }
}

/// The creation submission.
///
/// Same shape as the rename controller and for the same reason (see above): the
/// form must stay on screen with what the owner typed while the request runs,
/// so this is held here and consumed inside the screen rather than handed to
/// `AsyncValueView`.
///
/// **On success it invalidates the membership status**, which is what carries
/// the owner off `/setup`. `appDestinationProvider` recomputes,
/// `MembershipStatus` becomes `member`, and the EXISTING redirect moves them to
/// `/home` — no new routing rule, which is why criterion 25 needs none.
class CreateBusinessController extends AutoDisposeNotifier<AsyncValue<void>> {
  @override
  AsyncValue<void> build() => const AsyncData<void>(null);

  Future<void> create(String name) async {
    state = const AsyncLoading<void>();

    state = await AsyncValue.guard<void>(() async {
      await ref.read(businessRepositoryProvider).create(name);
      // Both, in this order: the business read is what screens display, the
      // membership status is what the redirect decides on. Invalidating only
      // the first would leave the owner on `/setup` looking at nothing.
      ref.invalidate(myBusinessProvider);
      ref.invalidate(membershipStatusProvider);
      await ref.read(membershipStatusProvider.future);
    });
  }
}

/// The salon's public address, once it has one.
///
/// ══ WHY THIS IS A SEPARATE READ AT ALL ══════════════════════════════════════
///
/// `GET /v1/me/business` does not return the handle — see
/// `ApiBusinessRepository.publish`, which explains why the idempotent publish
/// endpoint is the only way to obtain it and what the one-line API fix would
/// be. This provider is where that cost is contained: **one call per refresh,
/// cached by Riverpod**, rather than a call per rebuild.
///
/// `null` for an unpublished salon, and this never publishes one — the guard
/// below is what keeps a read path from having a side effect.
final FutureProvider<PublishedSalon?> publishedSalonProvider =
    FutureProvider<PublishedSalon?>((Ref ref) async {
      final BusinessStatus status = await ref.watch(myBusinessProvider.future);

      final bool isPublished = switch (status) {
        NoBusinessYet() => false,
        HasBusiness(business: final OwnedBusiness value) => value.published,
      };
      if (!isPublished) return null;

      return ref.read(businessRepositoryProvider).publish();
    });

/// The publish action.
///
/// Separate from the read above so the button's spinner and the read's cache do
/// not share a state: a failed publish must not blank the dashboard, and a
/// successful one must refresh three things.
class PublishController extends AutoDisposeNotifier<AsyncValue<void>> {
  @override
  AsyncValue<void> build() => const AsyncData<void>(null);

  Future<void> publish() async {
    state = const AsyncLoading<void>();

    state = await AsyncValue.guard<void>(() async {
      await ref.read(businessRepositoryProvider).publish();

      // The business read carries `published`, which is what swaps the
      // dashboard from the checklist to the live state; the handle read carries
      // the address it shows. Invalidating only the first would leave an owner
      // looking at a published dashboard with no link on it.
      ref.invalidate(myBusinessProvider);
      ref.invalidate(publishedSalonProvider);
      await ref.read(publishedSalonProvider.future);
    });
  }
}

final AutoDisposeNotifierProvider<PublishController, AsyncValue<void>>
publishControllerProvider =
    AutoDisposeNotifierProvider<PublishController, AsyncValue<void>>(
      PublishController.new,
    );

final AutoDisposeNotifierProvider<CreateBusinessController, AsyncValue<void>>
createBusinessControllerProvider =
    AutoDisposeNotifierProvider<CreateBusinessController, AsyncValue<void>>(
      CreateBusinessController.new,
    );

final AutoDisposeNotifierProvider<RenameBusinessController, AsyncValue<void>>
renameBusinessControllerProvider =
    AutoDisposeNotifierProvider<RenameBusinessController, AsyncValue<void>>(
      RenameBusinessController.new,
    );
