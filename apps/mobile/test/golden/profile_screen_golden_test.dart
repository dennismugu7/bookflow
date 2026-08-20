@Tags(<String>['golden'])
library;

import 'dart:async';
import 'dart:io';

import 'package:bookflow/features/business/business_models.dart';
import 'package:bookflow/features/business/business_providers.dart';
import 'package:bookflow/features/business/business_repository.dart';
import 'package:bookflow/features/profile/profile_models.dart';
import 'package:bookflow/features/profile/profile_providers.dart';
import 'package:bookflow/features/profile/profile_repository.dart';
import 'package:bookflow/features/profile/profile_screen.dart';
import 'package:bookflow/platform/auth_gateway.dart';
import 'package:bookflow/platform/providers.dart';
import 'package:bookflow/theme/app_theme.dart';
import 'package:bookflow/theme/tokens.dart';
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';

/// Renders screen #20 to a PNG so it can be compared **by eye** against
/// `docs/designs/native/native-20-…png`.
///
/// ══ THIS IS NOT A GOLDEN ASSERTION, AND MUST NOT BECOME ONE ═════════════════
///
/// It uses `matchesGoldenFile`, which is the only mechanism Flutter gives for
/// getting a widget onto disk as a PNG. **CI does not run it**: the `mobile` job
/// runs `flutter test --exclude-tags golden`, and the `@Tags` above is what that
/// excludes.
///
/// The reason is text rasterisation. Font hinting, subpixel positioning and
/// available font files all differ between this Windows development machine and
/// the Ubuntu runner, so a byte-comparison of rendered text fails on the runner
/// for reasons that have nothing to do with the screen. The predictable outcome
/// of that is not better tests — it is people running `--update-goldens` until
/// the build goes green, which trains everyone to regenerate the reference
/// instead of looking at it. A comparison nobody trusts is worse than no
/// comparison, because it costs the same and teaches the opposite habit.
///
/// So: **the PNG is an artefact, not an assertion.** Its job is to be opened
/// next to the design and looked at by a person. The behaviour of this screen is
/// covered by `test/profile_screen_test.dart`, which asserts on widgets and text
/// rather than on pixels, and which does run in CI.
///
/// ── REGENERATE IT WITH ──────────────────────────────────────────────────────
///
///   flutter test --tags golden --update-goldens
///
/// then commit the PNG under `docs/designs/built/`.
///
/// ── ABOUT THE TEXT IN THE IMAGE ─────────────────────────────────────────────
///
/// `flutter test` renders every glyph as a filled box unless real fonts are
/// loaded, which makes an image intended for eyeballing nearly useless. So this
/// loads **Roboto from the Flutter SDK's own cache** — the same family Android
/// uses by default, resolved from `FLUTTER_ROOT` rather than a hardcoded path.
///
/// The theme is then pinned to that family for the render. The app itself sets
/// `fontFamily: null` and takes the platform default (`tokens.dart`), so this is
/// a **substitution made for the artefact only**: on a real Android device this
/// is the same face, and on iOS it is San Francisco instead. Nothing else about
/// the screen is changed for the image.
///
/// If the fonts cannot be found the test still renders and still writes a PNG —
/// with boxes for text. Failing would be worse: the image's job is to show
/// layout, spacing, colour, the avatar and the card, and all of those survive.
void main() {
  setUpAll(() async {
    final String? flutterRoot = Platform.environment['FLUTTER_ROOT'];
    if (flutterRoot == null) return;

    // Forward slashes resolve on Windows too, so this needs no `package:path`.
    final Directory fonts = Directory(
      '$flutterRoot/bin/cache/artifacts/material_fonts',
    );
    if (!fonts.existsSync()) return;

    // Family name -> file. `MaterialIcons` is what `Icons.arrow_back` resolves
    // to; without it the back arrow renders as a box like everything else.
    const Map<String, List<String>> families = <String, List<String>>{
      'Roboto': <String>[
        'roboto-regular.ttf',
        'roboto-bold.ttf',
        'roboto-italic.ttf',
      ],
      'MaterialIcons': <String>['materialicons-regular.otf'],
    };

    for (final MapEntry<String, List<String>> family in families.entries) {
      final FontLoader loader = FontLoader(family.key);
      bool loaded = false;
      for (final String name in family.value) {
        final File file = File('${fonts.path}/$name');
        if (!file.existsSync()) continue;
        loader.addFont(
          Future<ByteData>.value(ByteData.sublistView(file.readAsBytesSync())),
        );
        loaded = true;
      }
      if (loaded) await loader.load();
    }
  });

  testWidgets('renders screen #20 to docs/designs/built/', (
    WidgetTester tester,
  ) async {
    // A 360×760dp frame at devicePixelRatio 3 — the same 1080px width as the
    // native screenshots, so the two images can be put side by side at the same
    // scale without resampling either.
    tester.view.physicalSize = const Size(1080, 2280);
    tester.view.devicePixelRatio = 3;
    addTearDown(tester.view.reset);

    await tester.pumpWidget(
      ProviderScope(
        overrides: <Override>[
          authGatewayProvider.overrideWithValue(_GoldenGateway()),
          profileRepositoryProvider.overrideWithValue(const _GoldenProfile()),
          // Decision 11 widened this screen with a business section. Without
          // this override the section's read has no API behind it, fails, and
          // the golden captures "Something went wrong." — canonising an error
          // state as what screen #20 looks like.
          businessRepositoryProvider.overrideWithValue(const _GoldenBusiness()),
        ],
        child: MaterialApp(
          // Roboto pinned for the artefact only — see the note above.
          theme: _withRoboto(BookflowTheme.light()),
          home: const ProfileScreen(),
          debugShowCheckedModeBanner: false,
        ),
      ),
    );
    await tester.pumpAndSettle();

    // The same person the design's mock shows, so the two images differ only
    // where the SYSTEM differs (ADR-039) and not because the data changed.
    await expectLater(
      find.byType(ProfileScreen),
      matchesGoldenFile('../../../../docs/designs/built/native-20-profile.png'),
    );
  });
}

/// Pushes Roboto through every slot the screen actually renders with — the text
/// theme AND the app bar's title style, which `ThemeData` captured from the
/// un-applied text theme when the theme was built.
ThemeData _withRoboto(ThemeData base) {
  final TextTheme text = base.textTheme.apply(fontFamily: 'Roboto');
  return base.copyWith(
    textTheme: text,
    appBarTheme: base.appBarTheme.copyWith(titleTextStyle: text.titleLarge),
    // `textButtonTheme` captured `labelLarge` from the ORIGINAL text theme when
    // the theme was built, so re-applying the family above does not reach it.
    // Missed until decision 11 put the first button on this screen: without
    // this the label falls back to the test font, which draws every glyph as a
    // filled rectangle — and the golden captured "Edit" as a solid blue block.
    textButtonTheme: TextButtonThemeData(
      style: TextButton.styleFrom(
        foregroundColor: BookflowColors.actionBlue,
        textStyle: text.labelLarge,
      ),
    ),
  );
}

class _GoldenProfile implements ProfileRepository {
  const _GoldenProfile();

  @override
  Future<OwnerProfile> fetchMine() async => const OwnerProfile(
    id: '00000000-0000-4000-8000-000000000001',
    firstName: 'dennis',
    lastName: 'mugu',
  );
}

/// The demo salon, so the artefact shows the section populated rather than
/// empty or failed.
class _GoldenBusiness implements BusinessRepository {
  const _GoldenBusiness();

  @override
  Future<BusinessStatus> fetchMine() async => const HasBusiness(
    OwnedBusiness(
      id: '00000000-0000-4000-8000-000000000002',
      name: 'Demo Salon',
      published: false,
    ),
  );

  @override
  Future<OwnedBusiness> rename({required String id, required String name}) =>
      throw UnimplementedError('the golden never renames');

  @override
  Future<OwnedBusiness> create(String name) =>
      throw UnimplementedError('the golden never creates');
}

class _GoldenGateway implements AuthGateway {
  // The entry flow's operations. This fake does not perform them, and a throw
  // says so at the line rather than letting a test pass on a fake success.
  @override
  Future<void> signInWithPassword({
    required String email,
    required String password,
  }) => throw UnimplementedError();

  @override
  Future<void> verifySignupCode({
    required String email,
    required String code,
  }) => throw UnimplementedError();

  @override
  Future<void> resendSignupCode({required String email}) =>
      throw UnimplementedError();

  @override
  SessionStatus get status => SessionStatus.signedIn;

  @override
  Stream<SessionStatus> statusChanges() => const Stream<SessionStatus>.empty();

  @override
  String? currentAccessToken() => 'golden';

  @override
  String? currentEmail() => 'dennismugu7@gmail.com';

  @override
  Future<void> signOut() async {}
}
