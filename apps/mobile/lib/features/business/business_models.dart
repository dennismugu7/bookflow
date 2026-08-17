/// The owner's business, as this feature uses it.
///
/// A view model rather than the generated `Business`, for the same reason
/// `OwnerProfile` is one: the generated package is regenerated wholesale on
/// every schema change (ADR-025), so anything this feature derives or depends
/// on hanging off it would be deleted by the next generation.
class OwnedBusiness {
  const OwnedBusiness({
    required this.id,
    required this.name,
    required this.published,
  });

  final String id;
  final String name;

  /// ADR-004: private until explicitly published. Nothing in this slice
  /// publishes, so this is `false` for every business it creates — but it is
  /// carried rather than dropped, because the dashboard's setup-continuation
  /// state is keyed on it.
  final bool published;
}

/// Whether the signed-in owner has a business, and which one.
///
/// ── WHY A SEALED RESULT AND NOT `OwnedBusiness?` ────────────────────────────
///
/// A nullable would work and would be worse. `GET /v1/me/business` answers 404
/// for "you have not created one yet", and that 404 has to travel up as **an
/// answer, not an error** — see `business_repository.dart`. A bare `null`
/// invites the reading that something went wrong and got swallowed; naming the
/// case makes the absence deliberate and forces every consumer to say what it
/// does about it.
sealed class BusinessStatus {
  const BusinessStatus();
}

/// The account exists and owns nothing. The ordinary state of every owner
/// between sign-up and onboarding.
final class NoBusinessYet extends BusinessStatus {
  const NoBusinessYet();
}

/// The account owns this business.
final class HasBusiness extends BusinessStatus {
  const HasBusiness(this.business);

  final OwnedBusiness business;
}
