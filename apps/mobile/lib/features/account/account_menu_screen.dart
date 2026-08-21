import 'package:bookflow/features/auth/logout_confirmation.dart';
import 'package:bookflow/features/profile/profile_models.dart';
import 'package:bookflow/features/profile/profile_providers.dart';
import 'package:bookflow/platform/providers.dart';
import 'package:bookflow/theme/tokens.dart';
import 'package:bookflow/ui/initials_avatar.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:url_launcher/url_launcher.dart';

/// Screen #17 — the account menu (`native-16`), pushed from the dashboard's
/// avatar (decision 12).
///
/// ══ FIVE ROWS, WHICH IS WHAT THE DESIGN DRAWS ═══════════════════════════════
///
/// **This shipped with two.** The comment here read: "The design draws Profile,
/// My services, Settings, Support and Log out. This ships Profile and Log out
/// only: #21/#22, #23 and #18 do not exist, and a row that navigates nowhere is
/// a promise the app does not keep. **The fifth design deviation**, and
/// criterion 56 pins it."
///
/// Every one of those destinations exists now. `/services` shipped with owner
/// configuration, `/settings` ships here, and Support is a `mailto:` rather than
/// screen #18's Help Center form — a form that posts to nothing would be the
/// same broken promise in a new place, and an email reaches a person today.
///
/// **The deviation is closed.** Criterion 56 described a screen that no longer
/// exists.
///
/// ══ GENERATION B — READ FOR STRUCTURE, NEVER FOR COLOUR ═════════════════════
///
/// ADR-039 classifies `native-16` as Generation B and rules that Generation B
/// "is not" the design system: *"Layout, hierarchy, copy and content stand.
/// Colour and treatment come from the tokens."* So its violet accents, black
/// pill buttons and pink avatar are **not sampled** — every colour here comes
/// from `tokens.dart`.
///
/// ══ THE WAY BACK IS DECLARED, NOT INHERITED (criterion 62) ══════════════════
///
/// This screen used to carry no `leading:` at all, and an arrow appeared anyway:
/// `AppBar.automaticallyImplyLeading` supplies a `BackButton` whenever the route
/// can pop. **It worked, and it was a guarantee nobody held.** The arrow was
/// conditional on `/account` being reached by `push` — route it with `go`, or
/// promote it to a shell, and the only way back to the dashboard disappears
/// with no test failing. That is the same failure as screen #20 losing its path
/// when `/home` moved, which criterion 55 exists to catch.
///
/// So it is explicit here, as it is on #20, and criterion 62 pins it.
///
/// ══ THE HEADER MAY DEGRADE; THE ROWS MAY NOT ════════════════════════════════
///
/// The profile read feeds the header only. **`AsyncValueView` is deliberately
/// not used for the screen**: it would replace everything on a failure and take
/// Log out with it, stranding exactly the user who most needs to leave. So
/// loading and error are confined to the header, and the rows are static —
/// criteria 59 and 60.
class AccountMenuScreen extends ConsumerWidget {
  const AccountMenuScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final AsyncValue<OwnerProfile> profile = ref.watch(myProfileProvider);

    return Scaffold(
      appBar: AppBar(
        leading: IconButton(
          key: const Key('account-back'),
          icon: const Icon(Icons.arrow_back),
          onPressed: () => context.pop(),
          tooltip: 'Back',
        ),
        title: const Text('Account'),
      ),
      body: SafeArea(
        child: ListView(
          padding: const EdgeInsets.all(BookflowSpacing.lg),
          children: <Widget>[
            _Header(profile: profile),
            const SizedBox(height: BookflowSpacing.xl),
            ListTile(
              key: const Key('account-profile'),
              leading: const Icon(Icons.badge_outlined),
              title: const Text('Profile'),
              trailing: const Icon(Icons.chevron_right),
              onTap: () => context.push('/profile'),
            ),
            ListTile(
              key: const Key('account-services'),
              leading: const Icon(Icons.design_services_outlined),
              title: const Text('My services'),
              trailing: const Icon(Icons.chevron_right),
              // The same screen the dashboard checklist reaches. A second route
              // to one screen rather than a second screen — the design puts it
              // in both places because an owner looking for their price list
              // will look in both.
              onTap: () => context.push('/services'),
            ),
            ListTile(
              key: const Key('account-settings'),
              leading: const Icon(Icons.settings_outlined),
              title: const Text('Settings'),
              trailing: const Icon(Icons.chevron_right),
              onTap: () => context.push('/settings'),
            ),
            ListTile(
              key: const Key('account-support'),
              leading: const Icon(Icons.support_agent_outlined),
              title: const Text('Support'),
              // ── AN EMAIL, NOT SCREEN #18'S HELP CENTER FORM ───────────────
              //
              // The design routes this to a contact form. **That form has no
              // endpoint** — nothing in the API accepts a support request, and
              // building one that posted nowhere would be the same promise the
              // two-row version of this screen was written to avoid.
              //
              // A `mailto:` reaches a person today, which is what a support
              // affordance is for. The trailing icon says so: an outbound arrow
              // rather than a chevron, because this leaves the app.
              trailing: const Icon(Icons.north_east),
              onTap: () async => _openSupportMail(context),
            ),
            const Divider(),
            ListTile(
              key: const Key('account-log-out'),
              leading: const Icon(Icons.logout),
              title: const Text('Log out'),
              // Sign-out moved here from screen #20's back arrow, whose comment
              // said it signed out because "there is one screen behind the
              // shell". That reasoning expired the moment this screen existed.
              //
              // It now asks first (Screen 11). This row sits directly under
              // Profile, and a mistap used to end the session outright.
              onTap: () async {
                if (await showLogoutConfirmation(context)) {
                  await ref.read(authGatewayProvider).signOut();
                }
              },
            ),
          ],
        ),
      ),
    );
  }
}

/// Opens the device's mail client, addressed to support.
///
/// The address is the one the design uses on screens #25 and #27, so an owner
/// who reaches support from the deletion flow and one who reaches it from this
/// menu land in the same inbox.
Future<void> _openSupportMail(BuildContext context) async {
  // `Uri(scheme:, path:)` rather than `Uri.parse('mailto:$address')`: a parsed
  // concatenation puts an unescaped address into a URI, and a `?` in one would
  // turn the remainder into query parameters.
  final Uri mail = Uri(
    scheme: 'mailto',
    path: supportEmailAddress,
    queryParameters: const <String, String>{'subject': 'Bookflow support'},
  );

  try {
    await launchUrl(mail);
  } catch (_) {
    // A device with no mail client is a real device — a tablet, an emulator.
    // `launchUrl` throws there, and an unhandled exception from a tap crashes
    // the frame. The address is shown instead, so the tap still leads somewhere
    // rather than appearing broken.
    if (!context.mounted) return;
    ScaffoldMessenger.of(context).showSnackBar(
      const SnackBar(content: Text('Email us at $supportEmailAddress')),
    );
  }
}

/// The one place the support address is written.
///
/// Screens #17, #25 and #27 all show it. A second copy is a second thing to
/// change when it moves, and the one that gets missed is the one in the
/// deletion flow, which is where somebody is already unhappy.
const String supportEmailAddress = 'support@mugu-labs.com';

/// The design's banner: gradient, avatar, name.
class _Header extends StatelessWidget {
  const _Header({required this.profile});

  final AsyncValue<OwnerProfile> profile;

  @override
  Widget build(BuildContext context) {
    final ThemeData theme = Theme.of(context);

    return Container(
      padding: const EdgeInsets.symmetric(vertical: BookflowSpacing.xl),
      decoration: BoxDecoration(
        // ── THE GRADIENT IS THE HERO TOKEN, NOT native-16's VIOLET ──────────
        //
        // ADR-039 makes `native-16` Generation B: "Layout, hierarchy, copy and
        // content stand. Colour and treatment come from the tokens." The design
        // draws a purple gradient banner, so a gradient banner is what this is —
        // built from `heroGradientStart`/`heroGradientEnd`, which are measured
        // from Generation A, rather than sampled from the screenshot.
        gradient: const LinearGradient(
          colors: <Color>[
            BookflowColors.heroGradientStart,
            BookflowColors.heroGradientEnd,
          ],
          begin: Alignment.topLeft,
          end: Alignment.bottomRight,
        ),
        borderRadius: BorderRadius.circular(BookflowRadii.card),
      ),
      // Confined to the header. A failed or pending profile read must not reach
      // the rows below it — see the class comment.
      child: profile.when(
        loading: () => const SizedBox(
          key: Key('account-header-loading'),
          height: BookflowSizes.avatarSmall,
          child: Center(child: CircularProgressIndicator.adaptive()),
        ),
        error: (Object error, StackTrace stackTrace) => Text(
          key: const Key('account-header-error'),
          'Could not load your details.',
          style: theme.textTheme.bodySmall?.copyWith(
            color: BookflowColors.textOnBrand,
          ),
          textAlign: TextAlign.center,
        ),
        data: (OwnerProfile value) => Column(
          children: <Widget>[
            InitialsAvatar(
              initials: value.initials,
              diameter: BookflowSizes.avatarLarge,
            ),
            const SizedBox(height: BookflowSpacing.md),
            Text(
              value.fullName,
              key: const Key('account-header-name'),
              style: theme.textTheme.titleMedium?.copyWith(
                // On the gradient, so the body colour would be unreadable.
                color: BookflowColors.textOnBrand,
                fontWeight: FontWeight.w700,
              ),
            ),
          ],
        ),
      ),
    );
  }
}
