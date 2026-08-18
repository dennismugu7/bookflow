import 'package:bookflow/features/business/business_models.dart';
import 'package:bookflow/features/business/business_repository.dart';

/// Whether the signed-in owner has a business yet (ADR-003: one business per
/// account, through a membership row).
enum MembershipStatus {
  /// Signed in, no membership. ADR-031 calls this "a real, representable
  /// state, not an edge case discovered later", and it is where an owner is
  /// between sign-up and creating a business.
  none,

  /// Signed in, with a business.
  member,
}

/// Knows the data source and nothing else (ADR-028).
///
/// ══ THIS USED TO BE A CONSTANT, AND ITS OWN COMMENT SAID WHY ════════════════
///
/// Until 2026-08-18 this file returned `MembershipStatus.none` unconditionally,
/// with a note explaining that this was **the correct answer and not a
/// placeholder**: "There is no way for an owner to acquire a business: business
/// creation is the onboarding slice, which does not exist." It ended:
///
///   "It becomes a lie the moment business creation ships, which is the same
///    moment the endpoint to replace it arrives."
///
/// **Both have now shipped** — `POST /v1/businesses` creates, and
/// `GET /v1/me/business` answers. So the constant is deleted rather than
/// updated: it was a truthful answer to a question that no longer has that
/// answer, and keeping it behind a flag would preserve the lie it warned about.
abstract interface class MembershipRepository {
  Future<MembershipStatus> currentStatus();
}

/// Derives the status from the business the API reports.
///
/// ── WHY THIS DELEGATES RATHER THAN CALLING THE API ITSELF ───────────────────
///
/// `BusinessRepository.fetchMine` already owns the one rule this depends on:
/// **404 means "no business yet" and is a data answer, not an error** — every
/// other failure is rethrown so `AsyncValue` can render it. Reimplementing that
/// mapping here would be a second place for it to drift, and a divergence would
/// show up as the router sending an owner to `/unavailable` instead of
/// `/setup` — a bug two layers from its cause.
///
/// So this is a projection of `BusinessStatus` onto the two values the router
/// needs, and nothing more.
class ApiMembershipRepository implements MembershipRepository {
  const ApiMembershipRepository(this._business);

  final BusinessRepository _business;

  @override
  Future<MembershipStatus> currentStatus() async {
    final BusinessStatus status = await _business.fetchMine();
    return switch (status) {
      NoBusinessYet() => MembershipStatus.none,
      HasBusiness() => MembershipStatus.member,
    };
  }
}
