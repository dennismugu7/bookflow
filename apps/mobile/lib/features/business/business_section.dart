import 'package:bookflow/features/business/business_models.dart';
import 'package:bookflow/features/business/business_providers.dart';
import 'package:bookflow/theme/tokens.dart';
import 'package:bookflow/ui/async_value_view.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

/// Screen #20's business section (decision 11).
///
/// `DD-Bookflow-Native.md:962` already calls #20's destination the
/// "Personal/Business Information Management page" — screen #17's Profile row.
/// This is the Business half: the name, and an edit affordance that renames it.
///
/// **This said `:973` until 2026-08-18, copied from `00-frame.md` decision 11,
/// which said the same.** The quote was right and the pointer was wrong: `:973`
/// is the Settings action, a different row of the same menu. Both are corrected;
/// the decision rests on the quote and is unaffected.
///
/// ── WHY IT SITS BENEATH THE PERSONAL SECTION ────────────────────────────────
///
/// Screen #20 carries K75's dead `Edit` control on the personal fields — drawn
/// in the design, deliberately not built, because nothing it could do exists.
/// So this slice ships a screen whose business section is editable and whose
/// personal section is not, which is odd and is decision 11's recorded cost.
///
/// The section is visually subordinate — beneath, under its own heading — so
/// the working affordance reads as belonging to the business block rather than
/// as an inconsistency inside one card.
///
/// ── ITS TWO READS ARE INDEPENDENT OF THE PROFILE'S ──────────────────────────
///
/// This watches `myBusinessProvider`; the card above watches
/// `myProfileProvider`. Deliberately separate: one failing must not blank the
/// other, and a business that fails to load should not take the owner's name
/// off the screen.
class BusinessSection extends ConsumerWidget {
  const BusinessSection({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final AsyncValue<BusinessStatus> business = ref.watch(myBusinessProvider);
    final ThemeData theme = Theme.of(context);

    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: <Widget>[
        Text(
          'Business',
          style: theme.textTheme.titleMedium?.copyWith(
            fontWeight: FontWeight.w700,
          ),
        ),
        const SizedBox(height: BookflowSpacing.md),
        // The READ is a whole-section AsyncValue and may own this space — there
        // is nothing to preserve while it loads. The SUBMISSION is not; see
        // `_BusinessName` below.
        AsyncValueView<BusinessStatus>(
          value: business,
          onRetry: () => ref.invalidate(myBusinessProvider),
          data: (BusinessStatus status) => switch (status) {
            // Not reachable from this screen in this slice — an owner with no
            // business is routed to setup, not here. Handled anyway because
            // `BusinessStatus` is sealed and the compiler requires it, which is
            // the point of sealing it.
            NoBusinessYet() => const EmptyStateView(
              message: 'No business yet.',
            ),
            HasBusiness(business: final OwnedBusiness value) => _BusinessName(
              business: value,
            ),
          },
        ),
      ],
    );
  }
}

/// The name, and the rename.
///
/// ── LOADING AND ERROR ARE PROPERTIES OF THE SUBMISSION, NOT OF THE SCREEN ───
///
/// `ErrorView` is deliberately not used for a failed rename. It replaces
/// whatever it is given and offers a retry — which would discard what the owner
/// typed, and say "Something went wrong" where the truth is more specific.
///
/// So the submission's three states are consumed here, inside the section: the
/// field stays mounted with its text intact, the control shows progress, and a
/// failure leaves both usable so the owner can simply press save again.
class _BusinessName extends ConsumerStatefulWidget {
  const _BusinessName({required this.business});

  final OwnedBusiness business;

  @override
  ConsumerState<_BusinessName> createState() => _BusinessNameState();
}

class _BusinessNameState extends ConsumerState<_BusinessName> {
  late final TextEditingController _controller = TextEditingController(
    text: widget.business.name,
  );
  bool _editing = false;

  @override
  void dispose() {
    _controller.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final ThemeData theme = Theme.of(context);
    final AsyncValue<void> submission = ref.watch(
      renameBusinessControllerProvider,
    );
    final bool inFlight = submission.isLoading;

    if (!_editing) {
      return Row(
        children: <Widget>[
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: <Widget>[
                Text(
                  'Business name',
                  style: theme.textTheme.bodyMedium?.copyWith(
                    fontWeight: FontWeight.w700,
                  ),
                ),
                const SizedBox(height: BookflowSpacing.xs),
                Text(widget.business.name, style: theme.textTheme.bodyMedium),
              ],
            ),
          ),
          TextButton(
            key: const Key('business-edit'),
            onPressed: () {
              _controller.text = widget.business.name;
              setState(() => _editing = true);
            },
            child: const Text('Edit'),
          ),
        ],
      );
    }

    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: <Widget>[
        TextField(
          key: const Key('business-name-field'),
          controller: _controller,
          // Disabled rather than removed while saving: removing it would drop
          // the typed text, which is the thing this whole shape protects.
          enabled: !inFlight,
          decoration: const InputDecoration(labelText: 'Business name'),
        ),
        const SizedBox(height: BookflowSpacing.md),
        // The error state. Not `ErrorView` — see the class comment.
        if (submission.hasError)
          Padding(
            padding: const EdgeInsets.only(bottom: BookflowSpacing.md),
            child: Text(
              key: const Key('business-rename-error'),
              'That name could not be saved. Check your connection and try again.',
              style: theme.textTheme.bodySmall?.copyWith(
                color: theme.colorScheme.error,
              ),
            ),
          ),
        // Stacked and full-width rather than a trailing Row. Not a layout
        // preference: `app_theme.dart` gives `FilledButton` a
        // `Size.fromHeight` minimum, which is an INFINITE width — the design
        // system's buttons are full-width by construction. Putting one in a
        // Row hands it unbounded horizontal constraints and it throws
        // "BoxConstraints forces an infinite width". Found by the widget test,
        // and fixed by following the token rather than by boxing around it.
        FilledButton(
          key: const Key('business-save'),
          onPressed: inFlight
              ? null
              : () async {
                  await ref
                      .read(renameBusinessControllerProvider.notifier)
                      .rename(id: widget.business.id, name: _controller.text);
                  // Stay in edit mode on failure so the typed value and the
                  // error are both still there.
                  final bool ok = !ref
                      .read(renameBusinessControllerProvider)
                      .hasError;
                  if (ok && mounted) {
                    setState(() => _editing = false);
                  }
                },
          child: inFlight
              // The one in-flight indicator, on the control rather than
              // over the screen.
              ? const SizedBox(
                  key: Key('business-rename-loading'),
                  width: BookflowSizes.inlineSpinner,
                  height: BookflowSizes.inlineSpinner,
                  child: CircularProgressIndicator.adaptive(strokeWidth: 2),
                )
              : const Text('Save'),
        ),
        const SizedBox(height: BookflowSpacing.sm),
        TextButton(
          onPressed: inFlight ? null : () => setState(() => _editing = false),
          child: const Text('Cancel'),
        ),
      ],
    );
  }
}
