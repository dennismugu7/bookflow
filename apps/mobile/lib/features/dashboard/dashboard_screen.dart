import 'package:bookflow/features/business/business_models.dart';
import 'package:bookflow/features/business/business_providers.dart';
import 'package:bookflow/features/profile/profile_models.dart';
import 'package:bookflow/features/profile/profile_providers.dart';
import 'package:bookflow/theme/tokens.dart';
import 'package:bookflow/ui/async_value_view.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

/// Screen #12 — the dashboard (`native-11`), at `/home`.
///
/// ══ WHAT IS DELIBERATELY NOT HERE ═══════════════════════════════════════════
///
/// `native-11` draws a pill segmented control — **Bookings, Contacts,
/// Calendar** — and a bookings empty state with a share-link prompt. **None of
/// it is here**, and the omission follows decision 12's rule for screen #17's
/// rows: *a control whose destination does not exist is omitted, not drawn
/// inert*. All three tabs lead to a dashboard this slice excludes, so drawing
/// them would make K75's promise three times on one screen.
///
/// **Recorded as the seventh design deviation.**
///
/// ── AND THE EMPTY STATE IS NOT DROPPED, IT IS REPLACED (§5's K47 answer) ────
///
/// The designed empty state tells a brand-new owner that *"appointments will
/// land here automatically"* and offers a *"booking link"* to share. For a
/// business with no services and nothing published **both statements are
/// false**, so while the business is unpublished this shows a
/// setup-continuation state instead: where the owner is, and what remains.
///
/// `native-11` is **Generation A** (ADR-039), which is Bookflow's design system,
/// so `tokens.dart` applies directly here.
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
        // setup-continuation state, not the bookings empty state. Both assert
        // something about a business whose state is unknown, and `router.dart`
        // already argues the same point for the redirect: "Guessing wrong in
        // that direction is worse than saying 'we could not load this' and
        // offering a retry."
        child: AsyncValueView<BusinessStatus>(
          value: business,
          onRetry: () => ref.invalidate(myBusinessProvider),
          data: (BusinessStatus status) => switch (status) {
            // Unreachable from here — an owner with no business is at /setup —
            // but the compiler requires it, which is why `BusinessStatus` is
            // sealed.
            NoBusinessYet() => const _SetupContinuation(businessName: null),
            HasBusiness(business: final OwnedBusiness value) =>
              _SetupContinuation(businessName: value.name),
          },
        ),
      ),
    );
  }
}

/// The top-right avatar (`native-11`), which opens the account menu.
///
/// Reads the profile the same way screen #20 does. It shows initials, so it
/// degrades to an empty circle rather than a spinner while loading — an avatar
/// is not worth a loading state, and `profile_models.dart` already argues the
/// same for a name that cannot render.
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
        child: Container(
          width: BookflowSizes.avatarSmall,
          height: BookflowSizes.avatarSmall,
          decoration: const BoxDecoration(
            color: BookflowColors.avatarGreen,
            shape: BoxShape.circle,
          ),
          alignment: Alignment.center,
          child: Text(
            initials,
            style: Theme.of(context).textTheme.bodyMedium?.copyWith(
              color: BookflowColors.textOnBrand,
              fontWeight: FontWeight.w700,
            ),
          ),
        ),
      ),
    );
  }
}

/// Where the owner is in setup, and what remains (§5's K47 answer).
///
/// **What it lists is design, not a Phase 0 decision** — §5's answer fixes that
/// the state exists and what it must not show, and the criteria file records
/// that the enumeration was ruled not-blocked for exactly that reason. What is
/// listed here follows the onboarding steps the design already names.
class _SetupContinuation extends StatelessWidget {
  const _SetupContinuation({required this.businessName});

  final String? businessName;

  @override
  Widget build(BuildContext context) {
    final ThemeData theme = Theme.of(context);

    return SingleChildScrollView(
      padding: const EdgeInsets.all(BookflowSpacing.xl),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
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
            'Your business is created. A few things left before clients can '
            'book with you.',
            style: theme.textTheme.bodyMedium,
            textAlign: TextAlign.center,
          ),
          const SizedBox(height: BookflowSpacing.xl),
          // Each is a later slice. Listed as remaining work rather than drawn
          // as controls, for the same reason the tabs are absent: a row that
          // navigates nowhere is a promise the app does not keep.
          const _Remaining(label: 'Add your services'),
          const _Remaining(label: 'Add your team'),
          const _Remaining(label: 'Set your opening hours'),
          const _Remaining(label: 'Publish your booking page'),
        ],
      ),
    );
  }
}

class _Remaining extends StatelessWidget {
  const _Remaining({required this.label});

  final String label;

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.only(bottom: BookflowSpacing.sm),
      child: Row(
        children: <Widget>[
          const Icon(Icons.radio_button_unchecked, size: BookflowSpacing.lg),
          const SizedBox(width: BookflowSpacing.sm),
          Expanded(
            child: Text(label, style: Theme.of(context).textTheme.bodyMedium),
          ),
        ],
      ),
    );
  }
}
