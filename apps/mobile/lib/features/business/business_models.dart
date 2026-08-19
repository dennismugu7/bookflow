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

/// Creation was refused because the account already has a business (K82,
/// criterion 63).
///
/// ── WHY A TYPE AND NOT A STATUS CODE THE SCREEN READS ───────────────────────
///
/// ADR-014 fixes that the client branches on the problem document's `type` slug
/// and never on a message — and a screen cannot read either, because ADR-028
/// forbids it importing `package:bookflow_api` or Dio at all. So the mapping
/// from `/problems/business-already-exists` to something a widget can branch on
/// happens in the repository, which is the only file allowed to know what a
/// problem document is, and this is what comes out.
///
/// **The status code is deliberately not the discriminator.** 409 is the
/// conflict's transport, not its meaning; a future conflict on this endpoint
/// would share the code and mean something else entirely, and a screen keyed on
/// `409` would confidently show the wrong sentence.
class BusinessAlreadyExists implements Exception {
  const BusinessAlreadyExists();

  @override
  String toString() => 'BusinessAlreadyExists';
}
