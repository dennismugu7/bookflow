import 'package:bookflow/features/media/media_models.dart';
import 'package:bookflow/features/media/media_providers.dart';
import 'package:bookflow/theme/tokens.dart';
import 'package:bookflow/ui/async_value_view.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

/// The portfolio, at `/portfolio`.
///
/// ══ A GRID, AND THE "+" IS A TILE IN IT ═════════════════════════════════════
///
/// The design draws a three-column square grid. The add control is the first
/// tile rather than a FAB — unlike `/services` and `/team` — because here it
/// belongs in the same visual run as the thing it adds, and a FAB would cover
/// the bottom-right image on a full gallery.
///
/// ── DELETING NEEDS A DELIBERATE GESTURE ────────────────────────────────────
///
/// Long-press, then a confirmation. A per-tile X badge would sit inside a
/// three-column grid on a phone, which makes it a small target next to a large
/// one — and the small one is the destructive one. Long-press is harder to hit
/// by accident and the dialog catches what is left.
class PortfolioScreen extends ConsumerWidget {
  const PortfolioScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final AsyncValue<List<PortfolioImage>> portfolio = ref.watch(
      myPortfolioProvider,
    );
    final AsyncValue<void> upload = ref.watch(imageUploadControllerProvider);

    return Scaffold(
      appBar: AppBar(
        leading: const BackButton(key: Key('portfolio-back')),
        title: const Text('Portfolio'),
      ),
      body: SafeArea(
        child: Column(
          children: <Widget>[
            // The upload's own failure, above the grid: it is about the action
            // rather than about the list, and putting it in `ErrorView` would
            // replace a gallery that loaded perfectly well.
            if (upload.hasError)
              Padding(
                padding: const EdgeInsets.all(BookflowSpacing.lg),
                child: Text(
                  key: const Key('portfolio-error'),
                  uploadFailureMessage(upload.error!),
                  style: Theme.of(context).textTheme.bodySmall?.copyWith(
                    color: Theme.of(context).colorScheme.error,
                  ),
                  textAlign: TextAlign.center,
                ),
              ),
            Expanded(
              child: AsyncValueView<List<PortfolioImage>>(
                value: portfolio,
                onRetry: () => ref.invalidate(myPortfolioProvider),
                data: (List<PortfolioImage> images) => images.isEmpty
                    ? const _EmptyState()
                    : _Grid(images: images),
              ),
            ),
          ],
        ),
      ),
    );
  }
}

Future<void> _pick(WidgetRef ref) async {
  await ref
      .read(imageUploadControllerProvider.notifier)
      .pickAndUpload(ImagePurpose.portfolio);
}

class _EmptyState extends ConsumerWidget {
  const _EmptyState();

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final ThemeData theme = Theme.of(context);
    final bool busy = ref.watch(imageUploadControllerProvider).isLoading;

    return Center(
      child: Padding(
        padding: const EdgeInsets.all(BookflowSpacing.xl),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: <Widget>[
            Icon(
              Icons.photo_library_outlined,
              size: BookflowSizes.avatarLarge,
              color: theme.colorScheme.outline,
            ),
            const SizedBox(height: BookflowSpacing.lg),
            Text(
              'Show clients what you do best',
              key: const Key('portfolio-empty'),
              style: theme.textTheme.titleLarge,
              textAlign: TextAlign.center,
            ),
            const SizedBox(height: BookflowSpacing.xl),
            FilledButton.icon(
              key: const Key('portfolio-upload'),
              onPressed: busy ? null : () => _pick(ref),
              icon: const Icon(Icons.add_photo_alternate_outlined),
              label: const Text('Upload a photo'),
            ),
          ],
        ),
      ),
    );
  }
}

class _Grid extends ConsumerWidget {
  const _Grid({required this.images});

  final List<PortfolioImage> images;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    return GridView.builder(
      padding: const EdgeInsets.all(BookflowSpacing.lg),
      gridDelegate: const SliverGridDelegateWithFixedCrossAxisCount(
        crossAxisCount: 3,
        // Square, as drawn. A gallery of differently-shaped tiles reads as
        // broken rather than as varied.
        childAspectRatio: 1,
        crossAxisSpacing: BookflowSpacing.sm,
        mainAxisSpacing: BookflowSpacing.sm,
      ),
      // The add tile is index 0 so it stays in the same place as the gallery
      // grows. At the end it would move on every upload.
      itemCount: images.length + 1,
      itemBuilder: (BuildContext context, int index) =>
          index == 0 ? const _AddTile() : _ImageTile(image: images[index - 1]),
    );
  }
}

class _AddTile extends ConsumerWidget {
  const _AddTile();

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final ThemeData theme = Theme.of(context);
    final bool busy = ref.watch(imageUploadControllerProvider).isLoading;

    return InkWell(
      key: const Key('portfolio-add'),
      onTap: busy ? null : () => _pick(ref),
      child: DecoratedBox(
        decoration: BoxDecoration(
          border: Border.all(color: theme.colorScheme.outline),
          borderRadius: BorderRadius.circular(BookflowRadii.card),
        ),
        child: Center(
          child: busy
              ? const SizedBox(
                  key: Key('portfolio-add-loading'),
                  width: BookflowSizes.inlineSpinner,
                  height: BookflowSizes.inlineSpinner,
                  child: CircularProgressIndicator.adaptive(strokeWidth: 2),
                )
              : Icon(Icons.add, color: theme.colorScheme.outline),
        ),
      ),
    );
  }
}

class _ImageTile extends ConsumerWidget {
  const _ImageTile({required this.image});

  final PortfolioImage image;

  Future<void> _confirmRemove(BuildContext context, WidgetRef ref) async {
    final bool confirmed =
        await showDialog<bool>(
          context: context,
          builder: (BuildContext dialogContext) => AlertDialog(
            title: const Text('Remove this photo?'),
            content: const Text('It will stop appearing on your booking page.'),
            actions: <Widget>[
              TextButton(
                key: const Key('portfolio-delete-cancel'),
                onPressed: () => Navigator.of(dialogContext).pop(false),
                child: const Text('Keep it'),
              ),
              FilledButton(
                key: const Key('portfolio-delete-confirm'),
                onPressed: () => Navigator.of(dialogContext).pop(true),
                child: const Text('Remove'),
              ),
            ],
          ),
        ) ??
        false;

    if (!confirmed) return;

    await ref
        .read(imageUploadControllerProvider.notifier)
        .removePortfolioImage(image.id);
  }

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final ThemeData theme = Theme.of(context);

    return InkWell(
      key: Key('portfolio-tile-${image.id}'),
      onLongPress: () => _confirmRemove(context, ref),
      child: ClipRRect(
        borderRadius: BorderRadius.circular(BookflowRadii.card),
        child: Image.network(
          image.imageUrl,
          fit: BoxFit.cover,
          // A tile that cannot load stays a tile: it can still be long-pressed
          // and removed, which is exactly what an owner wants to do with a
          // photograph that will not display.
          errorBuilder: (BuildContext _, Object _, StackTrace? _) => ColoredBox(
            color: theme.colorScheme.surfaceContainerHighest,
            child: Icon(
              Icons.broken_image_outlined,
              color: theme.colorScheme.outline,
            ),
          ),
        ),
      ),
    );
  }
}
