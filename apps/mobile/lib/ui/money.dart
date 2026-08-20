/// Money, for display.
///
/// ══ ONE HELPER OWNS EVERY MONEY STRING (`CLAUDE.md` §5) ═════════════════════
///
/// Not because formatting is hard, but because the alternative is each screen
/// deciding for itself whether to write `KES 400`, `Ksh 400`, `400 KES` or
/// `KES 400.00` — and a price list that spells the currency two ways reads as
/// a bug in the salon rather than in the app.
///
/// ── WHOLE SHILLINGS, AND NO DECIMAL POINT ANYWHERE ─────────────────────────
///
/// The project invariant: every money value is an integer count of whole
/// Kenyan shillings. The API stores `price_kes` as exactly that, the input is a
/// plain integer field, and this never emits a fractional part — printing
/// `KES 400.00` would advertise a precision the system does not have and invite
/// the next person to add cents somewhere.
///
/// The thousands separator is a plain comma. `intl` is not a dependency of this
/// app and adding one to place a comma would be a large answer to a small
/// question; v1 is a single locale (ADR-005: Kenya, KES, Latin script), so
/// there is no locale to negotiate.
library;

/// `1234567` → `KES 1,234,567`.
String formatKes(int shillings) => 'KES ${_grouped(shillings)}';

/// The number alone, grouped — for a field that already says KES beside it.
String formatShillings(int shillings) => _grouped(shillings);

String _grouped(int value) {
  // Negative prices are not representable by the API (`price_kes >= 0`), but
  // formatting one as `KES -1,000` rather than `KES ,000-1` costs one line.
  final bool negative = value < 0;
  final String digits = value.abs().toString();

  final StringBuffer out = StringBuffer();
  for (int i = 0; i < digits.length; i += 1) {
    // A separator before every third digit counting from the right, except at
    // the very start — which is what stops `,400`.
    final int fromRight = digits.length - i;
    if (i > 0 && fromRight % 3 == 0) out.write(',');
    out.write(digits[i]);
  }

  return negative ? '-$out' : out.toString();
}

/// `90` → `1 hr 30 mins`. Durations are minutes everywhere in the API.
///
/// Here rather than in a screen for the same reason as the currency: two
/// screens showing a service's length should not disagree about how to say it.
String formatDuration(int minutes) {
  if (minutes < 60) return '$minutes mins';

  final int hours = minutes ~/ 60;
  final int rest = minutes % 60;
  final String hourPart = hours == 1 ? '1 hr' : '$hours hrs';

  return rest == 0 ? hourPart : '$hourPart $rest mins';
}
