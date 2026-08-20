// GENERATED CODE - DO NOT MODIFY BY HAND

part of 'opening_hours_entry.dart';

// **************************************************************************
// BuiltValueGenerator
// **************************************************************************

class _$OpeningHoursEntry extends OpeningHoursEntry {
  @override
  final int dayOfWeek;
  @override
  final String openTime;
  @override
  final String closeTime;

  factory _$OpeningHoursEntry(
          [void Function(OpeningHoursEntryBuilder)? updates]) =>
      (OpeningHoursEntryBuilder()..update(updates))._build();

  _$OpeningHoursEntry._(
      {required this.dayOfWeek,
      required this.openTime,
      required this.closeTime})
      : super._();
  @override
  OpeningHoursEntry rebuild(void Function(OpeningHoursEntryBuilder) updates) =>
      (toBuilder()..update(updates)).build();

  @override
  OpeningHoursEntryBuilder toBuilder() =>
      OpeningHoursEntryBuilder()..replace(this);

  @override
  bool operator ==(Object other) {
    if (identical(other, this)) return true;
    return other is OpeningHoursEntry &&
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
    return (newBuiltValueToStringHelper(r'OpeningHoursEntry')
          ..add('dayOfWeek', dayOfWeek)
          ..add('openTime', openTime)
          ..add('closeTime', closeTime))
        .toString();
  }
}

class OpeningHoursEntryBuilder
    implements Builder<OpeningHoursEntry, OpeningHoursEntryBuilder> {
  _$OpeningHoursEntry? _$v;

  int? _dayOfWeek;
  int? get dayOfWeek => _$this._dayOfWeek;
  set dayOfWeek(int? dayOfWeek) => _$this._dayOfWeek = dayOfWeek;

  String? _openTime;
  String? get openTime => _$this._openTime;
  set openTime(String? openTime) => _$this._openTime = openTime;

  String? _closeTime;
  String? get closeTime => _$this._closeTime;
  set closeTime(String? closeTime) => _$this._closeTime = closeTime;

  OpeningHoursEntryBuilder() {
    OpeningHoursEntry._defaults(this);
  }

  OpeningHoursEntryBuilder get _$this {
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
  void replace(OpeningHoursEntry other) {
    _$v = other as _$OpeningHoursEntry;
  }

  @override
  void update(void Function(OpeningHoursEntryBuilder)? updates) {
    if (updates != null) updates(this);
  }

  @override
  OpeningHoursEntry build() => _build();

  _$OpeningHoursEntry _build() {
    final _$result = _$v ??
        _$OpeningHoursEntry._(
          dayOfWeek: BuiltValueNullFieldError.checkNotNull(
              dayOfWeek, r'OpeningHoursEntry', 'dayOfWeek'),
          openTime: BuiltValueNullFieldError.checkNotNull(
              openTime, r'OpeningHoursEntry', 'openTime'),
          closeTime: BuiltValueNullFieldError.checkNotNull(
              closeTime, r'OpeningHoursEntry', 'closeTime'),
        );
    replace(_$result);
    return _$result;
  }
}

// ignore_for_file: deprecated_member_use_from_same_package,type=lint
