// GENERATED CODE - DO NOT MODIFY BY HAND

part of 'business_input.dart';

// **************************************************************************
// BuiltValueGenerator
// **************************************************************************

class _$BusinessInput extends BusinessInput {
  @override
  final String id;
  @override
  final String name;
  @override
  final bool published;
  @override
  final String? handle;

  factory _$BusinessInput([void Function(BusinessInputBuilder)? updates]) =>
      (BusinessInputBuilder()..update(updates))._build();

  _$BusinessInput._(
      {required this.id,
      required this.name,
      required this.published,
      this.handle})
      : super._();
  @override
  BusinessInput rebuild(void Function(BusinessInputBuilder) updates) =>
      (toBuilder()..update(updates)).build();

  @override
  BusinessInputBuilder toBuilder() => BusinessInputBuilder()..replace(this);

  @override
  bool operator ==(Object other) {
    if (identical(other, this)) return true;
    return other is BusinessInput &&
        id == other.id &&
        name == other.name &&
        published == other.published &&
        handle == other.handle;
  }

  @override
  int get hashCode {
    var _$hash = 0;
    _$hash = $jc(_$hash, id.hashCode);
    _$hash = $jc(_$hash, name.hashCode);
    _$hash = $jc(_$hash, published.hashCode);
    _$hash = $jc(_$hash, handle.hashCode);
    _$hash = $jf(_$hash);
    return _$hash;
  }

  @override
  String toString() {
    return (newBuiltValueToStringHelper(r'BusinessInput')
          ..add('id', id)
          ..add('name', name)
          ..add('published', published)
          ..add('handle', handle))
        .toString();
  }
}

class BusinessInputBuilder
    implements Builder<BusinessInput, BusinessInputBuilder> {
  _$BusinessInput? _$v;

  String? _id;
  String? get id => _$this._id;
  set id(String? id) => _$this._id = id;

  String? _name;
  String? get name => _$this._name;
  set name(String? name) => _$this._name = name;

  bool? _published;
  bool? get published => _$this._published;
  set published(bool? published) => _$this._published = published;

  String? _handle;
  String? get handle => _$this._handle;
  set handle(String? handle) => _$this._handle = handle;

  BusinessInputBuilder() {
    BusinessInput._defaults(this);
  }

  BusinessInputBuilder get _$this {
    final $v = _$v;
    if ($v != null) {
      _id = $v.id;
      _name = $v.name;
      _published = $v.published;
      _handle = $v.handle;
      _$v = null;
    }
    return this;
  }

  @override
  void replace(BusinessInput other) {
    _$v = other as _$BusinessInput;
  }

  @override
  void update(void Function(BusinessInputBuilder)? updates) {
    if (updates != null) updates(this);
  }

  @override
  BusinessInput build() => _build();

  _$BusinessInput _build() {
    final _$result = _$v ??
        _$BusinessInput._(
          id: BuiltValueNullFieldError.checkNotNull(id, r'BusinessInput', 'id'),
          name: BuiltValueNullFieldError.checkNotNull(
              name, r'BusinessInput', 'name'),
          published: BuiltValueNullFieldError.checkNotNull(
              published, r'BusinessInput', 'published'),
          handle: handle,
        );
    replace(_$result);
    return _$result;
  }
}

// ignore_for_file: deprecated_member_use_from_same_package,type=lint
