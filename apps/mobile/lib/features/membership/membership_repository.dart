/// Whether the signed-in owner has a business yet (ADR-003: one business per
/// account, through a membership row).
enum MembershipStatus {
  /// Signed in, no membership. ADR-031 calls this "a real, representable
  /// state, not an edge case discovered later", and ADR-032 gives it the
  /// stubbed "finish setting up" screen.
  none,

  /// Signed in, with a business.
  member,
}

/// Knows the data source and nothing else (ADR-028).
///
/// ══ WHY THE IMPLEMENTATION BELOW IS A CONSTANT ══════════════════════════════
///
/// **`apps/api` has no endpoint that answers this question.** It serves
/// `GET /v1/me` (the caller's own profile) and `GET /v1/businesses/{id}` (one
/// business, by id, scoped through membership). Neither answers "does this user
/// have a business at all", and inventing one here would be inventing an API
/// change in a client PR.
///
/// So this returns `MembershipStatus.none`, and **that is the correct answer
/// today, not a placeholder standing in for one.** There is no way for an owner
/// to acquire a business: business creation is the onboarding slice, which does
/// not exist. Every signed-in user genuinely has no membership, so the stub is
/// what every signed-in user should genuinely see.
///
/// **It becomes a lie the moment business creation ships**, which is the same
/// moment the endpoint to replace it arrives. The test that pins this is in
/// `test/router_redirect_test.dart`: it drives both statuses through the
/// redirect by overriding this repository, so the `member` path is exercised
/// even though nothing in production can currently produce it.
abstract interface class MembershipRepository {
  Future<MembershipStatus> currentStatus();
}

/// See the note above. Deliberately not named `FakeMembershipRepository` — it is
/// not standing in for a real one that exists elsewhere.
class NoBusinessYetMembershipRepository implements MembershipRepository {
  const NoBusinessYetMembershipRepository();

  @override
  Future<MembershipStatus> currentStatus() async => MembershipStatus.none;
}
