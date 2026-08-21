import 'package:bookflow/features/bookings/bookings_models.dart';
import 'package:bookflow/features/bookings/bookings_providers.dart';
import 'package:bookflow/features/bookings/payment_proof_view.dart';
import 'package:bookflow/theme/tokens.dart';
import 'package:bookflow/ui/money.dart';
import 'package:bookflow/ui/salon_time.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

/// One booking, collapsed or expanded — the design's "Bookings Dashboard,
/// Parts 1–2" card.
///
/// ══ ONE WIDGET, TWO PLACES ══════════════════════════════════════════════════
///
/// The list renders these as cards; the calendar opens the SAME widget in a
/// bottom sheet when a block is tapped. The design says the calendar's detail
/// view mirrors "the same booking record shown in the Bookings tab, since this
/// is the same underlying data" — so it is the same widget rather than a second
/// one that has to be kept in step.
///
/// `alwaysExpanded` is what the sheet passes: a sheet the owner has already
/// opened by tapping a block should not ask them to tap a chevron as well.
class BookingCard extends ConsumerStatefulWidget {
  const BookingCard({
    required this.booking,
    this.alwaysExpanded = false,
    super.key,
  });

  final Booking booking;
  final bool alwaysExpanded;

  @override
  ConsumerState<BookingCard> createState() => _BookingCardState();
}

class _BookingCardState extends ConsumerState<BookingCard> {
  bool _expanded = false;

  bool get _isOpen => widget.alwaysExpanded || _expanded;

  @override
  Widget build(BuildContext context) {
    final ThemeData theme = Theme.of(context);
    final Booking booking = widget.booking;

    return Card(
      margin: const EdgeInsets.only(bottom: BookflowSpacing.md),
      child: Padding(
        padding: const EdgeInsets.all(BookflowSpacing.lg),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: <Widget>[
            Row(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: <Widget>[
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: <Widget>[
                      Text(
                        booking.serviceName,
                        key: const Key('booking-service'),
                        style: theme.textTheme.bodyMedium?.copyWith(
                          fontWeight: FontWeight.w700,
                        ),
                      ),
                      const SizedBox(height: BookflowSpacing.xs),
                      // ── COLLAPSED SHOWS DURATION, EXPANDED SHOWS WHEN ─────
                      //
                      // The design is explicit that expanding "replaces
                      // duration with the actual scheduled date/time", and the
                      // reason is worth keeping: a collapsed list is scanned for
                      // WHAT was booked, an open card is read for WHEN.
                      Text(
                        _isOpen
                            ? formatSalonDateTime(booking.startsAt)
                            : formatDuration(booking.durationMinutes),
                        key: const Key('booking-subtitle'),
                        style: theme.textTheme.bodySmall,
                      ),
                      const SizedBox(height: BookflowSpacing.xs),
                      Text(
                        formatKes(booking.priceKes),
                        style: theme.textTheme.bodyMedium,
                      ),
                    ],
                  ),
                ),
                _StatusPill(status: booking.status),
              ],
            ),
            if (_isOpen) ...<Widget>[
              const SizedBox(height: BookflowSpacing.md),
              const Divider(height: 1),
              const SizedBox(height: BookflowSpacing.md),
              _Details(booking: booking),
              const SizedBox(height: BookflowSpacing.md),
              _Actions(booking: booking),
            ],
            // The sheet has no chevron: it is already open and cannot collapse,
            // so an affordance that did nothing would be worse than none.
            if (!widget.alwaysExpanded)
              Center(
                child: IconButton(
                  key: Key('booking-toggle-${booking.id}'),
                  onPressed: () => setState(() => _expanded = !_expanded),
                  icon: Icon(_expanded ? Icons.expand_less : Icons.expand_more),
                  tooltip: _expanded ? 'Collapse' : 'Expand',
                ),
              ),
          ],
        ),
      ),
    );
  }
}

/// The status pill. Colour comes from the tab the status corresponds to.
class _StatusPill extends StatelessWidget {
  const _StatusPill({required this.status});

  final BookingStatus status;

  @override
  Widget build(BuildContext context) {
    final ThemeData theme = Theme.of(context);

    // The design's colour-coding, which is not decoration: green "Confirm
    // booking?" leads to the green "Confirmed" tab, red "Cancel booking?" to the
    // red "Cancelled" one. The pill uses the same three so a scanned list and
    // the filter bar agree.
    final Color colour = switch (status) {
      BookingStatus.booked => BookflowColors.actionBlue,
      BookingStatus.confirmed => BookflowColors.statusConfirmed,
      BookingStatus.cancelled => theme.colorScheme.error,
    };

    return Container(
      key: Key('booking-pill-${status.wire}'),
      padding: const EdgeInsets.symmetric(
        horizontal: BookflowSpacing.md,
        vertical: BookflowSpacing.xs,
      ),
      decoration: BoxDecoration(
        color: colour.withValues(alpha: BookflowOpacity.pillFill),
        borderRadius: BorderRadius.circular(BookflowRadii.pill),
      ),
      child: Text(
        status.label,
        style: theme.textTheme.bodySmall?.copyWith(
          color: colour,
          fontWeight: FontWeight.w700,
        ),
      ),
    );
  }
}

/// The metadata block: when it was booked, who booked it, and the proof link.
class _Details extends ConsumerWidget {
  const _Details({required this.booking});

  final Booking booking;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final ThemeData theme = Theme.of(context);

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: <Widget>[
        // ── "Booked on" IS THE APPOINTMENT'S DAY, NOT THE ORDER'S ────────────
        //
        // The design shows "Booked on: July 19, 2026" beside a July 22
        // appointment — so it means when the CLIENT PLACED the booking, and
        // that is `created_at`, which **the API does not return**. Rather than
        // invent it or show a plausible wrong date, the line names what it
        // actually has. A row that quietly showed the appointment date under a
        // "booked on" label would be worse than an absent row: it would look
        // right.
        _DetailRow(
          label: 'Appointment',
          value: formatSalonDateTime(booking.startsAt),
        ),
        if (booking.teamMemberName != null)
          _DetailRow(label: 'With', value: booking.teamMemberName!)
        else
          const _DetailRow(label: 'With', value: 'Any professional'),
        const SizedBox(height: BookflowSpacing.sm),
        Text(
          booking.clientName,
          key: const Key('booking-client-name'),
          style: theme.textTheme.bodyMedium?.copyWith(
            fontWeight: FontWeight.w700,
          ),
        ),
        Text(booking.clientEmail, style: theme.textTheme.bodySmall),
        Text(booking.clientPhone, style: theme.textTheme.bodySmall),
        // ── SHOWN ONLY WHEN THERE IS ONE ────────────────────────────────────
        //
        // `hasPaymentProof` is the whole reason the list carries a boolean. An
        // always-present link would send the owner to a 404 for most bookings,
        // and they would learn to ignore it — including for the ones that do
        // have a proof.
        if (booking.hasPaymentProof) ...<Widget>[
          const SizedBox(height: BookflowSpacing.sm),
          TextButton(
            key: const Key('booking-proof-link'),
            style: TextButton.styleFrom(
              padding: EdgeInsets.zero,
              alignment: Alignment.centerLeft,
            ),
            onPressed: () async =>
                showPaymentProof(context, ref, bookingId: booking.id),
            child: const Text('Check payment confirmation'),
          ),
        ],
      ],
    );
  }
}

class _DetailRow extends StatelessWidget {
  const _DetailRow({required this.label, required this.value});

  final String label;
  final String value;

  @override
  Widget build(BuildContext context) {
    final ThemeData theme = Theme.of(context);

    return Padding(
      padding: const EdgeInsets.only(bottom: BookflowSpacing.xs),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: <Widget>[
          SizedBox(
            width: BookflowSizes.detailLabel,
            child: Text(
              label,
              style: theme.textTheme.bodySmall?.copyWith(
                color: theme.colorScheme.onSurfaceVariant,
              ),
            ),
          ),
          Expanded(child: Text(value, style: theme.textTheme.bodySmall)),
        ],
      ),
    );
  }
}

/// Confirm, cancel and reinstate — whichever the current status allows.
///
/// ══ THE OFFERED ACTIONS MIRROR THE API'S TRANSITIONS ════════════════════════
///
/// `booked → confirmed`, `booked | confirmed → cancelled`,
/// `cancelled → booked`. Offering an action the API would refuse with 409
/// `invalid-booking-transition` would be a button whose only outcome is an
/// error, so the switch below is the client's copy of that table.
///
/// The server remains the authority — two devices can disagree about a status —
/// and this is about not drawing a control that cannot work.
class _Actions extends ConsumerWidget {
  const _Actions({required this.booking});

  final Booking booking;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final ThemeData theme = Theme.of(context);
    final BookingActionController controller = ref.watch(
      bookingActionProvider.notifier,
    );
    // Watched so the widget rebuilds when the submission's state changes;
    // `isBusy` reads the id, so only the card that was pressed shows a spinner.
    ref.watch(bookingActionProvider);
    final bool busy = controller.isBusy(booking.id);

    if (busy) {
      return const Center(
        child: SizedBox(
          key: Key('booking-action-loading'),
          width: BookflowSizes.inlineSpinner,
          height: BookflowSizes.inlineSpinner,
          child: CircularProgressIndicator.adaptive(strokeWidth: 2),
        ),
      );
    }

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: <Widget>[
        if (booking.status == BookingStatus.booked)
          _ActionLink(
            key: const Key('booking-confirm'),
            label: 'Confirm booking?',
            colour: BookflowColors.statusConfirmed,
            onTap: () async => controller.confirm(booking.id),
          ),
        if (booking.status == BookingStatus.booked ||
            booking.status == BookingStatus.confirmed)
          _ActionLink(
            key: const Key('booking-cancel'),
            label: 'Cancel booking?',
            colour: theme.colorScheme.error,
            // ── ASKS FIRST, AND THE DESIGN SAYS WHY ───────────────────────
            //
            // "This directly resolves the earlier concern about accidental taps
            // given the proximity to 'Confirm booking?'." The two links sit one
            // above the other and one of them emails a client that their
            // appointment is off.
            onTap: () async {
              if (await confirmCancelDialog(context)) {
                await controller.cancel(booking.id);
              }
            },
          ),
        if (booking.status == BookingStatus.cancelled)
          _ActionLink(
            key: const Key('booking-reinstate'),
            label: 'Reinstate booking?',
            colour: BookflowColors.actionBlue,
            // Also asks — the design calls for "its own lightweight
            // confirmation step given it re-activates a booking the client was
            // already told was cancelled".
            onTap: () async {
              if (await confirmReinstateDialog(context)) {
                await controller.reinstate(booking.id);
                if (!context.mounted) return;

                // ── THE ONE FAILURE WITH SOMETHING SPECIFIC TO SAY ─────────
                //
                // A cancelled booking occupies nothing, so its slot is free and
                // may have been taken. That is not a fault — it is the
                // exclusion constraint working — and "Something went wrong"
                // would send the owner looking for a bug.
                final Object? error = ref.read(bookingActionProvider).error;
                if (error is SlotTaken) {
                  ScaffoldMessenger.of(context).showSnackBar(
                    const SnackBar(
                      content: Text('That time has since been taken.'),
                    ),
                  );
                }
              }
            },
          ),
      ],
    );
  }
}

class _ActionLink extends StatelessWidget {
  const _ActionLink({
    required this.label,
    required this.colour,
    required this.onTap,
    super.key,
  });

  final String label;
  final Color colour;
  final Future<void> Function() onTap;

  @override
  Widget build(BuildContext context) {
    final ThemeData theme = Theme.of(context);

    return TextButton(
      style: TextButton.styleFrom(
        padding: EdgeInsets.zero,
        alignment: Alignment.centerLeft,
        minimumSize: Size.zero,
        tapTargetSize: MaterialTapTargetSize.shrinkWrap,
      ),
      onPressed: () async => onTap(),
      child: Padding(
        padding: const EdgeInsets.symmetric(vertical: BookflowSpacing.sm),
        child: Text(
          label,
          style: theme.textTheme.bodyMedium?.copyWith(
            color: colour,
            fontWeight: FontWeight.w700,
          ),
        ),
      ),
    );
  }
}

/// The design's Cancel Confirmation Dialog. Returns whether to proceed.
///
/// The copy is the design's: the warning names the consequence the owner cannot
/// take back — "The client will be notified by email." — and the dismissing
/// option is "Keep booking" rather than "Cancel", which in a cancel dialog means
/// both things at once.
Future<bool> confirmCancelDialog(BuildContext context) async {
  final bool? proceed = await showDialog<bool>(
    context: context,
    builder: (BuildContext context) => AlertDialog(
      key: const Key('cancel-booking-dialog'),
      title: const Text('Cancel this booking?'),
      content: const Text(
        'The client will be notified by email. This cannot be undone from '
        'their side — they would need to book again.',
      ),
      actions: <Widget>[
        TextButton(
          key: const Key('cancel-booking-keep'),
          onPressed: () => Navigator.of(context).pop(false),
          child: const Text('Keep booking'),
        ),
        TextButton(
          key: const Key('cancel-booking-confirm'),
          style: TextButton.styleFrom(
            foregroundColor: Theme.of(context).colorScheme.error,
          ),
          onPressed: () => Navigator.of(context).pop(true),
          child: const Text('Yes, cancel booking'),
        ),
      ],
    ),
  );

  // A dialog dismissed by tapping outside returns null, and null must mean NO.
  return proceed ?? false;
}

/// The lighter confirmation the design asks for on reinstate.
Future<bool> confirmReinstateDialog(BuildContext context) async {
  final bool? proceed = await showDialog<bool>(
    context: context,
    builder: (BuildContext context) => AlertDialog(
      key: const Key('reinstate-booking-dialog'),
      title: const Text('Reinstate this booking?'),
      content: const Text(
        'The client was told it was cancelled, so they will be emailed again. '
        'If the time has since been taken this will not go through.',
      ),
      actions: <Widget>[
        TextButton(
          onPressed: () => Navigator.of(context).pop(false),
          child: const Text('Not now'),
        ),
        TextButton(
          key: const Key('reinstate-booking-confirm'),
          onPressed: () => Navigator.of(context).pop(true),
          child: const Text('Reinstate'),
        ),
      ],
    ),
  );

  return proceed ?? false;
}
