/// Client configuration, supplied at build time.
///
/// `--dart-define`, not a `.env` file read at runtime: a Flutter app ships to a
/// device and anything it reads at runtime has to be bundled with it, so a
/// "secret" file would be a secret handed to every user. Compile-time values are
/// at least honest about that.
///
/// **Nothing here is a secret**, and nothing here may become one. The Supabase
/// anon key is publishable by design (ADR-023: "Safe to expose; carries no
/// privileges beyond RLS") and the API origin is public. **The service-role key
/// must never appear in this file or anywhere else in this package** — it
/// bypasses RLS entirely (spike 001/C7), it lives only in the API process, and
/// an app binary is not a place a secret can be kept.
library;

/// Reads the build-time environment once.
///
/// Constructed rather than static so a test can build a config without any
/// `--dart-define` at all, which is what keeps the widget tests hermetic.
class AppConfig {
  const AppConfig({
    required this.supabaseUrl,
    required this.supabaseAnonKey,
    required this.apiBaseUrl,
    this.webBaseUrl = defaultWebBaseUrl,
  });

  /// The values the running app was compiled with.
  factory AppConfig.fromEnvironment() {
    return const AppConfig(
      supabaseUrl: String.fromEnvironment('SUPABASE_URL'),
      supabaseAnonKey: String.fromEnvironment('SUPABASE_ANON_KEY'),
      apiBaseUrl: String.fromEnvironment('API_BASE_URL'),
      webBaseUrl: String.fromEnvironment(
        'WEB_BASE_URL',
        defaultValue: defaultWebBaseUrl,
      ),
    );
  }

  /// ══ THE CLIENT WEB APP DOES NOT EXIST YET, AND THIS SAYS SO ══════════════
  ///
  /// ADR-001 builds it last, and `CLAUDE.md` forbids creating `apps/web/` until
  /// the owner app can configure a real salon. So a booking link built from
  /// this points nowhere — **on purpose, and visibly.**
  ///
  /// `.invalid` is reserved by RFC 2606 and is guaranteed never to resolve.
  /// That is the whole reason it was chosen over a plausible-looking
  /// placeholder: an owner who taps this link gets an immediate, unambiguous
  /// failure rather than somebody else's parked domain, and nobody can register
  /// it out from under us.
  ///
  /// **One constant to change when the web app deploys**, and it is
  /// overridable by `--dart-define=WEB_BASE_URL=...` in the meantime so a
  /// staging build can point at a real host without a code change.
  static const String defaultWebBaseUrl =
      'https://bookflow-staging-web.invalid';

  /// GoTrue's origin. Used by `supabase_flutter` for authentication ONLY —
  /// see `auth_gateway.dart` for why this is not also the API origin.
  final String supabaseUrl;

  /// The publishable key. Not a credential in the sense that matters.
  final String supabaseAnonKey;

  /// Our own API's origin — `apps/api`. The generated client talks here and
  /// nowhere else.
  final String apiBaseUrl;

  /// The client booking site's origin. A salon's public page is this plus
  /// `/` plus its handle (ADR-021).
  ///
  /// **Not in `missingKeys()`**, unlike the three above. Those three are
  /// required for the app to function at all and a build without them should
  /// fail loudly; this one has a working default and an app with no booking
  /// site is an app that cannot share a link — which is a missing feature, not
  /// a broken build.
  final String webBaseUrl;

  /// The public booking page for [handle].
  ///
  /// Built here rather than in a widget so there is one place the shape of a
  /// booking URL is decided, and one place to change when the web app grows a
  /// path prefix.
  String bookingLinkFor(String handle) =>
      '${webBaseUrl.replaceAll(RegExp(r'/+$'), '')}/$handle';

  /// Whether every required value is present.
  ///
  /// Checked and reported rather than asserted: a release build with a missing
  /// define should fail with a sentence a human can act on, not with an empty
  /// string that turns into a confusing network error three screens later.
  List<String> missingKeys() {
    return <String>[
      if (supabaseUrl.isEmpty) 'SUPABASE_URL',
      if (supabaseAnonKey.isEmpty) 'SUPABASE_ANON_KEY',
      if (apiBaseUrl.isEmpty) 'API_BASE_URL',
    ];
  }
}
