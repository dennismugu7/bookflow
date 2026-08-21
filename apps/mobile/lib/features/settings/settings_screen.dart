import 'package:bookflow/theme/tokens.dart';
import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';

/// Screen #23 — Settings, pushed from the account menu.
///
/// ══ THREE ROWS AND ONE DESTRUCTIVE BUTTON, AS DRAWN ═════════════════════════
///
/// The design's icon convention is meaningful and is kept: a key on Change
/// password signals an in-app transition, and an outbound arrow on the two legal
/// rows signals leaving. **Both legal rows stay in the app anyway**, which is
/// the one place this departs — see `LegalDocumentScreen` for why, and note the
/// icons still say "outbound" because that is what they will be once the
/// documents exist.
///
/// The Delete account button sits at the bottom behind a large gap, which the
/// design describes as "a deliberately isolated, low-prominence destructive
/// action". Outlined rather than filled, and red — it is reachable without being
/// inviting.
class SettingsScreen extends StatelessWidget {
  const SettingsScreen({super.key});

  @override
  Widget build(BuildContext context) {
    final ThemeData theme = Theme.of(context);

    return Scaffold(
      appBar: AppBar(
        // Declared rather than inherited, for criterion 62's reason: an
        // `automaticallyImplyLeading` arrow is conditional on how the route was
        // reached, and routing this with `go` instead of `push` would remove the
        // only way back with no test failing.
        leading: IconButton(
          key: const Key('settings-back'),
          icon: const Icon(Icons.arrow_back),
          onPressed: () => context.pop(),
          tooltip: 'Back',
        ),
        title: const Text('Settings'),
      ),
      body: SafeArea(
        child: Column(
          children: <Widget>[
            Expanded(
              child: ListView(
                padding: const EdgeInsets.all(BookflowSpacing.lg),
                children: <Widget>[
                  ListTile(
                    key: const Key('settings-change-password'),
                    leading: const Icon(Icons.key_outlined),
                    title: const Text('Change password'),
                    trailing: const Icon(Icons.chevron_right),
                    onTap: () => context.push('/change-password'),
                  ),
                  ListTile(
                    key: const Key('settings-privacy'),
                    leading: const Icon(Icons.north_east),
                    title: const Text('Privacy policy'),
                    trailing: const Icon(Icons.chevron_right),
                    onTap: () => context.push('/legal/privacy'),
                  ),
                  ListTile(
                    key: const Key('settings-terms'),
                    leading: const Icon(Icons.north_east),
                    title: const Text('Terms of service'),
                    trailing: const Icon(Icons.chevron_right),
                    onTap: () => context.push('/legal/terms'),
                  ),
                ],
              ),
            ),
            Padding(
              padding: const EdgeInsets.all(BookflowSpacing.lg),
              child: OutlinedButton(
                key: const Key('settings-delete-account'),
                style: OutlinedButton.styleFrom(
                  foregroundColor: theme.colorScheme.error,
                  side: BorderSide(color: theme.colorScheme.error),
                ),
                // Straight into the exit survey (#25), not a dialog. The design
                // answers its own question here: the friction step "does exist,
                // it's just this screen rather than a simple dialog".
                onPressed: () => context.push('/delete-account'),
                child: const Text('Delete account'),
              ),
            ),
          ],
        ),
      ),
    );
  }
}

/// Which document is being shown.
enum LegalDocument {
  privacy('Privacy policy'),
  terms('Terms of service');

  const LegalDocument(this.title);

  final String title;
}

/// The Privacy policy and Terms of service, which do not exist yet.
///
/// ══ A HONEST PLACEHOLDER, NOT A DEAD TAP AND NOT A FAKE DOCUMENT ════════════
///
/// **Neither document has been written.** That is a known project gap, and it
/// has three possible treatments:
///
///   * **Omit the rows.** But the design draws them, and an app that collects
///     an email address and a phone number needs somewhere to say what it does
///     with them. Removing the rows hides the gap rather than closing it.
///   * **Link out to a URL.** There is no URL. A link to a 404 is worse than no
///     link, and inventing one commits to a domain nobody has published at.
///   * **Generate placeholder legal text.** Absolutely not. A privacy policy is
///     a legal undertaking; text that LOOKS like one and was written by nobody
///     with authority to make those promises is worse than an empty screen in
///     every direction — it misleads the reader and binds the company to terms
///     it never agreed.
///
/// So the row navigates, and the screen says plainly that the document is
/// coming and where to ask in the meantime. The tap leads somewhere; nothing
/// pretends to be a policy.
///
/// **What closes this**: real documents, hosted. The rows already carry the
/// outbound-arrow icon the design specifies, so that change is a URL and a
/// `launchUrl`.
class LegalDocumentScreen extends StatelessWidget {
  const LegalDocumentScreen({required this.document, super.key});

  final LegalDocument document;

  @override
  Widget build(BuildContext context) {
    final ThemeData theme = Theme.of(context);

    return Scaffold(
      appBar: AppBar(
        leading: IconButton(
          key: const Key('legal-back'),
          icon: const Icon(Icons.arrow_back),
          onPressed: () => context.pop(),
          tooltip: 'Back',
        ),
        title: Text(document.title),
      ),
      body: SafeArea(
        child: ListView(
          padding: const EdgeInsets.all(BookflowSpacing.xl),
          children: <Widget>[
            const SizedBox(height: BookflowSpacing.xxl),
            Icon(
              Icons.description_outlined,
              key: const Key('legal-placeholder'),
              size: BookflowSizes.avatarLarge,
              color: theme.colorScheme.outline,
            ),
            const SizedBox(height: BookflowSpacing.lg),
            Text(
              '${document.title} is on its way',
              style: theme.textTheme.titleLarge,
              textAlign: TextAlign.center,
            ),
            const SizedBox(height: BookflowSpacing.sm),
            Text(
              'We are still writing this document, and it will be published '
              'here before Bookflow launches publicly.',
              style: theme.textTheme.bodyMedium,
              textAlign: TextAlign.center,
            ),
            const SizedBox(height: BookflowSpacing.md),
            Text(
              'If you have a question about your data in the meantime, email '
              'us and a person will answer.',
              style: theme.textTheme.bodySmall,
              textAlign: TextAlign.center,
            ),
          ],
        ),
      ),
    );
  }
}
