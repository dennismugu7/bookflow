import 'package:test/test.dart';
import 'package:bookflow_api/bookflow_api.dart';

/// tests for PublicApi
void main() {
  final instance = BookflowApi().getPublicApi();

  group(PublicApi, () {
    // Book a slot
    //
    // Unauthenticated, multipart/form-data. Fields: serviceId, startsAt (ISO 8601), clientName, clientEmail, clientPhone, optional teamMemberId, optional paymentProof (JPEG or PNG, 5 MB). The service name, duration and price are snapshotted from the service row at booking time (ADR-006) and never taken from the request. A slot taken concurrently answers 409 slot-taken — that race is what the database exclusion constraint exists for, and the client should re-read availability.
    //
    //Future<BookingReceipt> createSalonBooking(String handle) async
    test('test createSalonBooking', () async {
      // TODO
    });

    // A published salon’s booking page
    //
    // Unauthenticated. Returns an allowlist projection — no ids beyond the service and team-member ids booking will reference, no owner, no timestamps. A handle that does not exist and a salon that is not published are the same 404, deliberately: distinguishing them would let anyone enumerate unpublished salons by name.
    //
    //Future<PublicSalon> getPublicSalon(String handle) async
    test('test getPublicSalon', () async {
      // TODO
    });

    // Bookable start times for one service on one day
    //
    // Unauthenticated. Slots are on a 30-minute grid anchored to the opening time, and a slot is offered only when the service fits before closing AND nothing already occupies it — matching the exclusion constraint exactly, so an offered slot does not 409. Times are Africa/Nairobi (ADR-005). A past date or one beyond 60 days is refused as validation-failed rather than answered with an empty list.
    //
    //Future<Availability> getSalonAvailability(String serviceId, String date, String handle, { String teamMemberId }) async
    test('test getSalonAvailability', () async {
      // TODO
    });
  });
}
