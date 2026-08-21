/// The owner's diary, as this feature uses it.
///
/// View models rather than the generated types, for the reason `OwnedBusiness`
/// gives: `packages/bookflow_api` is regenerated wholesale on every schema
/// change (ADR-025), so anything hanging off a generated class is deleted by the
/// next generation.
library;

/// Where a booking is in its life.
///
/// ══ AN ENUM, NOT A STRING, AND THE FILTER BAR IS WHY ════════════════════════
///
/// Three screens key off this: the segmented filter chooses which to fetch, the
/// status pill colours itself from it, and the action links decide which of
/// confirm/cancel/reinstate to offer. A raw `String` would let a typo produce a
/// card with no actions at all — visible only to whoever hit that one status.
enum BookingStatus {
  /// The client has booked and the salon has not yet acted.
  booked('booked'),

  /// The salon has confirmed. The client has been emailed.
  confirmed('confirmed'),

  /// Cancelled — by the salon. **Not terminal**: the design gives cancelled
  /// bookings a reinstate path, and the API allows `cancelled → booked`.
  cancelled('cancelled');

  const BookingStatus(this.wire);

  /// What the API calls it. Kept beside the value so the mapping is one place.
  final String wire;

  /// The label the design puts on the filter tab and the status pill.
  String get label => switch (this) {
    BookingStatus.booked => 'Booked',
    BookingStatus.confirmed => 'Confirmed',
    BookingStatus.cancelled => 'Cancelled',
  };

  /// Tolerant of a value this app does not know.
  ///
  /// A status the client cannot name is not a reason to fail a whole list — the
  /// API's vocabulary can grow before this app is rebuilt, and a booking shown
  /// as `booked` with the wrong actions is recoverable where a crashed screen
  /// is not.
  static BookingStatus parse(String wire) => BookingStatus.values.firstWhere(
    (BookingStatus s) => s.wire == wire,
    orElse: () => BookingStatus.booked,
  );
}

/// One booking, as the salon owner sees it.
class Booking {
  const Booking({
    required this.id,
    required this.serviceName,
    required this.durationMinutes,
    required this.priceKes,
    required this.clientName,
    required this.clientEmail,
    required this.clientPhone,
    required this.startsAt,
    required this.status,
    required this.hasPaymentProof,
    this.teamMemberName,
  });

  final String id;

  /// ADR-006: the SNAPSHOT taken when the booking was made, never a live join.
  /// If the salon has since renamed the service or changed its price, the card
  /// shows what the client actually agreed to.
  final String serviceName;
  final int durationMinutes;
  final int priceKes;

  final String clientName;
  final String clientEmail;
  final String clientPhone;

  /// The appointment, as a real instant. Rendered in the salon's zone.
  final DateTime startsAt;

  final BookingStatus status;

  /// ══ A BOOLEAN, AND DELIBERATELY NOT A URL ═════════════════════════════════
  ///
  /// The proof lives in a private bucket. The list says only whether there is
  /// one, so the card knows whether to offer the link; the address is minted on
  /// demand, expires in about five minutes, and is never stored (ADR-011).
  ///
  /// It used to be a `paymentProofUrl` pointing into the PUBLIC bucket, which
  /// made a client's financial document readable by anyone who saw the string.
  final bool hasPaymentProof;

  /// Null when the booking was made as "any professional".
  final String? teamMemberName;

  /// When the appointment ends, from the snapshot.
  ///
  /// Derived rather than carried: the API computes `ends_at` with a trigger and
  /// the exclusion constraint indexes it, so a THIRD expression of the same
  /// fact travelling over the wire is one more thing that can disagree. The
  /// calendar needs a block height and this is enough for it.
  DateTime get endsAt => startsAt.add(Duration(minutes: durationMinutes));
}

/// Someone who has booked. Derived from bookings — there is no contacts table.
class Contact {
  const Contact({
    required this.name,
    required this.email,
    required this.phone,
    required this.bookingCount,
    required this.lastBookingAt,
  });

  final String name;
  final String email;
  final String phone;
  final int bookingCount;
  final DateTime lastBookingAt;
}

/// A reinstate was refused because something else has taken the slot.
///
/// A typed error for the reason `BusinessAlreadyExists` is one: ADR-028 keeps
/// Dio and the problem document out of every screen, and the card needs to say
/// something specific rather than "something went wrong".
///
/// **This is not a defensive case.** A cancelled booking occupies nothing, so
/// its slot is genuinely free and a client may have booked it in the meantime —
/// the exclusion constraint refuses the reinstate, and it is right to.
class SlotTaken implements Exception {
  const SlotTaken();

  @override
  String toString() => 'SlotTaken';
}

/// The proof could not be produced: no proof, or the object is gone.
///
/// The API answers 404 for both, deliberately — and for "not your booking" too.
/// A caller who may not read a proof may not learn whether there is one.
class PaymentProofUnavailable implements Exception {
  const PaymentProofUnavailable();

  @override
  String toString() => 'PaymentProofUnavailable';
}
