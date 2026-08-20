import 'package:bookflow/features/business/business_models.dart';
import 'package:bookflow/features/business/business_providers.dart';
import 'package:bookflow/features/media/media_models.dart';
import 'package:bookflow/features/media/media_providers.dart';
import 'package:bookflow/theme/tokens.dart';
import 'package:bookflow/ui/async_value_view.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

/// Screen #20's business section (decision 11).
///
/// `DD-Bookflow-Native.md:962` already calls #20's destination the
/// "Personal/Business Information Management page" — screen #17's Profile row.
/// This is the Business half: the name, and an edit affordance that renames it.
///
/// **This said `:973` until 2026-08-18, copied from `00-frame.md` decision 11,
/// which said the same.** The quote was right and the pointer was wrong: `:973`
/// is the Settings action, a different row of the same menu. Both are corrected;
/// the decision rests on the quote and is unaffected.
///
/// ── WHY IT SITS BENEATH THE PERSONAL SECTION ────────────────────────────────
///
/// Screen #20 carries K75's dead `Edit` control on the personal fields — drawn
/// in the design, deliberately not built, because nothing it could do exists.
/// So this slice ships a screen whose business section is editable and whose
/// personal section is not, which is odd and is decision 11's recorded cost.
///
/// The section is visually subordinate — beneath, under its own heading — so
/// the working affordance reads as belonging to the business block rather than
/// as an inconsistency inside one card.
///
/// ── ITS TWO READS ARE INDEPENDENT OF THE PROFILE'S ──────────────────────────
///
/// This watches `myBusinessProvider`; the card above watches
/// `myProfileProvider`. Deliberately separate: one failing must not blank the
/// other, and a business that fails to load should not take the owner's name
/// off the screen.
class BusinessSection extends ConsumerWidget {
  const BusinessSection({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final AsyncValue<BusinessStatus> business = ref.watch(myBusinessProvider);
    final ThemeData theme = Theme.of(context);

    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: <Widget>[
        Text(
          'Business',
          style: theme.textTheme.titleMedium?.copyWith(
            fontWeight: FontWeight.w700,
          ),
        ),
        const SizedBox(height: BookflowSpacing.md),
        // The READ is a whole-section AsyncValue and may own this space — there
        // is nothing to preserve while it loads. The SUBMISSION is not; see
        // `_BusinessName` below.
        AsyncValueView<BusinessStatus>(
          value: business,
          onRetry: () => ref.invalidate(myBusinessProvider),
          data: (BusinessStatus status) => switch (status) {
            // Not reachable from this screen in this slice — an owner with no
            // business is routed to setup, not here. Handled anyway because
            // `BusinessStatus` is sealed and the compiler requires it, which is
            // the point of sealing it.
            NoBusinessYet() => const EmptyStateView(
              message: 'No business yet.',
            ),
            HasBusiness(business: final OwnedBusiness value) => _BusinessName(
              business: value,
            ),
          },
        ),
      ],
    );
  }
}

/// The name, and the rename.
///
/// ── LOADING AND ERROR ARE PROPERTIES OF THE SUBMISSION, NOT OF THE SCREEN ───
///
/// `ErrorView` is deliberately not used for a failed rename. It replaces
/// whatever it is given and offers a retry — which would discard what the owner
/// typed, and say "Something went wrong" where the truth is more specific.
///
/// So the submission's three states are consumed here, inside the section: the
/// field stays mounted with its text intact, the control shows progress, and a
/// failure leaves both usable so the owner can simply press save again.
class _BusinessName extends ConsumerStatefulWidget {
  const _BusinessName({required this.business});

  final OwnedBusiness business;

  @override
  ConsumerState<_BusinessName> createState() => _BusinessNameState();
}

class _BusinessNameState extends ConsumerState<_BusinessName> {
  late final TextEditingController _controller = TextEditingController(
    text: widget.business.name,
  );

  /// ══ THE IDENTITY FIELDS CANNOT BE PREFILLED, AND THE FORM SAYS SO ═════════
  ///
  /// `GET /v1/me/business` returns `{id, name, published}` and nothing else, so
  /// there is no stored tagline, about, category, address or maps link to put
  /// in these controllers. They start empty on every visit even when the salon
  /// has all five set.
  ///
  /// **Which is why blank means "leave unchanged" rather than "clear"** —
  /// `business_repository.dart` sends only the fields that were filled in. The
  /// helper line under the form tells the owner that, because a form that
  /// silently ignores its own blank fields is worse than one that explains it.
  ///
  /// One line in the API's `businessSchema` fixes both halves at once.
  final TextEditingController _tagline = TextEditingController();
  final TextEditingController _about = TextEditingController();
  final TextEditingController _category = TextEditingController();
  final TextEditingController _address = TextEditingController();
  final TextEditingController _mapsUrl = TextEditingController();

  bool _editing = false;
  String? _mapsError;

  /// Set when a banner is uploaded in this session. The stored one cannot be
  /// read back either, for the same reason as the text fields.
  String? _bannerUrl;

  @override
  void dispose() {
    _controller.dispose();
    _tagline.dispose();
    _about.dispose();
    _category.dispose();
    _address.dispose();
    _mapsUrl.dispose();
    super.dispose();
  }

  /// ── LOOSE, ON PURPOSE ──────────────────────────────────────────────────────
  ///
  /// A maps link is rendered as a link by the client web app and parsed by
  /// nothing, so the only mistake worth catching is an owner pasting something
  /// that is plainly not one. Requiring `maps` or `goo.gl` catches the common
  /// paste-the-wrong-thing case; anything stricter would reject a valid short
  /// link from a provider nobody anticipated.
  bool _mapsLinkLooksValid(String value) {
    if (value.isEmpty) return true;
    final String lower = value.toLowerCase();
    return lower.contains('maps') || lower.contains('goo.gl');
  }

  Future<void> _pickBanner() async {
    final UploadedImage? uploaded = await ref
        .read(imageUploadControllerProvider.notifier)
        .pickAndUpload(ImagePurpose.banner);

    if (!mounted) return;
    // A cancelled picker returns null with no error and must say nothing.
    if (uploaded == null) return;

    setState(() => _bannerUrl = uploaded.url);
  }

  Future<void> _save() async {
    setState(() {
      _mapsError = _mapsLinkLooksValid(_mapsUrl.text.trim())
          ? null
          : 'That doesn’t look like a Maps link';
    });
    if (_mapsError != null) return;

    await ref
        .read(renameBusinessControllerProvider.notifier)
        .rename(
          id: widget.business.id,
          name: _controller.text,
          tagline: _tagline.text.trim(),
          about: _about.text.trim(),
          category: _category.text.trim(),
          address: _address.text.trim(),
          mapsUrl: _mapsUrl.text.trim(),
        );

    // Stay in edit mode on failure so the typed values and the error are both
    // still there.
    if (!ref.read(renameBusinessControllerProvider).hasError && mounted) {
      setState(() => _editing = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final ThemeData theme = Theme.of(context);
    final AsyncValue<void> submission = ref.watch(
      renameBusinessControllerProvider,
    );
    final bool inFlight = submission.isLoading;

    if (!_editing) {
      return Row(
        children: <Widget>[
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: <Widget>[
                Text(
                  'Business name',
                  style: theme.textTheme.bodyMedium?.copyWith(
                    fontWeight: FontWeight.w700,
                  ),
                ),
                const SizedBox(height: BookflowSpacing.xs),
                Text(widget.business.name, style: theme.textTheme.bodyMedium),
              ],
            ),
          ),
          TextButton(
            key: const Key('business-edit'),
            onPressed: () {
              _controller.text = widget.business.name;
              setState(() => _editing = true);
            },
            child: const Text('Edit'),
          ),
        ],
      );
    }

    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: <Widget>[
        TextField(
          key: const Key('business-name-field'),
          controller: _controller,
          // Disabled rather than removed while saving: removing it would drop
          // the typed text, which is the thing this whole shape protects.
          enabled: !inFlight,
          decoration: const InputDecoration(labelText: 'Business name'),
        ),
        const SizedBox(height: BookflowSpacing.md),
        TextField(
          key: const Key('business-tagline-field'),
          controller: _tagline,
          enabled: !inFlight,
          decoration: const InputDecoration(
            labelText: 'Tagline (optional)',
            hintText: 'Your business, in a nutshell',
          ),
        ),
        const SizedBox(height: BookflowSpacing.md),
        TextField(
          key: const Key('business-about-field'),
          controller: _about,
          enabled: !inFlight,
          minLines: 3,
          maxLines: 6,
          decoration: const InputDecoration(
            labelText: 'About (optional)',
            hintText: 'Tell your story',
          ),
        ),
        const SizedBox(height: BookflowSpacing.md),
        TextField(
          key: const Key('business-category-field'),
          controller: _category,
          enabled: !inFlight,
          decoration: const InputDecoration(
            labelText: 'Category (optional)',
            hintText: 'Salon, barbershop, spa',
          ),
        ),
        const SizedBox(height: BookflowSpacing.md),
        TextField(
          key: const Key('business-address-field'),
          controller: _address,
          enabled: !inFlight,
          minLines: 2,
          maxLines: 3,
          decoration: const InputDecoration(labelText: 'Address (optional)'),
        ),
        const SizedBox(height: BookflowSpacing.md),
        TextField(
          key: const Key('business-maps-field'),
          controller: _mapsUrl,
          enabled: !inFlight,
          keyboardType: TextInputType.url,
          autocorrect: false,
          decoration: InputDecoration(
            labelText: 'Google Maps link (optional)',
            errorText: _mapsError,
          ),
        ),
        const SizedBox(height: BookflowSpacing.md),
        _BannerPicker(bannerUrl: _bannerUrl, onPick: _pickBanner),
        const SizedBox(height: BookflowSpacing.md),
        // The form is honest about what it cannot show. See the note on the
        // controllers: these five fields cannot be read back yet, so a blank
        // one means "leave it as it is" and an owner who expected to see their
        // tagline needs to be told why it is not there.
        Text(
          'Leave a field blank to keep what is already saved. Saved details are '
          'not shown back here yet.',
          key: const Key('business-blank-note'),
          style: theme.textTheme.bodySmall,
        ),
        const SizedBox(height: BookflowSpacing.md),
        // The error state. Not `ErrorView` — see the class comment.
        if (submission.hasError)
          Padding(
            padding: const EdgeInsets.only(bottom: BookflowSpacing.md),
            child: Text(
              key: const Key('business-rename-error'),
              'That name could not be saved. Check your connection and try again.',
              style: theme.textTheme.bodySmall?.copyWith(
                color: theme.colorScheme.error,
              ),
            ),
          ),
        // Stacked and full-width rather than a trailing Row. Not a layout
        // preference: `app_theme.dart` gives `FilledButton` a
        // `Size.fromHeight` minimum, which is an INFINITE width — the design
        // system's buttons are full-width by construction. Putting one in a
        // Row hands it unbounded horizontal constraints and it throws
        // "BoxConstraints forces an infinite width". Found by the widget test,
        // and fixed by following the token rather than by boxing around it.
        FilledButton(
          key: const Key('business-save'),
          onPressed: inFlight ? null : _save,
          child: inFlight
              // The one in-flight indicator, on the control rather than
              // over the screen.
              ? const SizedBox(
                  key: Key('business-rename-loading'),
                  width: BookflowSizes.inlineSpinner,
                  height: BookflowSizes.inlineSpinner,
                  child: CircularProgressIndicator.adaptive(strokeWidth: 2),
                )
              : const Text('Save'),
        ),
        const SizedBox(height: BookflowSpacing.sm),
        TextButton(
          onPressed: inFlight ? null : () => setState(() => _editing = false),
          child: const Text('Cancel'),
        ),
      ],
    );
  }
}

/// The banner, and the control that replaces it.
///
/// ── UPLOADED ON PICK, LIKE THE TEAM PHOTO ──────────────────────────────────
///
/// The upload endpoint writes `banner_url` on the business itself when the
/// purpose is `banner`, so by the time this thumbnail appears the banner is
/// already saved — it does not wait for Save and is not part of the PATCH.
/// That is the API's shape rather than a shortcut: a `bannerUrl` field on
/// `RenameBusinessRequest` would be a second writer for one column.
class _BannerPicker extends ConsumerWidget {
  const _BannerPicker({required this.bannerUrl, required this.onPick});

  final String? bannerUrl;
  final VoidCallback onPick;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final ThemeData theme = Theme.of(context);
    final AsyncValue<void> upload = ref.watch(imageUploadControllerProvider);

    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: <Widget>[
        if (bannerUrl != null)
          Padding(
            padding: const EdgeInsets.only(bottom: BookflowSpacing.sm),
            child: ClipRRect(
              borderRadius: BorderRadius.circular(BookflowRadii.card),
              child: Image.network(
                bannerUrl!,
                height: BookflowSizes.avatarLarge,
                fit: BoxFit.cover,
                errorBuilder: (BuildContext _, Object _, StackTrace? _) =>
                    const SizedBox.shrink(),
              ),
            ),
          ),
        OutlinedButton.icon(
          key: const Key('business-banner-pick'),
          onPressed: upload.isLoading ? null : onPick,
          icon: upload.isLoading
              ? const SizedBox(
                  key: Key('business-banner-loading'),
                  width: BookflowSizes.inlineSpinner,
                  height: BookflowSizes.inlineSpinner,
                  child: CircularProgressIndicator.adaptive(strokeWidth: 2),
                )
              : const Icon(Icons.image_outlined),
          label: Text(
            bannerUrl == null ? 'Add a banner image' : 'Replace banner',
          ),
        ),
        if (upload.hasError)
          Padding(
            padding: const EdgeInsets.only(top: BookflowSpacing.sm),
            child: Text(
              key: const Key('business-banner-error'),
              uploadFailureMessage(upload.error!),
              style: theme.textTheme.bodySmall?.copyWith(
                color: theme.colorScheme.error,
              ),
            ),
          ),
      ],
    );
  }
}
