import 'package:bookflow/features/business/business_models.dart';
import 'package:bookflow/features/business/business_providers.dart';
import 'package:bookflow/features/dashboard/dashboard_screen.dart';
import 'package:bookflow/features/hours/hours_models.dart';
import 'package:bookflow/features/hours/hours_providers.dart';
import 'package:bookflow/features/hours/hours_repository.dart';
import 'package:bookflow/features/hours/hours_screen.dart';
import 'package:bookflow/features/profile/profile_models.dart';
import 'package:bookflow/features/profile/profile_providers.dart';
import 'package:bookflow/features/services/services_models.dart';
import 'package:bookflow/features/services/services_providers.dart';
import 'package:bookflow/platform/config.dart';
import 'package:bookflow/platform/providers.dart';
import 'package:bookflow/theme/app_theme.dart';
import 'package:bookflow/ui/money.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';

/// The parts of owner configuration that a reading cannot settle.
///
/// Most of this feature is a form that posts what was typed. These are the
/// places where being wrong looks exactly like being right: a week that sends
/// the wrong days, money that grows a decimal point, and a checklist that
/// claims a step is done when it is not.
void main() {
  group('money is whole shillings, and one helper says so', () {
    test('never emits a fractional part, and groups thousands', () {
      // The project invariant. `KES 400.00` would advertise a precision the
      // system does not have and invite the next person to add cents.
      expect(formatKes(400), 'KES 400');
      expect(formatKes(0), 'KES 0');
      expect(formatKes(2500), 'KES 2,500');
      expect(formatKes(1234567), 'KES 1,234,567');
      // The boundary the grouping loop gets wrong if it writes a separator
      // before the first digit.
      expect(formatKes(100), 'KES 100');
      expect(formatKes(1000), 'KES 1,000');
    });

    test('durations read as a person would say them', () {
      expect(formatDuration(20), '20 mins');
      expect(formatDuration(60), '1 hr');
      expect(formatDuration(90), '1 hr 30 mins');
      expect(formatDuration(120), '2 hrs');
    });
  });

  group('a day being edited', () {
    test('keeps its times while closed, so reopening does not lose them', () {
      final DayDraft day = DayDraft.from(
        const DayHours(dayOfWeek: 0, openTime: '10:30', closeTime: '18:15'),
      );

      day.isOpen = false;

      // The API has no row for a closed day (A6), which is exactly why the
      // draft must not mirror that: an owner who flips Sunday off and on again
      // would otherwise be handed 09:00–17:00 back.
      expect(day.open, const TimeOfDay(hour: 10, minute: 30));
      expect(day.close, const TimeOfDay(hour: 18, minute: 15));
      expect(day.isInvalid, isFalse, reason: 'a closed day is never invalid');
    });

    test('is invalid when it does not close after it opens', () {
      final DayDraft day = DayDraft.closed(0)..isOpen = true;

      day
        ..open = const TimeOfDay(hour: 17, minute: 0)
        ..close = const TimeOfDay(hour: 9, minute: 0);
      expect(day.isInvalid, isTrue);

      // Equal times count as invalid: a day that opens and closes at the same
      // moment is closed, and closed is the toggle's job.
      day.close = const TimeOfDay(hour: 17, minute: 0);
      expect(day.isInvalid, isTrue);

      day.close = const TimeOfDay(hour: 17, minute: 1);
      expect(day.isInvalid, isFalse);
    });

    test('round-trips the wire format, zero-padded', () {
      // The API's regex is `HH:MM`; `9:05` is not that and would be a 400.
      expect(formatWallClock(const TimeOfDay(hour: 9, minute: 5)), '09:05');
      expect(parseWallClock('09:05'), const TimeOfDay(hour: 9, minute: 5));
      // Tolerant rather than throwing: one malformed row must not take the
      // whole week's screen down.
      expect(parseWallClock('nonsense'), const TimeOfDay(hour: 0, minute: 0));
    });
  });

  group('saving the week', () {
    testWidgets('sends only the open days, and the whole week every time', (
      WidgetTester tester,
    ) async {
      final _RecordingHours repository = _RecordingHours(
        stored: <DayHours>[
          const DayHours(dayOfWeek: 0, openTime: '09:00', closeTime: '17:00'),
          const DayHours(dayOfWeek: 1, openTime: '09:00', closeTime: '17:00'),
        ],
      );

      await tester.pumpWidget(
        _host(
          overrides: <Override>[
            hoursRepositoryProvider.overrideWithValue(repository),
          ],
          child: const OpeningHoursScreen(),
        ),
      );
      await tester.pumpAndSettle();

      // Close Tuesday, open Wednesday.
      await tester.tap(find.byKey(const Key('hours-toggle-1')));
      await tester.pumpAndSettle();
      await tester.tap(find.byKey(const Key('hours-toggle-2')));
      await tester.pumpAndSettle();

      await tester.tap(find.byKey(const Key('hours-save')));
      await tester.pumpAndSettle();

      // ── THE ASSERTION THAT MATTERS ──────────────────────────────────────────
      //
      // The endpoint is a PUT: the body IS the week afterwards. A client that
      // sent only what it changed would silently close every day it left out,
      // and a client that sent closed days as rows would be refused by the
      // check constraint. Monday and Wednesday, and nothing else.
      expect(repository.lastSaved, isNotNull);
      expect(
        repository.lastSaved!.map((DayHours d) => d.dayOfWeek).toList(),
        <int>[0, 2],
      );
    });

    testWidgets('refuses to save a day that closes before it opens', (
      WidgetTester tester,
    ) async {
      final _RecordingHours repository = _RecordingHours(
        stored: <DayHours>[
          // Stored the wrong way round is not reachable through the API, so
          // this is constructed directly — the point is that the CLIENT stops
          // it before a request, and says which day.
          const DayHours(dayOfWeek: 0, openTime: '17:00', closeTime: '09:00'),
        ],
      );

      await tester.pumpWidget(
        _host(
          overrides: <Override>[
            hoursRepositoryProvider.overrideWithValue(repository),
          ],
          child: const OpeningHoursScreen(),
        ),
      );
      await tester.pumpAndSettle();

      expect(find.byKey(const Key('hours-invalid-0')), findsOneWidget);

      await tester.tap(find.byKey(const Key('hours-save')));
      await tester.pumpAndSettle();

      expect(find.byKey(const Key('hours-error')), findsOneWidget);
      expect(
        repository.lastSaved,
        isNull,
        reason: 'nothing may be sent while a day is invalid',
      );
    });

    testWidgets('copying Monday leaves closed days closed', (
      WidgetTester tester,
    ) async {
      final _RecordingHours repository = _RecordingHours(
        stored: <DayHours>[
          const DayHours(dayOfWeek: 0, openTime: '08:00', closeTime: '12:00'),
          const DayHours(dayOfWeek: 3, openTime: '14:00', closeTime: '19:00'),
        ],
      );

      await tester.pumpWidget(
        _host(
          overrides: <Override>[
            hoursRepositoryProvider.overrideWithValue(repository),
          ],
          child: const OpeningHoursScreen(),
        ),
      );
      await tester.pumpAndSettle();

      // Seven day rows sit above it, so in a test viewport it starts below the
      // fold. Scrolled into view rather than the list shortened: the control
      // being reachable only after the days is the layout, and a test that
      // avoided scrolling would be testing a screen nobody has.
      final Finder copy = find.byKey(const Key('hours-copy-monday'));
      await tester.scrollUntilVisible(copy, 200);
      await tester.pumpAndSettle();

      await tester.tap(copy);
      await tester.pumpAndSettle();
      await tester.tap(find.byKey(const Key('hours-save')));
      await tester.pumpAndSettle();

      // Thursday takes Monday's hours; the four closed days stay closed. A
      // copy that opened every day would be doing something nobody asked for.
      expect(
        repository.lastSaved!.map((DayHours d) => d.dayOfWeek).toList(),
        <int>[0, 3],
      );
      expect(repository.lastSaved!.last.openTime, '08:00');
      expect(repository.lastSaved!.last.closeTime, '12:00');
    });
  });

  group('the dashboard checklist', () {
    testWidgets('reports done from the data, and todo while it is unknown', (
      WidgetTester tester,
    ) async {
      await tester.pumpWidget(
        _host(
          overrides: <Override>[
            myBusinessProvider.overrideWith(
              (Ref ref) async => const HasBusiness(
                OwnedBusiness(id: 'b', name: 'Vera Salon', published: false),
              ),
            ),
            myServicesProvider.overrideWith(
              (Ref ref) async => <SalonService>[
                const SalonService(
                  id: 's',
                  name: 'Silk press',
                  durationMinutes: 90,
                  priceKes: 2500,
                  position: 0,
                ),
              ],
            ),
            myOpeningHoursProvider.overrideWith(
              (Ref ref) async => <DayHours>[],
            ),
          ],
          child: const DashboardScreen(),
        ),
      );
      await tester.pumpAndSettle();

      expect(find.text('Setting up Vera Salon'), findsOneWidget);
      // Singular, because "1 services" is the kind of thing an owner notices.
      expect(find.text('1 service'), findsOneWidget);
      // Zero open days is NOT done, and the row says what is missing rather
      // than nothing at all.
      expect(find.text('Open 0 days a week'), findsOneWidget);
    });

    testWidgets('a published salon shows its booking link, not the checklist', (
      WidgetTester tester,
    ) async {
      await tester.pumpWidget(
        _host(
          overrides: <Override>[
            myBusinessProvider.overrideWith(
              (Ref ref) async => const HasBusiness(
                OwnedBusiness(id: 'b', name: 'Vera Salon', published: true),
              ),
            ),
            publishedSalonProvider.overrideWith(
              (Ref ref) async => const PublishedSalon(
                name: 'Vera Salon',
                handle: 'vera-salon',
              ),
            ),
          ],
          child: const DashboardScreen(),
        ),
      );
      await tester.pumpAndSettle();

      expect(find.byKey(const Key('dashboard-published')), findsOneWidget);
      expect(find.byKey(const Key('setup-continuation')), findsNothing);
      // Built from the config's base URL plus the handle, so the one constant
      // is the only thing that changes when the web app deploys.
      expect(find.text('https://example.invalid/vera-salon'), findsOneWidget);
    });
  });
}

Widget _host({required List<Override> overrides, required Widget child}) {
  return ProviderScope(
    overrides: <Override>[
      appConfigProvider.overrideWithValue(
        const AppConfig(
          supabaseUrl: 'http://localhost',
          supabaseAnonKey: 'anon',
          apiBaseUrl: 'http://localhost',
          webBaseUrl: 'https://example.invalid',
        ),
      ),
      // The dashboard's avatar reads it; nothing here asserts on it.
      myProfileProvider.overrideWith(
        (Ref ref) async =>
            const OwnerProfile(id: 'u', firstName: 'Vera', lastName: 'Achieng'),
      ),
      ...overrides,
    ],
    child: MaterialApp(theme: BookflowTheme.light(), home: child),
  );
}

class _RecordingHours implements HoursRepository {
  _RecordingHours({required this.stored});

  final List<DayHours> stored;

  /// Null until a save actually happens — which is what the invalid-day test
  /// turns on. A counter would not distinguish "not called" from "called with
  /// nothing".
  List<DayHours>? lastSaved;

  @override
  Future<List<DayHours>> fetch() async => stored;

  @override
  Future<List<DayHours>> replace(List<DayHours> days) async {
    lastSaved = days;
    return days;
  }
}
