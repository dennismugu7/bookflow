import 'package:bookflow/features/bookings/bookings_models.dart';
import 'package:bookflow/features/bookings/bookings_providers.dart';
import 'package:bookflow/theme/tokens.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:url_launcher/url_launcher.dart';

/// The client's proof of payment, fetched and shown.
///
/// ══ THE URL IS FETCHED HERE AND NEVER STORED ════════════════════════════════
///
/// The booking list carries `hasPaymentProof` and no address. The address is
/// minted by `GET /v1/me/business/bookings/{id}/payment-proof` at the moment the
/// owner asks, lives about five minutes, and is thrown away with this sheet
/// (ADR-011).
///
/// **Nothing caches it**, and that is deliberate rather than lazy: a cached
/// signed URL is a stale one, and an owner reopening a sheet after ten minutes
/// would get a permission error from Storage instead of their document. Asking
/// again costs one request.
///
/// ── IN-APP FIRST, BROWSER AS THE ESCAPE ────────────────────────────────────
///
/// A proof is usually an M-Pesa screenshot, so it renders in place. It may not
/// be — the client uploads whatever they have — so `Image.network`'s
/// `errorBuilder` offers "Open in browser" rather than showing a broken box.
/// **The fallback matters more than it looks**: an unopenable proof is the one
/// piece of evidence the owner has that they were paid.
Future<void> showPaymentProof(
  BuildContext context,
  WidgetRef ref, {
  required String bookingId,
}) async {
  await showModalBottomSheet<void>(
    context: context,
    isScrollControlled: true,
    showDragHandle: true,
    builder: (BuildContext context) => _PaymentProofSheet(bookingId: bookingId),
  );
}

class _PaymentProofSheet extends ConsumerStatefulWidget {
  const _PaymentProofSheet({required this.bookingId});

  final String bookingId;

  @override
  ConsumerState<_PaymentProofSheet> createState() => _PaymentProofSheetState();
}

class _PaymentProofSheetState extends ConsumerState<_PaymentProofSheet> {
  /// Started in `initState` and held, rather than called in `build`.
  ///
  /// A future created inside `build` is a NEW request on every rebuild — and a
  /// bottom sheet rebuilds when the keyboard moves, when the theme changes, and
  /// whenever the parent does. Each one would mint another signed URL.
  late final Future<String> _url = ref
      .read(bookingsRepositoryProvider)
      .paymentProofUrl(widget.bookingId);

  @override
  Widget build(BuildContext context) {
    final ThemeData theme = Theme.of(context);

    return SafeArea(
      child: Padding(
        padding: const EdgeInsets.all(BookflowSpacing.xl),
        child: FutureBuilder<String>(
          future: _url,
          builder: (BuildContext context, AsyncSnapshot<String> snapshot) {
            if (snapshot.connectionState != ConnectionState.done) {
              return const Padding(
                padding: EdgeInsets.all(BookflowSpacing.xl),
                child: Center(
                  child: CircularProgressIndicator.adaptive(
                    key: Key('proof-loading'),
                  ),
                ),
              );
            }

            if (snapshot.hasError) {
              // The API answers 404 for "no proof", "object gone", "not your
              // booking" and "no such booking" alike — so this message says the
              // only true thing that covers all four. Guessing which one would
              // mean guessing, and one of the four is a security boundary.
              final bool unavailable =
                  snapshot.error is PaymentProofUnavailable;
              return Text(
                key: const Key('proof-error'),
                unavailable
                    ? 'That payment confirmation is not available.'
                    : 'Could not load the payment confirmation. Check your '
                          'connection and try again.',
                style: theme.textTheme.bodyMedium,
              );
            }

            final String url = snapshot.requireData;

            return Column(
              mainAxisSize: MainAxisSize.min,
              crossAxisAlignment: CrossAxisAlignment.stretch,
              children: <Widget>[
                Text(
                  'Payment confirmation',
                  style: theme.textTheme.titleLarge,
                  textAlign: TextAlign.center,
                ),
                const SizedBox(height: BookflowSpacing.lg),
                Flexible(
                  child: InteractiveViewer(
                    child: Image.network(
                      url,
                      key: const Key('proof-image'),
                      fit: BoxFit.contain,
                      errorBuilder:
                          (
                            BuildContext context,
                            Object error,
                            StackTrace? stack,
                          ) => Padding(
                            padding: const EdgeInsets.all(BookflowSpacing.lg),
                            child: Text(
                              'This file cannot be shown here — it may not be '
                              'an image. Open it in your browser instead.',
                              key: const Key('proof-not-an-image'),
                              style: theme.textTheme.bodySmall,
                              textAlign: TextAlign.center,
                            ),
                          ),
                    ),
                  ),
                ),
                const SizedBox(height: BookflowSpacing.lg),
                OutlinedButton.icon(
                  key: const Key('proof-open-browser'),
                  onPressed: () async {
                    await launchUrl(
                      Uri.parse(url),
                      mode: LaunchMode.externalApplication,
                    );
                  },
                  icon: const Icon(Icons.open_in_new),
                  label: const Text('Open in browser'),
                ),
                const SizedBox(height: BookflowSpacing.sm),
                Text(
                  'This link expires in a few minutes.',
                  style: theme.textTheme.bodySmall,
                  textAlign: TextAlign.center,
                ),
              ],
            );
          },
        ),
      ),
    );
  }
}
