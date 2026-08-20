// GENERATED CODE - DO NOT MODIFY BY HAND

part of 'published_business.dart';

// **************************************************************************
// BuiltValueGenerator
// **************************************************************************

class _$PublishedBusiness extends PublishedBusiness {
  @override
  final String id;
  @override
  final String name;
  @override
  final bool published;
  @override
  final String handle;

  factory _$PublishedBusiness(
          [void Function(PublishedBusinessBuilder)? updates]) =>
      (PublishedBusinessBuilder()..update(updates))._build();

  _$PublishedBusiness._(
      {required this.id,
      required this.name,
      required this.published,
      required this.handle})
      : super._();
  @override
  PublishedBusiness rebuild(void Function(PublishedBusinessBuilder) updates) =>
      (toBuilder()..update(updates)).build();

  @override
  PublishedBusinessBuilder toBuilder() =>
      PublishedBusinessBuilder()..replace(this);

  @override
  bool operator ==(Object other) {
    if (identical(other, this)) return true;
    return other is PublishedBusiness &&
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
    return (newBuiltValueToStringHelper(r'PublishedBusiness')
          ..add('id', id)
          ..add('name', name)
          ..add('published', published)
          ..add('handle', handle))
        .toString();
  }
}

class PublishedBusinessBuilder
    implements Builder<PublishedBusiness, PublishedBusinessBuilder> {
  _$PublishedBusiness? _$v;

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

  PublishedBusinessBuilder() {
    PublishedBusiness._defaults(this);
  }

  PublishedBusinessBuilder get _$this {
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
  void replace(PublishedBusiness other) {
    _$v = other as _$PublishedBusiness;
  }

  @override
  void update(void Function(PublishedBusinessBuilder)? updates) {
    if (updates != null) updates(this);
  }

  @override
  PublishedBusiness build() => _build();

  _$PublishedBusiness _build() {
    final _$result = _$v ??
        _$PublishedBusiness._(
          id: BuiltValueNullFieldError.checkNotNull(
              id, r'PublishedBusiness', 'id'),
          name: BuiltValueNullFieldError.checkNotNull(
              name, r'PublishedBusiness', 'name'),
          published: BuiltValueNullFieldError.checkNotNull(
              published, r'PublishedBusiness', 'published'),
          handle: BuiltValueNullFieldError.checkNotNull(
              handle, r'PublishedBusiness', 'handle'),
        );
    replace(_$result);
    return _$result;
  }
}

// ignore_for_file: deprecated_member_use_from_same_package,type=lint
