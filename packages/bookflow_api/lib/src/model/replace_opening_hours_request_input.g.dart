// GENERATED CODE - DO NOT MODIFY BY HAND

part of 'replace_opening_hours_request_input.dart';

// **************************************************************************
// BuiltValueGenerator
// **************************************************************************

class _$ReplaceOpeningHoursRequestInput
    extends ReplaceOpeningHoursRequestInput {
  @override
  final BuiltList<OpeningHoursEntryInput> days;

  factory _$ReplaceOpeningHoursRequestInput(
          [void Function(ReplaceOpeningHoursRequestInputBuilder)? updates]) =>
      (ReplaceOpeningHoursRequestInputBuilder()..update(updates))._build();

  _$ReplaceOpeningHoursRequestInput._({required this.days}) : super._();
  @override
  ReplaceOpeningHoursRequestInput rebuild(
          void Function(ReplaceOpeningHoursRequestInputBuilder) updates) =>
      (toBuilder()..update(updates)).build();

  @override
  ReplaceOpeningHoursRequestInputBuilder toBuilder() =>
      ReplaceOpeningHoursRequestInputBuilder()..replace(this);

  @override
  bool operator ==(Object other) {
    if (identical(other, this)) return true;
    return other is ReplaceOpeningHoursRequestInput && days == other.days;
  }

  @override
  int get hashCode {
    var _$hash = 0;
    _$hash = $jc(_$hash, days.hashCode);
    _$hash = $jf(_$hash);
    return _$hash;
  }

  @override
  String toString() {
    return (newBuiltValueToStringHelper(r'ReplaceOpeningHoursRequestInput')
          ..add('days', days))
        .toString();
  }
}

class ReplaceOpeningHoursRequestInputBuilder
    implements
        Builder<ReplaceOpeningHoursRequestInput,
            ReplaceOpeningHoursRequestInputBuilder> {
  _$ReplaceOpeningHoursRequestInput? _$v;

  ListBuilder<OpeningHoursEntryInput>? _days;
  ListBuilder<OpeningHoursEntryInput> get days =>
      _$this._days ??= ListBuilder<OpeningHoursEntryInput>();
  set days(ListBuilder<OpeningHoursEntryInput>? days) => _$this._days = days;

  ReplaceOpeningHoursRequestInputBuilder() {
    ReplaceOpeningHoursRequestInput._defaults(this);
  }

  ReplaceOpeningHoursRequestInputBuilder get _$this {
    final $v = _$v;
    if ($v != null) {
      _days = $v.days.toBuilder();
      _$v = null;
    }
    return this;
  }

  @override
  void replace(ReplaceOpeningHoursRequestInput other) {
    _$v = other as _$ReplaceOpeningHoursRequestInput;
  }

  @override
  void update(void Function(ReplaceOpeningHoursRequestInputBuilder)? updates) {
    if (updates != null) updates(this);
  }

  @override
  ReplaceOpeningHoursRequestInput build() => _build();

  _$ReplaceOpeningHoursRequestInput _build() {
    _$ReplaceOpeningHoursRequestInput _$result;
    try {
      _$result = _$v ??
          _$ReplaceOpeningHoursRequestInput._(
            days: days.build(),
          );
    } catch (_) {
      late String _$failedField;
      try {
        _$failedField = 'days';
        days.build();
      } catch (e) {
        throw BuiltValueNestedFieldError(
            r'ReplaceOpeningHoursRequestInput', _$failedField, e.toString());
      }
      rethrow;
    }
    replace(_$result);
    return _$result;
  }
}

// ignore_for_file: deprecated_member_use_from_same_package,type=lint
