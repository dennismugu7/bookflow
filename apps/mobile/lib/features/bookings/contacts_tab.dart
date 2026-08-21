import 'package:bookflow/features/bookings/bookings_models.dart';
import 'package:bookflow/features/bookings/bookings_providers.dart';
import 'package:bookflow/theme/tokens.dart';
import 'package:bookflow/ui/async_value_view.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:url_launcher/url_launcher.dart';

/// The Contacts tab — design screen #8.
///
/// Name, email and phone per card. The email and the phone are tappable and
/// hand off to the operating system, which is the design's specification and is
/// also the right division of labour: an app that tried to send the mail itself
/// would need an account, a composer and a sent folder.
///
/// **Tapping the card itself does nothing here.** The design routes it to
/// `/contacts/:id` showing "appointment history, total spent, notes" — none of
/// which exists: there is no contacts table (they are derived from bookings),
/// no notes column, and no spend total. A card that navigated to an empty
/// screen would be the promise-nothing-keeps that `K75` names.
class ContactsTab extends ConsumerWidget {
  const ContactsTab({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final AsyncValue<List<Contact>> contacts = ref.watch(contactsProvider);

    return RefreshIndicator(
      onRefresh: () async {
        ref.invalidate(contactsProvider);
        await ref.read(contactsProvider.future);
      },
      child: AsyncValueView<List<Contact>>(
        value: contacts,
        onRetry: () => ref.invalidate(contactsProvider),
        data: (List<Contact> list) => list.isEmpty
            ? _Empty()
            : ListView.builder(
                padding: const EdgeInsets.all(BookflowSpacing.lg),
                itemCount: list.length,
                itemBuilder: (BuildContext context, int index) =>
                    _ContactCard(contact: list[index]),
              ),
      ),
    );
  }
}

class _Empty extends StatelessWidget {
  @override
  Widget build(BuildContext context) {
    final ThemeData theme = Theme.of(context);

    // A scrollable, so the pull-to-refresh gesture still lands. See the
    // bookings empty state for the same reasoning.
    return ListView(
      padding: const EdgeInsets.all(BookflowSpacing.xxl),
      children: <Widget>[
        Text(
          'Clients who book will appear here.',
          key: const Key('contacts-empty'),
          style: theme.textTheme.bodyMedium,
          textAlign: TextAlign.center,
        ),
      ],
    );
  }
}

class _ContactCard extends StatelessWidget {
  const _ContactCard({required this.contact});

  final Contact contact;

  @override
  Widget build(BuildContext context) {
    final ThemeData theme = Theme.of(context);

    return Card(
      margin: const EdgeInsets.only(bottom: BookflowSpacing.md),
      child: Padding(
        padding: const EdgeInsets.all(BookflowSpacing.lg),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: <Widget>[
            Text(
              contact.name,
              style: theme.textTheme.bodyMedium?.copyWith(
                fontWeight: FontWeight.w700,
              ),
            ),
            const SizedBox(height: BookflowSpacing.sm),
            _LaunchableLine(
              key: Key('contact-email-${contact.email}'),
              icon: Icons.mail_outline,
              label: contact.email,
              // `Uri(scheme:, path:)` rather than `Uri.parse('mailto:$x')`:
              // parsing a string built by concatenation puts an unescaped
              // address into a URI, and an address containing a `?` would turn
              // the rest into query parameters.
              uri: Uri(scheme: 'mailto', path: contact.email),
            ),
            _LaunchableLine(
              key: Key('contact-phone-${contact.phone}'),
              icon: Icons.phone_outlined,
              label: contact.phone,
              uri: Uri(scheme: 'tel', path: contact.phone),
            ),
            const SizedBox(height: BookflowSpacing.sm),
            Text(
              contact.bookingCount == 1
                  ? '1 booking'
                  : '${contact.bookingCount} bookings',
              style: theme.textTheme.bodySmall?.copyWith(
                color: theme.colorScheme.onSurfaceVariant,
              ),
            ),
          ],
        ),
      ),
    );
  }
}

class _LaunchableLine extends StatelessWidget {
  const _LaunchableLine({
    required this.icon,
    required this.label,
    required this.uri,
    super.key,
  });

  final IconData icon;
  final String label;
  final Uri uri;

  @override
  Widget build(BuildContext context) {
    final ThemeData theme = Theme.of(context);

    return InkWell(
      onTap: () async {
        // ── A DEVICE WITH NO MAIL APP IS A REAL DEVICE ────────────────────
        //
        // `launchUrl` throws when nothing can handle the scheme, and an
        // unhandled exception from a tap crashes the frame. A tablet with no
        // SIM has no dialler; an emulator has neither.
        //
        // The failure is reported rather than swallowed: a tap that silently
        // did nothing would read as a broken button.
        try {
          await launchUrl(uri);
        } catch (_) {
          if (!context.mounted) return;
          ScaffoldMessenger.of(context).showSnackBar(
            SnackBar(content: Text('Nothing on this device can open $label.')),
          );
        }
      },
      child: Padding(
        padding: const EdgeInsets.symmetric(vertical: BookflowSpacing.xs),
        child: Row(
          children: <Widget>[
            Icon(
              icon,
              size: BookflowSizes.inlineSpinner,
              color: BookflowColors.actionBlue,
            ),
            const SizedBox(width: BookflowSpacing.sm),
            Expanded(
              child: Text(
                label,
                style: theme.textTheme.bodySmall?.copyWith(
                  color: BookflowColors.actionBlue,
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }
}
