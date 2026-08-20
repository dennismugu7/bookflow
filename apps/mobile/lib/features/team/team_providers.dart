import 'package:bookflow/features/team/team_models.dart';
import 'package:bookflow/features/team/team_repository.dart';
import 'package:bookflow/platform/providers.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

/// Holds what logic this feature has (ADR-028).

final Provider<TeamRepository> teamRepositoryProvider =
    Provider<TeamRepository>(
      (Ref ref) => ApiTeamRepository(ref.watch(apiClientProvider)),
    );

/// The salon's team. An empty list is data, not an error (ADR-028).
final FutureProvider<List<TeamMember>> myTeamProvider =
    FutureProvider<List<TeamMember>>(
      (Ref ref) => ref.watch(teamRepositoryProvider).list(),
    );

/// The add/edit/delete submission.
///
/// ── NO DUPLICATE-NAME BRANCH, AND THAT IS THE API'S DECISION ───────────────
///
/// Services are unique per salon because two identically-named services are
/// indistinguishable to a client choosing between them. **People are not
/// services** — two stylists called Grace is an ordinary fact about a salon —
/// so there is no constraint to translate and no `ServiceNameTaken` equivalent
/// here.
class TeamEditorController extends AutoDisposeNotifier<AsyncValue<void>> {
  @override
  AsyncValue<void> build() => const AsyncData<void>(null);

  Future<void> save({
    required String? id,
    required String name,
    required String? role,
    required String? about,
    required String? photoUrl,
  }) async {
    state = const AsyncLoading<void>();

    state = await AsyncValue.guard<void>(() async {
      final TeamRepository repository = ref.read(teamRepositoryProvider);

      if (id == null) {
        await repository.create(
          name: name,
          role: role,
          about: about,
          photoUrl: photoUrl,
        );
      } else {
        await repository.update(
          id: id,
          name: name,
          role: role,
          about: about,
          photoUrl: photoUrl,
        );
      }

      await _refresh();
    });
  }

  Future<void> delete(String id) async {
    state = const AsyncLoading<void>();

    state = await AsyncValue.guard<void>(() async {
      await ref.read(teamRepositoryProvider).delete(id);
      await _refresh();
    });
  }

  Future<void> _refresh() async {
    ref.invalidate(myTeamProvider);
    await ref.read(myTeamProvider.future);
  }
}

final AutoDisposeNotifierProvider<TeamEditorController, AsyncValue<void>>
teamEditorControllerProvider =
    AutoDisposeNotifierProvider<TeamEditorController, AsyncValue<void>>(
      TeamEditorController.new,
    );
