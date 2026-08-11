import 'package:flutter/material.dart';

/// Bookflow — the salon owner's app (ADR-001, ADR-015).
///
/// This is a skeleton. It has no screens, no design system and no API client
/// on purpose: screens are Phase 3, the visual language in
/// `docs/source/Styles-Reference.md` is applied then, and the API client is
/// generated from the OpenAPI spec rather than written (ADR-014, ADR-025).
///
/// What it does prove is that the project compiles, analyses clean under
/// `analysis_options.yaml`, and builds for both Android and iOS in CI — which
/// is the whole job of this step, since iOS can never be built locally
/// (ADR-015: the development machine is Windows).
void main() {
  runApp(const BookflowApp());
}

/// Shown until the first real screen lands.
const String placeholderHeadline = 'Bookflow';

/// Deliberately explicit that nothing is built yet, so a stray build of this
/// skeleton is never mistaken for a broken app.
const String placeholderBody =
    'Owner app skeleton. No screens yet — see docs/BUILD_LOG.md.';

class BookflowApp extends StatelessWidget {
  const BookflowApp({super.key});

  @override
  Widget build(BuildContext context) {
    return const MaterialApp(
      title: placeholderHeadline,
      home: PlaceholderScreen(),
    );
  }
}

class PlaceholderScreen extends StatelessWidget {
  const PlaceholderScreen({super.key});

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      body: Center(
        child: Padding(
          padding: const EdgeInsets.all(24),
          child: Column(
            mainAxisAlignment: MainAxisAlignment.center,
            children: <Widget>[
              Text(
                placeholderHeadline,
                style: Theme.of(context).textTheme.headlineMedium,
              ),
              const SizedBox(height: 8),
              Text(placeholderBody, textAlign: TextAlign.center),
            ],
          ),
        ),
      ),
    );
  }
}
