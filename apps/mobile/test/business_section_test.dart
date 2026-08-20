import 'dart:async';

import 'package:bookflow/features/business/business_models.dart';
import 'package:bookflow/features/business/business_providers.dart';
import 'package:bookflow/features/business/business_repository.dart';
import 'package:bookflow/features/business/business_section.dart';
import 'package:bookflow/theme/app_theme.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';

/// Screen #20's business section — criteria 52, 53 and 54.
///
/// ══ EACH STATE IS DRIVEN, NOT CAUGHT AT ONE MOMENT ══════════════════════════
///
/// A loading state asserted only while loading proves less than one shown to
/// appear **and then clear**: a spinner that is always there passes the first
/// and fails the second. So the submission tests drive the transition —
/// absent → present → absent — and the failure test drives absent → present →
/// still-usable.
void main() {
  Widget sectionWith(List<Override> overrides) {
    return ProviderScope(
      overrides: overrides,
      child: MaterialApp(
        theme: BookflowTheme.light(),
        home: const Scaffold(
          body: SingleChildScrollView(child: BusinessSection()),
        ),
      ),
    );
  }

  const OwnedBusiness vera = OwnedBusiness(
    id: '00000000-0000-4000-8000-000000000002',
    name: 'Vera’s Salon',
    published: false,
  );

  testWidgets('criterion 52 — the section shows the business name', (
    WidgetTester tester,
  ) async {
    await tester.pumpWidget(
      sectionWith(<Override>[
        businessRepositoryProvider.overrideWithValue(
          _StubRepository(status: const HasBusiness(vera)),
        ),
      ]),
    );
    await tester.pumpAndSettle();

    expect(find.text('Business'), findsOneWidget);
    expect(find.text('Vera’s Salon'), findsOneWidget);
  });

  testWidgets(
    'criterion 53 — a rename in flight shows loading, which then clears',
    (WidgetTester tester) async {
      final Completer<OwnedBusiness> pending = Completer<OwnedBusiness>();
      await tester.pumpWidget(
        sectionWith(<Override>[
          businessRepositoryProvider.overrideWithValue(
            _StubRepository(
              status: const HasBusiness(vera),
              renameFuture: pending.future,
            ),
          ),
        ]),
      );
      await tester.pumpAndSettle();

      // ABSENT — before anything is submitted.
      expect(
        find.byKey(const Key('business-rename-loading')),
        findsNothing,
        reason: 'no spinner before a submission',
      );

      await tester.tap(find.byKey(const Key('business-edit')));
      await tester.pumpAndSettle();
      await tester.enterText(
        find.byKey(const Key('business-name-field')),
        'Renamed Salon',
      );
      await tester.tap(find.byKey(const Key('business-save')));
      await tester.pump();

      // PRESENT — in flight. The field is still mounted, which is the whole
      // reason this is not an `AsyncValueView`.
      expect(find.byKey(const Key('business-rename-loading')), findsOneWidget);
      expect(find.byKey(const Key('business-name-field')), findsOneWidget);

      pending.complete(
        OwnedBusiness(id: vera.id, name: 'Renamed Salon', published: false),
      );
      await tester.pumpAndSettle();

      // ABSENT AGAIN — a spinner that never clears would pass the middle
      // assertion and fail this one.
      expect(
        find.byKey(const Key('business-rename-loading')),
        findsNothing,
        reason: 'the spinner must clear when the submission settles',
      );
    },
  );

  testWidgets(
    'criterion 54 — a failed rename shows an error and stays submittable',
    (WidgetTester tester) async {
      final _StubRepository repository = _StubRepository(
        status: const HasBusiness(vera),
        failRename: true,
      );

      await tester.pumpWidget(
        sectionWith(<Override>[
          businessRepositoryProvider.overrideWithValue(repository),
        ]),
      );
      await tester.pumpAndSettle();

      await tester.tap(find.byKey(const Key('business-edit')));
      await tester.pumpAndSettle();
      await tester.enterText(
        find.byKey(const Key('business-name-field')),
        'Renamed Salon',
      );

      expect(
        find.byKey(const Key('business-rename-error')),
        findsNothing,
        reason: 'no error before a submission',
      );

      await tester.tap(find.byKey(const Key('business-save')));
      await tester.pumpAndSettle();

      // The error is shown, and the screen is NOT replaced — `ErrorView` would
      // have taken the field and the typed value with it.
      expect(find.byKey(const Key('business-rename-error')), findsOneWidget);
      expect(find.byKey(const Key('business-name-field')), findsOneWidget);

      // What the owner typed survived. This is the assertion that fails if
      // anyone later swaps this for a whole-screen error state.
      expect(find.text('Renamed Salon'), findsOneWidget);

      // And they can submit again without restarting the app — the control is
      // enabled, and pressing it actually calls through.
      final int before = repository.renameCalls;
      await tester.tap(find.byKey(const Key('business-save')));
      await tester.pumpAndSettle();
      expect(
        repository.renameCalls,
        before + 1,
        reason: 'the save control must still work after a failure',
      );
    },
  );

  testWidgets(
    'a failed READ renders the shared error view, unlike a failed submission',
    (WidgetTester tester) async {
      await tester.pumpWidget(
        sectionWith(<Override>[
          businessRepositoryProvider.overrideWithValue(
            _StubRepository(failRead: true),
          ),
        ]),
      );
      await tester.pumpAndSettle();

      // The read owns the section, so it may be replaced. The distinction between
      // this and the test above is the point of §C.2's reasoning.
      expect(find.text('Something went wrong.'), findsOneWidget);
    },
  );
}

class _StubRepository implements BusinessRepository {
  _StubRepository({
    this.status,
    this.renameFuture,
    this.failRead = false,
    this.failRename = false,
  });

  final BusinessStatus? status;

  /// A pending future, for driving the in-flight state. Supplied only where the
  /// test needs to control WHEN the submission settles.
  final Future<OwnedBusiness>? renameFuture;

  /// Failures are flags rather than pre-built `Future.error`s, deliberately: an
  /// error future constructed at test setup is unhandled until something awaits
  /// it, and the framework reports that as a test failure before the assertion
  /// under test ever runs. Built inside the call, it is awaited immediately.
  final bool failRead;
  final bool failRename;

  int renameCalls = 0;

  @override
  Future<BusinessStatus> fetchMine() async {
    if (failRead) throw StateError('read failed');
    return status ?? const NoBusinessYet();
  }

  @override
  Future<OwnedBusiness> create(String name) =>
      throw UnimplementedError('the business section never creates');

  @override
  Future<OwnedBusiness> rename({required String id, required String name}) {
    renameCalls += 1;
    if (failRename) {
      return Future<OwnedBusiness>.error(StateError('rename failed'));
    }
    return renameFuture ??
        Future<OwnedBusiness>.value(
          OwnedBusiness(id: id, name: name, published: false),
        );
  }

  @override
  Future<PublishedSalon> publish() =>
      throw UnimplementedError('this fake never publishes');
}
