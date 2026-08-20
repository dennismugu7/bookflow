import 'package:bookflow/theme/tokens.dart';
import 'package:flutter/material.dart';

/// My team — **the route exists, the screen does not**, at `/team`.
///
/// ══ WHY A PLACEHOLDER RATHER THAN A DEAD ROW ════════════════════════════════
///
/// The dashboard's checklist has four rows and three of them go somewhere. The
/// options for the fourth were to draw it inert — which is the defect the
/// entry-flow slice existed to remove, two disabled buttons on the welcome
/// screen — or to send it here and say plainly that it is next.
///
/// **The API is already built.** `/v1/me/business/team-members` shipped at
/// 4c05e46 with the full CRUD surface and the generated Dart client has
/// `TeamApi`; what is missing is only this screen, which lands in 4b. So this
/// is one file to delete rather than a feature to design.
class TeamScreen extends StatelessWidget {
  const TeamScreen({super.key});

  @override
  Widget build(BuildContext context) {
    final ThemeData theme = Theme.of(context);

    return Scaffold(
      appBar: AppBar(
        leading: const BackButton(key: Key('team-back')),
        title: const Text('My team'),
      ),
      body: SafeArea(
        child: Center(
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
                  'Coming next',
                  key: const Key('team-placeholder'),
                  style: theme.textTheme.titleLarge,
                  textAlign: TextAlign.center,
                ),
                const SizedBox(height: BookflowSpacing.sm),
                Text(
                  'Adding the people clients can book with is the next thing '
                  'we are building. Your salon can go live without it.',
                  style: theme.textTheme.bodyMedium,
                  textAlign: TextAlign.center,
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }
}
