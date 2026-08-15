import 'package:bookflow/platform/router.dart';
import 'package:bookflow/theme/app_theme.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

/// The app widget: theme, router, and nothing else.
///
/// `MaterialApp.router`, because ADR-028 puts the auth-aware redirect on the
/// router. A `MaterialApp` with a `home:` would mean deciding the first screen
/// here and then re-deciding it on every session change somewhere else.
///
/// **No `ProviderScope` here.** It is created by the caller — `main.dart` in
/// production, the test in tests — so that overrides are supplied from outside
/// rather than by this widget knowing about them. That is what makes the whole
/// tree testable without touching Supabase.
///
/// ADR-035: English only. No `localizationsDelegates` beyond Flutter's own
/// defaults, no `supportedLocales` list, no ARB files.
class BookflowApp extends ConsumerWidget {
  const BookflowApp({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final GoRouter router = ref.watch(routerProvider);

    return MaterialApp.router(
      title: 'Bookflow',
      theme: BookflowTheme.light(),
      // No `darkTheme`. Styles-Reference.md describes one visual system, on
      // white surfaces with an indigo hero, and every screenshot is light. A
      // dark theme would be invented rather than derived, and inventing one
      // silently is worse than not having one.
      routerConfig: router,
      debugShowCheckedModeBanner: false,
    );
  }
}
