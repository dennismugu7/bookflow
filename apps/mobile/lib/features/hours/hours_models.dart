/// Opening hours, as this feature uses them.
///
/// ══ WALL-CLOCK, NEVER AN INSTANT (ADR-010) ══════════════════════════════════
///
/// `CLAUDE.md` §5: a booking's start and end are `timestamptz` in UTC;
/// recurring opening hours are a day-of-week plus a plain local time, and the
/// two are never interchanged. So these are `HH:MM` strings and a
/// `TimeOfDay` — **never a `DateTime`**, which would carry a date nobody
/// chose and an offset that would be applied twice.
library;

import 'package:flutter/material.dart';

/// 0 = Monday, matching the API and the column.
///
/// Stated in three places now — the migration, the API schema and here —
/// because PostgreSQL's `extract(dow)` is 0 = Sunday and ISO 8601 is 1 =
/// Monday, so every reader arrives with a different prior and one of them is
/// wrong by a day. Dart's own `DateTime.weekday` is 1 = Monday, which is a
/// fourth convention and the reason this list exists rather than arithmetic on
/// it.
const List<String> weekdayNames = <String>[
  'Monday',
  'Tuesday',
  'Wednesday',
  'Thursday',
  'Friday',
  'Saturday',
  'Sunday',
];

/// One day, as stored.
class DayHours {
  const DayHours({
    required this.dayOfWeek,
    required this.openTime,
    required this.closeTime,
  });

  final int dayOfWeek;

  /// `HH:MM`, 24-hour. The API's wire format, kept as a string end to end so
  /// nothing has to agree about how to render seconds.
  final String openTime;
  final String closeTime;
}

/// One day, while it is being edited.
///
/// ── WHY A DRAFT TYPE AND NOT A NULLABLE `DayHours` ─────────────────────────
///
/// A closed day has no times in the API — it is an absent row (A6). But a day
/// the owner has just closed on screen still has the times they had before,
/// and throwing them away means reopening it loses them. So the draft keeps
/// times independently of `isOpen`, and only open days are sent.
class DayDraft {
  DayDraft({
    required this.dayOfWeek,
    required this.isOpen,
    required this.open,
    required this.close,
  });

  /// A day nobody has configured. 09:00–17:00 because a default has to be
  /// something and those are the hours the design's own example uses.
  factory DayDraft.closed(int dayOfWeek) => DayDraft(
    dayOfWeek: dayOfWeek,
    isOpen: false,
    open: const TimeOfDay(hour: 9, minute: 0),
    close: const TimeOfDay(hour: 17, minute: 0),
  );

  factory DayDraft.from(DayHours hours) => DayDraft(
    dayOfWeek: hours.dayOfWeek,
    isOpen: true,
    open: parseWallClock(hours.openTime),
    close: parseWallClock(hours.closeTime),
  );

  final int dayOfWeek;
  bool isOpen;
  TimeOfDay open;
  TimeOfDay close;

  /// Whether this day would be refused by the API.
  ///
  /// The same rule as `ck_opening_hours_close_after_open`, checked here so the
  /// owner is told beside the row rather than by a failed save that does not
  /// say which day. Equal times count as invalid: a day that opens and closes
  /// at the same moment is closed, and closed is expressed by the toggle.
  bool get isInvalid => isOpen && !_isAfter(close, open);

  String get openWire => formatWallClock(open);
  String get closeWire => formatWallClock(close);

  DayDraft copy() =>
      DayDraft(dayOfWeek: dayOfWeek, isOpen: isOpen, open: open, close: close);
}

bool _isAfter(TimeOfDay a, TimeOfDay b) =>
    a.hour * 60 + a.minute > b.hour * 60 + b.minute;

/// `09:05` → `TimeOfDay(9, 5)`.
///
/// Tolerant of a malformed value rather than throwing: this parses what the
/// server sent, and a screen that crashed on an unexpected string would take
/// the whole week down over one row. An unparseable time falls back to
/// midnight, which is visibly wrong and editable — unlike a red screen.
TimeOfDay parseWallClock(String value) {
  final List<String> parts = value.split(':');
  final int hour = int.tryParse(parts.isEmpty ? '' : parts[0]) ?? 0;
  final int minute = int.tryParse(parts.length > 1 ? parts[1] : '') ?? 0;

  return TimeOfDay(hour: hour.clamp(0, 23), minute: minute.clamp(0, 59));
}

/// `TimeOfDay(9, 5)` → `09:05`. Zero-padded, because the API's regex requires
/// `HH:MM` and `9:05` is not that.
String formatWallClock(TimeOfDay time) {
  final String hour = time.hour.toString().padLeft(2, '0');
  final String minute = time.minute.toString().padLeft(2, '0');
  return '$hour:$minute';
}
