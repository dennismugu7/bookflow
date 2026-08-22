import 'package:bookflow/features/account/account_menu_screen.dart'
    show supportEmailAddress;
import 'package:bookflow/features/profile/profile_models.dart';
import 'package:bookflow/features/profile/profile_providers.dart';
import 'package:bookflow/platform/providers.dart';
import 'package:bookflow/theme/tokens.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

/// Screens #25–#27 — the account deletion flow.
///
/// ══ THREE STEPS IN ONE ROUTE, AND THE LAST IS TERMINAL ══════════════════════
///
/// Survey → confirmation → success, with the step in state. One route rather
/// than three, for the reason the client web app's booking flow gives: the steps
/// are not independently addressable. `/delete-account/confirm` reached cold
/// would have no survey answer and would redirect to the first step, which makes
/// it a link that never works.
///
/// **The success step removes every way backward**, which the design is explicit
/// about: "No back arrow or close icon present — this is a terminal state
/// screen, deliberately removing any way to navigate backward into a now-deleted
/// account." A back arrow there would return to a confirmation screen for an
/// account that no longer exists, holding a button that would 401.
class DeleteAccountScreen extends ConsumerStatefulWidget {
  const DeleteAccountScreen({super.key});

  @override
  ConsumerState<DeleteAccountScreen> createState() =>
      _DeleteAccountScreenState();
}

/// The design's four canned answers, plus the free-text one.
enum _Reason {
  accident('I created this account by accident.'),
  foundAnother('I found another app that better suits my needs'),
  tooComplicated('The app is too complicated'),
  somethingElse('Something else (Tell us more)');

  const _Reason(this.label);

  final String label;
}

enum _Step { survey, confirm, done }

class _DeleteAccountScreenState extends ConsumerState<DeleteAccountScreen> {
  _Step _step = _Step.survey;
  _Reason? _reason;
  final TextEditingController _detail = TextEditingController();
  final TextEditingController _password = TextEditingController();
  bool _understood = false;

  @override
  void dispose() {
    _detail.dispose();
    _password.dispose();
    super.dispose();
  }

  /// What travels to the API's log.
  ///
  /// For "Something else" it is what they typed; for the canned answers it is
  /// the label as drawn. Sending the enum NAME would put `foundAnother` in a log
  /// somebody reads to learn why people leave — the sentence is the answer.
  String? get _reasonText {
    final _Reason? chosen = _reason;
    if (chosen == null) return null;
    if (chosen == _Reason.somethingElse) {
      final String typed = _detail.text.trim();
      // Falls back to the label rather than sending nothing: "they chose
      // Something else and wrote nothing" is itself informative, and an empty
      // string would be indistinguishable from no survey at all.
      return typed.isEmpty ? chosen.label : typed;
    }
    return chosen.label;
  }

  Future<void> _delete() async {
    await ref
        .read(deleteAccountControllerProvider.notifier)
        .delete(password: _password.text, reason: _reasonText);

    if (!mounted) return;
    // Only on success. A failure leaves the owner on the confirmation step with
    // the error shown, because there is something to retry — the API's ordering
    // makes a partial deletion safe to repeat.
    if (!ref.read(deleteAccountControllerProvider).hasError) {
      setState(() => _step = _Step.done);
    }
  }

  @override
  Widget build(BuildContext context) {
    final AsyncValue<void> deletion = ref.watch(
      deleteAccountControllerProvider,
    );

    return Scaffold(
      appBar: _step == _Step.done
          // No bar at all on the terminal screen — see the class comment.
          ? null
          : AppBar(
              leading: _step == _Step.confirm
                  ? IconButton(
                      key: const Key('delete-back'),
                      icon: const Icon(Icons.arrow_back),
                      onPressed: () => setState(() => _step = _Step.survey),
                      tooltip: 'Back',
                    )
                  : null,
              actions: <Widget>[
                IconButton(
                  key: const Key('delete-close'),
                  icon: const Icon(Icons.close),
                  // Leaves the flow entirely, back to Settings. The design puts
                  // both a back arrow and a close on the confirmation step and
                  // notes the redundancy; they differ here — back returns to the
                  // survey, close abandons the whole thing.
                  onPressed: () => context.pop(),
                  tooltip: 'Close',
                ),
              ],
            ),
      body: SafeArea(
        child: switch (_step) {
          _Step.survey => _Survey(
            reason: _reason,
            detail: _detail,
            onPick: (_Reason picked) => setState(() => _reason = picked),
            onContinue: () => setState(() => _step = _Step.confirm),
          ),
          _Step.confirm => _Confirm(
            understood: _understood,
            password: _password,
            busy: deletion.isLoading,
            // A wrong password reads differently from everything else, and is
            // the only failure with a field to point at.
            wrongPassword: deletion.error is ReauthenticationFailed,
            failed: deletion.hasError,
            onToggle: (bool value) => setState(() => _understood = value),
            onPasswordChanged: () => setState(() {}),
            onDelete: _delete,
          ),
          _Step.done => const _Done(),
        },
      ),
    );
  }
}

/// Screen #25 — the exit survey.
class _Survey extends StatelessWidget {
  const _Survey({
    required this.reason,
    required this.detail,
    required this.onPick,
    required this.onContinue,
  });

  final _Reason? reason;
  final TextEditingController detail;
  final ValueChanged<_Reason> onPick;
  final VoidCallback onContinue;

  @override
  Widget build(BuildContext context) {
    final ThemeData theme = Theme.of(context);

    return ListView(
      padding: const EdgeInsets.all(BookflowSpacing.xl),
      children: <Widget>[
        Text('Delete my account', style: theme.textTheme.bodySmall),
        const SizedBox(height: BookflowSpacing.sm),
        Text(
          'We’re sad to see you go!',
          key: const Key('delete-survey-title'),
          style: theme.textTheme.titleLarge,
        ),
        const SizedBox(height: BookflowSpacing.md),
        // The off-ramp the design calls "a deliberate retention screen". The
        // address is the same constant the account menu uses.
        Text(
          'If there’s anything we could do to make things right, we’d love to '
          'hear from you. Reach out anytime at $supportEmailAddress.',
          style: theme.textTheme.bodyMedium,
        ),
        const SizedBox(height: BookflowSpacing.xl),
        Text(
          'Help us improve',
          style: theme.textTheme.titleMedium?.copyWith(
            fontWeight: FontWeight.w700,
          ),
        ),
        const SizedBox(height: BookflowSpacing.sm),
        Text(
          'Please let us know the reason for deleting your account:',
          style: theme.textTheme.bodyMedium,
        ),
        const SizedBox(height: BookflowSpacing.sm),

        for (final _Reason option in _Reason.values)
          RadioListTile<_Reason>(
            key: Key('delete-reason-${option.name}'),
            value: option,
            // ignore: deprecated_member_use
            groupValue: reason,
            // ignore: deprecated_member_use
            onChanged: (_Reason? picked) {
              if (picked != null) onPick(picked);
            },
            title: Text(option.label, style: theme.textTheme.bodyMedium),
            contentPadding: EdgeInsets.zero,
          ),

        // Revealed by the selection, as the design implies. Absent otherwise
        // rather than disabled: a greyed field beside three radio buttons reads
        // as broken, and there is nothing to type until this option is chosen.
        if (reason == _Reason.somethingElse)
          Padding(
            padding: const EdgeInsets.only(top: BookflowSpacing.sm),
            child: TextField(
              key: const Key('delete-reason-detail'),
              controller: detail,
              minLines: 2,
              maxLines: 4,
              // The API caps the reason at 500 characters. Enforced here too so
              // the limit is visible while typing rather than as a 400 after
              // pressing Continue on an irreversible flow.
              maxLength: 500,
              decoration: const InputDecoration(
                labelText: 'Tell us more (optional)',
              ),
            ),
          ),

        const SizedBox(height: BookflowSpacing.lg),
        const Divider(),
        const SizedBox(height: BookflowSpacing.lg),
        FilledButton(
          key: const Key('delete-survey-continue'),
          // Disabled until something is chosen, which the design leaves
          // unstated ("not visually indicated in this mockup"). Enabled would
          // let somebody tap straight through the retention screen it exists to
          // be, and the survey would answer nothing.
          onPressed: reason == null ? null : onContinue,
          child: const Text('Continue  →'),
        ),
      ],
    );
  }
}

/// Screen #26 — the final confirmation, gated on a password AND a checkbox.
///
/// ══ THE PASSWORD FIELD IS A DELIBERATE DESIGN DEVIATION ═════════════════════
///
/// **The design draws no password here.** It gates on the checkbox alone, which
/// is a reasonable pattern for a destructive action and is not enough for this
/// one.
///
/// A bearer token is valid for up to an hour with no denylist (ADR-017) — a
/// sound trade for reading a diary and an indefensible one for erasing it. A
/// phone left unlocked on a salon counter, or a token lifted from a log, is
/// otherwise a complete and irreversible erasure of every client's appointment
/// record in a single tap. The checkbox stops a mistake; it does nothing
/// whatsoever about somebody else holding the phone.
///
/// **Irreversible destruction of other people's data justifies the extra
/// friction**, and the server enforces it regardless (`me.service.ts`), so
/// omitting the field here would only produce a screen that always fails.
///
/// The checkbox stays. It answers a different question — "do you understand
/// what you lose" — and the password answers "are you the owner". Both.
class _Confirm extends StatelessWidget {
  const _Confirm({
    required this.understood,
    required this.password,
    required this.busy,
    required this.wrongPassword,
    required this.failed,
    required this.onToggle,
    required this.onPasswordChanged,
    required this.onDelete,
  });

  final bool understood;
  final TextEditingController password;
  final bool busy;
  final bool wrongPassword;
  final bool failed;
  final ValueChanged<bool> onToggle;
  final VoidCallback onPasswordChanged;
  final Future<void> Function() onDelete;

  @override
  Widget build(BuildContext context) {
    final ThemeData theme = Theme.of(context);

    return ListView(
      padding: const EdgeInsets.all(BookflowSpacing.xl),
      children: <Widget>[
        Text('Delete my account', style: theme.textTheme.bodySmall),
        const SizedBox(height: BookflowSpacing.sm),
        Text(
          'Delete your Bookflow Account',
          key: const Key('delete-confirm-title'),
          style: theme.textTheme.titleLarge,
        ),
        const SizedBox(height: BookflowSpacing.md),
        Text(
          'This action will delete your account and you won’t be able to '
          'retrieve it. Please confirm you understand by ticking the below '
          'statement:',
          style: theme.textTheme.bodyMedium,
        ),
        const SizedBox(height: BookflowSpacing.lg),
        // Above the checkbox, per the sequence the flow reads in: prove who you
        // are, then confirm you know what you lose.
        TextField(
          key: const Key('delete-password'),
          controller: password,
          obscureText: true,
          enabled: !busy,
          autocorrect: false,
          enableSuggestions: false,
          onChanged: (_) => onPasswordChanged(),
          decoration: InputDecoration(
            labelText: 'Enter your password to confirm',
            errorText: wrongPassword ? 'That password is incorrect.' : null,
          ),
        ),
        const SizedBox(height: BookflowSpacing.lg),
        CheckboxListTile(
          key: const Key('delete-confirm-gate'),
          value: understood,
          onChanged: busy ? null : (bool? next) => onToggle(next ?? false),
          controlAffinity: ListTileControlAffinity.leading,
          contentPadding: EdgeInsets.zero,
          title: Text(
            'I know I won’t be able to access my client bookings.',
            style: theme.textTheme.bodyMedium,
          ),
        ),
        const SizedBox(height: BookflowSpacing.lg),
        const Divider(),
        const SizedBox(height: BookflowSpacing.lg),

        // A wrong password already has its message on the field, so the general
        // one is suppressed for it — two errors for one cause reads as two
        // problems, and sends somebody looking for a second thing to fix.
        if (failed && !wrongPassword)
          Padding(
            padding: const EdgeInsets.only(bottom: BookflowSpacing.md),
            child: Text(
              key: const Key('delete-error'),
              'We couldn’t delete your account. Check your connection and try '
              'again, or contact $supportEmailAddress.',
              style: theme.textTheme.bodySmall?.copyWith(
                color: theme.colorScheme.error,
              ),
            ),
          ),

        FilledButton(
          key: const Key('delete-confirm-submit'),
          style: FilledButton.styleFrom(
            backgroundColor: theme.colorScheme.error,
          ),
          // ── THE GATE, AND WHY IT IS A CHECKBOX RATHER THAN A DIALOG ──────
          //
          // The design chooses "a gate-checkbox pattern ... rather than
          // re-entering a password or typing 'DELETE'". The checkbox names the
          // specific consequence — the client bookings — which is the thing an
          // owner would actually regret, and reading it is the friction.
          // BOTH gates. An empty password is refused here rather than sent to
          // be refused by the server — and the button staying dark until the
          // field has something in it is what makes the requirement visible.
          onPressed: (!understood || busy || password.text.isEmpty)
              ? null
              : () async => onDelete(),
          child: busy
              ? const SizedBox(
                  key: Key('delete-loading'),
                  width: BookflowSizes.inlineSpinner,
                  height: BookflowSizes.inlineSpinner,
                  child: CircularProgressIndicator.adaptive(strokeWidth: 2),
                )
              : const Text('Delete account'),
        ),
      ],
    );
  }
}

/// Screen #27 — the terminal success state.
///
/// ══ THE SESSION IS CLEARED BY *DONE*, NOT BY THE SUCCESSFUL DELETE ══════════
///
/// The natural place to sign out is the moment the API answers 204. It does not
/// work: the router's redirect moves off this route the instant the session
/// ends (ADR-042 — level 1 always overrides level 2), so this screen would
/// never be seen and the owner would be dropped on the welcome page with no
/// confirmation that anything happened.
///
/// **What that costs, stated rather than discovered:** between the successful
/// delete and this tap, the app holds a session token for an account that no
/// longer exists. It authenticates nothing — every request with it answers 401 —
/// and if the app is killed here, the next launch's first API call gets that
/// 401, the interceptor ends the session, and the owner lands on the welcome
/// screen. Which is the correct destination, reached the long way.
///
/// The window is one tap long and its worst outcome is the right one.
class _Done extends ConsumerWidget {
  const _Done();

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final ThemeData theme = Theme.of(context);

    return ListView(
      padding: const EdgeInsets.all(BookflowSpacing.xl),
      children: <Widget>[
        const SizedBox(height: BookflowSpacing.xxl),
        Center(
          child: Container(
            width: BookflowSizes.avatarLarge,
            height: BookflowSizes.avatarLarge,
            decoration: const BoxDecoration(
              shape: BoxShape.circle,
              // The design's gradient badge. Built from the hero tokens rather
              // than sampled — ADR-039 again.
              gradient: LinearGradient(
                colors: <Color>[
                  BookflowColors.heroGradientStart,
                  BookflowColors.heroGradientEnd,
                ],
              ),
            ),
            child: const Icon(
              Icons.check,
              key: Key('delete-done-badge'),
              color: BookflowColors.textOnBrand,
              size: 48,
            ),
          ),
        ),
        const SizedBox(height: BookflowSpacing.xl),
        Text(
          'Your account has been deleted',
          key: const Key('delete-done-title'),
          style: theme.textTheme.titleLarge,
          textAlign: TextAlign.center,
        ),
        const SizedBox(height: BookflowSpacing.md),
        Text(
          'We’ll miss you around here! If you need anything at all before you '
          'head out, feel free to reach out to $supportEmailAddress.',
          style: theme.textTheme.bodyMedium,
          textAlign: TextAlign.center,
        ),
        const SizedBox(height: BookflowSpacing.xl),
        const Divider(),
        const SizedBox(height: BookflowSpacing.lg),
        FilledButton(
          key: const Key('delete-done'),
          onPressed: () async {
            // The sign-out this flow has been deferring. Once it lands the
            // redirect takes over on its own — see the class comment.
            try {
              await ref.read(authGatewayProvider).signOut();
            } on Object catch (_) {
              // Swallowed. The account is gone; a failed local sign-out is not
              // a reason to keep somebody on a terminal screen, and ADR-017
              // bounds an orphaned token at an hour regardless.
            }

            // ── `go`, NOT `pop`, AND THE STACK IS WHY ───────────────────────
            //
            // Popping would unwind into Settings, then the account menu, then
            // the dashboard — every one a screen for an account that no longer
            // exists, each firing requests that would 401.
            //
            // Belt and braces with the redirect above: if the sign-out threw,
            // the redirect will not fire, and this is what still moves them.
            if (!context.mounted) return;
            context.go('/');
          },
          child: const Text('Done'),
        ),
      ],
    );
  }
}
