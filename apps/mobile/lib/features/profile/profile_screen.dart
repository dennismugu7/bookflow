import 'package:bookflow/features/profile/profile_models.dart';
import 'package:bookflow/features/profile/profile_providers.dart';
import 'package:bookflow/platform/providers.dart';
import 'package:bookflow/theme/tokens.dart';
import 'package:bookflow/ui/async_value_view.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

/// Screen #20 — My Profile Details. ADR-032's "one true page" for Phase 3.
///
/// ══ IT WILL NOT MATCH ITS OWN SCREENSHOT, AND THAT IS THE DECISION ══════════
///
/// `native-20` is Generation B (ADR-039) — a violet "Edit" link, a pink avatar
/// with one lowercase initial, pure black headings. Generation B is not
/// Bookflow's design system, so **its layout is taken and its colour is not**:
///
///   FROM the screenshot: the read-only card, the field order (first name, last
///   name, email), labels above values, the divider under the name, the avatar
///   centred above the name, the back arrow and "My profile" heading, the copy.
///
///   FROM the tokens:     a BLUE Edit affordance, a GREEN avatar with TWO
///                        uppercase initials, #3A3A3A text.
///
/// Recorded as deviation 8 in `docs/analysis/08-design-deviations.md`, so a
/// reviewer comparing the built screen to the design does not raise it as a bug.
///
/// ── THE EDIT AFFORDANCE IS NOT BUILT ────────────────────────────────────────
///
/// `native-20` shows an "Edit" link and a pencil badge on the avatar. **Neither
/// is rendered here, deliberately.** There is no `PATCH /v1/me` and no avatar
/// upload endpoint; adding either widens this slice from "prove the wiring" into
/// "build profile editing".
///
/// A visible control that does nothing is worse than an absent one — it is a
/// promise the app does not keep, and it costs a support conversation rather
/// than a missing feature. It belongs to the profile-editing slice, alongside
/// screen #20's edit mode and the ADR-011 avatar upload path.
class ProfileScreen extends ConsumerWidget {
  const ProfileScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final AsyncValue<OwnerProfile> profile = ref.watch(myProfileProvider);

    return Scaffold(
      appBar: AppBar(
        // The back arrow of `native-20`. It leads nowhere in this slice — there
        // is one screen behind the shell — so it signs out instead of pretending
        // to navigate, which is the only real action this page has.
        leading: IconButton(
          icon: const Icon(Icons.arrow_back),
          onPressed: () async => ref.read(authGatewayProvider).signOut(),
          tooltip: 'Sign out',
        ),
        title: const Text('My profile'),
      ),
      body: SafeArea(
        child: AsyncValueView<OwnerProfile>(
          value: profile,
          onRetry: () => ref.invalidate(myProfileProvider),
          data: (OwnerProfile value) => _ProfileCard(profile: value),
        ),
      ),
    );
  }
}

class _ProfileCard extends StatelessWidget {
  const _ProfileCard({required this.profile});

  final OwnerProfile profile;

  @override
  Widget build(BuildContext context) {
    final ThemeData theme = Theme.of(context);

    return SingleChildScrollView(
      // MEASURED at 32.3dp in `native-20`; `xl` is 32.
      padding: const EdgeInsets.all(BookflowSpacing.xl),
      child: Card(
        child: Padding(
          // MEASURED at 22dp; `lg` is 24, and `tokens.dart` records why the
          // measured value was not adopted.
          padding: const EdgeInsets.all(BookflowSpacing.lg),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: <Widget>[
              _Avatar(initials: profile.initials),
              const SizedBox(height: BookflowSpacing.md),
              Text(
                profile.fullName,
                style: theme.textTheme.titleLarge,
                textAlign: TextAlign.center,
              ),
              const SizedBox(height: BookflowSpacing.lg),
              const Divider(),
              const SizedBox(height: BookflowSpacing.lg),
              // Field order straight from the screenshot.
              _Field(label: 'First name', value: profile.firstName),
              const SizedBox(height: BookflowSpacing.md),
              _Field(label: 'Last name', value: profile.lastName),
              const SizedBox(height: BookflowSpacing.md),
              // Not on `OwnerProfile`: `GET /v1/me` does not return the email.
              // It lives on `auth.users`, which GoTrue owns (ADR-027), and the
              // API's Profile schema deliberately does not mirror it. Shown from
              // the session instead — see `_Field`'s sibling below.
              const _EmailField(),
            ],
          ),
        ),
      ),
    );
  }
}

/// Green circle, two white uppercase initials (Styles-Reference §2 and §7).
class _Avatar extends StatelessWidget {
  const _Avatar({required this.initials});

  final String initials;

  @override
  Widget build(BuildContext context) {
    return Center(
      child: Container(
        width: BookflowSizes.avatarLarge,
        height: BookflowSizes.avatarLarge,
        decoration: const BoxDecoration(
          color: BookflowColors.avatarGreen,
          shape: BoxShape.circle,
        ),
        alignment: Alignment.center,
        child: Text(
          initials,
          style: Theme.of(context).textTheme.titleLarge?.copyWith(
            color: BookflowColors.textOnBrand,
            fontWeight: FontWeight.w700,
          ),
        ),
      ),
    );
  }
}

/// A bold label over its value, as drawn.
class _Field extends StatelessWidget {
  const _Field({required this.label, required this.value, this.italic = false});

  final String label;
  final String value;

  /// Styles-Reference §3: "Email addresses throughout the app … are consistently
  /// styled in italic, distinguishing them from names and phone numbers."
  final bool italic;

  @override
  Widget build(BuildContext context) {
    final ThemeData theme = Theme.of(context);

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: <Widget>[
        Text(
          label,
          style: theme.textTheme.bodyMedium?.copyWith(
            fontWeight: FontWeight.w700,
          ),
        ),
        const SizedBox(height: BookflowSpacing.xs),
        Text(
          value,
          style: italic
              ? theme.textTheme.bodyMedium?.copyWith(
                  fontStyle: FontStyle.italic,
                )
              : theme.textTheme.bodyMedium,
        ),
      ],
    );
  }
}

/// The email, read from the session rather than from our API.
///
/// `GET /v1/me` returns the profile our database owns — first name, last name,
/// avatar path — and **not the email**, which lives on `auth.users` and belongs
/// to GoTrue (ADR-027). The screenshot shows it, so it is shown; the session
/// already holds it and no endpoint needs to change.
class _EmailField extends ConsumerWidget {
  const _EmailField();

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final String email = ref.watch(sessionEmailProvider) ?? '';
    return _Field(label: 'Email', value: email, italic: true);
  }
}
