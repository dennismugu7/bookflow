import 'package:bookflow/features/team/team_editor_sheet.dart';
import 'package:bookflow/features/team/team_models.dart';
import 'package:bookflow/features/team/team_providers.dart';
import 'package:bookflow/theme/tokens.dart';
import 'package:bookflow/ui/async_value_view.dart';
import 'package:bookflow/ui/initials_avatar.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

/// My team, at `/team`.
///
/// Replaces the placeholder that said "Coming next" — the API shipped at
/// 4c05e46 and this is the screen it was waiting for.
///
/// Same shape as `/services`, deliberately: an owner who has learned one of
/// these screens has learned both, and two list-plus-FAB screens that behaved
/// differently would be two things to learn for no reason.
class TeamScreen extends ConsumerWidget {
  const TeamScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final AsyncValue<List<TeamMember>> team = ref.watch(myTeamProvider);

    return Scaffold(
      appBar: AppBar(
        leading: const BackButton(key: Key('team-back')),
        title: const Text('My team'),
      ),
      body: SafeArea(
        child: AsyncValueView<List<TeamMember>>(
          value: team,
          onRetry: () => ref.invalidate(myTeamProvider),
          data: (List<TeamMember> members) => members.isEmpty
              ? const _EmptyState()
              : _TeamList(members: members),
        ),
      ),
      // Outside `AsyncValueView`: an owner whose list failed to load can still
      // add someone, rather than being offered nothing but a retry.
      floatingActionButton: FloatingActionButton(
        key: const Key('team-add'),
        onPressed: () => openTeamEditor(context, member: null),
        backgroundColor: BookflowColors.ctaGreen,
        foregroundColor: BookflowColors.textOnBrand,
        child: const Icon(Icons.add),
      ),
    );
  }
}

/// Opens the add/edit sheet. The sheet never opens or closes a route itself —
/// `auth_flow.dart` sets out why at length.
Future<void> openTeamEditor(
  BuildContext context, {
  required TeamMember? member,
}) {
  return showModalBottomSheet<void>(
    context: context,
    isScrollControlled: true,
    useSafeArea: true,
    builder: (BuildContext sheetContext) => TeamEditorSheet(
      member: member,
      onDone: () => Navigator.of(sheetContext).pop(),
    ),
  );
}

class _EmptyState extends StatelessWidget {
  const _EmptyState();

  @override
  Widget build(BuildContext context) {
    final ThemeData theme = Theme.of(context);

    return Center(
      child: Padding(
        padding: const EdgeInsets.all(BookflowSpacing.xl),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: <Widget>[
            Icon(
              Icons.groups_outlined,
              size: BookflowSizes.avatarLarge,
              color: theme.colorScheme.outline,
            ),
            const SizedBox(height: BookflowSpacing.lg),
            Text(
              'No one on your team yet',
              key: const Key('team-empty'),
              style: theme.textTheme.titleLarge,
              textAlign: TextAlign.center,
            ),
            const SizedBox(height: BookflowSpacing.sm),
            Text(
              'Add the people clients can book with',
              style: theme.textTheme.bodyMedium?.copyWith(
                fontStyle: FontStyle.italic,
              ),
              textAlign: TextAlign.center,
            ),
          ],
        ),
      ),
    );
  }
}

class _TeamList extends StatelessWidget {
  const _TeamList({required this.members});

  final List<TeamMember> members;

  @override
  Widget build(BuildContext context) {
    return ListView.separated(
      padding: const EdgeInsets.fromLTRB(
        BookflowSpacing.lg,
        BookflowSpacing.lg,
        BookflowSpacing.lg,
        // Room for the FAB, which would otherwise cover the last card.
        BookflowSpacing.xxl * 2,
      ),
      itemCount: members.length,
      separatorBuilder: (BuildContext _, int _) =>
          const SizedBox(height: BookflowSpacing.md),
      itemBuilder: (BuildContext context, int index) =>
          _MemberCard(member: members[index]),
    );
  }
}

class _MemberCard extends StatelessWidget {
  const _MemberCard({required this.member});

  final TeamMember member;

  @override
  Widget build(BuildContext context) {
    final ThemeData theme = Theme.of(context);

    return Card(
      child: Padding(
        padding: const EdgeInsets.all(BookflowSpacing.lg),
        child: Row(
          children: <Widget>[
            _MemberAvatar(member: member),
            const SizedBox(width: BookflowSpacing.md),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: <Widget>[
                  Text(
                    member.name,
                    style: theme.textTheme.bodyMedium?.copyWith(
                      fontWeight: FontWeight.bold,
                    ),
                  ),
                  if (member.role != null &&
                      member.role!.isNotEmpty) ...<Widget>[
                    const SizedBox(height: BookflowSpacing.xs),
                    Text(member.role!, style: theme.textTheme.bodySmall),
                  ],
                ],
              ),
            ),
            IconButton(
              key: Key('team-edit-${member.id}'),
              onPressed: () => openTeamEditor(context, member: member),
              icon: const Icon(Icons.edit_outlined),
              tooltip: 'Edit ${member.name}',
            ),
          ],
        ),
      ),
    );
  }
}

/// The photograph, or initials when there is none.
///
/// `InitialsAvatar` is the same widget the dashboard and screen #20 use — it
/// was extracted for exactly this, and a second circle-with-letters here would
/// be the fork that extraction existed to prevent.
class _MemberAvatar extends StatelessWidget {
  const _MemberAvatar({required this.member});

  final TeamMember member;

  @override
  Widget build(BuildContext context) {
    final String? photo = member.photoUrl;

    if (photo == null || photo.isEmpty) {
      return InitialsAvatar(
        initials: member.initials,
        diameter: BookflowSizes.avatarSmall,
      );
    }

    return ClipOval(
      child: Image.network(
        photo,
        width: BookflowSizes.avatarSmall,
        height: BookflowSizes.avatarSmall,
        fit: BoxFit.cover,
        // A URL that will not load falls back to initials rather than a broken
        // image icon: the member is still on the team either way.
        errorBuilder: (BuildContext _, Object _, StackTrace? _) =>
            InitialsAvatar(
              initials: member.initials,
              diameter: BookflowSizes.avatarSmall,
            ),
      ),
    );
  }
}
