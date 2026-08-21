/// Times, in the salon's zone, for display.
///
/// ══ ONE HELPER OWNS EVERY DATE STRING, LIKE `money.dart` OWNS EVERY PRICE ═══
///
/// The API sends instants in UTC. Kenya is UTC+3. **Every screen that renders a
/// booking has to make that conversion, and if each makes it itself, one of them
/// will forget** — producing a card that says 07:00 for a ten-o'clock
/// appointment, which reads as a booking-system bug rather than a formatting
/// one.
///
/// ── WHY A FIXED OFFSET AND NOT A TIMEZONE DATABASE ─────────────────────────
///
/// `DateTime.toLocal()` is wrong here: it uses the DEVICE's zone. An owner
/// checking their diary from abroad would see their salon's day shifted, and the
/// bug would be invisible to everyone testing at home.
///
/// The `timezone` package is the general answer and is not needed. ADR-005 makes
/// Africa/Nairobi an application constant rather than a stored column: v1 is
/// Kenya, there is no per-business zone anywhere in the schema, and **Kenya has
/// never observed daylight saving — UTC+3 has not moved since 1960.** So the
/// conversion is an addition, and a whole IANA database plus its data-file
/// upkeep would be a large answer to a settled question.
///
/// **This is the assumption that has to be revisited if Bookflow leaves Kenya**,
/// and it is written down here rather than assumed, because a fixed `+3` is
/// exactly the kind of thing that is silently wrong the first time it is not.
/// The API makes the same assumption in the same words — see
/// `bookings.schema.ts` — and delegates its own conversion to PostgreSQL's
/// `AT TIME ZONE`, which is the one place a real rule exists.
library;

/// Africa/Nairobi's offset from UTC. Never observed daylight saving.
const Duration _salonOffset = Duration(hours: 3);

/// The same instant, as wall-clock in the salon's zone.
///
/// Returns a `DateTime` whose FIELDS read as Nairobi local time. Its `isUtc`
/// flag is meaningless afterwards and nothing should test it — this value is for
/// reading fields off, never for arithmetic against another instant.
DateTime salonLocal(DateTime instant) => instant.toUtc().add(_salonOffset);

const List<String> _months = <String>[
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
];

const List<String> _weekdaysShort = <String>[
  'Mon',
  'Tue',
  'Wed',
  'Thu',
  'Fri',
  'Sat',
  'Sun',
];

/// `July 22, 2026` — the design's date format on an expanded card.
String formatSalonDate(DateTime instant) {
  final DateTime local = salonLocal(instant);
  return '${_months[local.month - 1]} ${local.day}, ${local.year}';
}

/// `10:00` — 24-hour, which is how the rest of the app writes opening hours.
///
/// The design's card shows "10 AM". 24-hour is used instead, deliberately and
/// consistently: the opening-hours screen, the availability grid and the API's
/// wire format are all `HH:MM`, and a diary that writes times one way on one
/// screen and another way on the next is harder to scan than either alone.
String formatSalonTime(DateTime instant) {
  final DateTime local = salonLocal(instant);
  final String hour = local.hour.toString().padLeft(2, '0');
  final String minute = local.minute.toString().padLeft(2, '0');
  return '$hour:$minute';
}

/// `July 22, 2026 · 10:00` — the design's scheduled date/time line.
String formatSalonDateTime(DateTime instant) =>
    '${formatSalonDate(instant)} · ${formatSalonTime(instant)}';

/// `Mon`, for a calendar column header.
String formatWeekdayShort(DateTime instant) {
  final DateTime local = salonLocal(instant);
  // `DateTime.weekday` is 1 = Monday through 7 = Sunday.
  return _weekdaysShort[local.weekday - 1];
}

/// `July 2026`, for the mini month picker's header.
String formatMonthYear(DateTime month) =>
    '${_months[month.month - 1]} ${month.year}';

/// `July 20–26, 2026`, for the week toolbar. Spans months when it has to.
String formatWeekRange(DateTime monday) {
  final DateTime sunday = monday.add(const Duration(days: 6));

  if (monday.month == sunday.month) {
    return '${_months[monday.month - 1]} ${monday.day}–${sunday.day}, '
        '${sunday.year}';
  }

  // A week straddling a month boundary. Named in full on both sides rather than
  // abbreviated, because "July 30–2" is unreadable.
  final String left = '${_months[monday.month - 1]} ${monday.day}';
  final String right = '${_months[sunday.month - 1]} ${sunday.day}';
  return monday.year == sunday.year
      ? '$left – $right, ${sunday.year}'
      : '$left, ${monday.year} – $right, ${sunday.year}';
}
