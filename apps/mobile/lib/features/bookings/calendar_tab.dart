import 'package:bookflow/features/bookings/booking_card.dart';
import 'package:bookflow/features/bookings/bookings_models.dart';
import 'package:bookflow/features/bookings/bookings_providers.dart';
import 'package:bookflow/theme/tokens.dart';
import 'package:bookflow/ui/async_value_view.dart';
import 'package:bookflow/ui/salon_time.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

/// The Calendar tab — design "Calendar Tab — Booking Schedule View".
///
/// ══ HAND-ROLLED, AND THAT IS THE CHEAPER OPTION HERE ════════════════════════
///
/// A calendar package would give month rendering and week views for free, and
/// would then have to be fought into this layout: a mini picker that collapses,
/// a week grid whose blocks are sized by a booking's DURATION, horizontal
/// scrolling when seven columns do not fit, and a tap target that opens the same
/// card the Bookings tab uses.
///
/// The grid is `Stack` over `SizedBox`es. That is the whole implementation, and
/// it is smaller than the configuration a package would need.
///
/// ── WEEK VIEW ONLY ─────────────────────────────────────────────────────────
///
/// The design's toolbar has a dropdown that "likely opens a view-mode switcher
/// (Day / Week / Month / Agenda)" — its own words, and undecided. A guess would
/// be three more layouts nobody asked for. Deferred, and the dropdown is not
/// drawn, because a control that opens nothing is worse than its absence.
class CalendarTab extends ConsumerStatefulWidget {
  const CalendarTab({super.key});

  @override
  ConsumerState<CalendarTab> createState() => _CalendarTabState();
}

class _CalendarTabState extends ConsumerState<CalendarTab> {
  /// The selected day, as a salon-local calendar date at midnight.
  late DateTime _selected = _startOfDay(salonLocal(DateTime.now()));

  /// Which month the mini picker is showing. Follows the selection but can be
  /// stepped independently — an owner paging to December has not yet chosen a
  /// day in it, and yanking the selection along would make paging useless.
  late DateTime _visibleMonth = DateTime(_selected.year, _selected.month);

  bool _pickerOpen = true;

  static DateTime _startOfDay(DateTime d) => DateTime(d.year, d.month, d.day);

  /// The Monday of the selected day's week. `weekday` is 1 = Monday.
  DateTime get _weekStart =>
      _selected.subtract(Duration(days: _selected.weekday - 1));

  void _goToToday() {
    final DateTime today = _startOfDay(salonLocal(DateTime.now()));
    setState(() {
      _selected = today;
      _visibleMonth = DateTime(today.year, today.month);
    });
  }

  @override
  Widget build(BuildContext context) {
    final AsyncValue<List<Booking>> bookings = ref.watch(
      calendarBookingsProvider,
    );

    return Column(
      children: <Widget>[
        _MonthPicker(
          visibleMonth: _visibleMonth,
          selected: _selected,
          open: _pickerOpen,
          onToggle: () => setState(() => _pickerOpen = !_pickerOpen),
          onStepMonth: (int delta) => setState(() {
            _visibleMonth = DateTime(
              _visibleMonth.year,
              _visibleMonth.month + delta,
            );
          }),
          onSelect: (DateTime day) => setState(() {
            _selected = day;
            _visibleMonth = DateTime(day.year, day.month);
          }),
        ),
        _WeekToolbar(
          weekStart: _weekStart,
          onToday: _goToToday,
          onStepWeek: (int delta) => setState(() {
            _selected = _selected.add(Duration(days: 7 * delta));
            _visibleMonth = DateTime(_selected.year, _selected.month);
          }),
        ),
        Expanded(
          child: RefreshIndicator(
            onRefresh: () async {
              ref.invalidate(calendarBookingsProvider);
              await ref.read(calendarBookingsProvider.future);
            },
            child: AsyncValueView<List<Booking>>(
              value: bookings,
              onRetry: () => ref.invalidate(calendarBookingsProvider),
              data: (List<Booking> all) =>
                  _WeekGrid(weekStart: _weekStart, bookings: all),
            ),
          ),
        ),
      ],
    );
  }
}

/// The mini month grid, with its collapse chevron and month arrows.
class _MonthPicker extends StatelessWidget {
  const _MonthPicker({
    required this.visibleMonth,
    required this.selected,
    required this.open,
    required this.onToggle,
    required this.onStepMonth,
    required this.onSelect,
  });

  final DateTime visibleMonth;
  final DateTime selected;
  final bool open;
  final VoidCallback onToggle;
  final ValueChanged<int> onStepMonth;
  final ValueChanged<DateTime> onSelect;

  @override
  Widget build(BuildContext context) {
    final ThemeData theme = Theme.of(context);

    return Column(
      children: <Widget>[
        Row(
          children: <Widget>[
            IconButton(
              key: const Key('calendar-picker-toggle'),
              onPressed: onToggle,
              icon: Icon(open ? Icons.expand_less : Icons.expand_more),
              tooltip: open ? 'Hide the month' : 'Show the month',
            ),
            Expanded(
              child: Text(
                formatMonthYear(visibleMonth),
                key: const Key('calendar-month-label'),
                style: theme.textTheme.bodyMedium?.copyWith(
                  fontWeight: FontWeight.w700,
                ),
              ),
            ),
            IconButton(
              key: const Key('calendar-prev-month'),
              onPressed: () => onStepMonth(-1),
              icon: const Icon(Icons.keyboard_arrow_up),
              tooltip: 'Previous month',
            ),
            IconButton(
              key: const Key('calendar-next-month'),
              onPressed: () => onStepMonth(1),
              icon: const Icon(Icons.keyboard_arrow_down),
              tooltip: 'Next month',
            ),
          ],
        ),
        if (open)
          _MonthGrid(
            visibleMonth: visibleMonth,
            selected: selected,
            onSelect: onSelect,
          ),
      ],
    );
  }
}

class _MonthGrid extends StatelessWidget {
  const _MonthGrid({
    required this.visibleMonth,
    required this.selected,
    required this.onSelect,
  });

  final DateTime visibleMonth;
  final DateTime selected;
  final ValueChanged<DateTime> onSelect;

  @override
  Widget build(BuildContext context) {
    final ThemeData theme = Theme.of(context);

    // ── THE GRID ALWAYS STARTS ON A MONDAY ─────────────────────────────────
    //
    // The design's header is "S M T W T F S", a Sunday-first American
    // convention. Monday-first is used instead and deliberately: Kenya starts
    // its week on Monday, `opening_hours.day_of_week` is 0 = Monday throughout
    // this system, and the week grid below is Monday-based. A picker whose weeks
    // disagreed with the grid it selects would highlight the wrong row.
    final DateTime first = DateTime(visibleMonth.year, visibleMonth.month);
    final DateTime gridStart = first.subtract(
      Duration(days: first.weekday - 1),
    );

    return Padding(
      padding: const EdgeInsets.symmetric(horizontal: BookflowSpacing.md),
      child: Column(
        children: <Widget>[
          Row(
            children: <String>['M', 'T', 'W', 'T', 'F', 'S', 'S']
                .map(
                  (String d) => Expanded(
                    child: Center(
                      child: Text(d, style: theme.textTheme.bodySmall),
                    ),
                  ),
                )
                .toList(),
          ),
          // Six rows always. A month can span six weeks, and a grid that
          // changed height between months would make the whole page jump when
          // paging — which is the sort of thing that feels like a bug.
          ...List<Widget>.generate(6, (int week) {
            return Row(
              children: List<Widget>.generate(7, (int day) {
                final DateTime date = gridStart.add(
                  Duration(days: week * 7 + day),
                );
                return Expanded(
                  child: _DayCell(
                    date: date,
                    inMonth: date.month == visibleMonth.month,
                    selected:
                        date.year == selected.year &&
                        date.month == selected.month &&
                        date.day == selected.day,
                    inSelectedWeek: _sameWeek(date, selected),
                    onTap: () => onSelect(date),
                  ),
                );
              }),
            );
          }),
        ],
      ),
    );
  }

  static bool _sameWeek(DateTime a, DateTime b) {
    final DateTime startA = a.subtract(Duration(days: a.weekday - 1));
    final DateTime startB = b.subtract(Duration(days: b.weekday - 1));
    return startA.year == startB.year &&
        startA.month == startB.month &&
        startA.day == startB.day;
  }
}

class _DayCell extends StatelessWidget {
  const _DayCell({
    required this.date,
    required this.inMonth,
    required this.selected,
    required this.inSelectedWeek,
    required this.onTap,
  });

  final DateTime date;
  final bool inMonth;
  final bool selected;
  final bool inSelectedWeek;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    final ThemeData theme = Theme.of(context);

    return InkWell(
      key: Key('calendar-day-${date.year}-${date.month}-${date.day}'),
      onTap: onTap,
      child: Container(
        margin: const EdgeInsets.all(BookflowSpacing.xs),
        padding: const EdgeInsets.symmetric(vertical: BookflowSpacing.sm),
        decoration: BoxDecoration(
          // The selected day is a filled circle; its week is outlined. Both are
          // in the design, and together they say "this day, and the week below
          // is showing it".
          color: selected ? BookflowColors.actionBlue : null,
          shape: BoxShape.circle,
          border: !selected && inSelectedWeek
              ? Border.all(
                  color: BookflowColors.actionBlue.withValues(
                    alpha: BookflowOpacity.pillFill,
                  ),
                )
              : null,
        ),
        child: Center(
          child: Text(
            '${date.day}',
            style: theme.textTheme.bodySmall?.copyWith(
              color: selected
                  ? BookflowColors.textOnBrand
                  // Adjacent months are muted, as the design specifies — they
                  // are context, not targets, though tapping one still works.
                  : theme.colorScheme.onSurface.withValues(
                      alpha: inMonth ? 1 : BookflowOpacity.adjacentMonth,
                    ),
            ),
          ),
        ),
      ),
    );
  }
}

class _WeekToolbar extends StatelessWidget {
  const _WeekToolbar({
    required this.weekStart,
    required this.onToday,
    required this.onStepWeek,
  });

  final DateTime weekStart;
  final VoidCallback onToday;
  final ValueChanged<int> onStepWeek;

  @override
  Widget build(BuildContext context) {
    final ThemeData theme = Theme.of(context);

    // ── EVERY CHILD MUST BE ABLE TO SHRINK, AND ONE OF THEM COULD NOT ────────
    //
    // This was `Today · Spacer · ‹ · label · ›` with the label as a plain
    // `Text`. On a 400dp phone — which is most phones — "August 17–23, 2026"
    // pushed the next-week arrow past the right edge: a RenderFlex overflow, and
    // a control the owner could see and not tap.
    //
    // Found by the widget test failing with "derived an Offset that would not
    // hit test on the specified widget", which is what an off-screen button
    // looks like from a test and would have looked like a mystery in the hands
    // of an owner.
    //
    // `spaceBetween` with a `Flexible` label: the label gives up width first and
    // ellipsises, and the arrows keep their positions. A week range that crosses
    // a month is the longest string this renders, so it is the one that has to
    // fit — or degrade legibly, which it now does.
    return Padding(
      padding: const EdgeInsets.symmetric(horizontal: BookflowSpacing.sm),
      child: Row(
        mainAxisAlignment: MainAxisAlignment.spaceBetween,
        children: <Widget>[
          TextButton.icon(
            key: const Key('calendar-today'),
            onPressed: onToday,
            icon: const Icon(Icons.today_outlined),
            label: const Text('Today'),
          ),
          IconButton(
            key: const Key('calendar-prev-week'),
            onPressed: () => onStepWeek(-1),
            icon: const Icon(Icons.chevron_left),
            tooltip: 'Previous week',
          ),
          Flexible(
            child: Text(
              formatWeekRange(weekStart),
              key: const Key('calendar-week-label'),
              style: theme.textTheme.bodySmall,
              maxLines: 1,
              overflow: TextOverflow.ellipsis,
            ),
          ),
          IconButton(
            key: const Key('calendar-next-week'),
            onPressed: () => onStepWeek(1),
            icon: const Icon(Icons.chevron_right),
            tooltip: 'Next week',
          ),
        ],
      ),
    );
  }
}

/// Seven day columns of twenty-four hour rows, with bookings drawn over them.
class _WeekGrid extends StatelessWidget {
  const _WeekGrid({required this.weekStart, required this.bookings});

  final DateTime weekStart;
  final List<Booking> bookings;

  @override
  Widget build(BuildContext context) {
    return SingleChildScrollView(
      // Vertical: twenty-four hours never fit. Horizontal is nested inside, so
      // the hour gutter can stay pinned while the days slide under it.
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: <Widget>[
          _HourGutter(),
          Expanded(
            child: SingleChildScrollView(
              scrollDirection: Axis.horizontal,
              child: Row(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: List<Widget>.generate(7, (int index) {
                  final DateTime day = weekStart.add(Duration(days: index));
                  return _DayColumn(
                    day: day,
                    // Filtered per column here rather than once into a map:
                    // seven passes over a list that is a salon's week is
                    // nothing, and the alternative is a second structure to
                    // keep in step with the first.
                    bookings: bookings
                        .where((Booking b) => _isOn(b, day))
                        .toList(),
                  );
                }),
              ),
            ),
          ),
        ],
      ),
    );
  }

  /// Whether a booking starts on this salon-local day.
  ///
  /// By START, not by overlap. A booking that ran past midnight would be drawn
  /// on the day it began and clipped at the bottom — which no salon's hours
  /// produce, and which is a smaller wrong than drawing it twice.
  static bool _isOn(Booking booking, DateTime day) {
    final DateTime local = salonLocal(booking.startsAt);
    return local.year == day.year &&
        local.month == day.month &&
        local.day == day.day;
  }
}

class _HourGutter extends StatelessWidget {
  @override
  Widget build(BuildContext context) {
    final ThemeData theme = Theme.of(context);

    return SizedBox(
      width: BookflowSizes.calendarGutterWidth,
      child: Column(
        children: <Widget>[
          // A spacer matching the day header, so hour 0 lines up with the first
          // row of every column rather than with their titles.
          const SizedBox(height: BookflowSpacing.xl),
          ...List<Widget>.generate(24, (int hour) {
            return SizedBox(
              height: BookflowSizes.calendarHourHeight,
              child: Align(
                alignment: Alignment.topRight,
                child: Padding(
                  padding: const EdgeInsets.only(right: BookflowSpacing.sm),
                  child: Text(
                    '${hour.toString().padLeft(2, '0')}:00',
                    style: theme.textTheme.bodySmall?.copyWith(
                      color: theme.colorScheme.onSurfaceVariant,
                    ),
                  ),
                ),
              ),
            );
          }),
        ],
      ),
    );
  }
}

class _DayColumn extends StatelessWidget {
  const _DayColumn({required this.day, required this.bookings});

  final DateTime day;
  final List<Booking> bookings;

  @override
  Widget build(BuildContext context) {
    final ThemeData theme = Theme.of(context);

    return SizedBox(
      width: BookflowSizes.calendarDayWidth,
      child: Column(
        children: <Widget>[
          SizedBox(
            height: BookflowSpacing.xl,
            child: Center(
              child: Text(
                '${day.day} ${formatWeekdayShort(day)}',
                style: theme.textTheme.bodySmall,
              ),
            ),
          ),
          SizedBox(
            height: BookflowSizes.calendarHourHeight * 24,
            child: Stack(
              children: <Widget>[
                // The hour rules, drawn first so blocks sit over them.
                Column(
                  children: List<Widget>.generate(24, (int hour) {
                    return Container(
                      height: BookflowSizes.calendarHourHeight,
                      decoration: BoxDecoration(
                        border: Border(
                          top: BorderSide(color: theme.dividerColor),
                          left: BorderSide(color: theme.dividerColor),
                        ),
                      ),
                    );
                  }),
                ),
                ...bookings.map(
                  (Booking booking) => _BookingBlock(booking: booking),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }
}

/// One booking, as a coloured block positioned by time and sized by duration.
class _BookingBlock extends StatelessWidget {
  const _BookingBlock({required this.booking});

  final Booking booking;

  @override
  Widget build(BuildContext context) {
    final ThemeData theme = Theme.of(context);
    final DateTime local = salonLocal(booking.startsAt);

    // Minutes from midnight, scaled to the hour height. The block's TOP is the
    // start and its HEIGHT is the duration — which is what makes a 30-minute
    // appointment visibly half of an hour-long one, the whole point of a grid
    // over a list.
    final double minutesFromMidnight =
        local.hour * 60 + local.minute.toDouble();
    final double perMinute = BookflowSizes.calendarHourHeight / 60;

    final Color colour = booking.status == BookingStatus.confirmed
        ? BookflowColors.statusConfirmed
        : BookflowColors.actionBlue;

    return Positioned(
      top: minutesFromMidnight * perMinute,
      left: 1,
      right: 1,
      height: booking.durationMinutes * perMinute,
      child: InkWell(
        key: Key('calendar-block-${booking.id}'),
        // The design guesses a tap "likely expands or opens a detail
        // popover/sheet ... mirroring the same booking record shown in the
        // Bookings tab". It is the same widget, so the two cannot diverge.
        onTap: () async {
          await showModalBottomSheet<void>(
            context: context,
            isScrollControlled: true,
            showDragHandle: true,
            builder: (BuildContext context) => SafeArea(
              child: SingleChildScrollView(
                padding: const EdgeInsets.all(BookflowSpacing.lg),
                child: BookingCard(booking: booking, alwaysExpanded: true),
              ),
            ),
          );
        },
        child: Container(
          padding: const EdgeInsets.all(BookflowSpacing.xs),
          decoration: BoxDecoration(
            color: colour.withValues(alpha: BookflowOpacity.calendarBlock),
            borderRadius: BorderRadius.circular(BookflowRadii.input),
          ),
          // ── LABELLED, WHERE THE DESIGN'S BLOCK IS NOT ─────────────────────
          //
          // The design's layout note observes that the block "renders as a
          // solid color block with no visible label ... which may need a
          // tap-to-reveal", and answers its own question: a diary of unlabelled
          // rectangles has to be tapped one at a time to be read at all. The
          // service name fits and clips gracefully when it does not.
          child: Text(
            booking.serviceName,
            maxLines: 2,
            overflow: TextOverflow.ellipsis,
            style: theme.textTheme.bodySmall?.copyWith(
              color: BookflowColors.textOnBrand,
            ),
          ),
        ),
      ),
    );
  }
}
