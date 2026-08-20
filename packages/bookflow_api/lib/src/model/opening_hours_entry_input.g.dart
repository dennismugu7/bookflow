// GENERATED CODE - DO NOT MODIFY BY HAND

part of 'opening_hours_entry_input.dart';

// **************************************************************************
// BuiltValueGenerator
// **************************************************************************

class _$OpeningHoursEntryInput extends OpeningHoursEntryInput {
  @override
  final int dayOfWeek;
  @override
  final String openTime;
  @override
  final String closeTime;

  factory _$OpeningHoursEntryInput(
          [void Function(OpeningHoursEntryInputBuilder)? updates]) =>
      (OpeningHoursEntryInputBuilder()..update(updates))._build();

  _$OpeningHoursEntryInput._(
      {required this.dayOfWeek,
      required this.openTime,
      required this.closeTime})
      : super._();
  @override
  OpeningHoursEntryInput rebuild(
          void Function(OpeningHoursEntryInputBuilder) updates) =>
      (toBuilder()..update(updates)).build();

  @override
  OpeningHoursEntryInputBuilder toBuilder() =>
      OpeningHoursEntryInputBuilder()..replace(this);

  @override
  bool operator ==(Object other) {
    if (identical(other, this)) return true;
    return other is OpeningHoursEntryInput &&
        dayOfWeek == other.dayOfWeek &&
        openTime == other.openTime &&
        closeTime == other.closeTime;
  }

  @override
  int get hashCode {
    var _$hash = 0;
    _$hash = $jc(_$hash, dayOfWeek.hashCode);
    _$hash = $jc(_$hash, openTime.hashCode);
    _$hash = $jc(_$hash, closeTime.hashCode);
    _$hash = $jf(_$hash);
    return _$hash;
  }

  @override
  String toString() {
    return (newBuiltValueToStringHelper(r'OpeningHoursEntryInput')
          ..add('dayOfWeek', dayOfWeek)
          ..add('openTime', openTime)
          ..add('closeTime', closeTime))
        .toString();
  }
}

class OpeningHoursEntryInputBuilder
    implements Builder<OpeningHoursEntryInput, OpeningHoursEntryInputBuilder> {
  _$OpeningHoursEntryInput? _$v;

  int? _dayOfWeek;
  int? get dayOfWeek => _$this._dayOfWeek;
  set dayOfWeek(int? dayOfWeek) => _$this._dayOfWeek = dayOfWeek;

  String? _openTime;
  String? get openTime => _$this._openTime;
  set openTime(String? openTime) => _$this._openTime = openTime;

  String? _closeTime;
  String? get closeTime => _$this._closeTime;
  set closeTime(String? closeTime) => _$this._closeTime = closeTime;

  OpeningHoursEntryInputBuilder() {
    OpeningHoursEntryInput._defaults(this);
  }

  OpeningHoursEntryInputBuilder get _$this {
    final $v = _$v;
    if ($v != null) {
      _dayOfWeek = $v.dayOfWeek;
      _openTime = $v.openTime;
      _closeTime = $v.closeTime;
      _$v = null;
    }
    return this;
  }

  @override
  void replace(OpeningHoursEntryInput other) {
    _$v = other as _$OpeningHoursEntryInput;
  }

  @override
  void update(void Function(OpeningHoursEntryInputBuilder)? updates) {
    if (updates != null) updates(this);
  }

  @override
  OpeningHoursEntryInput build() => _build();

  _$OpeningHoursEntryInput _build() {
    final _$result = _$v ??
        _$OpeningHoursEntryInput._(
          dayOfWeek: BuiltValueNullFieldError.checkNotNull(
              dayOfWeek, r'OpeningHoursEntryInput', 'dayOfWeek'),
          openTime: BuiltValueNullFieldError.checkNotNull(
              openTime, r'OpeningHoursEntryInput', 'openTime'),
          closeTime: BuiltValueNullFieldError.checkNotNull(
              closeTime, r'OpeningHoursEntryInput', 'closeTime'),
        );
    replace(_$result);
    return _$result;
  }
}

// ignore_for_file: deprecated_member_use_from_same_package,type=lint
