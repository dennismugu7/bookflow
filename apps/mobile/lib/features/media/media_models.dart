/// Images, as this feature uses them.
///
/// View models rather than the generated `UploadedImage` and `PortfolioImage`,
/// for the reason `business_models.dart` gives: the generated package is
/// regenerated wholesale on every schema change (ADR-025), so anything derived
/// from it would be deleted by the next generation. The names collide with the
/// generated ones deliberately — the repository hides those, and nothing else
/// in the app can see them at all.
library;

/// What an upload is for.
///
/// A closed set, matching the API's own vocabulary exactly. It decides the
/// object's key prefix in storage and which table (if any) records the result,
/// so a fourth value is a deliberate change on both sides rather than a string
/// that quietly does nothing.
enum ImagePurpose {
  banner,
  team,
  portfolio;

  /// The wire value. Named rather than relying on `name` so a rename of the
  /// enum member cannot silently change what is sent.
  String get wire => switch (this) {
    ImagePurpose.banner => 'banner',
    ImagePurpose.team => 'team',
    ImagePurpose.portfolio => 'portfolio',
  };
}

/// An image that is stored and publicly readable.
class UploadedImage {
  const UploadedImage({required this.url, required this.portfolioImageId});

  final String url;

  /// Only a `portfolio` upload creates a row of its own; a banner is a column
  /// on the business and a team photo is a column on the member.
  final String? portfolioImageId;
}

/// A gallery image on the public booking page.
class PortfolioImage {
  const PortfolioImage({
    required this.id,
    required this.imageUrl,
    required this.position,
  });

  final String id;
  final String imageUrl;
  final int position;
}

/// The file was refused before it was stored — wrong type, or over the cap.
///
/// Distinct from a transport failure because the remedy is different: this one
/// the owner can fix by choosing a different picture, and telling them to check
/// their connection would send them to fix something that is not broken.
class UploadRejected implements Exception {
  const UploadRejected();

  @override
  String toString() => 'UploadRejected';
}

/// Object storage is unreachable or refused for a reason that is not the
/// caller's fault. Retryable, unlike [UploadRejected].
class UploadUnavailable implements Exception {
  const UploadUnavailable();

  @override
  String toString() => 'UploadUnavailable';
}
