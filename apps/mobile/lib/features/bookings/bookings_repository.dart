import 'package:bookflow/features/bookings/bookings_models.dart';
// ── `Contact` EXISTS ON BOTH SIDES, AND THAT IS NOT AN ACCIDENT ─────────────
//
// The view model and the generated model describe the same thing, so they want
// the same name. `media_repository.dart` set the precedent for the collision:
// hide the generated one from the bare import and reach it through a prefix, so
// every mention says which side of the wire it is on.
import 'package:bookflow_api/bookflow_api.dart' hide Contact;
import 'package:bookflow_api/bookflow_api.dart' as api show Contact;
// The generated client's collection type — what `listMyBookings` returns, so a
// repository that unwraps it has to name it. Nothing outside this file does.
import 'package:built_collection/built_collection.dart';
import 'package:dio/dio.dart';

/// Knows the data source and nothing else (ADR-028).
///
/// **The only file in `features/bookings/` that may import
/// `package:bookflow_api`**, and `test/design_system_test.dart` enforces it by
/// filename.
abstract interface class BookingsRepository {
  /// The salon's bookings, optionally filtered.
  ///
  /// The filter is sent to the API rather than applied here. The design's
  /// segmented control is three record views, not three tabs over one list, and
  /// a salon with a year of cancellations should not ship all of them to show
  /// the four bookings the owner is looking at.
  Future<List<Booking>> list(BookingStatus? status);

  /// `booked → confirmed`. Emails the client.
  Future<Booking> confirm(String id);

  /// `booked | confirmed → cancelled`. Emails the client.
  Future<Booking> cancel(String id);

  /// `cancelled → booked`. Throws [SlotTaken] when the slot has since gone.
  Future<Booking> reinstate(String id);

  /// A short-lived URL for one booking's payment proof.
  ///
  /// Throws [PaymentProofUnavailable] when there is nothing to show. **Do not
  /// cache what this returns** — it expires in about five minutes, which is the
  /// whole reason the proof is safe to hand out at all (ADR-011).
  Future<String> paymentProofUrl(String id);

  /// The salon's clients, most recent first.
  Future<List<Contact>> contacts();
}

class ApiBookingsRepository implements BookingsRepository {
  const ApiBookingsRepository(this._api);

  final BookflowApi _api;

  @override
  Future<List<Booking>> list(BookingStatus? status) async {
    final Response<BuiltList<OwnerBooking>> response = await _api
        .getBookingsApi()
        .listMyBookings(status: status?.wire);

    // An empty list is a 200 with `[]`, not a 404 — a salon with no bookings
    // has not failed at anything, and the empty state is the right render.
    return (response.data ?? BuiltList<OwnerBooking>())
        .map(_toBooking)
        .toList();
  }

  @override
  Future<Booking> confirm(String id) async =>
      _one(await _api.getBookingsApi().confirmBooking(bookingId: id));

  @override
  Future<Booking> cancel(String id) async =>
      _one(await _api.getBookingsApi().cancelBooking(bookingId: id));

  /// ══ THE ONE TRANSITION THAT CAN BE REFUSED FOR A GOOD REASON ══════════════
  ///
  /// A cancelled booking occupies nothing, so its slot is genuinely free and
  /// somebody may have taken it. The database's exclusion constraint refuses the
  /// reinstate and the API answers 409 `slot-taken`.
  ///
  /// **This is translated and the rest is rethrown**, for the reason
  /// `business_repository.dart` sets out at length: the screen has a specific
  /// thing to say ("That time has since been taken"), and ADR-028 forbids a
  /// widget knowing what a problem document is.
  ///
  /// **The branch is on the `type` slug and never on 409** — ADR-014 makes the
  /// slug the contract, and this API has several distinct 409s wearing that same
  /// number.
  @override
  Future<Booking> reinstate(String id) async {
    try {
      return _one(await _api.getBookingsApi().reinstateBooking(bookingId: id));
    } on DioException catch (error) {
      if (_slugOf(error) == '/problems/slot-taken') {
        throw const SlotTaken();
      }
      rethrow;
    }
  }

  @override
  Future<String> paymentProofUrl(String id) async {
    try {
      final Response<PaymentProof> response = await _api
          .getBookingsApi()
          .getBookingPaymentProof(bookingId: id);

      final String? url = response.data?.url;
      if (url == null || url.isEmpty) {
        throw StateError('payment-proof returned no url');
      }
      return url;
    } on DioException catch (error) {
      // 404 covers four server-side cases — no such booking, not this owner's,
      // no proof, object gone — deliberately indistinguishable. The card can
      // say only "it is not available", which is exactly as much as the API is
      // willing to reveal and is the right amount.
      if (_slugOf(error) == '/problems/not-found') {
        throw const PaymentProofUnavailable();
      }
      rethrow;
    }
  }

  @override
  Future<List<Contact>> contacts() async {
    final Response<BuiltList<api.Contact>> response = await _api
        .getBookingsApi()
        .listMyContacts();

    return (response.data ?? BuiltList<api.Contact>()).map(_toContact).toList();
  }

  static Booking _one(Response<OwnerBooking> response) {
    final OwnerBooking? booking = response.data;
    if (booking == null) {
      throw StateError('a booking transition returned no body');
    }
    return _toBooking(booking);
  }

  /// The problem document's `type`, or null when the body is not one.
  ///
  /// Defensive by construction, like `business_repository.dart`'s: a transport
  /// failure has no response, an error page is not a map, a truncated body has
  /// no `type`. Every one yields null and the caller rethrows — the failure mode
  /// is "behave exactly as before", never "claim a conflict".
  static String? _slugOf(DioException error) {
    final Object? body = error.response?.data;
    if (body is! Map<String, dynamic>) return null;
    final Object? type = body['type'];
    return type is String ? type : null;
  }

  static Booking _toBooking(OwnerBooking booking) => Booking(
    id: booking.id,
    serviceName: booking.serviceName,
    durationMinutes: booking.durationMinutes,
    priceKes: booking.priceKes,
    clientName: booking.clientName,
    clientEmail: booking.clientEmail,
    clientPhone: booking.clientPhone,
    // ── PARSED TO A REAL INSTANT, NOT KEPT AS TEXT ──────────────────────────
    //
    // The API sends ISO 8601 in UTC. `DateTime.parse` respects the `Z`, so the
    // result is a correct instant; the SCREEN converts it to the salon's zone
    // for display. Keeping the string would push that conversion into every
    // widget that renders a time, and the calendar needs arithmetic on it.
    startsAt: DateTime.parse(booking.startsAt),
    status: BookingStatus.parse(booking.status.name),
    hasPaymentProof: booking.hasPaymentProof,
    teamMemberName: booking.teamMemberName,
  );

  static Contact _toContact(api.Contact contact) => Contact(
    name: contact.name,
    email: contact.email,
    phone: contact.phone,
    bookingCount: contact.bookingCount,
    lastBookingAt: DateTime.parse(contact.lastBookingAt),
  );
}
