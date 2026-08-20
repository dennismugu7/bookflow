import 'package:bookflow/features/business/business_models.dart';
import 'package:bookflow/features/business/business_providers.dart';
import 'package:bookflow/theme/tokens.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

/// Going live, with a confirmation first.
///
/// ══ WHY THIS ASKS ═══════════════════════════════════════════════════════════
///
/// Publishing is not a field edit. It makes the salon readable by anyone with
/// the link and it mints a **permanent** handle (ADR-021) — a rename retires a
/// handle, nothing reassigns one — so the address chosen here is the address
/// forever. That is worth a sentence before a tap, in the way a service edit is
/// not.
///
/// It is a sheet rather than a dialog because it has real copy to fit, and the
/// entry flow already established sheets as where this app explains things.
Future<void> showPublishSheet(BuildContext context) {
  return showModalBottomSheet<void>(
    context: context,
    isScrollControlled: true,
    useSafeArea: true,
    builder: (BuildContext sheetContext) =>
        _PublishSheet(onPublished: () => Navigator.of(sheetContext).pop()),
  );
}

class _PublishSheet extends ConsumerStatefulWidget {
  const _PublishSheet({required this.onPublished});

  final VoidCallback onPublished;

  @override
  ConsumerState<_PublishSheet> createState() => _PublishSheetState();
}

class _PublishSheetState extends ConsumerState<_PublishSheet> {
  String? _error;

  Future<void> _publish() async {
    setState(() => _error = null);

    await ref.read(publishControllerProvider.notifier).publish();
    if (!mounted) return;

    final AsyncValue<void> result = ref.read(publishControllerProvider);
    if (result.hasError) {
      setState(() {
        _error = result.error is PublishRequirementsNotMet
            // The API deliberately does not say WHICH requirement is missing —
            // no `detail`, no field list — so this names both. The client knows
            // its own state and could work it out; saying both is shorter than
            // being clever and is true whichever is missing.
            ? 'Add at least one service and your opening hours first.'
            : 'That did not work. Check your connection and try again.';
      });
      return;
    }

    widget.onPublished();
  }

  @override
  Widget build(BuildContext context) {
    final ThemeData theme = Theme.of(context);
    final bool inFlight = ref.watch(publishControllerProvider).isLoading;

    return SafeArea(
      top: false,
      child: SingleChildScrollView(
        padding: const EdgeInsets.all(BookflowSpacing.xl),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          mainAxisSize: MainAxisSize.min,
          children: <Widget>[
            Text(
              'Publish your booking page?',
              style: theme.textTheme.titleLarge,
              textAlign: TextAlign.center,
            ),
            const SizedBox(height: BookflowSpacing.md),
            Text(
              'Your services, hours and team become visible to anyone with your '
              'booking link, and clients can start booking. You get a permanent '
              'web address for your salon.',
              style: theme.textTheme.bodyMedium,
              textAlign: TextAlign.center,
            ),
            const SizedBox(height: BookflowSpacing.lg),
            if (_error != null)
              Padding(
                padding: const EdgeInsets.only(bottom: BookflowSpacing.md),
                child: Text(
                  key: const Key('publish-error'),
                  _error!,
                  style: theme.textTheme.bodySmall?.copyWith(
                    color: theme.colorScheme.error,
                  ),
                  textAlign: TextAlign.center,
                ),
              ),
            FilledButton(
              key: const Key('publish-confirm'),
              onPressed: inFlight ? null : _publish,
              child: inFlight
                  ? const SizedBox(
                      key: Key('publish-loading'),
                      width: BookflowSizes.inlineSpinner,
                      height: BookflowSizes.inlineSpinner,
                      child: CircularProgressIndicator.adaptive(strokeWidth: 2),
                    )
                  : const Text('Publish'),
            ),
            const SizedBox(height: BookflowSpacing.sm),
            TextButton(
              key: const Key('publish-cancel'),
              onPressed: inFlight ? null : () => Navigator.of(context).pop(),
              child: const Text('Not yet'),
            ),
          ],
        ),
      ),
    );
  }
}
