/// Someone a client can book with.
///
/// ══ ONE NAME FIELD (ADR-005) ════════════════════════════════════════════════
///
/// A team member is a CONTENT record in a Latin-script-only market, and ADR-005
/// gives content records one name field. The two-field rule in that same ADR is
/// about the owner's own account — `OwnerProfile` has `firstName`/`lastName`
/// for exactly that reason, and copying it here would be reading the ADR
/// backwards.
class TeamMember {
  const TeamMember({
    required this.id,
    required this.name,
    required this.role,
    required this.about,
    required this.photoUrl,
    required this.position,
  });

  final String id;
  final String name;

  /// A JOB TITLE — "Senior stylist". **Not an authorization role**, which is
  /// `memberships.role` and lives nowhere near this app. The field is called
  /// `role` on both sides of the wire and the name is the whole risk, which is
  /// why the API's column comment says the same thing.
  final String? role;

  final String? about;
  final String? photoUrl;
  final int position;

  /// For `InitialsAvatar` when there is no photograph.
  ///
  /// One field, so the initials come from the first letters of the first two
  /// words rather than from a first and last name that do not exist here.
  String get initials {
    final List<String> words = name
        .trim()
        .split(RegExp(r'\s+'))
        .where((String word) => word.isNotEmpty)
        .toList();

    if (words.isEmpty) return '';
    if (words.length == 1) return words.first.characters(1);
    return '${words.first.characters(1)}${words[1].characters(1)}';
  }
}

extension on String {
  /// The first [count] characters, uppercased. Guards a name that is shorter
  /// than the slice — a one-letter name is a real name.
  String characters(int count) =>
      substring(0, length < count ? length : count).toUpperCase();
}
