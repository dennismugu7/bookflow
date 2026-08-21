import 'package:bookflow/features/auth/logout_confirmation.dart';
import 'package:bookflow/features/business/business_models.dart';
import 'package:bookflow/features/business/business_providers.dart';
import 'package:bookflow/platform/providers.dart';
import 'package:bookflow/theme/tokens.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

/// Screen #5 — Business Branding Onboarding (`native-04`).
///
/// Replaces `SetupRequiredScreen` at `/setup`, which ADR-032 called "deliberate
/// debt … replaced by the onboarding slice". This is that slice.
///
/// ══ /setup IS A SHELL, NOT A PUSHED ROUTE ═══════════════════════════════════
///
/// `appDestinationProvider` maps `MembershipStatus.none` to `setupRequired`, so
/// an owner is here because the app computed it — ADR-042's test for a shell.
/// Nothing pushes this screen and nothing needs the level-2 redirect (T5).
///
/// ══ ONE FIELD OF FOUR, AND NO BACK ARROW ════════════════════════════════════
///
/// The design draws four fields and a back arrow. Decision 1 ships the name
/// only — Tagline, About and the banner are non-goals with no columns. Decision
/// 6 drops the back arrow: it "Returns to the previous onboarding step", and an
/// owner arriving from sign-up has none.
///
/// **`native-04` is Generation A** (ADR-039), which is Bookflow's design system,
/// so `tokens.dart` applies directly here — its colour is the system's rather
/// than a structural reference to be read for layout only.
///
/// ══ SIGN-OUT IS A DEVIATION, AND IT IS DELIBERATE ═══════════════════════════
///
/// **The design specifies no exit from this screen but the back arrow**, and
/// decision 6 removed that. Shipping it as drawn would strand an owner with no
/// business: `/setup` is the only destination the redirect allows them, so
/// there would be no way out of the app at all.
///
/// The stub this replaces carried the only sign-out such an owner could reach.
/// Removing it silently would have been a regression nothing tested for —
/// criterion 57 covers only an owner *with* a business. **Criterion 61 now pins
/// it**, and this is the sixth recorded design deviation.
class CreateBusinessScreen extends ConsumerStatefulWidget {
  const CreateBusinessScreen({super.key});

  @override
  ConsumerState<CreateBusinessScreen> createState() =>
      _CreateBusinessScreenState();
}

class _CreateBusinessScreenState extends ConsumerState<CreateBusinessScreen> {
  final TextEditingController _controller = TextEditingController();

  /// Whether the field currently holds something submittable. Local, because it
  /// is a property of this form and not of the app.
  bool _canSubmit = false;

  @override
  void initState() {
    super.initState();
    _controller.addListener(_onChanged);
  }

  void _onChanged() {
    final bool next = _controller.text.trim().isNotEmpty;
    if (next != _canSubmit) setState(() => _canSubmit = next);
  }

  @override
  void dispose() {
    _controller.removeListener(_onChanged);
    _controller.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final ThemeData theme = Theme.of(context);
    final AsyncValue<void> submission = ref.watch(
      createBusinessControllerProvider,
    );
    final bool inFlight = submission.isLoading;

    return Scaffold(
      // No `leading`. Decision 6 — and an AppBar with a title and no leading
      // widget renders none, rather than Flutter supplying a back button, which
      // it only does when there is something to pop.
      appBar: AppBar(title: const Text('Your business')),
      body: SafeArea(
        child: SingleChildScrollView(
          padding: const EdgeInsets.all(BookflowSpacing.xl),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: <Widget>[
              Text(
                "Let's give your business its own identity",
                style: theme.textTheme.titleLarge,
                textAlign: TextAlign.center,
              ),
              const SizedBox(height: BookflowSpacing.sm),
              Text(
                'This is what your clients will see first when they book with '
                'you.',
                style: theme.textTheme.bodyMedium,
                textAlign: TextAlign.center,
              ),
              const SizedBox(height: BookflowSpacing.xl),
              TextField(
                key: const Key('create-business-name'),
                controller: _controller,
                // Disabled rather than removed while saving: removing it would
                // drop what was typed, which is what this whole shape protects.
                enabled: !inFlight,
                textInputAction: TextInputAction.done,
                decoration: const InputDecoration(
                  labelText: 'Business name',
                  hintText: 'What should we call your establishment?',
                ),
              ),
              const SizedBox(height: BookflowSpacing.md),
              // ── THE ERROR STATE, AND WHY IT IS NOT `ErrorView` ─────────────
              //
              // `ErrorView` replaces whatever it is given and offers a retry —
              // which would discard the typed name and say "Something went
              // wrong" where the truth is more specific. The form stays
              // mounted; the message sits under the field.
              //
              // ── ONE FAILURE READS DIFFERENTLY FROM THE REST ───────────────
              //
              // Criterion 63 and K82. Until the owner's review pass on PR #15
              // every failure showed the connection message, INCLUDING the one
              // that is not a connection problem: an owner who already had a
              // business was told to check their network. The repository
              // translates `/problems/business-already-exists` into
              // `BusinessAlreadyExists` — the branch is on the problem `type`
              // per ADR-014, and it happens there because ADR-028 keeps Dio and
              // the generated client out of every screen. This widget only asks
              // which kind of failure it has.
              if (submission.hasError)
                Padding(
                  padding: const EdgeInsets.only(bottom: BookflowSpacing.md),
                  child: Text(
                    key: const Key('create-business-error'),
                    submission.error is BusinessAlreadyExists
                        ? 'You already have a business on this account.'
                        : 'That did not save. Check your connection and try again.',
                    style: theme.textTheme.bodySmall?.copyWith(
                      color: theme.colorScheme.error,
                    ),
                  ),
                ),
              FilledButton(
                key: const Key('create-business-submit'),
                // Criterion 30: an empty name is never submitted. Guarded here
                // AND rejected by the server — the client cannot be the only
                // check, but it should not send a request it knows will fail.
                onPressed: (!_canSubmit || inFlight)
                    ? null
                    : () async => ref
                          .read(createBusinessControllerProvider.notifier)
                          .create(_controller.text),
                child: inFlight
                    ? const SizedBox(
                        key: Key('create-business-loading'),
                        width: BookflowSizes.inlineSpinner,
                        height: BookflowSizes.inlineSpinner,
                        child: CircularProgressIndicator.adaptive(
                          strokeWidth: 2,
                        ),
                      )
                    : const Text('Next'),
              ),
              const SizedBox(height: BookflowSpacing.lg),
              // The deviation. See the class comment: without it an owner with
              // no business has no exit from the app at all.
              TextButton(
                key: const Key('create-business-sign-out'),
                // Asks first (Screen 11), like the account menu's row. This one
                // matters more, not less: it is the ONLY exit an owner with no
                // business has, so a mistap here used to end the session of
                // someone who had nowhere else to tap.
                onPressed: inFlight
                    ? null
                    : () async {
                        if (await showLogoutConfirmation(context)) {
                          await ref.read(authGatewayProvider).signOut();
                        }
                      },
                child: const Text('Sign out'),
              ),
            ],
          ),
        ),
      ),
    );
  }
}
