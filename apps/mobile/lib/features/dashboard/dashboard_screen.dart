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
import 'package:flutter/services.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:share_plus/share_plus.dart';

/// Screen #12 — the dashboard (`native-11`), at `/home`.
///
/// ══ THE CHECKLIST IS LIVE NOW ═══════════════════════════════════════════════
///
/// It used to list four things as text — "a row that navigates nowhere is a
/// promise the app does not keep", which was right while none of them had a
/// destination. Three now do and the fourth publishes. Each row computes its
/// own done/todo state from data the screen already fetched, so nothing claims
/// a step is finished without having read what finished it.
///
/// ── WHAT IS STILL NOT HERE ─────────────────────────────────────────────────
///
/// `native-11`'s **Bookings / Contacts / Calendar** segmented control. Bookings
/// do not exist, and the seventh design deviation stands unchanged: drawing
/// three tabs that lead nowhere would make K75's promise three times on one
/// screen.
///
/// ── AND THE EMPTY STATE IS STILL REPLACED, UNTIL IT IS TRUE ────────────────
///
/// The designed empty state offers a "booking link" to share. For an
/// unpublished salon there is no link, so the checklist stands in for it — and
/// once the salon IS published the link is real and the published state shows
/// it, which is the first time that part of the design has been honest.
class DashboardScreen extends ConsumerWidget {
  const DashboardScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final AsyncValue<BusinessStatus> business = ref.watch(myBusinessProvider);

    return Scaffold(
      appBar: AppBar(
        title: const Text('Bookflow'),
        actions: const <Widget>[_ProfileAvatar()],
      ),
      body: SafeArea(
        // ── CRITERION 46 LIVES IN THIS WIDGET'S BRANCHES ────────────────────
        //
        // On a failed load this renders `ErrorView` and NOTHING else — not the
        // checklist, not the published state. Both assert something about a
        // business whose state is unknown, and `router.dart` argues the same
        // point for the redirect: guessing wrong in that direction is worse
        // than saying "we could not load this" and offering a retry.
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
          child: AsyncValueView<BusinessStatus>(
            value: business,
            onRetry: () => ref.invalidate(myBusinessProvider),
            data: (BusinessStatus status) => switch (status) {
              // Unreachable from here — an owner with no business is at /setup
              // — but the compiler requires it, which is why `BusinessStatus`
              // is sealed.
              NoBusinessYet() => const _Checklist(businessName: null),
              HasBusiness(business: final OwnedBusiness value) =>
                value.published
                    ? _PublishedState(
                        businessName: value.name,
                        handle: value.handle,
                      )
                    : _Checklist(businessName: value.name),
            },
          ),
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

/// The salon is live. The heading is its name and the link is real.
class _PublishedState extends ConsumerWidget {
  const _PublishedState({required this.businessName, required this.handle});

  final String businessName;

  /// From the business read itself. There is no second fetch and no second
  /// async state — `handle` arrives with `published`, so a salon that is
  /// published always has its address in hand.
  final String? handle;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final ThemeData theme = Theme.of(context);

    return ListView(
      padding: const EdgeInsets.all(BookflowSpacing.xl),
      children: <Widget>[
        Text(
          businessName,
          key: const Key('dashboard-published'),
          style: theme.textTheme.titleLarge,
          textAlign: TextAlign.center,
        ),
        const SizedBox(height: BookflowSpacing.sm),
        Text(
          'Your booking page is live. Share the link and clients can book with '
          'you.',
          style: theme.textTheme.bodyMedium,
          textAlign: TextAlign.center,
        ),
        const SizedBox(height: BookflowSpacing.xl),
        // ── NO NESTED ASYNC STATE ANY MORE ──────────────────────────────────
        //
        // This used to be a second `AsyncValueView` over a second read, because
        // the handle came from a different endpoint than `published` did. It
        // comes from the same row now, so there is nothing left to load and
        // nothing that can fail on its own.
        //
        // The null branch survives for the compiler: `handle` is nullable
        // because an unpublished salon has none, and reaching here means
        // `published` is true — a combination the API does not produce.
        if (handle != null) _BookingLink(handle: handle!),
      ],
    );
  }
}

class _BookingLink extends ConsumerWidget {
  const _BookingLink({required this.handle});

  final String handle;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final ThemeData theme = Theme.of(context);
    final String link = ref.watch(appConfigProvider).bookingLinkFor(handle);

    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: <Widget>[
        Card(
          child: Padding(
            padding: const EdgeInsets.all(BookflowSpacing.lg),
            child: Text(
              link,
              key: const Key('booking-link'),
              style: theme.textTheme.bodyMedium,
              textAlign: TextAlign.center,
            ),
          ),
        ),
        const SizedBox(height: BookflowSpacing.md),
        FilledButton.icon(
          key: const Key('booking-link-copy'),
          onPressed: () async {
            await Clipboard.setData(ClipboardData(text: link));
            if (!context.mounted) return;
            ScaffoldMessenger.of(
              context,
            ).showSnackBar(const SnackBar(content: Text('Link copied.')));
          },
          icon: const Icon(Icons.copy),
          label: const Text('Copy link'),
        ),
        const SizedBox(height: BookflowSpacing.sm),
        OutlinedButton.icon(
          key: const Key('booking-link-share'),
          onPressed: () async {
            await SharePlus.instance.share(
              ShareParams(text: link, subject: 'Book with us on Bookflow'),
            );
          },
          icon: const Icon(Icons.ios_share),
          label: const Text('Share'),
        ),
      ],
    );
  }
}
