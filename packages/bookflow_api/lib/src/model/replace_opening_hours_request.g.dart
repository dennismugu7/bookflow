// GENERATED CODE - DO NOT MODIFY BY HAND

part of 'replace_opening_hours_request.dart';

// **************************************************************************
// BuiltValueGenerator
// **************************************************************************

class _$ReplaceOpeningHoursRequest extends ReplaceOpeningHoursRequest {
  @override
  final BuiltList<OpeningHoursEntry> days;

  factory _$ReplaceOpeningHoursRequest(
          [void Function(ReplaceOpeningHoursRequestBuilder)? updates]) =>
      (ReplaceOpeningHoursRequestBuilder()..update(updates))._build();

  _$ReplaceOpeningHoursRequest._({required this.days}) : super._();
  @override
  ReplaceOpeningHoursRequest rebuild(
          void Function(ReplaceOpeningHoursRequestBuilder) updates) =>
      (toBuilder()..update(updates)).build();

  @override
  ReplaceOpeningHoursRequestBuilder toBuilder() =>
      ReplaceOpeningHoursRequestBuilder()..replace(this);

  @override
  bool operator ==(Object other) {
    if (identical(other, this)) return true;
    return other is ReplaceOpeningHoursRequest && days == other.days;
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
    return (newBuiltValueToStringHelper(r'ReplaceOpeningHoursRequest')
          ..add('days', days))
        .toString();
  }
}

class ReplaceOpeningHoursRequestBuilder
    implements
        Builder<ReplaceOpeningHoursRequest, ReplaceOpeningHoursRequestBuilder> {
  _$ReplaceOpeningHoursRequest? _$v;

  ListBuilder<OpeningHoursEntry>? _days;
  ListBuilder<OpeningHoursEntry> get days =>
      _$this._days ??= ListBuilder<OpeningHoursEntry>();
  set days(ListBuilder<OpeningHoursEntry>? days) => _$this._days = days;

  ReplaceOpeningHoursRequestBuilder() {
    ReplaceOpeningHoursRequest._defaults(this);
  }

  ReplaceOpeningHoursRequestBuilder get _$this {
    final $v = _$v;
    if ($v != null) {
      _days = $v.days.toBuilder();
      _$v = null;
    }
    return this;
  }

  @override
  void replace(ReplaceOpeningHoursRequest other) {
    _$v = other as _$ReplaceOpeningHoursRequest;
  }

  @override
  void update(void Function(ReplaceOpeningHoursRequestBuilder)? updates) {
    if (updates != null) updates(this);
  }

  @override
  ReplaceOpeningHoursRequest build() => _build();

  _$ReplaceOpeningHoursRequest _build() {
    _$ReplaceOpeningHoursRequest _$result;
    try {
      _$result = _$v ??
          _$ReplaceOpeningHoursRequest._(
            days: days.build(),
          );
    } catch (_) {
      late String _$failedField;
      try {
        _$failedField = 'days';
        days.build();
      } catch (e) {
        throw BuiltValueNestedFieldError(
            r'ReplaceOpeningHoursRequest', _$failedField, e.toString());
      }
      rethrow;
    }
    replace(_$result);
    return _$result;
  }
}

// ignore_for_file: deprecated_member_use_from_same_package,type=lint
