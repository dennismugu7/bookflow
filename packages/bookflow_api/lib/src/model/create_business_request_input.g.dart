// GENERATED CODE - DO NOT MODIFY BY HAND

part of 'create_business_request_input.dart';

// **************************************************************************
// BuiltValueGenerator
// **************************************************************************

class _$CreateBusinessRequestInput extends CreateBusinessRequestInput {
  @override
  final String name;

  factory _$CreateBusinessRequestInput(
          [void Function(CreateBusinessRequestInputBuilder)? updates]) =>
      (CreateBusinessRequestInputBuilder()..update(updates))._build();

  _$CreateBusinessRequestInput._({required this.name}) : super._();
  @override
  CreateBusinessRequestInput rebuild(
          void Function(CreateBusinessRequestInputBuilder) updates) =>
      (toBuilder()..update(updates)).build();

  @override
  CreateBusinessRequestInputBuilder toBuilder() =>
      CreateBusinessRequestInputBuilder()..replace(this);

  @override
  bool operator ==(Object other) {
    if (identical(other, this)) return true;
    return other is CreateBusinessRequestInput && name == other.name;
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
    return (newBuiltValueToStringHelper(r'CreateBusinessRequestInput')
          ..add('name', name))
        .toString();
  }
}

class CreateBusinessRequestInputBuilder
    implements
        Builder<CreateBusinessRequestInput, CreateBusinessRequestInputBuilder> {
  _$CreateBusinessRequestInput? _$v;

  String? _name;
  String? get name => _$this._name;
  set name(String? name) => _$this._name = name;

  CreateBusinessRequestInputBuilder() {
    CreateBusinessRequestInput._defaults(this);
  }

  CreateBusinessRequestInputBuilder get _$this {
    final $v = _$v;
    if ($v != null) {
      _name = $v.name;
      _$v = null;
    }
    return this;
  }

  @override
  void replace(CreateBusinessRequestInput other) {
    _$v = other as _$CreateBusinessRequestInput;
  }

  @override
  void update(void Function(CreateBusinessRequestInputBuilder)? updates) {
    if (updates != null) updates(this);
  }

  @override
  CreateBusinessRequestInput build() => _build();

  _$CreateBusinessRequestInput _build() {
    final _$result = _$v ??
        _$CreateBusinessRequestInput._(
          name: BuiltValueNullFieldError.checkNotNull(
              name, r'CreateBusinessRequestInput', 'name'),
        );
    replace(_$result);
    return _$result;
  }
}

// ignore_for_file: deprecated_member_use_from_same_package,type=lint
