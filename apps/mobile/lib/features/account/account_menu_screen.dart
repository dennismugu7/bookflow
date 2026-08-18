import 'package:bookflow/features/profile/profile_models.dart';
import 'package:bookflow/features/profile/profile_providers.dart';
import 'package:bookflow/platform/providers.dart';
import 'package:bookflow/theme/tokens.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

/// Screen #17 — the account menu (`native-16`), pushed from the dashboard's
/// avatar (decision 12).
///
/// ══ TWO ROWS, NOT FIVE ══════════════════════════════════════════════════════
///
/// The design draws Profile, My services, Settings, Support and Log out. This
/// ships **Profile and Log out only**: #21/#22, #23 and #18 do not exist, and a
/// row that navigates nowhere is a promise the app does not keep. **The fifth
/// design deviation**, and criterion 56 pins it.
///
/// ══ GENERATION B — READ FOR STRUCTURE, NEVER FOR COLOUR ═════════════════════
///
/// ADR-039 classifies `native-16` as Generation B and rules that Generation B
/// "is not" the design system: *"Layout, hierarchy, copy and content stand.
/// Colour and treatment come from the tokens."* So its violet accents, black
/// pill buttons and pink avatar are **not sampled** — every colour here comes
/// from `tokens.dart`.
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
      appBar: AppBar(title: const Text('Account')),
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
            const Divider(),
            ListTile(
              key: const Key('account-log-out'),
              leading: const Icon(Icons.logout),
              title: const Text('Log out'),
              // Sign-out moved here from screen #20's back arrow, whose comment
              // said it signed out because "there is one screen behind the
              // shell". That reasoning expired the moment this screen existed.
              onTap: () async => ref.read(authGatewayProvider).signOut(),
            ),
          ],
        ),
      ),
    );
  }
}

class _Header extends StatelessWidget {
  const _Header({required this.profile});

  final AsyncValue<OwnerProfile> profile;

  @override
  Widget build(BuildContext context) {
    final ThemeData theme = Theme.of(context);

    // Confined to the header. A failed or pending profile read must not reach
    // the rows below it — see the class comment.
    return profile.when(
      loading: () => const SizedBox(
        key: Key('account-header-loading'),
        height: BookflowSizes.avatarSmall,
        child: Center(child: CircularProgressIndicator.adaptive()),
      ),
      error: (Object error, StackTrace stackTrace) => Text(
        key: const Key('account-header-error'),
        'Could not load your details.',
        style: theme.textTheme.bodySmall,
        textAlign: TextAlign.center,
      ),
      data: (OwnerProfile value) => Column(
        children: <Widget>[
          Container(
            width: BookflowSizes.avatarSmall,
            height: BookflowSizes.avatarSmall,
            decoration: const BoxDecoration(
              color: BookflowColors.avatarGreen,
              shape: BoxShape.circle,
            ),
            alignment: Alignment.center,
            child: Text(
              value.initials,
              style: theme.textTheme.bodyMedium?.copyWith(
                color: BookflowColors.textOnBrand,
                fontWeight: FontWeight.w700,
              ),
            ),
          ),
          const SizedBox(height: BookflowSpacing.sm),
          Text(value.fullName, style: theme.textTheme.titleMedium),
        ],
      ),
    );
  }
}
