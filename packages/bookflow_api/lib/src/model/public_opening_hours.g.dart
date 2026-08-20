// GENERATED CODE - DO NOT MODIFY BY HAND

part of 'public_opening_hours.dart';

// **************************************************************************
// BuiltValueGenerator
// **************************************************************************

class _$PublicOpeningHours extends PublicOpeningHours {
  @override
  final int dayOfWeek;
  @override
  final String openTime;
  @override
  final String closeTime;

  factory _$PublicOpeningHours(
          [void Function(PublicOpeningHoursBuilder)? updates]) =>
      (PublicOpeningHoursBuilder()..update(updates))._build();

  _$PublicOpeningHours._(
      {required this.dayOfWeek,
      required this.openTime,
      required this.closeTime})
      : super._();
  @override
  PublicOpeningHours rebuild(
          void Function(PublicOpeningHoursBuilder) updates) =>
      (toBuilder()..update(updates)).build();

  @override
  PublicOpeningHoursBuilder toBuilder() =>
      PublicOpeningHoursBuilder()..replace(this);

  @override
  bool operator ==(Object other) {
    if (identical(other, this)) return true;
    return other is PublicOpeningHours &&
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
    return (newBuiltValueToStringHelper(r'PublicOpeningHours')
          ..add('dayOfWeek', dayOfWeek)
          ..add('openTime', openTime)
          ..add('closeTime', closeTime))
        .toString();
  }
}

class PublicOpeningHoursBuilder
    implements Builder<PublicOpeningHours, PublicOpeningHoursBuilder> {
  _$PublicOpeningHours? _$v;

  int? _dayOfWeek;
  int? get dayOfWeek => _$this._dayOfWeek;
  set dayOfWeek(int? dayOfWeek) => _$this._dayOfWeek = dayOfWeek;

  String? _openTime;
  String? get openTime => _$this._openTime;
  set openTime(String? openTime) => _$this._openTime = openTime;

  String? _closeTime;
  String? get closeTime => _$this._closeTime;
  set closeTime(String? closeTime) => _$this._closeTime = closeTime;

  PublicOpeningHoursBuilder() {
    PublicOpeningHours._defaults(this);
  }

  PublicOpeningHoursBuilder get _$this {
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
  void replace(PublicOpeningHours other) {
    _$v = other as _$PublicOpeningHours;
  }

  @override
  void update(void Function(PublicOpeningHoursBuilder)? updates) {
    if (updates != null) updates(this);
  }

  @override
  PublicOpeningHours build() => _build();

  _$PublicOpeningHours _build() {
    final _$result = _$v ??
        _$PublicOpeningHours._(
          dayOfWeek: BuiltValueNullFieldError.checkNotNull(
              dayOfWeek, r'PublicOpeningHours', 'dayOfWeek'),
          openTime: BuiltValueNullFieldError.checkNotNull(
              openTime, r'PublicOpeningHours', 'openTime'),
          closeTime: BuiltValueNullFieldError.checkNotNull(
              closeTime, r'PublicOpeningHours', 'closeTime'),
        );
    replace(_$result);
    return _$result;
  }
}

// ignore_for_file: deprecated_member_use_from_same_package,type=lint
