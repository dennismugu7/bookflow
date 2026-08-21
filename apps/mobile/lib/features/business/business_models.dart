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
    this.handle,
    this.tagline,
    this.about,
    this.category,
    this.address,
    this.mapsUrl,
    this.bannerUrl,
  });

  final String id;
  final String name;

  /// ADR-004: private until explicitly published. The dashboard's checklist and
  /// its published state are both keyed on this.
  final bool published;

  /// The public booking address, or null until the salon is published.
  ///
  /// ── THIS ARRIVED LATE, AND THE WORKAROUND IT REPLACED IS GONE ────────────
  ///
  /// `GET /v1/me/business` used to return `{id, name, published}` only, so the
  /// dashboard learned its own handle by calling the idempotent publish
  /// endpoint — safe, because that endpoint is idempotent by design, and still
  /// a POST on a read path with one edge it could not cover: a published salon
  /// whose services had all been deleted failed the requirements check and got
  /// a 409 instead of its handle.
  ///
  /// The API now returns it. `publishedSalonProvider` and its extra round trip
  /// are deleted.
  final String? handle;

  /// ── THE PROFILE FIELDS, AND THE WORKAROUND THEY ALSO ENDED ────────────────
  ///
  /// These were absent from `GET /v1/me/business` for the same stretch as
  /// `handle`, and their absence cost more. The edit form could not prefill, so
  /// **blank had to mean "leave unchanged"** — a form that cannot show a stored
  /// tagline must not wipe one — and the consequence was that nothing could ever
  /// be cleared. The form carried a line of apology saying so.
  ///
  /// Now they arrive, the form prefills, and an emptied box means the owner
  /// emptied it. `business_repository.dart` sends all five on every save.
  final String? tagline;
  final String? about;
  final String? category;
  final String? address;
  final String? mapsUrl;

  /// The banner, shown as a thumbnail and **never sent back**.
  ///
  /// `POST /v1/me/business/images` writes this column when the purpose is
  /// `banner`, so the upload has already saved it by the time the form could
  /// include it. `RenameBusinessRequest` has no field for it, which is the API
  /// making the same point structurally.
  final String? bannerUrl;
}

/// Publishing was refused because the salon is not ready.
///
/// A typed error for the reason `BusinessAlreadyExists` is one: ADR-028 keeps
/// Dio out of `features/` outside a repository, and the screen needs to say
/// something specific rather than "something went wrong".
class PublishRequirementsNotMet implements Exception {
  const PublishRequirementsNotMet();

  @override
  String toString() => 'PublishRequirementsNotMet';
}

/// A salon that is live, and the address it is live at.
class PublishedSalon {
  const PublishedSalon({required this.name, required this.handle});

  final String name;

  /// ADR-021: permanent once assigned. A rename retires it; nothing reassigns
  /// it. The booking link is built from this and never stored whole, so a
  /// change to the web app's origin is one constant rather than a migration.
  final String handle;
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
