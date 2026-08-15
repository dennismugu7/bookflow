import 'package:bookflow/app.dart';
import 'package:bookflow/platform/auth_gateway.dart';
import 'package:bookflow/platform/config.dart';
import 'package:bookflow/platform/providers.dart';
import 'package:bookflow/platform/secure_session_store.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:supabase_flutter/supabase_flutter.dart';

/// Bookflow — the salon owner's app (ADR-001, ADR-015).
///
/// The entry point does three things and no more: read configuration, initialise
/// Supabase, and hand the resulting gateway to the provider graph. Everything
/// else is decided by providers, which is what lets the whole app be built in a
/// test with no platform channels involved.
Future<void> main() async {
  WidgetsFlutterBinding.ensureInitialized();

  final AppConfig config = AppConfig.fromEnvironment();
  final List<String> missing = config.missingKeys();
  if (missing.isNotEmpty) {
    // Fails here rather than at the first request, and names the variables.
    // Mirrors `apps/api/src/platform/config.ts`, which does the same thing for
    // the same reason (ADR-023) — and like that file, it never prints a value.
    throw StateError(
      'Missing build-time configuration: ${missing.join(', ')}. '
      'Pass them with --dart-define, e.g. '
      '--dart-define=API_BASE_URL=http://10.0.2.2:3000',
    );
  }

  await Supabase.initialize(
    url: config.supabaseUrl,
    // `publishableKey`, not the deprecated `anonKey` — the parameter was
    // renamed to match Supabase's newer key format. The value stays the one the
    // rest of this project calls SUPABASE_ANON_KEY (`.env.example`, the API's
    // config, CI), because renaming it here and nowhere else would be worse
    // than a parameter name that no longer matches. Both key formats are
    // accepted by this parameter.
    publishableKey: config.supabaseAnonKey,
    // The whole reason `SecureSessionStore` exists: the default persists the
    // refresh token in SharedPreferences, which is not encrypted.
    authOptions: FlutterAuthClientOptions(localStorage: SecureSessionStore()),
  );

  runApp(
    ProviderScope(
      overrides: <Override>[
        appConfigProvider.overrideWithValue(config),
        authGatewayProvider.overrideWithValue(
          SupabaseAuthGateway(Supabase.instance.client),
        ),
      ],
      child: const BookflowApp(),
    ),
  );
}
