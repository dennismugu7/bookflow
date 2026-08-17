// GENERATED CODE - DO NOT MODIFY BY HAND

part of 'create_business_request.dart';

// **************************************************************************
// BuiltValueGenerator
// **************************************************************************

class _$CreateBusinessRequest extends CreateBusinessRequest {
  @override
  final String name;

  factory _$CreateBusinessRequest(
          [void Function(CreateBusinessRequestBuilder)? updates]) =>
      (CreateBusinessRequestBuilder()..update(updates))._build();

  _$CreateBusinessRequest._({required this.name}) : super._();
  @override
  CreateBusinessRequest rebuild(
          void Function(CreateBusinessRequestBuilder) updates) =>
      (toBuilder()..update(updates)).build();

  @override
  CreateBusinessRequestBuilder toBuilder() =>
      CreateBusinessRequestBuilder()..replace(this);

  @override
  bool operator ==(Object other) {
    if (identical(other, this)) return true;
    return other is CreateBusinessRequest && name == other.name;
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
    return (newBuiltValueToStringHelper(r'CreateBusinessRequest')
          ..add('name', name))
        .toString();
  }
}

class CreateBusinessRequestBuilder
    implements Builder<CreateBusinessRequest, CreateBusinessRequestBuilder> {
  _$CreateBusinessRequest? _$v;

  String? _name;
  String? get name => _$this._name;
  set name(String? name) => _$this._name = name;

  CreateBusinessRequestBuilder() {
    CreateBusinessRequest._defaults(this);
  }

  CreateBusinessRequestBuilder get _$this {
    final $v = _$v;
    if ($v != null) {
      _name = $v.name;
      _$v = null;
    }
    return this;
  }

  @override
  void replace(CreateBusinessRequest other) {
    _$v = other as _$CreateBusinessRequest;
  }

  @override
  void update(void Function(CreateBusinessRequestBuilder)? updates) {
    if (updates != null) updates(this);
  }

  @override
  CreateBusinessRequest build() => _build();

  _$CreateBusinessRequest _build() {
    final _$result = _$v ??
        _$CreateBusinessRequest._(
          name: BuiltValueNullFieldError.checkNotNull(
              name, r'CreateBusinessRequest', 'name'),
        );
    replace(_$result);
    return _$result;
  }
}

// ignore_for_file: deprecated_member_use_from_same_package,type=lint
