/// The owner's own profile, as this feature uses it.
///
/// A view model rather than the generated `Profile`, which ADR-028 permits
/// "only where the generated model is a poor fit". It is a poor fit here for one
/// specific reason: the screen needs **initials**, and the generated model is
/// regenerated wholesale on every schema change (ADR-025), so anything derived
/// hanging off it would be deleted by the next generation. This is the shape
/// this feature owns.
class OwnerProfile {
  const OwnerProfile({
    required this.id,
    required this.firstName,
    required this.lastName,
    this.avatarPath,
  });

  final String id;
  final String firstName;
  final String lastName;

  /// A storage object path, not a URL (ADR-011). Nothing renders it yet — the
  /// avatar is initials until an authorizing endpoint exists to turn a path
  /// into a signed URL.
  final String? avatarPath;

  String get fullName => '$firstName $lastName'.trim();

  /// Two letters, per Styles-Reference.md §7: "bold white two-letter initials".
  ///
  /// `native-20` shows one lowercase letter, which is Generation B and not the
  /// system (ADR-039). Uppercase, first letter of each name.
  ///
  /// Degrades rather than throwing: a one-word name gives one letter, and an
  /// empty name gives an empty string. The API requires both names to be
  /// non-blank (`ck_user_profiles_*_name_present`), so the empty case should be
  /// unreachable — but a widget that throws on unexpected data takes the whole
  /// screen down, and an avatar is not worth that.
  String get initials {
    final String first = _firstLetter(firstName);
    final String last = _firstLetter(lastName);
    return '$first$last';
  }

  static String _firstLetter(String value) {
    final String trimmed = value.trim();
    return trimmed.isEmpty ? '' : trimmed.characters.first.toUpperCase();
  }
}

/// `characters` without the package: this only ever takes the first letter of a
/// Latin-script name (ADR-005 fixes v1 to Latin script), so a code-unit split is
/// sufficient and does not add a dependency for one call.
extension on String {
  Iterable<String> get characters => split('');
}
