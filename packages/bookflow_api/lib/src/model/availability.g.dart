// GENERATED CODE - DO NOT MODIFY BY HAND

part of 'availability.dart';

// **************************************************************************
// BuiltValueGenerator
// **************************************************************************

class _$Availability extends Availability {
  @override
  final BuiltList<String> slots;

  factory _$Availability([void Function(AvailabilityBuilder)? updates]) =>
      (AvailabilityBuilder()..update(updates))._build();

  _$Availability._({required this.slots}) : super._();
  @override
  Availability rebuild(void Function(AvailabilityBuilder) updates) =>
      (toBuilder()..update(updates)).build();

  @override
  AvailabilityBuilder toBuilder() => AvailabilityBuilder()..replace(this);

  @override
  bool operator ==(Object other) {
    if (identical(other, this)) return true;
    return other is Availability && slots == other.slots;
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
    return (newBuiltValueToStringHelper(r'Availability')..add('slots', slots))
        .toString();
  }
}

class AvailabilityBuilder
    implements Builder<Availability, AvailabilityBuilder> {
  _$Availability? _$v;

  ListBuilder<String>? _slots;
  ListBuilder<String> get slots => _$this._slots ??= ListBuilder<String>();
  set slots(ListBuilder<String>? slots) => _$this._slots = slots;

  AvailabilityBuilder() {
    Availability._defaults(this);
  }

  AvailabilityBuilder get _$this {
    final $v = _$v;
    if ($v != null) {
      _slots = $v.slots.toBuilder();
      _$v = null;
    }
    return this;
  }

  @override
  void replace(Availability other) {
    _$v = other as _$Availability;
  }

  @override
  void update(void Function(AvailabilityBuilder)? updates) {
    if (updates != null) updates(this);
  }

  @override
  Availability build() => _build();

  _$Availability _build() {
    _$Availability _$result;
    try {
      _$result = _$v ??
          _$Availability._(
            slots: slots.build(),
          );
    } catch (_) {
      late String _$failedField;
      try {
        _$failedField = 'slots';
        slots.build();
      } catch (e) {
        throw BuiltValueNestedFieldError(
            r'Availability', _$failedField, e.toString());
      }
      rethrow;
    }
    replace(_$result);
    return _$result;
  }
}

// ignore_for_file: deprecated_member_use_from_same_package,type=lint
