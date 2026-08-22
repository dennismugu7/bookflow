import 'package:bookflow/theme/app_theme.dart';
import 'package:bookflow/theme/system_chrome.dart';
import 'package:bookflow/theme/tokens.dart';
import 'package:bookflow/ui/async_value_view.dart';
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';

/// The splash, shown while the session is restored from the keystore.
///
/// On the hero gradient, because Styles-Reference.md §2 reserves it for "brand
/// moments (splash, sign-up entry, profile banner)" and this is the first of
/// them. It is also the only screen where waiting is expected rather than a
/// symptom, which is why the spinner sits under the wordmark instead of alone.
///
/// **No timer, and that is the deviation worth naming.** Screen 1 describes an
/// "Auto-timer / Tap" that moves to the welcome screen. This screen leaves when
/// the session finishes restoring and not a moment sooner or later, because the
/// wait here is real work rather than a held pose — a timer would either cut
/// the restore off or pad a cold start that was already done.
///
/// The wordmark is set in the platform font, not the rounded geometric face §3
/// asks for — deviation 7, and unchanged.
class StartupScreen extends StatelessWidget {
  const StartupScreen({super.key});

  @override
  Widget build(BuildContext context) {
    final ThemeData theme = Theme.of(context);

    // The bars take the brand colour here — this screen is full-bleed gradient,
    // and white bars around it would frame the splash rather than continue it.
    // Scoped to this screen, so leaving it restores the light chrome.
    return AnnotatedRegion<SystemUiOverlayStyle>(
      value: BookflowSystemChrome.brand,
      child: Scaffold(
        body: DecoratedBox(
          decoration: const BoxDecoration(gradient: BookflowTheme.heroGradient),
          child: Center(
            child: Column(
              mainAxisSize: MainAxisSize.min,
              children: <Widget>[
                Text(
                  'Bookflow',
                  style: theme.textTheme.displayLarge?.copyWith(
                    color: BookflowColors.textOnBrand,
                  ),
                ),
                const SizedBox(height: BookflowSpacing.sm),
                // Same wordmark, same tagline, same gradient as the welcome
                // screen the user lands on next — Screen 1 and Screen 2 are one
                // continuous brand moment in the design, and a splash that
                // dropped the tagline would read as a different screen.
                Text(
                  'Ready, set, book',
                  style: theme.textTheme.bodyMedium?.copyWith(
                    color: BookflowColors.textOnBrand,
                    fontStyle: FontStyle.italic,
                  ),
                ),
                const SizedBox(height: BookflowSpacing.xl),
                const LoadingView(),
              ],
            ),
          ),
        ),
      ),
    );
  }
}
