import 'package:bookflow/theme/tokens.dart';
import 'package:flutter/material.dart';

/// The bottom-sheet chrome all three entry sheets share.
///
/// Styles-Reference.md §6 and the design's Screens 3 and 4 draw the same frame
/// every time: a grabber bar, a back arrow at the top-left, a centred title,
/// then the form. Building it once means the three sheets differ only where the
/// design differs.
///
/// ══ WHY A SHEET AND NOT A ROUTE ═════════════════════════════════════════════
///
/// ADR-042 splits navigation in two: a **shell** is where the app computed the
/// user belongs, a **pushed route** is where they went because they tapped. A
/// modal sheet is neither — it is a decoration on top of the shell, and the
/// user is still at `/welcome` the whole time it is open.
///
/// That is what keeps the redirect out of this: the router never learns these
/// exist, so nothing has to teach it that `/welcome` may sometimes be covered.
/// When verification or login succeeds the session changes,
/// `appDestinationProvider` recomputes and the redirect replaces the shell
/// underneath — the sheet only has to close itself.
class AuthSheetScaffold extends StatelessWidget {
  const AuthSheetScaffold({
    required this.title,
    required this.children,
    this.onBack,
    super.key,
  });

  final String title;
  final List<Widget> children;

  /// Omit and no back affordance is drawn. The design puts one on every sheet;
  /// a sheet with nothing behind it to return to should not pretend otherwise.
  final VoidCallback? onBack;

  @override
  Widget build(BuildContext context) {
    final ThemeData theme = Theme.of(context);

    return Padding(
      // The keyboard. Without this the CTA sits behind it on every phone, and
      // `isScrollControlled` alone does not move anything — it only permits the
      // sheet to be taller than half the screen.
      padding: EdgeInsets.only(bottom: MediaQuery.viewInsetsOf(context).bottom),
      child: SafeArea(
        top: false,
        child: SingleChildScrollView(
          padding: const EdgeInsets.fromLTRB(
            BookflowSpacing.xl,
            BookflowSpacing.sm,
            BookflowSpacing.xl,
            BookflowSpacing.xl,
          ),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            mainAxisSize: MainAxisSize.min,
            children: <Widget>[
              const _Grabber(),
              const SizedBox(height: BookflowSpacing.sm),
              Row(
                children: <Widget>[
                  if (onBack != null)
                    IconButton(
                      key: const Key('auth-sheet-back'),
                      onPressed: onBack,
                      icon: const Icon(Icons.arrow_back),
                      tooltip: 'Back',
                    )
                  else
                    const SizedBox(width: BookflowSpacing.xxl),
                  Expanded(
                    child: Text(
                      title,
                      style: theme.textTheme.titleLarge,
                      textAlign: TextAlign.center,
                    ),
                  ),
                  // Balances the leading control so the title is centred on the
                  // sheet rather than on the space left over beside it.
                  const SizedBox(width: BookflowSpacing.xxl),
                ],
              ),
              const SizedBox(height: BookflowSpacing.lg),
              ...children,
            ],
          ),
        ),
      ),
    );
  }
}

class _Grabber extends StatelessWidget {
  const _Grabber();

  @override
  Widget build(BuildContext context) {
    return Center(
      child: Container(
        width: BookflowSizes.grabberWidth,
        height: BookflowSizes.grabberHeight,
        decoration: BoxDecoration(
          color: BookflowColors.sheetGrabber,
          borderRadius: BorderRadius.circular(BookflowSizes.grabberHeight),
        ),
      ),
    );
  }
}

/// The inline error line every entry sheet shows under its form.
///
/// Not `ErrorView`: that replaces what it is given and offers a retry, which
/// would discard the typed email and password — the same reasoning
/// `create_business_screen.dart` records for its own error line.
class AuthErrorText extends StatelessWidget {
  const AuthErrorText({required this.message, this.action, super.key});

  final String message;

  /// Rendered beneath the message when the failure has a next step — today
  /// only "this email is not verified", which can offer the verification sheet.
  final Widget? action;

  @override
  Widget build(BuildContext context) {
    final ThemeData theme = Theme.of(context);

    return Padding(
      padding: const EdgeInsets.only(bottom: BookflowSpacing.md),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: <Widget>[
          Text(
            key: const Key('auth-error'),
            message,
            style: theme.textTheme.bodySmall?.copyWith(
              color: theme.colorScheme.error,
            ),
          ),
          ?action,
        ],
      ),
    );
  }
}

/// A CTA that becomes a spinner while its request is in flight.
///
/// The spinner replaces the label rather than sitting beside it, so the button
/// does not change width mid-submission, and `BookflowSizes.inlineSpinner` is
/// sized to fit Material's button height without changing it.
class AuthSubmitButton extends StatelessWidget {
  const AuthSubmitButton({
    required this.label,
    required this.inFlight,
    required this.onPressed,
    super.key,
  });

  final String label;
  final bool inFlight;
  final VoidCallback? onPressed;

  @override
  Widget build(BuildContext context) {
    return FilledButton(
      onPressed: inFlight ? null : onPressed,
      child: inFlight
          ? const SizedBox(
              key: Key('auth-submit-loading'),
              width: BookflowSizes.inlineSpinner,
              height: BookflowSizes.inlineSpinner,
              child: CircularProgressIndicator.adaptive(strokeWidth: 2),
            )
          : Text(label),
    );
  }
}

/// Presents one of the entry sheets.
///
/// `isScrollControlled` so the sheet may exceed half the screen once the
/// keyboard is up; `useSafeArea` so it does not slide under the status bar on a
/// tall form. Both are properties of every sheet here, which is why they are
/// set once rather than at each call site.
Future<T?> showAuthSheet<T>({
  required BuildContext context,
  required WidgetBuilder builder,
}) {
  return showModalBottomSheet<T>(
    context: context,
    isScrollControlled: true,
    useSafeArea: true,
    builder: builder,
  );
}
