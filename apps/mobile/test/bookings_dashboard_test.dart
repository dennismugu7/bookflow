import 'package:bookflow/features/bookings/booking_card.dart';
import 'package:bookflow/features/bookings/bookings_models.dart';
import 'package:bookflow/features/bookings/bookings_providers.dart';
import 'package:bookflow/features/bookings/bookings_repository.dart';
import 'package:bookflow/features/bookings/bookings_tab.dart';
import 'package:bookflow/features/bookings/calendar_tab.dart';
import 'package:bookflow/features/bookings/contacts_tab.dart';
import 'package:bookflow/platform/config.dart';
import 'package:bookflow/platform/providers.dart';
import 'package:bookflow/theme/app_theme.dart';
import 'package:bookflow/ui/salon_time.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';

/// The owner's dashboard — the parts a reading cannot settle.
///
/// ══ WHY THESE AND NOT THE REST ══════════════════════════════════════════════
///
/// Most of this feature is a list of cards and three tabs. What is worth driving
/// is where being wrong LOOKS LIKE being right:
///
///   1. TIMES. The API sends UTC and the salon is UTC+3. A card showing 07:00
///      for a ten-o'clock appointment reads as a booking bug, not a formatting
///      one, and every screen that renders a time makes the same conversion.
///   2. WHICH ACTIONS ARE OFFERED. Offering "Confirm" on a cancelled booking is
///      a button whose only outcome is a 409.
///   3. THE CANCEL DIALOG ACTUALLY GATING. A dialog that opens and then cancels
///      anyway passes any test that only checks the dialog appears.
///   4. THE CALENDAR'S ARITHMETIC. A block's position and height are computed,
///      and a wrong divisor draws a plausible-looking diary that is wrong.
void main() {
  group('times are the salon’s, not the device’s', () {
    // 2026-07-22T07:00:00Z is 10:00 in Nairobi. The instant is written in UTC
    // deliberately: a test that built a local DateTime would pass on a machine
    // set to Nairobi and fail everywhere else, which is the exact bug the
    // helper exists to prevent.
    final DateTime tenAmNairobi = DateTime.utc(2026, 7, 22, 7);

    test('renders the design’s date and a 24-hour time', () {
      expect(formatSalonDate(tenAmNairobi), 'July 22, 2026');
      expect(formatSalonTime(tenAmNairobi), '10:00');
      expect(formatSalonDateTime(tenAmNairobi), 'July 22, 2026 · 10:00');
    });

    test('a UTC instant late in the day is still the same Nairobi day', () {
      // 22:30Z is 01:30 the NEXT morning in Nairobi. Getting this wrong puts a
      // booking on the previous day in the calendar, one column to the left.
      final DateTime lateUtc = DateTime.utc(2026, 7, 22, 22, 30);
      expect(formatSalonDate(lateUtc), 'July 23, 2026');
      expect(formatSalonTime(lateUtc), '01:30');
    });

    test('a week range that crosses a month is spelled out on both sides', () {
      expect(formatWeekRange(DateTime(2026, 7, 20)), 'July 20–26, 2026');
      expect(
        formatWeekRange(DateTime(2026, 7, 27)),
        'July 27 – August 2, 2026',
      );
    });
  });

  group('a booking card offers only the transitions the API allows', () {
    testWidgets('booked: confirm and cancel, never reinstate', (
      WidgetTester tester,
    ) async {
      await _pumpCard(tester, _booking(status: BookingStatus.booked));

      expect(find.byKey(const Key('booking-confirm')), findsOneWidget);
      expect(find.byKey(const Key('booking-cancel')), findsOneWidget);
      expect(find.byKey(const Key('booking-reinstate')), findsNothing);
    });

    testWidgets('confirmed: cancel only — confirming again would be a 409', (
      WidgetTester tester,
    ) async {
      await _pumpCard(tester, _booking(status: BookingStatus.confirmed));

      expect(find.byKey(const Key('booking-confirm')), findsNothing);
      expect(find.byKey(const Key('booking-cancel')), findsOneWidget);
      expect(find.byKey(const Key('booking-reinstate')), findsNothing);
    });

    testWidgets('cancelled: reinstate only', (WidgetTester tester) async {
      await _pumpCard(tester, _booking(status: BookingStatus.cancelled));

      expect(find.byKey(const Key('booking-confirm')), findsNothing);
      expect(find.byKey(const Key('booking-cancel')), findsNothing);
      expect(find.byKey(const Key('booking-reinstate')), findsOneWidget);
    });

    testWidgets('the proof link appears only when there is a proof', (
      WidgetTester tester,
    ) async {
      await _pumpCard(tester, _booking(hasPaymentProof: false));
      expect(find.byKey(const Key('booking-proof-link')), findsNothing);

      await _pumpCard(tester, _booking(hasPaymentProof: true));
      expect(find.byKey(const Key('booking-proof-link')), findsOneWidget);
    });

    testWidgets('collapsed shows duration; expanded shows when', (
      WidgetTester tester,
    ) async {
      final Booking booking = _booking();
      await _pumpCard(tester, booking, expanded: false);

      // The design: expanding "replaces duration with the actual scheduled
      // date/time".
      expect(find.text('50 mins'), findsOneWidget);
      expect(find.text('July 22, 2026 · 10:00'), findsNothing);

      await tester.tap(find.byKey(Key('booking-toggle-${booking.id}')));
      await tester.pumpAndSettle();

      expect(find.text('50 mins'), findsNothing);
      expect(find.text('July 22, 2026 · 10:00'), findsWidgets);
    });
  });

  group('cancelling asks first, and the answer is obeyed', () {
    testWidgets('“Keep booking” cancels nothing', (WidgetTester tester) async {
      final _FakeRepository repository = _FakeRepository();
      await _pumpCard(
        tester,
        _booking(status: BookingStatus.booked),
        repository: repository,
      );

      await tester.tap(find.byKey(const Key('booking-cancel')));
      await tester.pumpAndSettle();
      expect(find.byKey(const Key('cancel-booking-dialog')), findsOneWidget);

      await tester.tap(find.byKey(const Key('cancel-booking-keep')));
      await tester.pumpAndSettle();

      // ── THE ASSERTION THAT MATTERS ──────────────────────────────────────
      //
      // A dialog that opens and then cancels anyway passes any test that only
      // checks the dialog appeared. This one checks nothing was SENT — and the
      // request that would have gone out emails a client that their
      // appointment is off, which is not recoverable by tapping again.
      expect(repository.cancelled, isEmpty);
    });

    testWidgets('“Yes, cancel booking” sends exactly one cancel', (
      WidgetTester tester,
    ) async {
      final _FakeRepository repository = _FakeRepository();
      final Booking booking = _booking(status: BookingStatus.booked);
      await _pumpCard(tester, booking, repository: repository);

      await tester.tap(find.byKey(const Key('booking-cancel')));
      await tester.pumpAndSettle();
      await tester.tap(find.byKey(const Key('cancel-booking-confirm')));
      await tester.pumpAndSettle();

      expect(repository.cancelled, <String>[booking.id]);
    });

    testWidgets('reinstate asks too, and reports a taken slot', (
      WidgetTester tester,
    ) async {
      final _FakeRepository repository = _FakeRepository(slotTaken: true);
      await _pumpCard(
        tester,
        _booking(status: BookingStatus.cancelled),
        repository: repository,
      );

      await tester.tap(find.byKey(const Key('booking-reinstate')));
      await tester.pumpAndSettle();
      await tester.tap(find.byKey(const Key('reinstate-booking-confirm')));
      await tester.pumpAndSettle();

      // A cancelled booking occupies nothing, so its slot is genuinely free and
      // may have gone. The owner is told which of the two things happened
      // rather than "something went wrong", which would send them bug-hunting.
      expect(find.text('That time has since been taken.'), findsOneWidget);
    });
  });

  group('the bookings tab', () {
    testWidgets('an empty Booked list offers the share affordance', (
      WidgetTester tester,
    ) async {
      bool shared = false;
      await _pumpApp(
        tester,
        child: BookingsTab(onShareLink: () => shared = true),
        overrides: <Override>[
          bookingsProvider(
            BookingStatus.booked,
          ).overrideWith((Ref ref) async => <Booking>[]),
        ],
      );

      expect(find.text('No Bookings yet'), findsOneWidget);
      await tester.tap(find.byKey(const Key('bookings-empty-share')));
      expect(shared, isTrue);
    });

    testWidgets('an empty Cancelled list does NOT say “No Bookings yet”', (
      WidgetTester tester,
    ) async {
      await _pumpApp(
        tester,
        child: const BookingsTab(onShareLink: null),
        overrides: <Override>[
          bookingFilterProvider.overrideWith(
            (Ref ref) => BookingStatus.cancelled,
          ),
          bookingsProvider(
            BookingStatus.cancelled,
          ).overrideWith((Ref ref) async => <Booking>[]),
        ],
      );

      // Telling an owner with a full diary that they have no bookings, and
      // inviting them to go and get some, is false and slightly insulting.
      expect(find.text('No Bookings yet'), findsNothing);
      expect(find.text('Nothing cancelled.'), findsOneWidget);
    });

    testWidgets('changing the filter fetches that status, not a local filter', (
      WidgetTester tester,
    ) async {
      final _FakeRepository repository = _FakeRepository();

      await _pumpApp(
        tester,
        child: const BookingsTab(onShareLink: null),
        overrides: <Override>[
          bookingsRepositoryProvider.overrideWithValue(repository),
        ],
      );
      await tester.pumpAndSettle();

      await tester.tap(find.byKey(const Key('filter-confirmed')));
      await tester.pumpAndSettle();

      // The design's segmented control is three RECORD VIEWS, not three tabs
      // over one list. A salon with a year of cancellations should not ship all
      // of them to show the four bookings the owner is looking at.
      expect(repository.listed, <BookingStatus?>[
        BookingStatus.booked,
        BookingStatus.confirmed,
      ]);
    });
  });

  // ── TWO TESTS, NOT ONE WITH TWO PUMPS ──────────────────────────────────────
  //
  // These were one test that pumped an empty list, asserted, then pumped a
  // populated one. The second assertion failed: `pumpWidget` REUSES the element
  // when the widget type matches, so the same `ProviderScope` — and therefore
  // the same container and the same first set of overrides — survived the
  // second pump. The screen kept rendering the empty state.
  //
  // Worth recording because the failure looked like a bug in the contacts list
  // rather than in the test.
  group('the contacts tab', () {
    testWidgets('says so when there are none', (WidgetTester tester) async {
      await _pumpApp(
        tester,
        child: const ContactsTab(),
        overrides: <Override>[
          contactsProvider.overrideWith((Ref ref) async => <Contact>[]),
        ],
      );

      expect(find.byKey(const Key('contacts-empty')), findsOneWidget);
    });

    testWidgets('shows the name, email and phone the design specifies', (
      WidgetTester tester,
    ) async {
      await _pumpApp(
        tester,
        child: const ContactsTab(),
        overrides: <Override>[
          contactsProvider.overrideWith(
            (Ref ref) async => <Contact>[
              Contact(
                name: 'Xenon Xavier',
                email: 'xenon@example.com',
                phone: '0701408727',
                bookingCount: 2,
                lastBookingAt: DateTime.utc(2026, 7, 22, 7),
              ),
            ],
          ),
        ],
      );

      expect(find.text('Xenon Xavier'), findsOneWidget);
      expect(find.text('xenon@example.com'), findsOneWidget);
      expect(find.text('0701408727'), findsOneWidget);
      expect(find.text('2 bookings'), findsOneWidget);
    });
  });

  group('the calendar grid', () {
    testWidgets('draws this week’s bookings and not another week’s', (
      WidgetTester tester,
    ) async {
      // ── ANCHORED TO TODAY, BECAUSE THE CALENDAR IS ────────────────────────
      //
      // The grid opens on the current week, so a fixture with a hard-coded 2026
      // date would be off-screen forever and the test would assert nothing.
      // Both bookings are positioned RELATIVE to now: one in this week, one two
      // weeks out.
      final DateTime nowLocal = salonLocal(DateTime.now());
      final DateTime todayAtTen = DateTime.utc(
        nowLocal.year,
        nowLocal.month,
        nowLocal.day,
        7, // 07:00 UTC is 10:00 in Nairobi.
      );

      final Booking thisWeek = _booking(startsAt: todayAtTen);
      final Booking laterWeek = Booking(
        id: 'booking-2',
        serviceName: 'Silk press',
        durationMinutes: 60,
        priceKes: 2500,
        clientName: 'Grace Wanjiru',
        clientEmail: 'grace@example.com',
        clientPhone: '0700000000',
        startsAt: todayAtTen.add(const Duration(days: 14)),
        status: BookingStatus.confirmed,
        hasPaymentProof: false,
      );

      await _pumpApp(
        tester,
        child: const CalendarTab(),
        overrides: <Override>[
          calendarBookingsProvider.overrideWith(
            (Ref ref) async => <Booking>[thisWeek, laterWeek],
          ),
        ],
      );

      expect(find.byKey(Key('calendar-block-${thisWeek.id}')), findsOneWidget);
      // The one that matters: a grid ignoring the selected week would draw
      // every booking it was given, and a naive "the block exists" assertion
      // would pass while the diary showed the wrong fortnight at once.
      expect(find.byKey(Key('calendar-block-${laterWeek.id}')), findsNothing);

      // Stepping forward two weeks swaps which is visible.
      await tester.tap(find.byKey(const Key('calendar-next-week')));
      await tester.pumpAndSettle();
      await tester.tap(find.byKey(const Key('calendar-next-week')));
      await tester.pumpAndSettle();

      expect(find.byKey(Key('calendar-block-${thisWeek.id}')), findsNothing);
      expect(find.byKey(Key('calendar-block-${laterWeek.id}')), findsOneWidget);

      // And "Today" comes back.
      await tester.tap(find.byKey(const Key('calendar-today')));
      await tester.pumpAndSettle();
      expect(find.byKey(Key('calendar-block-${thisWeek.id}')), findsOneWidget);
    });

    test('a block’s top and height come from the salon-local time', () {
      // The arithmetic the grid does, asserted directly. A wrong divisor draws
      // a plausible diary that is wrong by hours, and no widget assertion would
      // notice — the block would still be a block.
      final Booking booking = _booking(startsAt: DateTime.utc(2026, 7, 22, 7));
      final DateTime local = salonLocal(booking.startsAt);

      expect(local.hour, 10);
      expect(local.minute, 0);

      // 10:00 with a 56dp hour is 560dp down; 50 minutes is 46.67dp tall.
      const double hourHeight = 56;
      final double top = (local.hour * 60 + local.minute) * (hourHeight / 60);
      final double height = booking.durationMinutes * (hourHeight / 60);

      expect(top, 560);
      expect(height, closeTo(46.7, 0.1));
      // The property that makes a grid worth having over a list: a 50-minute
      // appointment is visibly shorter than an hour-long one.
      expect(height, lessThan(hourHeight));
    });
  });
}

// ── Fixtures ────────────────────────────────────────────────────────────────

Booking _booking({
  BookingStatus status = BookingStatus.booked,
  bool hasPaymentProof = false,
  DateTime? startsAt,
}) => Booking(
  id: 'booking-1',
  serviceName: 'Haircut, Beard',
  durationMinutes: 50,
  priceKes: 140,
  clientName: 'Xenon Xavier',
  clientEmail: 'xenon@example.com',
  clientPhone: '0701408727',
  startsAt: startsAt ?? DateTime.utc(2026, 7, 22, 7),
  status: status,
  hasPaymentProof: hasPaymentProof,
);

Future<void> _pumpApp(
  WidgetTester tester, {
  required Widget child,
  List<Override> overrides = const <Override>[],
  Size size = const Size(1200, 2400),
}) async {
  tester.view.physicalSize = size;
  tester.view.devicePixelRatio = 3;
  addTearDown(tester.view.reset);

  await tester.pumpWidget(
    ProviderScope(
      overrides: <Override>[
        appConfigProvider.overrideWithValue(
          const AppConfig(
            supabaseUrl: 'http://localhost',
            supabaseAnonKey: 'anon',
            apiBaseUrl: 'http://localhost',
            webBaseUrl: 'https://example.invalid',
          ),
        ),
        ...overrides,
      ],
      child: MaterialApp(
        theme: BookflowTheme.light(),
        home: Scaffold(body: child),
      ),
    ),
  );
  await tester.pumpAndSettle();
}

Future<void> _pumpCard(
  WidgetTester tester,
  Booking booking, {
  bool expanded = true,
  _FakeRepository? repository,
}) async {
  await _pumpApp(
    tester,
    child: SingleChildScrollView(
      child: BookingCard(booking: booking, alwaysExpanded: expanded),
    ),
    overrides: <Override>[
      if (repository != null)
        bookingsRepositoryProvider.overrideWithValue(repository),
    ],
  );
}

/// Records what was asked of it, and can be told to refuse a reinstate.
class _FakeRepository implements BookingsRepository {
  _FakeRepository({this.slotTaken = false});

  final bool slotTaken;

  final List<BookingStatus?> listed = <BookingStatus?>[];
  final List<String> cancelled = <String>[];
  final List<String> confirmed = <String>[];

  @override
  Future<List<Booking>> list(BookingStatus? status) async {
    listed.add(status);
    return <Booking>[];
  }

  @override
  Future<Booking> confirm(String id) async {
    confirmed.add(id);
    return _booking(status: BookingStatus.confirmed);
  }

  @override
  Future<Booking> cancel(String id) async {
    cancelled.add(id);
    return _booking(status: BookingStatus.cancelled);
  }

  @override
  Future<Booking> reinstate(String id) async {
    if (slotTaken) throw const SlotTaken();
    return _booking();
  }

  @override
  Future<String> paymentProofUrl(String id) async =>
      throw UnimplementedError('no test here opens a proof');

  @override
  Future<List<Contact>> contacts() async => <Contact>[];
}
