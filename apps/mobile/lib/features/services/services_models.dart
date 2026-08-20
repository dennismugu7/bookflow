/// A bookable service, as this feature uses it.
///
/// A view model rather than the generated `Service`, for the reason
/// `business_models.dart` gives: the generated package is regenerated wholesale
/// on every schema change (ADR-025), so anything derived from it would be
/// deleted by the next generation.
class SalonService {
  const SalonService({
    required this.id,
    required this.name,
    required this.durationMinutes,
    required this.priceKes,
    required this.position,
  });

  final String id;
  final String name;

  /// Whole minutes. The API's floor is 1 and its ceiling is a day.
  final int durationMinutes;

  /// ── WHOLE SHILLINGS. NOT CENTS, NOT A DOUBLE ──────────────────────────────
  ///
  /// The project invariant, and `int` is how it is enforced on this side: a
  /// `double` here would let a rounding error into a price list, and there is
  /// no sub-shilling amount for it to be rounding to. `ui/money.dart` owns
  /// every string built from this.
  final int priceKes;

  /// Display order. Ties break on creation time, server-side.
  final int position;
}

/// The service name is already used by another of this salon's services.
///
/// A typed error rather than a `DioException` reaching a widget, for the same
/// reason `BusinessAlreadyExists` exists: ADR-028 keeps the generated client
/// and Dio out of `features/` except in a repository, and a screen that had to
/// read a status code to write a sentence would be reading the wire.
///
/// **Names are unique per salon and people are not**, which is why there is no
/// equivalent for team members — two stylists called Grace is an ordinary fact
/// about a salon, and the API has no constraint that refuses the second.
class ServiceNameTaken implements Exception {
  const ServiceNameTaken();

  @override
  String toString() => 'ServiceNameTaken';
}
