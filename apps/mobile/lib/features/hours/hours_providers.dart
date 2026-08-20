import 'package:bookflow/features/hours/hours_models.dart';
import 'package:bookflow/features/hours/hours_repository.dart';
import 'package:bookflow/platform/providers.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

/// Holds what logic this feature has (ADR-028).

final Provider<HoursRepository> hoursRepositoryProvider =
    Provider<HoursRepository>(
      (Ref ref) => ApiHoursRepository(ref.watch(apiClientProvider)),
    );

/// The week as stored. An empty list means closed every day (A6).
final FutureProvider<List<DayHours>> myOpeningHoursProvider =
    FutureProvider<List<DayHours>>(
      (Ref ref) => ref.watch(hoursRepositoryProvider).fetch(),
    );

/// The save.
///
/// Held here and consumed inside the screen rather than handed to
/// `AsyncValueView`: a failed save must leave the seven rows exactly as the
/// owner arranged them, and a full-page error would discard an edit that took
/// seven interactions to make.
class SaveHoursController extends AutoDisposeNotifier<AsyncValue<void>> {
  @override
  AsyncValue<void> build() => const AsyncData<void>(null);

  Future<void> save(List<DayHours> days) async {
    state = const AsyncLoading<void>();

    state = await AsyncValue.guard<void>(() async {
      await ref.read(hoursRepositoryProvider).replace(days);

      // Both, in this order, for the reason the services controller gives: this
      // screen renders the week, and the dashboard's checklist counts open days
      // to decide whether that step is done.
      ref.invalidate(myOpeningHoursProvider);
      await ref.read(myOpeningHoursProvider.future);
    });
  }
}

final AutoDisposeNotifierProvider<SaveHoursController, AsyncValue<void>>
saveHoursControllerProvider =
    AutoDisposeNotifierProvider<SaveHoursController, AsyncValue<void>>(
      SaveHoursController.new,
    );
