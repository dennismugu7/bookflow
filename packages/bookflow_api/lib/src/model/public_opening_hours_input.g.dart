// GENERATED CODE - DO NOT MODIFY BY HAND

part of 'public_opening_hours_input.dart';

// **************************************************************************
// BuiltValueGenerator
// **************************************************************************

class _$PublicOpeningHoursInput extends PublicOpeningHoursInput {
  @override
  final int dayOfWeek;
  @override
  final String openTime;
  @override
  final String closeTime;

  factory _$PublicOpeningHoursInput(
          [void Function(PublicOpeningHoursInputBuilder)? updates]) =>
      (PublicOpeningHoursInputBuilder()..update(updates))._build();

  _$PublicOpeningHoursInput._(
      {required this.dayOfWeek,
      required this.openTime,
      required this.closeTime})
      : super._();
  @override
  PublicOpeningHoursInput rebuild(
          void Function(PublicOpeningHoursInputBuilder) updates) =>
      (toBuilder()..update(updates)).build();

  @override
  PublicOpeningHoursInputBuilder toBuilder() =>
      PublicOpeningHoursInputBuilder()..replace(this);

  @override
  bool operator ==(Object other) {
    if (identical(other, this)) return true;
    return other is PublicOpeningHoursInput &&
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
    return (newBuiltValueToStringHelper(r'PublicOpeningHoursInput')
          ..add('dayOfWeek', dayOfWeek)
          ..add('openTime', openTime)
          ..add('closeTime', closeTime))
        .toString();
  }
}

class PublicOpeningHoursInputBuilder
    implements
        Builder<PublicOpeningHoursInput, PublicOpeningHoursInputBuilder> {
  _$PublicOpeningHoursInput? _$v;

  int? _dayOfWeek;
  int? get dayOfWeek => _$this._dayOfWeek;
  set dayOfWeek(int? dayOfWeek) => _$this._dayOfWeek = dayOfWeek;

  String? _openTime;
  String? get openTime => _$this._openTime;
  set openTime(String? openTime) => _$this._openTime = openTime;

  String? _closeTime;
  String? get closeTime => _$this._closeTime;
  set closeTime(String? closeTime) => _$this._closeTime = closeTime;

  PublicOpeningHoursInputBuilder() {
    PublicOpeningHoursInput._defaults(this);
  }

  PublicOpeningHoursInputBuilder get _$this {
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
  void replace(PublicOpeningHoursInput other) {
    _$v = other as _$PublicOpeningHoursInput;
  }

  @override
  void update(void Function(PublicOpeningHoursInputBuilder)? updates) {
    if (updates != null) updates(this);
  }

  @override
  PublicOpeningHoursInput build() => _build();

  _$PublicOpeningHoursInput _build() {
    final _$result = _$v ??
        _$PublicOpeningHoursInput._(
          dayOfWeek: BuiltValueNullFieldError.checkNotNull(
              dayOfWeek, r'PublicOpeningHoursInput', 'dayOfWeek'),
          openTime: BuiltValueNullFieldError.checkNotNull(
              openTime, r'PublicOpeningHoursInput', 'openTime'),
          closeTime: BuiltValueNullFieldError.checkNotNull(
              closeTime, r'PublicOpeningHoursInput', 'closeTime'),
        );
    replace(_$result);
    return _$result;
  }
}

// ignore_for_file: deprecated_member_use_from_same_package,type=lint
