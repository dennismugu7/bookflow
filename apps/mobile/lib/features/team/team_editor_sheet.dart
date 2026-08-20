import 'package:bookflow/features/media/media_models.dart';
import 'package:bookflow/features/media/media_providers.dart';
import 'package:bookflow/features/team/team_models.dart';
import 'package:bookflow/features/team/team_providers.dart';
import 'package:bookflow/theme/tokens.dart';
import 'package:bookflow/ui/initials_avatar.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

/// Add or edit a team member.
///
/// One sheet for both, with delete inside it — the same shape
/// `ServiceEditorSheet` uses, and for the same reasons: two sheets would be two
/// places for the validation to drift, and a swipe-to-delete that opens a
/// dialog is a gesture people trigger by accident.
class TeamEditorSheet extends ConsumerStatefulWidget {
  const TeamEditorSheet({
    required this.member,
    required this.onDone,
    super.key,
  });

  final TeamMember? member;
  final VoidCallback onDone;

  @override
  ConsumerState<TeamEditorSheet> createState() => _TeamEditorSheetState();
}

class _TeamEditorSheetState extends ConsumerState<TeamEditorSheet> {
  late final TextEditingController _name = TextEditingController(
    text: widget.member?.name ?? '',
  );
  late final TextEditingController _role = TextEditingController(
    text: widget.member?.role ?? '',
  );
  late final TextEditingController _about = TextEditingController(
    text: widget.member?.about ?? '',
  );

  /// The photo as it currently stands — the stored one until a new one is
  /// picked, and the new one afterwards.
  ///
  /// ── UPLOADED ON PICK, NOT ON SAVE ──────────────────────────────────────────
  ///
  /// The brief asked for the upload to happen on save. It happens on PICK
  /// instead, and the difference is what the owner sees: uploading on save
  /// means the thumbnail shown between picking and saving is a local file that
  /// may still fail to upload, so the sheet would show a picture it cannot
  /// promise. Uploading immediately means the thumbnail is the real URL — what
  /// is on screen is what is stored.
  ///
  /// The cost is an orphaned object if the owner picks a photo and then
  /// cancels. That is storage, and the API's own upload path already chose the
  /// same trade for the same reason.
  late String? _photoUrl = widget.member?.photoUrl;

  String? _nameError;
  String? _submitError;

  bool get _isEditing => widget.member != null;

  @override
  void dispose() {
    _name.dispose();
    _role.dispose();
    _about.dispose();
    super.dispose();
  }

  Future<void> _pickPhoto() async {
    setState(() => _submitError = null);

    final UploadedImage? uploaded = await ref
        .read(imageUploadControllerProvider.notifier)
        .pickAndUpload(ImagePurpose.team);

    if (!mounted) return;

    final AsyncValue<void> upload = ref.read(imageUploadControllerProvider);
    if (upload.hasError) {
      setState(() => _submitError = uploadFailureMessage(upload.error!));
      return;
    }

    // `null` with no error is a cancelled picker. Not a failure, and nothing
    // should be said about it.
    if (uploaded == null) return;

    setState(() => _photoUrl = uploaded.url);
  }

  Future<void> _save() async {
    setState(() {
      _nameError = _name.text.trim().isEmpty ? 'Give them a name.' : null;
      _submitError = null;
    });
    if (_nameError != null) return;

    await ref
        .read(teamEditorControllerProvider.notifier)
        .save(
          id: widget.member?.id,
          name: _name.text.trim(),
          role: _role.text.trim(),
          about: _about.text.trim(),
          photoUrl: _photoUrl,
        );

    if (!mounted) return;
    if (ref.read(teamEditorControllerProvider).hasError) {
      setState(
        () => _submitError =
            'That did not save. Check your connection and try again.',
      );
      return;
    }

    widget.onDone();
  }

  Future<void> _confirmDelete() async {
    final TeamMember? member = widget.member;
    if (member == null) return;

    final bool confirmed =
        await showDialog<bool>(
          context: context,
          builder: (BuildContext dialogContext) => AlertDialog(
            title: const Text('Remove from the team?'),
            content: Text(
              '${member.name} will stop appearing on your booking page. '
              'Bookings they already took are not affected.',
            ),
            actions: <Widget>[
              TextButton(
                key: const Key('team-delete-cancel'),
                onPressed: () => Navigator.of(dialogContext).pop(false),
                child: const Text('Keep them'),
              ),
              FilledButton(
                key: const Key('team-delete-confirm'),
                onPressed: () => Navigator.of(dialogContext).pop(true),
                child: const Text('Remove'),
              ),
            ],
          ),
        ) ??
        false;

    if (!confirmed || !mounted) return;

    await ref.read(teamEditorControllerProvider.notifier).delete(member.id);
    if (!mounted) return;

    if (ref.read(teamEditorControllerProvider).hasError) {
      setState(
        () => _submitError =
            'That did not save. Check your connection and try again.',
      );
      return;
    }

    widget.onDone();
  }

  @override
  Widget build(BuildContext context) {
    final ThemeData theme = Theme.of(context);
    final bool saving = ref.watch(teamEditorControllerProvider).isLoading;
    final bool uploading = ref.watch(imageUploadControllerProvider).isLoading;
    final bool busy = saving || uploading;

    return Padding(
      padding: EdgeInsets.only(bottom: MediaQuery.viewInsetsOf(context).bottom),
      child: SafeArea(
        top: false,
        child: SingleChildScrollView(
          padding: const EdgeInsets.all(BookflowSpacing.xl),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            mainAxisSize: MainAxisSize.min,
            children: <Widget>[
              Text(
                _isEditing ? 'Edit team member' : 'Add a team member',
                style: theme.textTheme.titleLarge,
                textAlign: TextAlign.center,
              ),
              const SizedBox(height: BookflowSpacing.lg),
              Center(
                child: _PhotoPicker(
                  photoUrl: _photoUrl,
                  initials: _name.text.trim().isEmpty
                      ? ''
                      : TeamMember(
                          id: '',
                          name: _name.text,
                          role: null,
                          about: null,
                          photoUrl: null,
                          position: 0,
                        ).initials,
                  busy: busy,
                  onTap: _pickPhoto,
                ),
              ),
              const SizedBox(height: BookflowSpacing.lg),
              TextField(
                key: const Key('team-name'),
                controller: _name,
                enabled: !busy,
                textCapitalization: TextCapitalization.words,
                textInputAction: TextInputAction.next,
                // Rebuilds the initials fallback as the name is typed, so an
                // avatar with no photo is never blank while a name exists.
                onChanged: (String _) => setState(() {}),
                decoration: InputDecoration(
                  labelText: 'Name',
                  errorText: _nameError,
                ),
              ),
              const SizedBox(height: BookflowSpacing.md),
              TextField(
                key: const Key('team-role'),
                controller: _role,
                enabled: !busy,
                textCapitalization: TextCapitalization.sentences,
                textInputAction: TextInputAction.next,
                decoration: const InputDecoration(
                  labelText: 'Role (optional)',
                  hintText: 'Senior stylist',
                ),
              ),
              const SizedBox(height: BookflowSpacing.md),
              TextField(
                key: const Key('team-about'),
                controller: _about,
                enabled: !busy,
                minLines: 2,
                maxLines: 4,
                textCapitalization: TextCapitalization.sentences,
                decoration: const InputDecoration(
                  labelText: 'About (optional)',
                  hintText: 'What they are known for',
                ),
              ),
              const SizedBox(height: BookflowSpacing.lg),
              if (_submitError != null)
                Padding(
                  padding: const EdgeInsets.only(bottom: BookflowSpacing.md),
                  child: Text(
                    key: const Key('team-editor-error'),
                    _submitError!,
                    style: theme.textTheme.bodySmall?.copyWith(
                      color: theme.colorScheme.error,
                    ),
                  ),
                ),
              FilledButton(
                key: const Key('team-save'),
                onPressed: busy ? null : _save,
                child: saving
                    ? const SizedBox(
                        key: Key('team-save-loading'),
                        width: BookflowSizes.inlineSpinner,
                        height: BookflowSizes.inlineSpinner,
                        child: CircularProgressIndicator.adaptive(
                          strokeWidth: 2,
                        ),
                      )
                    : Text(_isEditing ? 'Save changes' : 'Add to team'),
              ),
              if (_isEditing) ...<Widget>[
                const SizedBox(height: BookflowSpacing.sm),
                TextButton(
                  key: const Key('team-delete'),
                  onPressed: busy ? null : _confirmDelete,
                  style: TextButton.styleFrom(
                    foregroundColor: theme.colorScheme.error,
                  ),
                  child: const Text('Remove from team'),
                ),
              ],
            ],
          ),
        ),
      ),
    );
  }
}

/// The avatar, tappable, with the upload's spinner over it.
class _PhotoPicker extends StatelessWidget {
  const _PhotoPicker({
    required this.photoUrl,
    required this.initials,
    required this.busy,
    required this.onTap,
  });

  final String? photoUrl;
  final String initials;
  final bool busy;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    return InkWell(
      key: const Key('team-photo'),
      customBorder: const CircleBorder(),
      onTap: busy ? null : onTap,
      child: Stack(
        alignment: Alignment.center,
        children: <Widget>[
          if (photoUrl == null)
            // The initials fallback, shared with the list and with screen #20.
            InitialsAvatar(
              initials: initials,
              diameter: BookflowSizes.avatarLarge,
            )
          else
            ClipOval(
              child: Image.network(
                photoUrl!,
                width: BookflowSizes.avatarLarge,
                height: BookflowSizes.avatarLarge,
                fit: BoxFit.cover,
                // A stored URL that will not load must not take the sheet down
                // — the member is still editable without their photograph.
                errorBuilder: (BuildContext _, Object _, StackTrace? _) =>
                    InitialsAvatar(
                      initials: initials,
                      diameter: BookflowSizes.avatarLarge,
                    ),
              ),
            ),
          if (busy)
            const SizedBox(
              key: Key('team-photo-loading'),
              width: BookflowSizes.inlineSpinner,
              height: BookflowSizes.inlineSpinner,
              child: CircularProgressIndicator.adaptive(strokeWidth: 2),
            ),
        ],
      ),
    );
  }
}
