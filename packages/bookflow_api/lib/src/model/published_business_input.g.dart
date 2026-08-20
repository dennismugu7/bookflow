// GENERATED CODE - DO NOT MODIFY BY HAND

part of 'published_business_input.dart';

// **************************************************************************
// BuiltValueGenerator
// **************************************************************************

class _$PublishedBusinessInput extends PublishedBusinessInput {
  @override
  final String id;
  @override
  final String name;
  @override
  final bool published;
  @override
  final String handle;

  factory _$PublishedBusinessInput(
          [void Function(PublishedBusinessInputBuilder)? updates]) =>
      (PublishedBusinessInputBuilder()..update(updates))._build();

  _$PublishedBusinessInput._(
      {required this.id,
      required this.name,
      required this.published,
      required this.handle})
      : super._();
  @override
  PublishedBusinessInput rebuild(
          void Function(PublishedBusinessInputBuilder) updates) =>
      (toBuilder()..update(updates)).build();

  @override
  PublishedBusinessInputBuilder toBuilder() =>
      PublishedBusinessInputBuilder()..replace(this);

  @override
  bool operator ==(Object other) {
    if (identical(other, this)) return true;
    return other is PublishedBusinessInput &&
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
    return (newBuiltValueToStringHelper(r'PublishedBusinessInput')
          ..add('id', id)
          ..add('name', name)
          ..add('published', published)
          ..add('handle', handle))
        .toString();
  }
}

class PublishedBusinessInputBuilder
    implements Builder<PublishedBusinessInput, PublishedBusinessInputBuilder> {
  _$PublishedBusinessInput? _$v;

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

  PublishedBusinessInputBuilder() {
    PublishedBusinessInput._defaults(this);
  }

  PublishedBusinessInputBuilder get _$this {
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
  void replace(PublishedBusinessInput other) {
    _$v = other as _$PublishedBusinessInput;
  }

  @override
  void update(void Function(PublishedBusinessInputBuilder)? updates) {
    if (updates != null) updates(this);
  }

  @override
  PublishedBusinessInput build() => _build();

  _$PublishedBusinessInput _build() {
    final _$result = _$v ??
        _$PublishedBusinessInput._(
          id: BuiltValueNullFieldError.checkNotNull(
              id, r'PublishedBusinessInput', 'id'),
          name: BuiltValueNullFieldError.checkNotNull(
              name, r'PublishedBusinessInput', 'name'),
          published: BuiltValueNullFieldError.checkNotNull(
              published, r'PublishedBusinessInput', 'published'),
          handle: BuiltValueNullFieldError.checkNotNull(
              handle, r'PublishedBusinessInput', 'handle'),
        );
    replace(_$result);
    return _$result;
  }
}

// ignore_for_file: deprecated_member_use_from_same_package,type=lint
