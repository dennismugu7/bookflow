import 'package:flutter_secure_storage/flutter_secure_storage.dart';
import 'package:supabase_flutter/supabase_flutter.dart';

/// Where the session lives on the device.
///
/// ══ WHY THIS CLASS EXISTS AT ALL ════════════════════════════════════════════
///
/// `supabase_flutter` persists the session in **SharedPreferences** by default.
/// On Android that is an XML file in the app's data directory; on iOS it is a
/// plist. Neither is encrypted, and on a rooted or jailbroken device both are
/// readable. What is stored there is not a preference — it is a **refresh
/// token**, which ADR-017 makes long-lived and which can mint a new access token
/// for as long as it has not been revoked.
///
/// So the default would put the longest-lived credential in the app in the least
/// protected store it has. This replaces it with the platform keystore —
/// Keychain on iOS, EncryptedSharedPreferences over the Android Keystore — which
/// is what `flutter_secure_storage` wraps.
///
/// ── WHAT THIS DOES AND DOES NOT BUY ─────────────────────────────────────────
///
/// It raises the cost of reading the token off a device someone already has. It
/// does **not** defend against a compromised OS, a hooked process, or a user who
/// installs a malicious keyboard. ADR-017's real bound is elsewhere and is
/// unchanged: an access token is valid for one hour, and logout revokes the
/// refresh token so the session cannot be extended past it.
class SecureSessionStore extends LocalStorage {
  SecureSessionStore({FlutterSecureStorage? storage})
    : _storage = storage ?? const FlutterSecureStorage();

  final FlutterSecureStorage _storage;

  /// The key `supabase_flutter` uses for the persisted session.
  static const String _sessionKey = 'bookflow.supabase.session';

  @override
  Future<void> initialize() async {
    // Nothing to do: the platform stores are created on first write. Declared
    // rather than omitted because the base class requires it, and an empty
    // override with no explanation reads like something was forgotten.
  }

  @override
  Future<String?> accessToken() => _storage.read(key: _sessionKey);

  @override
  Future<bool> hasAccessToken() => _storage.containsKey(key: _sessionKey);

  @override
  Future<void> persistSession(String persistSessionString) {
    return _storage.write(key: _sessionKey, value: persistSessionString);
  }

  @override
  Future<void> removePersistedSession() => _storage.delete(key: _sessionKey);
}
