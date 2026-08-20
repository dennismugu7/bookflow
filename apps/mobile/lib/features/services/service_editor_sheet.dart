import 'package:bookflow/features/services/services_models.dart';
import 'package:bookflow/features/services/services_providers.dart';
import 'package:bookflow/theme/tokens.dart';
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

/// Add or edit a service.
///
/// ══ ONE SHEET FOR BOTH, AND DELETE LIVES INSIDE IT ══════════════════════════
///
/// The two forms are identical, so two sheets would be two places for the
/// duration field's validation to drift. `service == null` is the only
/// difference, and it changes the title, the CTA and whether Delete is drawn.
///
/// Delete is here rather than a swipe on the list because it needs a
/// confirmation and a swipe that opens a dialog is a gesture people trigger by
/// accident — the same reasoning the log-out modal carries.
class ServiceEditorSheet extends ConsumerStatefulWidget {
  const ServiceEditorSheet({
    required this.service,
    required this.onDone,
    super.key,
  });

  /// The service being edited, or null to add one.
  final SalonService? service;

  /// Called once the write has landed and the list has been re-read.
  final VoidCallback onDone;

  @override
  ConsumerState<ServiceEditorSheet> createState() => _ServiceEditorSheetState();
}

class _ServiceEditorSheetState extends ConsumerState<ServiceEditorSheet> {
  late final TextEditingController _name = TextEditingController(
    text: widget.service?.name ?? '',
  );
  late final TextEditingController _duration = TextEditingController(
    text: widget.service?.durationMinutes.toString() ?? '',
  );
  late final TextEditingController _price = TextEditingController(
    text: widget.service?.priceKes.toString() ?? '',
  );

  String? _nameError;
  String? _durationError;
  String? _priceError;

  /// Set when the API refuses the name. Cleared on the next attempt, so a
  /// corrected name does not keep showing the old complaint.
  String? _submitError;

  bool get _isEditing => widget.service != null;

  @override
  void dispose() {
    _name.dispose();
    _duration.dispose();
    _price.dispose();
    super.dispose();
  }

  /// The client's half of validation. The API re-runs all of it and is the
  /// authority; this only saves a round trip and marks the field.
  bool _validate() {
    final int? duration = int.tryParse(_duration.text.trim());
    final int? price = int.tryParse(_price.text.trim());

    setState(() {
      _nameError = _name.text.trim().isEmpty ? 'Give it a name.' : null;
      _durationError = (duration == null || duration <= 0)
          ? 'Minutes, greater than zero.'
          : duration > 1440
          ? 'That is longer than a day.'
          : null;
      // Zero is allowed: a consultation that costs nothing is a real service,
      // and the API's floor is `>= 0` rather than `> 0` for that reason.
      _priceError = (price == null || price < 0)
          ? 'Whole shillings, zero or more.'
          : null;
    });

    return _nameError == null && _durationError == null && _priceError == null;
  }

  Future<void> _save() async {
    if (!_validate()) return;
    setState(() => _submitError = null);

    await ref
        .read(serviceEditorControllerProvider.notifier)
        .save(
          id: widget.service?.id,
          name: _name.text.trim(),
          durationMinutes: int.parse(_duration.text.trim()),
          priceKes: int.parse(_price.text.trim()),
        );

    if (!mounted) return;

    final AsyncValue<void> result = ref.read(serviceEditorControllerProvider);
    if (result.hasError) {
      setState(() {
        _submitError = result.error is ServiceNameTaken
            ? 'You already have a service with that name.'
            : 'That did not save. Check your connection and try again.';
      });
      return;
    }

    widget.onDone();
  }

  Future<void> _confirmDelete() async {
    final SalonService? service = widget.service;
    if (service == null) return;

    final bool confirmed =
        await showDialog<bool>(
          context: context,
          builder: (BuildContext dialogContext) => AlertDialog(
            title: const Text('Remove this service?'),
            content: Text(
              '“${service.name}” will stop being bookable. Bookings that '
              'already used it are not affected.',
            ),
            actions: <Widget>[
              TextButton(
                key: const Key('service-delete-cancel'),
                onPressed: () => Navigator.of(dialogContext).pop(false),
                child: const Text('Keep it'),
              ),
              FilledButton(
                key: const Key('service-delete-confirm'),
                onPressed: () => Navigator.of(dialogContext).pop(true),
                child: const Text('Remove'),
              ),
            ],
          ),
        ) ??
        false;

    if (!confirmed || !mounted) return;

    await ref.read(serviceEditorControllerProvider.notifier).delete(service.id);
    if (!mounted) return;

    if (ref.read(serviceEditorControllerProvider).hasError) {
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
    final bool inFlight = ref.watch(serviceEditorControllerProvider).isLoading;

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
                _isEditing ? 'Edit service' : 'Add a service',
                style: theme.textTheme.titleLarge,
                textAlign: TextAlign.center,
              ),
              const SizedBox(height: BookflowSpacing.lg),
              TextField(
                key: const Key('service-name'),
                controller: _name,
                enabled: !inFlight,
                textCapitalization: TextCapitalization.sentences,
                textInputAction: TextInputAction.next,
                decoration: InputDecoration(
                  labelText: 'Service name',
                  hintText: 'Silk press',
                  errorText: _nameError,
                ),
              ),
              const SizedBox(height: BookflowSpacing.md),
              TextField(
                key: const Key('service-duration'),
                controller: _duration,
                enabled: !inFlight,
                keyboardType: TextInputType.number,
                // Digits only at the keyboard as well as at the parse: it stops
                // a decimal point being typed into a field that has no
                // fractional part rather than explaining afterwards that it
                // does not.
                inputFormatters: <TextInputFormatter>[
                  FilteringTextInputFormatter.digitsOnly,
                ],
                textInputAction: TextInputAction.next,
                decoration: InputDecoration(
                  labelText: 'How long does it take?',
                  suffixText: 'mins',
                  errorText: _durationError,
                ),
              ),
              const SizedBox(height: BookflowSpacing.md),
              TextField(
                key: const Key('service-price'),
                controller: _price,
                enabled: !inFlight,
                keyboardType: TextInputType.number,
                // ── WHOLE SHILLINGS. THE FORMATTER IS THE INVARIANT ─────────
                //
                // Digits only, so a decimal point cannot be entered at all.
                // The project rule is that money is an integer count of whole
                // shillings; a field that accepted `400.50` would have to
                // round it, and rounding somebody's price without telling them
                // is worse than refusing the keystroke.
                inputFormatters: <TextInputFormatter>[
                  FilteringTextInputFormatter.digitsOnly,
                ],
                textInputAction: TextInputAction.done,
                onSubmitted: (String _) => _save(),
                decoration: InputDecoration(
                  labelText: 'Price',
                  prefixText: 'KES ',
                  errorText: _priceError,
                ),
              ),
              const SizedBox(height: BookflowSpacing.lg),
              if (_submitError != null)
                Padding(
                  padding: const EdgeInsets.only(bottom: BookflowSpacing.md),
                  child: Text(
                    key: const Key('service-editor-error'),
                    _submitError!,
                    style: theme.textTheme.bodySmall?.copyWith(
                      color: theme.colorScheme.error,
                    ),
                  ),
                ),
              FilledButton(
                key: const Key('service-save'),
                onPressed: inFlight ? null : _save,
                child: inFlight
                    ? const SizedBox(
                        key: Key('service-save-loading'),
                        width: BookflowSizes.inlineSpinner,
                        height: BookflowSizes.inlineSpinner,
                        child: CircularProgressIndicator.adaptive(
                          strokeWidth: 2,
                        ),
                      )
                    : Text(_isEditing ? 'Save changes' : 'Add service'),
              ),
              if (_isEditing) ...<Widget>[
                const SizedBox(height: BookflowSpacing.sm),
                TextButton(
                  key: const Key('service-delete'),
                  onPressed: inFlight ? null : _confirmDelete,
                  style: TextButton.styleFrom(
                    foregroundColor: theme.colorScheme.error,
                  ),
                  child: const Text('Remove service'),
                ),
              ],
            ],
          ),
        ),
      ),
    );
  }
}
