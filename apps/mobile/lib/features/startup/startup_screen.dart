import 'package:bookflow/theme/app_theme.dart';
import 'package:bookflow/theme/tokens.dart';
import 'package:bookflow/ui/async_value_view.dart';
import 'package:flutter/material.dart';

/// The splash, shown while the session is restored from the keystore.
///
/// On the hero gradient, because Styles-Reference.md §2 reserves it for "brand
/// moments (splash, sign-up entry, profile banner)" and this is the first of
/// them. It is also the only screen where waiting is expected rather than a
/// symptom, which is why the spinner sits under the wordmark instead of alone.
///
/// PLACEHOLDER (PR 3a): the wordmark is set in the platform font, not the
/// rounded geometric face §3 asks for — see deviation 7. The animated splash the
/// design implies is not built.
class StartupScreen extends StatelessWidget {
  const StartupScreen({super.key});

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      body: DecoratedBox(
        decoration: const BoxDecoration(gradient: BookflowTheme.heroGradient),
        child: Center(
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: <Widget>[
              Text(
                'Bookflow',
                style: Theme.of(context).textTheme.displayLarge?.copyWith(
                  color: BookflowColors.textOnBrand,
                ),
              ),
              const SizedBox(height: BookflowSpacing.xl),
              const LoadingView(),
            ],
          ),
        ),
      ),
    );
  }
}
