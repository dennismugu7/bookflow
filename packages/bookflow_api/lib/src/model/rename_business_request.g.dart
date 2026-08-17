// GENERATED CODE - DO NOT MODIFY BY HAND

part of 'rename_business_request.dart';

// **************************************************************************
// BuiltValueGenerator
// **************************************************************************

class _$RenameBusinessRequest extends RenameBusinessRequest {
  @override
  final String name;

  factory _$RenameBusinessRequest(
          [void Function(RenameBusinessRequestBuilder)? updates]) =>
      (RenameBusinessRequestBuilder()..update(updates))._build();

  _$RenameBusinessRequest._({required this.name}) : super._();
  @override
  RenameBusinessRequest rebuild(
          void Function(RenameBusinessRequestBuilder) updates) =>
      (toBuilder()..update(updates)).build();

  @override
  RenameBusinessRequestBuilder toBuilder() =>
      RenameBusinessRequestBuilder()..replace(this);

  @override
  bool operator ==(Object other) {
    if (identical(other, this)) return true;
    return other is RenameBusinessRequest && name == other.name;
  }

  @override
  int get hashCode {
    var _$hash = 0;
    _$hash = $jc(_$hash, name.hashCode);
    _$hash = $jf(_$hash);
    return _$hash;
  }

  @override
  String toString() {
    return (newBuiltValueToStringHelper(r'RenameBusinessRequest')
          ..add('name', name))
        .toString();
  }
}

class RenameBusinessRequestBuilder
    implements Builder<RenameBusinessRequest, RenameBusinessRequestBuilder> {
  _$RenameBusinessRequest? _$v;

  String? _name;
  String? get name => _$this._name;
  set name(String? name) => _$this._name = name;

  RenameBusinessRequestBuilder() {
    RenameBusinessRequest._defaults(this);
  }

  RenameBusinessRequestBuilder get _$this {
    final $v = _$v;
    if ($v != null) {
      _name = $v.name;
      _$v = null;
    }
    return this;
  }

  @override
  void replace(RenameBusinessRequest other) {
    _$v = other as _$RenameBusinessRequest;
  }

  @override
  void update(void Function(RenameBusinessRequestBuilder)? updates) {
    if (updates != null) updates(this);
  }

  @override
  RenameBusinessRequest build() => _build();

  _$RenameBusinessRequest _build() {
    final _$result = _$v ??
        _$RenameBusinessRequest._(
          name: BuiltValueNullFieldError.checkNotNull(
              name, r'RenameBusinessRequest', 'name'),
        );
    replace(_$result);
    return _$result;
  }
}

// ignore_for_file: deprecated_member_use_from_same_package,type=lint
