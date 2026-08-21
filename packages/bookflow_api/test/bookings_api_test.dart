import 'package:test/test.dart';
import 'package:bookflow_api/bookflow_api.dart';

/// tests for BookingsApi
void main() {
  final instance = BookflowApi().getBookingsApi();

  group(BookingsApi, () {
    // Cancel a booking
    //
    // booked or confirmed → cancelled. Emails the client. The slot becomes bookable again immediately — a cancelled booking occupies nothing.
    //
    //Future<OwnerBooking> cancelBooking(String bookingId) async
    test('test cancelBooking', () async {
      // TODO
    });

    // Confirm a booking
    //
    // booked → confirmed. Emails the client the confirmation. A booking in any other state answers 409 invalid-booking-transition.
    //
    //Future<OwnerBooking> confirmBooking(String bookingId) async
    test('test confirmBooking', () async {
      // TODO
    });

    // The salon's bookings
    //
    // Newest start time first, optionally filtered by status. Carries the snapshot and the client’s details, which is what the salon needs to serve the appointment.
    //
    //Future<BuiltList<OwnerBooking>> listMyBookings({ String status }) async
    test('test listMyBookings', () async {
      // TODO
    });

    // The salon's clients
    //
    // Derived from bookings — there is no contacts table to keep in step. Grouped by email, because a name is not unique and a phone number gets retyped; the name and phone shown are from that client’s most recent booking.
    //
    //Future<BuiltList<Contact>> listMyContacts() async
    test('test listMyContacts', () async {
      // TODO
    });

    // Reinstate a booking
    //
    // cancelled → booked. May answer 409 slot-taken: the slot was free while the booking was cancelled and something else may have taken it, which the exclusion constraint refuses.
    //
    //Future<OwnerBooking> reinstateBooking(String bookingId) async
    test('test reinstateBooking', () async {
      // TODO
    });
  });
}
