import 'package:bookflow/features/bookings/bookings_models.dart';
import 'package:bookflow/features/bookings/bookings_repository.dart';
import 'package:bookflow/platform/providers.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

/// Holds what logic this feature has — state derivation and orchestration,
/// never business rules, which are server-side (ADR-028).

final Provider<BookingsRepository> bookingsRepositoryProvider =
    Provider<BookingsRepository>(
      (Ref ref) => ApiBookingsRepository(ref.watch(apiClientProvider)),
    );

/// Which of the three record views the Bookings tab is showing.
///
/// The design's bottom segmented control is not a display filter over one list —
/// it chooses which set to fetch. So this is a provider rather than screen
/// state: `bookingsProvider` watches it, and changing it re-fetches.
final StateProvider<BookingStatus> bookingFilterProvider =
    StateProvider<BookingStatus>((Ref ref) => BookingStatus.booked);

/// The bookings in the selected record view.
///
/// **An empty list is DATA, not an error and not a separate state.** ADR-028 is
/// explicit that "empty is not an `AsyncValue` case and remains the screen's own
/// responsibility inside the data branch" — which is what lets the Booked tab
/// draw the design's "No Bookings yet" empty state with its share button.
///
/// `.family` on the status rather than one provider reading the filter, so the
/// calendar can ask for what it needs without disturbing the list's selection.
final FutureProviderFamily<List<Booking>, BookingStatus?> bookingsProvider =
    FutureProvider.family<List<Booking>, BookingStatus?>(
      (Ref ref, BookingStatus? status) =>
          ref.watch(bookingsRepositoryProvider).list(status),
    );

/// The salon's clients.
final FutureProvider<List<Contact>> contactsProvider =
    FutureProvider<List<Contact>>(
      (Ref ref) => ref.watch(bookingsRepositoryProvider).contacts(),
    );

/// Every non-cancelled booking, for the calendar.
///
/// ══ FETCHED ONCE AND RENDERED, NOT QUERIED PER CELL ═════════════════════════
///
/// A week grid is seven columns of twenty-four rows. Asking the API what sits in
/// each would be 168 requests to draw one screen, and it would still be wrong —
/// a booking spans rows, so a per-cell query has no single right answer.
///
/// So the calendar holds the list and does its own arithmetic. **Both statuses
/// are fetched separately and combined here** because the API filters by one
/// status at a time; a cancelled booking occupies nothing and must not draw a
/// block, which is the same rule the exclusion constraint applies.
final FutureProvider<List<Booking>>
calendarBookingsProvider = FutureProvider<List<Booking>>((Ref ref) async {
  final BookingsRepository repository = ref.watch(bookingsRepositoryProvider);

  final List<List<Booking>> both = await Future.wait(<Future<List<Booking>>>[
    repository.list(BookingStatus.booked),
    repository.list(BookingStatus.confirmed),
  ]);

  return both.expand((List<Booking> each) => each).toList()
    ..sort((Booking a, Booking b) => a.startsAt.compareTo(b.startsAt));
});

/// A booking transition in flight.
///
/// ── A SUBMISSION IS NOT A READ, AND THE CARD MUST SURVIVE IT ────────────────
///
/// `bookingsProvider` owns the list and may be replaced by a spinner while it
/// loads. A confirm cannot work that way: the expanded card has to stay on
/// screen with its client details visible while the request runs, and on failure
/// it must stay open so the owner can try again rather than be replaced by a
/// full-page error.
///
/// **The id is part of the state** because several cards are on screen at once.
/// A bare `AsyncValue<void>` would put every card's spinner on at the same time,
/// and the owner would not know which one they had pressed.
class BookingActionController extends AutoDisposeNotifier<AsyncValue<String?>> {
  @override
  AsyncValue<String?> build() => const AsyncData<String?>(null);

  /// Whether THIS booking is the one currently in flight.
  bool isBusy(String bookingId) => state.isLoading && _inFlight == bookingId;

  String? _inFlight;

  Future<void> confirm(String id) =>
      _run(id, (BookingsRepository r) => r.confirm(id));

  Future<void> cancel(String id) =>
      _run(id, (BookingsRepository r) => r.cancel(id));

  Future<void> reinstate(String id) =>
      _run(id, (BookingsRepository r) => r.reinstate(id));

  Future<void> _run(
    String id,
    Future<Booking> Function(BookingsRepository) action,
  ) async {
    _inFlight = id;
    state = const AsyncLoading<String?>();

    // `AsyncValue.guard` rather than try/catch: it captures the error AND the
    // stack, which a bare catch drops.
    state = await AsyncValue.guard<String?>(() async {
      await action(ref.read(bookingsRepositoryProvider));

      // ── EVERY VIEW IS INVALIDATED, NOT JUST THE ONE IN FRONT ──────────────
      //
      // A transition MOVES a booking between record views: confirming takes it
      // out of Booked and puts it into Confirmed. Invalidating only the current
      // filter would leave the destination list stale, so the owner would
      // confirm a booking, switch to Confirmed, and not see it — and would
      // reasonably conclude the confirm had failed.
      //
      // The calendar too: a cancel must remove its block, and a reinstate must
      // put one back.
      for (final BookingStatus status in BookingStatus.values) {
        ref.invalidate(bookingsProvider(status));
      }
      ref
        ..invalidate(bookingsProvider(null))
        ..invalidate(calendarBookingsProvider)
        // A first-ever booking creates a contact, and a transition can change
        // which booking is that client's most recent — which is where the name
        // and phone on the contact card come from.
        ..invalidate(contactsProvider);

      return id;
    });
  }
}

final AutoDisposeNotifierProvider<BookingActionController, AsyncValue<String?>>
bookingActionProvider =
    AutoDisposeNotifierProvider<BookingActionController, AsyncValue<String?>>(
      BookingActionController.new,
    );
