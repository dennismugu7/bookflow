import 'package:bookflow/features/bookings/bookings_tab.dart';
import 'package:bookflow/features/bookings/calendar_tab.dart';
import 'package:bookflow/features/bookings/contacts_tab.dart';
import 'package:bookflow/features/business/business_models.dart';
import 'package:bookflow/features/business/business_providers.dart';
import 'package:bookflow/features/dashboard/publish_sheet.dart';
import 'package:bookflow/features/hours/hours_models.dart';
import 'package:bookflow/features/hours/hours_providers.dart';
import 'package:bookflow/features/media/media_models.dart';
import 'package:bookflow/features/media/media_providers.dart';
import 'package:bookflow/features/profile/profile_models.dart';
import 'package:bookflow/features/profile/profile_providers.dart';
import 'package:bookflow/features/services/services_models.dart';
import 'package:bookflow/features/services/services_providers.dart';
import 'package:bookflow/features/team/team_models.dart';
import 'package:bookflow/features/team/team_providers.dart';
import 'package:bookflow/platform/providers.dart';
import 'package:bookflow/theme/tokens.dart';
import 'package:bookflow/ui/async_value_view.dart';
import 'package:bookflow/ui/initials_avatar.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:share_plus/share_plus.dart';

/// Screen #12 — the dashboard (`native-11`), at `/home`.
///
/// ══ TWO DIFFERENT SCREENS UNDER ONE ROUTE ═══════════════════════════════════
///
/// A PUBLISHED salon gets the design's dashboard: the Bookings / Contacts /
/// Calendar pill row, the avatar, and three tabs of real data. An UNPUBLISHED
/// one keeps the setup checklist, untouched.
///
/// **That split is the point rather than a compromise.** The design draws one
/// dashboard because it assumes a working salon; a salon with no services and no
/// hours cannot be booked, so all three tabs would be empty and the one thing
/// that owner needs — the list of steps left — would not be on screen.
///
/// ── THE SEVENTH DESIGN DEVIATION IS NOW RESOLVED ───────────────────────────
///
/// This file used to record that the segmented control was deliberately absent
/// because "bookings do not exist, and drawing three tabs that lead nowhere
/// would make K75's promise three times on one screen". Bookings exist. The
/// tabs lead somewhere. The deviation is closed for a published salon, and
/// stands for an unpublished one for the reason above.
///
/// ── AND THE EMPTY STATE HAS MOVED TO WHERE IT BELONGS ──────────────────────
///
/// Screen #5's "No Bookings yet" with its share button is the BOOKINGS TAB's
/// empty state, which is what the design always meant — it sits under the tab
/// row in the drawing. The published dashboard no longer shows a booking link
/// as its whole content; it shows the diary, and offers the link when the diary
/// is empty.
class DashboardScreen extends ConsumerWidget {
  const DashboardScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final AsyncValue<BusinessStatus> business = ref.watch(myBusinessProvider);

    return AsyncValueView<BusinessStatus>(
      value: business,
      onRetry: () => ref.invalidate(myBusinessProvider),
      // ── CRITERION 46 LIVES IN THESE BRANCHES ──────────────────────────────
      //
      // On a failed load this renders `ErrorView` and NOTHING else — not the
      // checklist, not the dashboard. Both assert something about a business
      // whose state is unknown, and `router.dart` argues the same point for the
      // redirect: guessing wrong is worse than saying "we could not load this".
      //
      // It wraps the whole Scaffold rather than sitting inside one, because the
      // two states need DIFFERENT scaffolds — the published one has a tab row in
      // its app bar and the checklist does not.
      data: (BusinessStatus status) => switch (status) {
        // Unreachable from here — an owner with no business is at /setup — but
        // the compiler requires it, which is why `BusinessStatus` is sealed.
        NoBusinessYet() => const _SetupScaffold(businessName: null),
        HasBusiness(business: final OwnedBusiness value) =>
          value.published
              ? _LiveDashboard(businessName: value.name, handle: value.handle)
              : _SetupScaffold(businessName: value.name),
      },
    );
  }
}

/// The published salon's dashboard: three tabs, and the avatar.
class _LiveDashboard extends ConsumerStatefulWidget {
  const _LiveDashboard({required this.businessName, required this.handle});

  final String businessName;
  final String? handle;

  @override
  ConsumerState<_LiveDashboard> createState() => _LiveDashboardState();
}

class _LiveDashboardState extends ConsumerState<_LiveDashboard>
    with SingleTickerProviderStateMixin {
  late final TabController _tabs = TabController(length: 3, vsync: this);

  @override
  void dispose() {
    _tabs.dispose();
    super.dispose();
  }

  /// Opens the system share sheet with the booking link.
  ///
  /// Lives here rather than in the Bookings tab because the link comes from the
  /// business read this widget already holds — a tab that fetched the handle
  /// again would be a second source for one string.
  Future<void> _shareLink() async {
    final String? handle = widget.handle;
    if (handle == null) return;

    final String link = ref.read(appConfigProvider).bookingLinkFor(handle);
    await SharePlus.instance.share(
      ShareParams(text: link, subject: 'Book with us on Bookflow'),
    );
  }

  @override
  Widget build(BuildContext context) {
    final ThemeData theme = Theme.of(context);

    return Scaffold(
      appBar: AppBar(
        // ── THE PILLS ARE THE TITLE, NOT A ROW BENEATH IT ────────────────────
        //
        // The design's top bar is the three tabs and the avatar — there is no
        // "Bookflow" wordmark on this screen. An owner in their own diary knows
        // which app they are in, and the space buys a legible tab row.
        title: TabBar(
          controller: _tabs,
          isScrollable: false,
          // Pill-shaped, per the design: the selected tab is outlined rather
          // than underlined, so the three read as one segmented control.
          indicator: BoxDecoration(
            borderRadius: BorderRadius.circular(BookflowRadii.pill),
            border: Border.all(color: theme.colorScheme.primary),
          ),
          indicatorSize: TabBarIndicatorSize.tab,
          // The one colour literal the design-system rule permits, and it is
          // permitted because it is the absence of a colour rather than a
          // choice of one — there is no token that could be wrong here.
          dividerColor: Colors.transparent,
          labelStyle: theme.textTheme.bodySmall?.copyWith(
            fontWeight: FontWeight.w700,
          ),
          unselectedLabelStyle: theme.textTheme.bodySmall,
          tabs: const <Widget>[
            Tab(key: Key('tab-bookings'), text: 'Bookings'),
            Tab(key: Key('tab-contacts'), text: 'Contacts'),
            Tab(key: Key('tab-calendar'), text: 'Calendar'),
          ],
        ),
        actions: const <Widget>[_ProfileAvatar()],
      ),
      body: SafeArea(
        child: TabBarView(
          controller: _tabs,
          children: <Widget>[
            BookingsTab(onShareLink: widget.handle == null ? null : _shareLink),
            const ContactsTab(),
            const CalendarTab(),
          ],
        ),
      ),
    );
  }
}

/// The unpublished salon's dashboard: the setup checklist, unchanged.
class _SetupScaffold extends ConsumerWidget {
  const _SetupScaffold({required this.businessName});

  final String? businessName;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Bookflow'),
        actions: const <Widget>[_ProfileAvatar()],
      ),
      body: SafeArea(
        child: RefreshIndicator(
          // One refresh on demand. No realtime, no polling: the only thing that
          // changes this screen is the owner's own action on another screen,
          // and those already invalidate what they changed.
          onRefresh: () async {
            ref
              ..invalidate(myBusinessProvider)
              ..invalidate(myServicesProvider)
              ..invalidate(myOpeningHoursProvider)
              ..invalidate(myTeamProvider)
              ..invalidate(myPortfolioProvider);
            await ref.read(myBusinessProvider.future);
          },
          child: _Checklist(businessName: businessName),
        ),
      ),
    );
  }
}

/// The top-right avatar (`native-11`), which opens the account menu.
class _ProfileAvatar extends ConsumerWidget {
  const _ProfileAvatar();

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final AsyncValue<OwnerProfile> profile = ref.watch(myProfileProvider);
    final String initials = profile.maybeWhen(
      data: (OwnerProfile value) => value.initials,
      orElse: () => '',
    );

    return Padding(
      padding: const EdgeInsets.only(right: BookflowSpacing.md),
      child: InkWell(
        key: const Key('dashboard-avatar'),
        customBorder: const CircleBorder(),
        onTap: () => context.push('/account'),
        child: InitialsAvatar(
          initials: initials,
          diameter: BookflowSizes.avatarSmall,
        ),
      ),
    );
  }
}

/// Where the owner is in setup, and what remains.
class _Checklist extends ConsumerWidget {
  const _Checklist({required this.businessName});

  final String? businessName;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final ThemeData theme = Theme.of(context);

    // ── EACH ROW'S DONE STATE IS COMPUTED, NEVER ASSUMED ────────────────────
    //
    // `maybeWhen(orElse: …)` rather than a spinner per row: a checklist that
    // flickered four spinners on every open would be worse than one that shows
    // "todo" for the half-second before the counts arrive, and a row that reads
    // "todo" while loading understates rather than overstates — it never claims
    // a step is done that is not.
    final int serviceCount = ref
        .watch(myServicesProvider)
        .maybeWhen(
          data: (List<SalonService> value) => value.length,
          orElse: () => 0,
        );
    final int openDays = ref
        .watch(myOpeningHoursProvider)
        .maybeWhen(
          data: (List<DayHours> value) => value.length,
          orElse: () => 0,
        );
    final int teamCount = ref
        .watch(myTeamProvider)
        .maybeWhen(
          data: (List<TeamMember> value) => value.length,
          orElse: () => 0,
        );
    final int photoCount = ref
        .watch(myPortfolioProvider)
        .maybeWhen(
          data: (List<PortfolioImage> value) => value.length,
          orElse: () => 0,
        );

    return ListView(
      padding: const EdgeInsets.all(BookflowSpacing.xl),
      children: <Widget>[
        Text(
          businessName == null
              ? 'Finish setting up'
              : 'Setting up $businessName',
          key: const Key('setup-continuation'),
          style: theme.textTheme.titleLarge,
          textAlign: TextAlign.center,
        ),
        const SizedBox(height: BookflowSpacing.sm),
        Text(
          'Your business is created. A few things left before clients can book '
          'with you.',
          style: theme.textTheme.bodyMedium,
          textAlign: TextAlign.center,
        ),
        const SizedBox(height: BookflowSpacing.xl),
        _SetupRow(
          key: const Key('setup-services'),
          label: 'Add your services',
          done: serviceCount > 0,
          summary: serviceCount == 1 ? '1 service' : '$serviceCount services',
          onTap: () => context.push('/services'),
        ),
        _SetupRow(
          key: const Key('setup-hours'),
          label: 'Set your opening hours',
          done: openDays > 0,
          summary: openDays == 1
              ? 'Open 1 day a week'
              : 'Open $openDays days a week',
          onTap: () => context.push('/opening-hours'),
        ),
        // ── NOT REQUIRED TO PUBLISH, AND SAYS SO ────────────────────────────
        //
        // The API's publish check is name + at least one service + at least one
        // open day. The team is not on that list, so this row must not read as
        // blocking — an owner who works alone would otherwise wait for a step
        // that is never coming.
        _SetupRow(
          key: const Key('setup-team'),
          label: 'Add your team',
          // It has a screen now, so the row can report what is on it rather
          // than being permanently unticked as it was while `/team` was a
          // placeholder. Still optional: publishing does not wait for it.
          done: teamCount > 0,
          summary: teamCount == 0
              ? 'Optional'
              : teamCount == 1
              ? '1 person — optional'
              : '$teamCount people — optional',
          onTap: () => context.push('/team'),
        ),
        // ── ALSO NOT REQUIRED TO PUBLISH ────────────────────────────────────
        //
        // Same shape as the team row and the same reason: the API's gate is
        // name + one service + one open day. A gallery is worth having and is
        // not worth waiting for, so the row exists to be REACHABLE rather than
        // to be ticked, and its summary says "optional" out loud.
        _SetupRow(
          key: const Key('setup-portfolio'),
          label: 'Add photos of your work',
          done: photoCount > 0,
          summary: photoCount == 0
              ? 'Optional'
              : photoCount == 1
              ? '1 photo — optional'
              : '$photoCount photos — optional',
          onTap: () => context.push('/portfolio'),
        ),
        _SetupRow(
          key: const Key('setup-publish'),
          label: 'Publish your booking page',
          done: false,
          summary: 'Go live',
          onTap: () => showPublishSheet(context),
        ),
      ],
    );
  }
}

class _SetupRow extends StatelessWidget {
  const _SetupRow({
    required this.label,
    required this.done,
    required this.summary,
    required this.onTap,
    super.key,
  });

  final String label;
  final bool done;
  final String summary;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    final ThemeData theme = Theme.of(context);

    return Card(
      margin: const EdgeInsets.only(bottom: BookflowSpacing.md),
      child: ListTile(
        onTap: onTap,
        leading: Icon(
          done ? Icons.check_circle : Icons.radio_button_unchecked,
          color: done ? theme.colorScheme.secondary : theme.colorScheme.outline,
        ),
        title: Text(label, style: theme.textTheme.bodyMedium),
        subtitle: Text(summary, style: theme.textTheme.bodySmall),
        // A done row keeps its chevron: it is still editable, and removing the
        // affordance would make finished steps look locked.
        trailing: const Icon(Icons.chevron_right),
      ),
    );
  }
}

// ── `_PublishedState` AND `_BookingLink` LIVED HERE AND ARE GONE ────────────
//
// They were the whole content of a published salon's dashboard: its name, a
// sentence saying the page was live, the link in a card, and Copy and Share
// buttons. That was the right screen while there was nothing else to show.
//
// There is now. The design's dashboard for a live salon is the diary, and the
// link belongs to the Bookings tab's empty state — which is where the design
// draws it, beneath the tab row. Keeping this as a fourth thing would mean an
// owner with bookings scrolling past their own URL to reach them.
//
// **Copy-to-clipboard went with it, and that is a real loss**: the share sheet
// covers it on both platforms (every share sheet offers Copy), but it is now
// two taps rather than one. Recorded rather than quietly dropped.
