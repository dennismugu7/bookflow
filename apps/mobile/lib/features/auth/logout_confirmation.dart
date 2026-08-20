import 'package:bookflow/platform/providers.dart';
import 'package:bookflow/theme/tokens.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

/// Screen 11 — the log-out confirmation.
///
/// ══ WHY A CONFIRMATION AT ALL, GIVEN THE APP HAS NO LOGIN SCREEN … ══════════
///
/// … it does now. Until the entry flow landed, signing out was a one-way door
/// (K81) and a confirmation would only have made the trapdoor politer. With
/// login built, sign-out is recoverable and the modal is doing its real job:
/// stopping a mistap on a row that sits directly under "Profile".
///
/// **It names the account.** The design puts the email in bold — "Are you sure
/// you want to log out of dennismugu7@gmail.com" — and that is the part worth
/// keeping: it is the only place the app tells an owner which account they are
/// actually in before ending it.
///
/// ── DISMISSAL HAS THREE ROUTES, ALL OF THEM SAFE ────────────────────────────
///
/// The X, "Go back", and tapping the backdrop. Only "Confirm" signs out, and it
/// is the only control that does anything irreversible, so every accidental
/// gesture lands on the harmless side.
///
/// Returns `true` if the user confirmed. The caller signs out; this widget does
/// not, so the modal stays a question and the answer stays with whoever asked.
Future<bool> showLogoutConfirmation(BuildContext context) async {
  final bool? confirmed = await showDialog<bool>(
    context: context,
    // The design: "Tap Backdrop / Outside Modal Area … Dismisses the modal".
    barrierDismissible: true,
    builder: (BuildContext dialogContext) => const _LogoutDialog(),
  );

  // `null` is the backdrop and the system back button. Both mean "no".
  return confirmed ?? false;
}

class _LogoutDialog extends ConsumerStatefulWidget {
  const _LogoutDialog();

  @override
  ConsumerState<_LogoutDialog> createState() => _LogoutDialogState();
}

class _LogoutDialogState extends ConsumerState<_LogoutDialog> {
  /// The spinner the design asks for inside "Confirm". Local, because it is
  /// over the moment this dialog pops — the sign-out itself belongs to the
  /// caller and outlives this widget.
  bool _confirming = false;

  @override
  Widget build(BuildContext context) {
    final ThemeData theme = Theme.of(context);
    final String? email = ref.watch(sessionEmailProvider);

    return AlertDialog(
      backgroundColor: theme.colorScheme.surface,
      shape: RoundedRectangleBorder(
        borderRadius: BorderRadius.circular(BookflowRadii.card),
      ),
      titlePadding: const EdgeInsets.fromLTRB(
        BookflowSpacing.lg,
        BookflowSpacing.md,
        BookflowSpacing.sm,
        0,
      ),
      title: Row(
        children: <Widget>[
          Expanded(child: Text('Log out?', style: theme.textTheme.titleLarge)),
          IconButton(
            key: const Key('logout-dismiss'),
            onPressed: _confirming
                ? null
                : () => Navigator.of(context).pop(false),
            icon: const Icon(Icons.close),
            tooltip: 'Close',
          ),
        ],
      ),
      content: Text.rich(
        TextSpan(
          style: theme.textTheme.bodyMedium,
          children: <InlineSpan>[
            const TextSpan(text: 'Are you sure you want to log out of '),
            TextSpan(
              // The address, or an honest stand-in. A session that cannot name
              // itself is still a session worth ending, and a blank where the
              // email should be is better than pretending to know it.
              text: email ?? 'this account',
              style: const TextStyle(fontWeight: FontWeight.bold),
            ),
            const TextSpan(text: '?'),
          ],
        ),
      ),
      actionsPadding: const EdgeInsets.fromLTRB(
        BookflowSpacing.lg,
        0,
        BookflowSpacing.lg,
        BookflowSpacing.lg,
      ),
      actions: <Widget>[
        OutlinedButton(
          key: const Key('logout-go-back'),
          onPressed: _confirming
              ? null
              : () => Navigator.of(context).pop(false),
          style: OutlinedButton.styleFrom(shape: const StadiumBorder()),
          child: const Text('Go back'),
        ),
        FilledButton(
          key: const Key('logout-confirm'),
          onPressed: _confirming
              ? null
              : () {
                  setState(() => _confirming = true);
                  Navigator.of(context).pop(true);
                },
          style: FilledButton.styleFrom(shape: const StadiumBorder()),
          child: _confirming
              ? const SizedBox(
                  key: Key('logout-confirm-loading'),
                  width: BookflowSizes.inlineSpinner,
                  height: BookflowSizes.inlineSpinner,
                  child: CircularProgressIndicator.adaptive(strokeWidth: 2),
                )
              : const Text('Confirm'),
        ),
      ],
    );
  }
}
