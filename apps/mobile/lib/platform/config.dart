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
  });

  /// The values the running app was compiled with.
  factory AppConfig.fromEnvironment() {
    return const AppConfig(
      supabaseUrl: String.fromEnvironment('SUPABASE_URL'),
      supabaseAnonKey: String.fromEnvironment('SUPABASE_ANON_KEY'),
      apiBaseUrl: String.fromEnvironment('API_BASE_URL'),
    );
  }

  /// GoTrue's origin. Used by `supabase_flutter` for authentication ONLY —
  /// see `auth_gateway.dart` for why this is not also the API origin.
  final String supabaseUrl;

  /// The publishable key. Not a credential in the sense that matters.
  final String supabaseAnonKey;

  /// Our own API's origin — `apps/api`. The generated client talks here and
  /// nowhere else.
  final String apiBaseUrl;

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
