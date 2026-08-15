import 'package:bookflow/theme/tokens.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

/// ══ THE ASYNC CONVENTION EVERY SCREEN INHERITS (ADR-028) ════════════════════
///
/// **All asynchronous UI state flows through `AsyncValue` and is handled
/// exhaustively — data, loading and error, all three, always.**
///
/// ── HOW TO USE IT ───────────────────────────────────────────────────────────
///
/// ```dart
/// class ServicesScreen extends ConsumerWidget {
///   @override
///   Widget build(BuildContext context, WidgetRef ref) {
///     return AsyncValueView<List<Service>>(
///       value: ref.watch(servicesProvider),
///       onRetry: () => ref.invalidate(servicesProvider),
///       data: (List<Service> services) => services.isEmpty
///           ? const EmptyStateView(message: 'No services yet.')
///           : ServiceList(services),
///     );
///   }
/// }
/// ```
///
/// ── WHY A WIDGET RATHER THAN A CONVENTION ───────────────────────────────────
///
/// ADR-028's rationale is that a missing branch should be a **compile error
/// rather than an oversight**. `AsyncValue.when` already gives that: omit
/// `error:` and it does not compile. What it does not give is consistency —
/// twelve screens each writing their own `CircularProgressIndicator` and their
/// own error text produce twelve slightly different spinners and twelve
/// different apologies, and no screen is wrong on its own.
///
/// So the exhaustiveness comes from `when`, and the *appearance* comes from
/// here. **No screen writes its own spinner.**
///
/// ── EMPTY IS NOT A CASE HERE, AND THAT IS DELIBERATE ────────────────────────
///
/// ADR-028 is explicit: "Empty is not an `AsyncValue` case and remains the
/// screen's own responsibility inside the data branch." A successful load that
/// returned nothing is data — the screen knows what "nothing" means for its own
/// content and this widget cannot. `EmptyStateView` below is offered for the
/// look of it, not to make emptiness a fourth state.
class AsyncValueView<T> extends StatelessWidget {
  const AsyncValueView({
    required this.value,
    required this.data,
    this.onRetry,
    super.key,
  });

  final AsyncValue<T> value;
  final Widget Function(T value) data;

  /// Invoked by the error state's retry action. Omit it and no retry is
  /// offered — appropriate when there is nothing useful to retry.
  final VoidCallback? onRetry;

  @override
  Widget build(BuildContext context) {
    return value.when(
      data: data,
      loading: () => const LoadingView(),
      // The error object is deliberately NOT rendered. It is a `DioException`
      // or a stack trace, and showing either to a salon owner is noise at best
      // and a leak at worst. What the user needs is what happened and what they
      // can do; what a developer needs is in the log.
      error: (Object error, StackTrace stackTrace) =>
          ErrorView(onRetry: onRetry),
    );
  }
}

/// The one spinner in the app.
class LoadingView extends StatelessWidget {
  const LoadingView({super.key});

  @override
  Widget build(BuildContext context) {
    return const Center(
      child: Padding(
        padding: EdgeInsets.all(BookflowSpacing.lg),
        child: CircularProgressIndicator.adaptive(),
      ),
    );
  }
}

/// The one error state.
class ErrorView extends StatelessWidget {
  const ErrorView({this.onRetry, this.message, super.key});

  final VoidCallback? onRetry;

  /// Overridable so a screen can say something truer than the default when it
  /// genuinely knows more. Most should not.
  final String? message;

  @override
  Widget build(BuildContext context) {
    final ThemeData theme = Theme.of(context);

    return Center(
      child: Padding(
        padding: const EdgeInsets.all(BookflowSpacing.lg),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: <Widget>[
            Text(
              message ?? 'Something went wrong.',
              style: theme.textTheme.titleLarge,
              textAlign: TextAlign.center,
            ),
            const SizedBox(height: BookflowSpacing.sm),
            Text(
              'Check your connection and try again.',
              style: theme.textTheme.bodySmall,
              textAlign: TextAlign.center,
            ),
            if (onRetry != null) ...<Widget>[
              const SizedBox(height: BookflowSpacing.lg),
              TextButton(onPressed: onRetry, child: const Text('Try again')),
            ],
          ],
        ),
      ),
    );
  }
}

/// A successful load with nothing in it. See the note above: this is a look, not
/// a state.
class EmptyStateView extends StatelessWidget {
  const EmptyStateView({required this.message, this.action, super.key});

  final String message;
  final Widget? action;

  @override
  Widget build(BuildContext context) {
    final ThemeData theme = Theme.of(context);

    return Center(
      child: Padding(
        padding: const EdgeInsets.all(BookflowSpacing.lg),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: <Widget>[
            Text(
              message,
              style: theme.textTheme.bodyMedium,
              textAlign: TextAlign.center,
            ),
            if (action != null) ...<Widget>[
              const SizedBox(height: BookflowSpacing.lg),
              action!,
            ],
          ],
        ),
      ),
    );
  }
}
