import 'package:bookflow/features/hours/hours_models.dart';
import 'package:bookflow/features/hours/hours_providers.dart';
import 'package:bookflow/theme/tokens.dart';
import 'package:bookflow/ui/async_value_view.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

/// Opening hours, at `/opening-hours`.
///
/// ══ THE DESIGN'S ONBOARDING SECTION, AS A MANAGEMENT SCREEN ═════════════════
///
/// The design collects hours once, during onboarding. This is the same seven
/// rows as a thing an owner returns to — so it prefills from what is stored,
/// and every visit is an edit rather than a first entry.
///
/// ── SEVEN ROWS ALWAYS, INCLUDING THE CLOSED ONES ───────────────────────────
///
/// A6 makes a closed day an ABSENT row server-side, and the obvious client
/// mirror — show only the days that exist, with an "add a day" button — is
/// worse to use: an owner opening on Saturday would have to find Saturday
/// rather than flip it. All seven are always drawn and the toggle decides which
/// are sent.
///
/// ── ONE SAVE, BECAUSE THE ENDPOINT IS ONE PUT ──────────────────────────────
///
/// The whole week goes in one request, so a half-saved week is not a state that
/// can exist. Per-row auto-save would issue up to seven writes for one intent
/// and could leave a salon open at hours nobody chose if the third failed.
class OpeningHoursScreen extends ConsumerWidget {
  const OpeningHoursScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final AsyncValue<List<DayHours>> stored = ref.watch(myOpeningHoursProvider);

    return Scaffold(
      appBar: AppBar(
        leading: const BackButton(key: Key('hours-back')),
        title: const Text('Opening hours'),
      ),
      body: SafeArea(
        child: AsyncValueView<List<DayHours>>(
          value: stored,
          onRetry: () => ref.invalidate(myOpeningHoursProvider),
          // Keyed on the stored week so a refresh rebuilds the editor from the
          // new data. Without the key, `_Editor`'s state would survive the
          // provider changing underneath it and keep showing the old week.
          data: (List<DayHours> days) => _Editor(
            key: ValueKey<String>(
              days
                  .map(
                    (DayHours d) => '${d.dayOfWeek}${d.openTime}${d.closeTime}',
                  )
                  .join(),
            ),
            stored: days,
          ),
        ),
      ),
    );
  }
}

class _Editor extends ConsumerStatefulWidget {
  const _Editor({required this.stored, super.key});

  final List<DayHours> stored;

  @override
  ConsumerState<_Editor> createState() => _EditorState();
}

class _EditorState extends ConsumerState<_Editor> {
  late List<DayDraft> _week;
  String? _saveError;
  bool _savedOnce = false;

  @override
  void initState() {
    super.initState();
    _week = _draftsFrom(widget.stored);
  }

  /// Seven drafts, whatever the server sent.
  static List<DayDraft> _draftsFrom(List<DayHours> stored) {
    final Map<int, DayHours> byDay = <int, DayHours>{
      for (final DayHours day in stored) day.dayOfWeek: day,
    };

    return List<DayDraft>.generate(weekdayNames.length, (int index) {
      final DayHours? existing = byDay[index];
      return existing == null
          ? DayDraft.closed(index)
          : DayDraft.from(existing);
    });
  }

  bool get _hasInvalidDay => _week.any((DayDraft day) => day.isInvalid);

  Future<void> _pick(DayDraft day, {required bool opening}) async {
    final TimeOfDay? picked = await showTimePicker(
      context: context,
      initialTime: opening ? day.open : day.close,
    );
    if (picked == null) return;

    setState(() {
      if (opening) {
        day.open = picked;
      } else {
        day.close = picked;
      }
      // A time change can fix the row's error, so the banner is recomputed on
      // the next build rather than kept.
      _saveError = null;
    });
  }

  /// ── COPY MONDAY TO EVERY OPEN DAY ──────────────────────────────────────────
  ///
  /// Cheap, and the design flags the pain of entering seven days by hand. It
  /// copies to days that are already OPEN rather than opening them: an owner
  /// who is closed on Sunday does not want Monday's hours applied to Sunday,
  /// and a control that opened days as a side effect would be doing something
  /// nobody asked for.
  void _copyMondayToOpenDays() {
    final DayDraft monday = _week.first;

    setState(() {
      for (final DayDraft day in _week.skip(1)) {
        if (!day.isOpen) continue;
        day.open = monday.open;
        day.close = monday.close;
      }
      _saveError = null;
    });
  }

  Future<void> _save() async {
    if (_hasInvalidDay) {
      setState(() => _saveError = 'Closing time must be after opening time.');
      return;
    }

    setState(() => _saveError = null);

    // Only the open days. A closed day is an absent row (A6), not a row with
    // equal times — the API has no way to express the latter and the check
    // constraint would refuse it.
    final List<DayHours> payload = _week
        .where((DayDraft day) => day.isOpen)
        .map(
          (DayDraft day) => DayHours(
            dayOfWeek: day.dayOfWeek,
            openTime: day.openWire,
            closeTime: day.closeWire,
          ),
        )
        .toList();

    await ref.read(saveHoursControllerProvider.notifier).save(payload);
    if (!mounted) return;

    if (ref.read(saveHoursControllerProvider).hasError) {
      setState(
        () => _saveError =
            'That did not save. Check your connection and try again.',
      );
      return;
    }

    setState(() => _savedOnce = true);
  }

  @override
  Widget build(BuildContext context) {
    final ThemeData theme = Theme.of(context);
    final bool inFlight = ref.watch(saveHoursControllerProvider).isLoading;

    return Column(
      children: <Widget>[
        Expanded(
          child: ListView(
            padding: const EdgeInsets.all(BookflowSpacing.lg),
            children: <Widget>[
              Text(
                'Clients can only book while you are open. A day that is off is '
                'closed.',
                style: theme.textTheme.bodySmall,
              ),
              const SizedBox(height: BookflowSpacing.md),
              for (final DayDraft day in _week)
                _DayRow(
                  day: day,
                  enabled: !inFlight,
                  onToggle: (bool value) => setState(() {
                    day.isOpen = value;
                    _saveError = null;
                  }),
                  onPickOpen: () => _pick(day, opening: true),
                  onPickClose: () => _pick(day, opening: false),
                ),
              const SizedBox(height: BookflowSpacing.sm),
              TextButton.icon(
                key: const Key('hours-copy-monday'),
                onPressed: inFlight ? null : _copyMondayToOpenDays,
                icon: const Icon(Icons.copy_all_outlined),
                label: const Text('Use Monday’s hours for every open day'),
              ),
            ],
          ),
        ),
        // The save bar, outside the scroll view: a seven-row form scrolls, and
        // a Save button that scrolls off the bottom is a Save button people
        // report as missing.
        Padding(
          padding: const EdgeInsets.all(BookflowSpacing.lg),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: <Widget>[
              if (_saveError != null)
                Padding(
                  padding: const EdgeInsets.only(bottom: BookflowSpacing.sm),
                  child: Text(
                    key: const Key('hours-error'),
                    _saveError!,
                    style: theme.textTheme.bodySmall?.copyWith(
                      color: theme.colorScheme.error,
                    ),
                  ),
                ),
              if (_savedOnce && _saveError == null)
                Padding(
                  padding: const EdgeInsets.only(bottom: BookflowSpacing.sm),
                  child: Text(
                    'Saved.',
                    key: const Key('hours-saved'),
                    style: theme.textTheme.bodySmall,
                    textAlign: TextAlign.center,
                  ),
                ),
              FilledButton(
                key: const Key('hours-save'),
                onPressed: inFlight ? null : _save,
                child: inFlight
                    ? const SizedBox(
                        key: Key('hours-save-loading'),
                        width: BookflowSizes.inlineSpinner,
                        height: BookflowSizes.inlineSpinner,
                        child: CircularProgressIndicator.adaptive(
                          strokeWidth: 2,
                        ),
                      )
                    : const Text('Save hours'),
              ),
            ],
          ),
        ),
      ],
    );
  }
}

class _DayRow extends StatelessWidget {
  const _DayRow({
    required this.day,
    required this.enabled,
    required this.onToggle,
    required this.onPickOpen,
    required this.onPickClose,
  });

  final DayDraft day;
  final bool enabled;
  final ValueChanged<bool> onToggle;
  final VoidCallback onPickOpen;
  final VoidCallback onPickClose;

  @override
  Widget build(BuildContext context) {
    final ThemeData theme = Theme.of(context);
    final String name = weekdayNames[day.dayOfWeek];

    return Padding(
      padding: const EdgeInsets.only(bottom: BookflowSpacing.sm),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: <Widget>[
          Row(
            children: <Widget>[
              Expanded(child: Text(name, style: theme.textTheme.bodyMedium)),
              if (!day.isOpen) Text('Closed', style: theme.textTheme.bodySmall),
              Switch(
                key: Key('hours-toggle-${day.dayOfWeek}'),
                value: day.isOpen,
                onChanged: enabled ? onToggle : null,
              ),
            ],
          ),
          if (day.isOpen)
            Row(
              children: <Widget>[
                Expanded(
                  child: OutlinedButton(
                    key: Key('hours-open-${day.dayOfWeek}'),
                    onPressed: enabled ? onPickOpen : null,
                    child: Text(formatWallClock(day.open)),
                  ),
                ),
                const Padding(
                  padding: EdgeInsets.symmetric(horizontal: BookflowSpacing.sm),
                  child: Text('to'),
                ),
                Expanded(
                  child: OutlinedButton(
                    key: Key('hours-close-${day.dayOfWeek}'),
                    onPressed: enabled ? onPickClose : null,
                    child: Text(formatWallClock(day.close)),
                  ),
                ),
              ],
            ),
          // Inline and beside the row it belongs to. A single banner at the
          // bottom would say a day is wrong without saying which, on a screen
          // with seven of them.
          if (day.isInvalid)
            Padding(
              padding: const EdgeInsets.only(top: BookflowSpacing.xs),
              child: Text(
                key: Key('hours-invalid-${day.dayOfWeek}'),
                'Closing time must be after opening time.',
                style: theme.textTheme.bodySmall?.copyWith(
                  color: theme.colorScheme.error,
                ),
              ),
            ),
        ],
      ),
    );
  }
}
