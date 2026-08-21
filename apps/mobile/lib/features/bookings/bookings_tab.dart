import 'package:bookflow/features/bookings/booking_card.dart';
import 'package:bookflow/features/bookings/bookings_models.dart';
import 'package:bookflow/features/bookings/bookings_providers.dart';
import 'package:bookflow/theme/tokens.dart';
import 'package:bookflow/ui/async_value_view.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

/// The Bookings tab — design "Bookings Dashboard, Parts 1–2" and screen #5.
///
/// A list of cards over a three-way record filter. The filter is at the BOTTOM,
/// which is where the design puts it and is also where a thumb is.
class BookingsTab extends ConsumerWidget {
  const BookingsTab({required this.onShareLink, super.key});

  /// Opens the share sheet. Passed in rather than built here: the link belongs
  /// to the business read, which the dashboard already holds, and a tab that
  /// fetched it again would be a second source for one string.
  ///
  /// Null when the salon has no handle — which cannot happen for a published
  /// salon, and the empty state degrades to its text rather than drawing a
  /// button that would throw.
  final VoidCallback? onShareLink;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final BookingStatus filter = ref.watch(bookingFilterProvider);
    final AsyncValue<List<Booking>> bookings = ref.watch(
      bookingsProvider(filter),
    );

    return Column(
      children: <Widget>[
        Expanded(
          child: RefreshIndicator(
            // Pull to refresh, and nothing else. The design's own open question
            // asks whether a client's booking should appear live; it is
            // deferred, so this app does not pretend to. One deliberate gesture
            // beats a poll that drains a battery to be wrong less often.
            onRefresh: () async {
              ref.invalidate(bookingsProvider(filter));
              await ref.read(bookingsProvider(filter).future);
            },
            child: AsyncValueView<List<Booking>>(
              value: bookings,
              onRetry: () => ref.invalidate(bookingsProvider(filter)),
              data: (List<Booking> list) => list.isEmpty
                  ? _EmptyState(filter: filter, onShareLink: onShareLink)
                  : ListView.builder(
                      padding: const EdgeInsets.all(BookflowSpacing.lg),
                      itemCount: list.length,
                      itemBuilder: (BuildContext context, int index) =>
                          BookingCard(booking: list[index]),
                    ),
            ),
          ),
        ),
        _FilterBar(
          selected: filter,
          onSelect: (BookingStatus next) =>
              ref.read(bookingFilterProvider.notifier).state = next,
        ),
      ],
    );
  }
}

/// The design's bottom segmented control, with its three icons.
class _FilterBar extends StatelessWidget {
  const _FilterBar({required this.selected, required this.onSelect});

  final BookingStatus selected;
  final ValueChanged<BookingStatus> onSelect;

  @override
  Widget build(BuildContext context) {
    final ThemeData theme = Theme.of(context);

    return Material(
      color: theme.colorScheme.surface,
      elevation: 8,
      child: SafeArea(
        top: false,
        child: Padding(
          padding: const EdgeInsets.symmetric(
            horizontal: BookflowSpacing.lg,
            vertical: BookflowSpacing.md,
          ),
          child: Row(
            children: <Widget>[
              // The icons are the design's: a calendar-with-checkmark for
              // Booked, a green tick for Confirmed, a red cross for Cancelled.
              _FilterButton(
                status: BookingStatus.booked,
                icon: Icons.event_available_outlined,
                colour: BookflowColors.actionBlue,
                selected: selected == BookingStatus.booked,
                onTap: () => onSelect(BookingStatus.booked),
              ),
              _FilterButton(
                status: BookingStatus.confirmed,
                icon: Icons.check_circle_outline,
                colour: BookflowColors.statusConfirmed,
                selected: selected == BookingStatus.confirmed,
                onTap: () => onSelect(BookingStatus.confirmed),
              ),
              _FilterButton(
                status: BookingStatus.cancelled,
                icon: Icons.cancel_outlined,
                colour: theme.colorScheme.error,
                selected: selected == BookingStatus.cancelled,
                onTap: () => onSelect(BookingStatus.cancelled),
              ),
            ],
          ),
        ),
      ),
    );
  }
}

class _FilterButton extends StatelessWidget {
  const _FilterButton({
    required this.status,
    required this.icon,
    required this.colour,
    required this.selected,
    required this.onTap,
  });

  final BookingStatus status;
  final IconData icon;
  final Color colour;
  final bool selected;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    final ThemeData theme = Theme.of(context);

    return Expanded(
      child: InkWell(
        key: Key('filter-${status.wire}'),
        onTap: onTap,
        borderRadius: BorderRadius.circular(BookflowRadii.pill),
        child: Container(
          padding: const EdgeInsets.symmetric(vertical: BookflowSpacing.sm),
          decoration: BoxDecoration(
            // The selected tab is "outlined" in the design. Outline rather than
            // fill so the three read as one control with one chosen, not as
            // three buttons one of which is pressed.
            border: Border.all(
              color: selected ? colour : theme.colorScheme.surface,
            ),
            borderRadius: BorderRadius.circular(BookflowRadii.pill),
          ),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: <Widget>[
              Icon(
                icon,
                size: BookflowSizes.inlineSpinner,
                color: selected ? colour : theme.colorScheme.outline,
              ),
              const SizedBox(height: BookflowSpacing.xs),
              Text(
                status.label,
                style: theme.textTheme.bodySmall?.copyWith(
                  color: selected ? colour : theme.colorScheme.outline,
                  fontWeight: selected ? FontWeight.w700 : FontWeight.w400,
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}

/// Screen #5's empty state — but only on the Booked filter.
///
/// ══ THE OTHER TWO GET SOMETHING QUIETER, AND THAT IS THE POINT ══════════════
///
/// The design's empty state is "No Bookings yet" with a share button, drawn for
/// a salon that has never been booked. Showing it under the CANCELLED filter
/// would tell an owner with a full diary that they have no bookings and invite
/// them to go and get some — which is false and slightly insulting.
///
/// So the illustration and the call to action belong to Booked, and the other
/// two say the true, dull thing.
class _EmptyState extends StatelessWidget {
  const _EmptyState({required this.filter, required this.onShareLink});

  final BookingStatus filter;
  final VoidCallback? onShareLink;

  @override
  Widget build(BuildContext context) {
    final ThemeData theme = Theme.of(context);

    if (filter != BookingStatus.booked) {
      return ListView(
        padding: const EdgeInsets.all(BookflowSpacing.xxl),
        children: <Widget>[
          Text(
            filter == BookingStatus.confirmed
                ? 'Nothing confirmed yet.'
                : 'Nothing cancelled.',
            key: Key('bookings-empty-${filter.wire}'),
            style: theme.textTheme.bodyMedium,
            textAlign: TextAlign.center,
          ),
        ],
      );
    }

    // ListView rather than Column: `RefreshIndicator` needs a scrollable child
    // to receive the drag, and an empty state that cannot be pulled is an empty
    // state the owner cannot refresh — precisely when they most want to, having
    // just shared the link.
    return ListView(
      padding: const EdgeInsets.all(BookflowSpacing.xl),
      children: <Widget>[
        const SizedBox(height: BookflowSpacing.xxl),
        // The design's "vector illustration depicting a light blue calendar
        // card placeholder with clouds". No such asset exists in the repository
        // — `docs/source/` ships screenshots, not exported vectors — so this is
        // the nearest honest thing rather than a traced approximation.
        Icon(
          Icons.event_note_outlined,
          key: const Key('bookings-empty-booked'),
          size: BookflowSizes.avatarLarge,
          color: BookflowColors.actionBlue,
        ),
        const SizedBox(height: BookflowSpacing.lg),
        Text(
          'No Bookings yet',
          style: theme.textTheme.titleLarge,
          textAlign: TextAlign.center,
        ),
        const SizedBox(height: BookflowSpacing.sm),
        Text(
          'Share your booking link on WhatsApp or Instagram, and appointments '
          'will land here automatically.',
          style: theme.textTheme.bodyMedium,
          textAlign: TextAlign.center,
        ),
        const SizedBox(height: BookflowSpacing.xl),
        if (onShareLink != null)
          FilledButton(
            key: const Key('bookings-empty-share'),
            onPressed: onShareLink,
            child: const Text('Share your booking link  ›'),
          ),
      ],
    );
  }
}
