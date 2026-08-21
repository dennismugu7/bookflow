import 'package:bookflow/features/business/business_section.dart';
import 'package:bookflow/features/profile/profile_models.dart';
import 'package:bookflow/features/profile/profile_providers.dart';
import 'package:bookflow/platform/providers.dart';
import 'package:bookflow/theme/tokens.dart';
import 'package:bookflow/ui/async_value_view.dart';
import 'package:bookflow/ui/initials_avatar.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

/// Screen #20 — My Profile Details. ADR-032's "one true page" for Phase 3.
///
/// ══ IT WILL NOT MATCH ITS OWN SCREENSHOT, AND THAT IS THE DECISION ══════════
///
/// `native-20` is Generation B (ADR-039) — a violet "Edit" link, a pink avatar
/// with one lowercase initial, pure black headings. Generation B is not
/// Bookflow's design system, so **its layout is taken and its colour is not**:
///
///   FROM the screenshot: the read-only card, the field order (first name, last
///   name, email), labels above values, the divider under the name, the avatar
///   centred above the name, the back arrow and "My profile" heading, the copy.
///
///   FROM the tokens:     a BLUE Edit affordance, a GREEN avatar with TWO
///                        uppercase initials, #3A3A3A text.
///
/// Recorded as deviation 8 in `docs/analysis/08-design-deviations.md`, so a
/// reviewer comparing the built screen to the design does not raise it as a bug.
///
/// ── THE EDIT LINK IS BUILT NOW; THE PENCIL BADGE IS STILL NOT ───────────────
///
/// This comment used to say neither was rendered, "deliberately … There is no
/// `PATCH /v1/me` and no avatar upload endpoint". **One of those two is no
/// longer true**: `PATCH /v1/me` exists, so the names are editable and the Edit
/// link does what the design draws it doing.
///
/// **The avatar's pencil badge stays absent**, and for the unchanged half of the
/// original reasoning: there is no avatar upload. `PATCH /v1/me` does not write
/// `avatar_path` — a route that wrote null there would ERASE the column the
/// upload will need — and a badge that opened a picker leading nowhere would be
/// the promise the app does not keep.
///
/// The email stays read-only. It belongs to GoTrue (ADR-027), and changing it is
/// a verification flow rather than a field edit.
class ProfileScreen extends ConsumerWidget {
  const ProfileScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final AsyncValue<OwnerProfile> profile = ref.watch(myProfileProvider);

    return Scaffold(
      appBar: AppBar(
        // The back arrow of `native-20`, and it now goes back.
        //
        // It used to sign out, with a comment saying it did so because "there
        // is one screen behind the shell — so it signs out instead of
        // pretending to navigate". **That reasoning expired with decision 12**:
        // screen #17 is behind this one now, and sign-out moved to its Log out
        // row. That comment was the marker for this change.
        leading: IconButton(
          key: const Key('profile-back'),
          icon: const Icon(Icons.arrow_back),
          onPressed: () => context.pop(),
          tooltip: 'Back',
        ),
        title: const Text('My profile'),
      ),
      body: SafeArea(
        child: AsyncValueView<OwnerProfile>(
          value: profile,
          onRetry: () => ref.invalidate(myProfileProvider),
          data: (OwnerProfile value) => _ProfileCard(profile: value),
        ),
      ),
    );
  }
}

class _ProfileCard extends ConsumerStatefulWidget {
  const _ProfileCard({required this.profile});

  final OwnerProfile profile;

  @override
  ConsumerState<_ProfileCard> createState() => _ProfileCardState();
}

class _ProfileCardState extends ConsumerState<_ProfileCard> {
  bool _editing = false;

  late final TextEditingController _firstName = TextEditingController(
    text: widget.profile.firstName,
  );
  late final TextEditingController _lastName = TextEditingController(
    text: widget.profile.lastName,
  );

  @override
  void dispose() {
    _firstName.dispose();
    _lastName.dispose();
    super.dispose();
  }

  bool get _complete =>
      _firstName.text.trim().isNotEmpty && _lastName.text.trim().isNotEmpty;

  Future<void> _save() async {
    await ref
        .read(renameProfileControllerProvider.notifier)
        .rename(
          firstName: _firstName.text.trim(),
          lastName: _lastName.text.trim(),
        );

    // Stays in edit mode on failure so the typed values and the error are both
    // still there — the same shape the Business section uses.
    if (!ref.read(renameProfileControllerProvider).hasError && mounted) {
      setState(() => _editing = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final ThemeData theme = Theme.of(context);
    final OwnerProfile profile = widget.profile;
    final AsyncValue<void> submission = ref.watch(
      renameProfileControllerProvider,
    );
    final bool inFlight = submission.isLoading;

    return SingleChildScrollView(
      // MEASURED at 32.3dp in `native-20`; `xl` is 32.
      padding: const EdgeInsets.all(BookflowSpacing.xl),
      child: Card(
        child: Padding(
          // MEASURED at 22dp; `lg` is 24, and `tokens.dart` records why the
          // measured value was not adopted.
          padding: const EdgeInsets.all(BookflowSpacing.lg),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: <Widget>[
              // No pencil badge. See the class comment: there is no avatar
              // upload, and a badge opening a picker that led nowhere would be
              // exactly the promise this screen was written to avoid.
              _Avatar(initials: profile.initials),
              const SizedBox(height: BookflowSpacing.md),
              Text(
                profile.fullName,
                style: theme.textTheme.titleLarge,
                textAlign: TextAlign.center,
              ),
              const SizedBox(height: BookflowSpacing.lg),
              const Divider(),
              const SizedBox(height: BookflowSpacing.lg),

              if (!_editing) ...<Widget>[
                Row(
                  children: <Widget>[
                    Expanded(
                      child: Text(
                        'Personal details',
                        style: theme.textTheme.bodyMedium?.copyWith(
                          fontWeight: FontWeight.w700,
                        ),
                      ),
                    ),
                    TextButton(
                      key: const Key('profile-edit'),
                      onPressed: () {
                        // ── RESEEDED ON EVERY TAP, NOT ONLY AT CONSTRUCTION ──
                        //
                        // The same fix the Business section got. `widget.profile`
                        // MOVES: a save invalidates the read and this widget
                        // rebuilds with the stored row. Without this, an owner
                        // who saved and pressed Edit again would see the values
                        // as of page load — including anything the server
                        // trimmed — and saving would write them back.
                        //
                        // It also discards whatever a cancelled edit left.
                        _firstName.text = profile.firstName;
                        _lastName.text = profile.lastName;
                        setState(() => _editing = true);
                      },
                      child: const Text('Edit'),
                    ),
                  ],
                ),
                const SizedBox(height: BookflowSpacing.sm),
                // Field order straight from the screenshot.
                _Field(label: 'First name', value: profile.firstName),
                const SizedBox(height: BookflowSpacing.md),
                _Field(label: 'Last name', value: profile.lastName),
              ] else ...<Widget>[
                TextField(
                  key: const Key('profile-first-name-field'),
                  controller: _firstName,
                  // Disabled rather than removed while saving: removing it would
                  // drop the typed text, which is what this shape protects.
                  enabled: !inFlight,
                  textCapitalization: TextCapitalization.words,
                  decoration: const InputDecoration(labelText: 'First name'),
                  onChanged: (_) => setState(() {}),
                ),
                const SizedBox(height: BookflowSpacing.md),
                TextField(
                  key: const Key('profile-last-name-field'),
                  controller: _lastName,
                  enabled: !inFlight,
                  textCapitalization: TextCapitalization.words,
                  decoration: const InputDecoration(labelText: 'Last name'),
                  onChanged: (_) => setState(() {}),
                ),
                const SizedBox(height: BookflowSpacing.md),

                // Not `ErrorView`: it would replace the card and take the typed
                // values with it, and say "something went wrong" where the truth
                // is more specific. The form stays mounted.
                if (submission.hasError)
                  Padding(
                    padding: const EdgeInsets.only(bottom: BookflowSpacing.md),
                    child: Text(
                      key: const Key('profile-rename-error'),
                      'That did not save. Check your connection and try again.',
                      style: theme.textTheme.bodySmall?.copyWith(
                        color: theme.colorScheme.error,
                      ),
                    ),
                  ),

                FilledButton(
                  key: const Key('profile-save'),
                  // Both names are required by `PATCH /v1/me`, so an empty one
                  // is refused here rather than sent to be refused there.
                  onPressed: (!_complete || inFlight) ? null : _save,
                  child: inFlight
                      ? const SizedBox(
                          key: Key('profile-rename-loading'),
                          width: BookflowSizes.inlineSpinner,
                          height: BookflowSizes.inlineSpinner,
                          child: CircularProgressIndicator.adaptive(
                            strokeWidth: 2,
                          ),
                        )
                      : const Text('Save'),
                ),
                const SizedBox(height: BookflowSpacing.sm),
                TextButton(
                  key: const Key('profile-cancel'),
                  onPressed: inFlight
                      ? null
                      : () => setState(() => _editing = false),
                  child: const Text('Cancel'),
                ),
              ],

              const SizedBox(height: BookflowSpacing.md),
              // Not on `OwnerProfile`: `GET /v1/me` does not return the email.
              // It lives on `auth.users`, which GoTrue owns (ADR-027), and the
              // API's Profile schema deliberately does not mirror it. Shown from
              // the session instead — see `_Field`'s sibling below.
              //
              // **Outside the edit branch on purpose**: it is read-only in both
              // states, and putting it inside would draw it twice.
              const _EmailField(),
              const SizedBox(height: BookflowSpacing.lg),
              const Divider(),
              const SizedBox(height: BookflowSpacing.lg),
              // Decision 11: screen #20 widened to the "Personal/Business
              // Information Management page" its own routing text already names
              // (`DD-Bookflow-Native.md:973`). Beneath the personal fields, and
              // reading its own provider — see `BusinessSection`.
              const BusinessSection(),
            ],
          ),
        ),
      ),
    );
  }
}

/// Green circle, two white uppercase initials (Styles-Reference §2 and §7).
///
/// The circle itself is `InitialsAvatar` in `ui/`, shared with screens #12 and
/// #17. This wrapper keeps the `Center` and the larger text style, which are
/// this screen's layout rather than the element's.
class _Avatar extends StatelessWidget {
  const _Avatar({required this.initials});

  final String initials;

  @override
  Widget build(BuildContext context) {
    return Center(
      child: InitialsAvatar(
        initials: initials,
        diameter: BookflowSizes.avatarLarge,
        textStyle: Theme.of(context).textTheme.titleLarge,
      ),
    );
  }
}

/// A bold label over its value, as drawn.
class _Field extends StatelessWidget {
  const _Field({required this.label, required this.value, this.italic = false});

  final String label;
  final String value;

  /// Styles-Reference §3: "Email addresses throughout the app … are consistently
  /// styled in italic, distinguishing them from names and phone numbers."
  final bool italic;

  @override
  Widget build(BuildContext context) {
    final ThemeData theme = Theme.of(context);

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: <Widget>[
        Text(
          label,
          style: theme.textTheme.bodyMedium?.copyWith(
            fontWeight: FontWeight.w700,
          ),
        ),
        const SizedBox(height: BookflowSpacing.xs),
        Text(
          value,
          style: italic
              ? theme.textTheme.bodyMedium?.copyWith(
                  fontStyle: FontStyle.italic,
                )
              : theme.textTheme.bodyMedium,
        ),
      ],
    );
  }
}

/// The email, read from the session rather than from our API.
///
/// `GET /v1/me` returns the profile our database owns — first name, last name,
/// avatar path — and **not the email**, which lives on `auth.users` and belongs
/// to GoTrue (ADR-027). The screenshot shows it, so it is shown; the session
/// already holds it and no endpoint needs to change.
class _EmailField extends ConsumerWidget {
  const _EmailField();

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final String email = ref.watch(sessionEmailProvider) ?? '';
    return _Field(label: 'Email', value: email, italic: true);
  }
}
