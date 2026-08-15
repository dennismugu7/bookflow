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
