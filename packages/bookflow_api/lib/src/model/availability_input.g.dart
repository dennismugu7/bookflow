// GENERATED CODE - DO NOT MODIFY BY HAND

part of 'availability_input.dart';

// **************************************************************************
// BuiltValueGenerator
// **************************************************************************

class _$AvailabilityInput extends AvailabilityInput {
  @override
  final BuiltList<String> slots;

  factory _$AvailabilityInput(
          [void Function(AvailabilityInputBuilder)? updates]) =>
      (AvailabilityInputBuilder()..update(updates))._build();

  _$AvailabilityInput._({required this.slots}) : super._();
  @override
  AvailabilityInput rebuild(void Function(AvailabilityInputBuilder) updates) =>
      (toBuilder()..update(updates)).build();

  @override
  AvailabilityInputBuilder toBuilder() =>
      AvailabilityInputBuilder()..replace(this);

  @override
  bool operator ==(Object other) {
    if (identical(other, this)) return true;
    return other is AvailabilityInput && slots == other.slots;
  }

  @override
  int get hashCode {
    var _$hash = 0;
    _$hash = $jc(_$hash, slots.hashCode);
    _$hash = $jf(_$hash);
    return _$hash;
  }

  @override
  String toString() {
    return (newBuiltValueToStringHelper(r'AvailabilityInput')
          ..add('slots', slots))
        .toString();
  }
}

class AvailabilityInputBuilder
    implements Builder<AvailabilityInput, AvailabilityInputBuilder> {
  _$AvailabilityInput? _$v;

  ListBuilder<String>? _slots;
  ListBuilder<String> get slots => _$this._slots ??= ListBuilder<String>();
  set slots(ListBuilder<String>? slots) => _$this._slots = slots;

  AvailabilityInputBuilder() {
    AvailabilityInput._defaults(this);
  }

  AvailabilityInputBuilder get _$this {
    final $v = _$v;
    if ($v != null) {
      _slots = $v.slots.toBuilder();
      _$v = null;
    }
    return this;
  }

  @override
  void replace(AvailabilityInput other) {
    _$v = other as _$AvailabilityInput;
  }

  @override
  void update(void Function(AvailabilityInputBuilder)? updates) {
    if (updates != null) updates(this);
  }

  @override
  AvailabilityInput build() => _build();

  _$AvailabilityInput _build() {
    _$AvailabilityInput _$result;
    try {
      _$result = _$v ??
          _$AvailabilityInput._(
            slots: slots.build(),
          );
    } catch (_) {
      late String _$failedField;
      try {
        _$failedField = 'slots';
        slots.build();
      } catch (e) {
        throw BuiltValueNestedFieldError(
            r'AvailabilityInput', _$failedField, e.toString());
      }
      rethrow;
    }
    replace(_$result);
    return _$result;
  }
}

// ignore_for_file: deprecated_member_use_from_same_package,type=lint
