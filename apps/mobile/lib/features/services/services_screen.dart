import 'package:bookflow/features/services/service_editor_sheet.dart';
import 'package:bookflow/features/services/services_models.dart';
import 'package:bookflow/features/services/services_providers.dart';
import 'package:bookflow/theme/tokens.dart';
import 'package:bookflow/ui/async_value_view.dart';
import 'package:bookflow/ui/money.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

/// My Services — screens #21 (empty) and #22 (populated), at `/services`.
///
/// ══ ONE SCREEN, TWO DESIGNS, AND EMPTY IS NOT A THIRD STATE ═════════════════
///
/// The design draws the empty and populated screens separately; they are the
/// same route with the same app bar and the same FAB, differing only in the
/// body. ADR-028 is explicit that "empty is not an `AsyncValue` case and remains
/// the screen's own responsibility inside the data branch", which is exactly
/// where the choice is made below.
///
/// **The illustration is not built.** The design puts a drawing above the empty
/// state's copy; there is no asset for it and inventing one would put a picture
/// nobody approved in front of every new owner. An icon carries the same
/// meaning and is honest about being a placeholder.
class ServicesScreen extends ConsumerWidget {
  const ServicesScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final AsyncValue<List<SalonService>> services = ref.watch(
      myServicesProvider,
    );

    return Scaffold(
      appBar: AppBar(
        leading: const BackButton(key: Key('services-back')),
        title: const Text('My services'),
      ),
      body: SafeArea(
        child: AsyncValueView<List<SalonService>>(
          value: services,
          onRetry: () => ref.invalidate(myServicesProvider),
          data: (List<SalonService> value) => value.isEmpty
              ? const _EmptyState()
              : _ServiceList(services: value),
        ),
      ),
      // The FAB is outside `AsyncValueView` on purpose: an owner whose list
      // failed to load can still add a service, and the alternative is a screen
      // that offers nothing but a retry. Same reasoning the account menu's
      // header carries for keeping Log out reachable when the header fails.
      floatingActionButton: FloatingActionButton(
        key: const Key('services-add'),
        onPressed: () => openServiceEditor(context, ref, service: null),
        backgroundColor: BookflowColors.ctaGreen,
        foregroundColor: BookflowColors.textOnBrand,
        child: const Icon(Icons.add),
      ),
    );
  }
}

/// Opens the add/edit sheet and refreshes on success.
///
/// A function rather than a method so the FAB and each card call the same
/// thing; the sheet itself never opens or closes a route, for the reason
/// `auth_flow.dart` sets out at length.
Future<void> openServiceEditor(
  BuildContext context,
  WidgetRef ref, {
  required SalonService? service,
}) {
  return showModalBottomSheet<void>(
    context: context,
    isScrollControlled: true,
    useSafeArea: true,
    builder: (BuildContext sheetContext) => ServiceEditorSheet(
      service: service,
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
              Icons.content_cut,
              size: BookflowSizes.avatarLarge,
              color: theme.colorScheme.outline,
            ),
            const SizedBox(height: BookflowSpacing.lg),
            Text(
              'No service added to your menu',
              key: const Key('services-empty'),
              style: theme.textTheme.titleLarge,
              textAlign: TextAlign.center,
            ),
            const SizedBox(height: BookflowSpacing.sm),
            Text(
              'Give your clients something new to book',
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

class _ServiceList extends ConsumerWidget {
  const _ServiceList({required this.services});

  final List<SalonService> services;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    return ListView.separated(
      padding: const EdgeInsets.fromLTRB(
        BookflowSpacing.lg,
        BookflowSpacing.lg,
        BookflowSpacing.lg,
        // Room for the FAB, which would otherwise sit on top of the last card.
        BookflowSpacing.xxl * 2,
      ),
      itemCount: services.length,
      separatorBuilder: (BuildContext _, int _) =>
          const SizedBox(height: BookflowSpacing.md),
      itemBuilder: (BuildContext context, int index) =>
          _ServiceCard(service: services[index]),
    );
  }
}

class _ServiceCard extends ConsumerWidget {
  const _ServiceCard({required this.service});

  final SalonService service;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final ThemeData theme = Theme.of(context);

    return Card(
      child: Padding(
        padding: const EdgeInsets.all(BookflowSpacing.lg),
        child: Row(
          children: <Widget>[
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: <Widget>[
                  Text(
                    service.name,
                    style: theme.textTheme.bodyMedium?.copyWith(
                      fontWeight: FontWeight.bold,
                    ),
                  ),
                  const SizedBox(height: BookflowSpacing.xs),
                  Text(
                    formatDuration(service.durationMinutes),
                    style: theme.textTheme.bodySmall,
                  ),
                  const SizedBox(height: BookflowSpacing.xs),
                  Text(
                    // `ui/money.dart` owns every money string in the app.
                    formatKes(service.priceKes),
                    style: theme.textTheme.bodyMedium?.copyWith(
                      fontWeight: FontWeight.bold,
                    ),
                  ),
                ],
              ),
            ),
            IconButton(
              key: Key('service-edit-${service.id}'),
              onPressed: () =>
                  openServiceEditor(context, ref, service: service),
              icon: const Icon(Icons.edit_outlined),
              tooltip: 'Edit ${service.name}',
            ),
          ],
        ),
      ),
    );
  }
}
