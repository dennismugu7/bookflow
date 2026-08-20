import 'package:bookflow/features/services/services_models.dart';
import 'package:bookflow/features/services/services_repository.dart';
import 'package:bookflow/platform/providers.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

/// Holds what logic this feature has — state derivation and orchestration,
/// never business rules, which are server-side (ADR-028).

final Provider<ServicesRepository> servicesRepositoryProvider =
    Provider<ServicesRepository>(
      (Ref ref) => ApiServicesRepository(ref.watch(apiClientProvider)),
    );

/// The salon's services.
///
/// **An empty list is DATA, not an error and not a separate state.** ADR-028 is
/// explicit that "empty is not an `AsyncValue` case and remains the screen's own
/// responsibility inside the data branch" — which is what lets the screen draw
/// the design's empty state rather than a spinner or an apology.
final FutureProvider<List<SalonService>> myServicesProvider =
    FutureProvider<List<SalonService>>(
      (Ref ref) => ref.watch(servicesRepositoryProvider).list(),
    );

/// The add/edit/delete submission.
///
/// Held here and consumed inside the sheet rather than handed to
/// `AsyncValueView`, for the reason `business_providers.dart` sets out: a form
/// must stay on screen with what the user typed while the request runs, and on
/// failure it must keep the typed value rather than swap itself for a full-page
/// error whose retry button has forgotten the input.
class ServiceEditorController extends AutoDisposeNotifier<AsyncValue<void>> {
  @override
  AsyncValue<void> build() => const AsyncData<void>(null);

  Future<void> save({
    required String? id,
    required String name,
    required int durationMinutes,
    required int priceKes,
  }) async {
    state = const AsyncLoading<void>();

    // `AsyncValue.guard` rather than try/catch: it captures the error AND the
    // stack, which a bare catch drops.
    state = await AsyncValue.guard<void>(() async {
      final ServicesRepository repository = ref.read(
        servicesRepositoryProvider,
      );

      // `id == null` is the whole difference between adding and editing, and
      // the sheet is otherwise identical — so it is one method rather than two
      // that would drift.
      if (id == null) {
        await repository.create(
          name: name,
          durationMinutes: durationMinutes,
          priceKes: priceKes,
        );
      } else {
        await repository.update(
          id: id,
          name: name,
          durationMinutes: durationMinutes,
          priceKes: priceKes,
        );
      }

      await _refresh();
    });
  }

  Future<void> delete(String id) async {
    state = const AsyncLoading<void>();

    state = await AsyncValue.guard<void>(() async {
      await ref.read(servicesRepositoryProvider).delete(id);
      await _refresh();
    });
  }

  /// Re-reads the list AND the dashboard's view of it.
  ///
  /// Both, in this order, for the reason `CreateBusinessController` gives about
  /// its two invalidations: the list is what this screen renders, and the
  /// dashboard's checklist counts services to decide whether that step is done.
  /// Invalidating only the first would leave `/home` claiming there are none.
  Future<void> _refresh() async {
    ref.invalidate(myServicesProvider);
    await ref.read(myServicesProvider.future);
  }
}

final AutoDisposeNotifierProvider<ServiceEditorController, AsyncValue<void>>
serviceEditorControllerProvider =
    AutoDisposeNotifierProvider<ServiceEditorController, AsyncValue<void>>(
      ServiceEditorController.new,
    );
