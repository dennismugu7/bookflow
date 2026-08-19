// GENERATED CODE - DO NOT MODIFY BY HAND

part of 'rename_business_request_input.dart';

// **************************************************************************
// BuiltValueGenerator
// **************************************************************************

class _$RenameBusinessRequestInput extends RenameBusinessRequestInput {
  @override
  final String name;

  factory _$RenameBusinessRequestInput(
          [void Function(RenameBusinessRequestInputBuilder)? updates]) =>
      (RenameBusinessRequestInputBuilder()..update(updates))._build();

  _$RenameBusinessRequestInput._({required this.name}) : super._();
  @override
  RenameBusinessRequestInput rebuild(
          void Function(RenameBusinessRequestInputBuilder) updates) =>
      (toBuilder()..update(updates)).build();

  @override
  RenameBusinessRequestInputBuilder toBuilder() =>
      RenameBusinessRequestInputBuilder()..replace(this);

  @override
  bool operator ==(Object other) {
    if (identical(other, this)) return true;
    return other is RenameBusinessRequestInput && name == other.name;
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
    return (newBuiltValueToStringHelper(r'RenameBusinessRequestInput')
          ..add('name', name))
        .toString();
  }
}

class RenameBusinessRequestInputBuilder
    implements
        Builder<RenameBusinessRequestInput, RenameBusinessRequestInputBuilder> {
  _$RenameBusinessRequestInput? _$v;

  String? _name;
  String? get name => _$this._name;
  set name(String? name) => _$this._name = name;

  RenameBusinessRequestInputBuilder() {
    RenameBusinessRequestInput._defaults(this);
  }

  RenameBusinessRequestInputBuilder get _$this {
    final $v = _$v;
    if ($v != null) {
      _name = $v.name;
      _$v = null;
    }
    return this;
  }

  @override
  void replace(RenameBusinessRequestInput other) {
    _$v = other as _$RenameBusinessRequestInput;
  }

  @override
  void update(void Function(RenameBusinessRequestInputBuilder)? updates) {
    if (updates != null) updates(this);
  }

  @override
  RenameBusinessRequestInput build() => _build();

  _$RenameBusinessRequestInput _build() {
    final _$result = _$v ??
        _$RenameBusinessRequestInput._(
          name: BuiltValueNullFieldError.checkNotNull(
              name, r'RenameBusinessRequestInput', 'name'),
        );
    replace(_$result);
    return _$result;
  }
}

// ignore_for_file: deprecated_member_use_from_same_package,type=lint
