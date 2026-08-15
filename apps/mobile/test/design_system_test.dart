import 'dart:io';

import 'package:flutter_test/flutter_test.dart';

/// Two architectural rules, enforced by reading the source tree.
///
/// ══ WHY A TEST AND NOT A LINT ═══════════════════════════════════════════════
///
/// Dart's analyzer has no rule for either of these. `depend_on_referenced_
/// packages` cannot express "this package, but only from these directories",
/// and no lint knows what a design token is. Custom analyzer plugins exist and
/// are a heavy, separately-versioned dependency for two rules.
///
/// So: a test that reads the files. It runs in the same `flutter test` the CI
/// job already runs, it fails with the offending file and line, and it cannot be
/// forgotten — which is the property that matters. **A convention nobody can
/// violate beats one everyone has to remember.**
void main() {
  final Directory lib = Directory('lib');

  List<File> dartFilesUnder(String path) {
    final Directory directory = Directory(path);
    if (!directory.existsSync()) return <File>[];
    return directory
        .listSync(recursive: true)
        .whereType<File>()
        .where((File file) => file.path.endsWith('.dart'))
        .toList();
  }

  group('screens never import the generated client (ADR-028)', () {
    /// The rule, in ADR-028's words: "Screens never import
    /// `packages/bookflow_api` directly. Each feature wraps the generated client
    /// in a thin repository, and the repository is what the feature's providers
    /// depend on."
    ///
    /// The reason is blast radius. `packages/bookflow_api` is regenerated
    /// wholesale on every schema change (ADR-025) and CI fails on any diff. A
    /// screen importing a generated model is coupled to the generator's naming,
    /// its null handling and its `built_value` builders — so a renamed response
    /// type surfaces in every screen at once instead of in one file whose job is
    /// to know about the wire format.
    /// **Where the line actually falls.** ADR-028's layout makes `platform/`
    /// "api client construction · auth · storage · config · router" — so
    /// platform files may hold the client and its type; that is their job. The
    /// ban is on `features/` and `ui/`, where only a `*_repository.dart` may
    /// know the wire format.
    ///
    /// This distinction was found by this test failing: `platform/providers.dart`
    /// legitimately names `BookflowApi` to declare the provider that supplies
    /// it, and a rule that called that a violation would have been a rule that
    /// had to be worked around on its first day.
    test('no screen, provider or widget under features/ or ui/ imports it', () {
      final List<String> offenders = <String>[];

      for (final File file in dartFilesUnder(lib.path)) {
        final String path = file.path.replaceAll(r'\', '/');
        final bool isFeatureOrUi =
            path.contains('lib/features/') || path.contains('lib/ui/');
        if (!isFeatureOrUi) continue;

        // A feature's repository is the one file per feature whose job is to
        // know about the wire format — and the blast radius of a regeneration.
        if (file.uri.pathSegments.last.endsWith('_repository.dart')) continue;

        final List<String> lines = file.readAsLinesSync();
        for (int i = 0; i < lines.length; i += 1) {
          if (lines[i].startsWith("import 'package:bookflow_api/")) {
            offenders.add('$path:${i + 1}');
          }
        }
      }

      expect(
        offenders,
        isEmpty,
        reason:
            'These files import the generated client directly. Wrap it in a '
            '<feature>_repository.dart instead (ADR-028). Offending:\n'
            '${offenders.join('\n')}',
      );
    });

    test('the allowed importer really does import it', () {
      // Otherwise the rule above passes vacuously the day someone deletes the
      // client wiring, and nobody notices the test is asserting nothing.
      final File client = File('lib/platform/api_client.dart');
      expect(client.existsSync(), isTrue);
      expect(
        client.readAsStringSync(),
        contains("import 'package:bookflow_api/bookflow_api.dart';"),
      );
    });
  });

  group('no screen hardcodes a design value', () {
    /// ── PROPOSED `CLAUDE.md` §5 NON-NEGOTIABLE ────────────────────────────
    ///
    /// Wording proposed for review, to sit with the other client rules:
    ///
    ///   • **No widget names a colour, radius, spacing or font size literally.**
    ///     Every value comes from `apps/mobile/lib/theme/` through `ThemeData`
    ///     or a `Bookflow*` token class. A `Color(0xFF…)` outside `theme/` has
    ///     forked the design system: the token can be changed and that widget
    ///     will not move, and nothing will report it. Enforced by
    ///     `apps/mobile/test/design_system_test.dart`, which fails with the
    ///     file and line. (ADR-028, Styles-Reference.md)
    ///
    /// The test is deliberately narrower than the wording: it catches literal
    /// colours, which are the values that actually get pasted in from a
    /// screenshot. Spacing and radii are checked by review, because a bare `8`
    /// in a widget is not distinguishable from any other integer without
    /// type-aware analysis.
    test('no Color literal outside lib/theme/', () {
      // `\b` before `Colors` matters: without it the pattern also matches the
      // token class itself, `BookflowColors.actionBlue`, and the rule would
      // reject exactly the thing it exists to require. Caught by the
      // enforceability test below on the first run.
      final RegExp colorLiteral = RegExp(
        r'Color\(0x|\bColors\.(?!transparent\b)[a-zA-Z]',
      );
      final List<String> offenders = <String>[];

      for (final File file in dartFilesUnder(lib.path)) {
        final String path = file.path.replaceAll(r'\', '/');
        if (path.contains('lib/theme/')) continue;

        final List<String> lines = file.readAsLinesSync();
        for (int i = 0; i < lines.length; i += 1) {
          final String line = lines[i];
          // Comments describe tokens constantly; they are prose, not styling.
          if (line.trimLeft().startsWith('//') ||
              line.trimLeft().startsWith('///')) {
            continue;
          }
          if (colorLiteral.hasMatch(line)) {
            offenders.add('$path:${i + 1}  ${line.trim()}');
          }
        }
      }

      expect(
        offenders,
        isEmpty,
        reason:
            'These lines name a colour outside lib/theme/. Add a token to '
            'theme/tokens.dart and reach it through ThemeData or the token '
            'class. Offending:\n${offenders.join('\n')}',
      );
    });

    test('the rule is enforceable — a violation would be caught', () {
      // Proves the matcher above is not a regex that matches nothing. Without
      // this, a typo in the pattern would make the previous test pass forever
      // while checking nothing, which is the failure mode of every grep-based
      // rule.
      // `\b` before `Colors` matters: without it the pattern also matches the
      // token class itself, `BookflowColors.actionBlue`, and the rule would
      // reject exactly the thing it exists to require. Caught by the
      // enforceability test below on the first run.
      final RegExp colorLiteral = RegExp(
        r'Color\(0x|\bColors\.(?!transparent\b)[a-zA-Z]',
      );
      expect(colorLiteral.hasMatch('  color: Color(0xFF0278FF),'), isTrue);
      expect(colorLiteral.hasMatch('  color: Colors.red,'), isTrue);
      expect(
        colorLiteral.hasMatch('  color: BookflowColors.actionBlue,'),
        isFalse,
      );
    });
  });
}
