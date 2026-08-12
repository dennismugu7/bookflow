// GENERATED CODE - DO NOT MODIFY BY HAND

part of 'business.dart';

// **************************************************************************
// BuiltValueGenerator
// **************************************************************************

class _$Business extends Business {
  @override
  final String id;
  @override
  final String name;
  @override
  final bool published;

  factory _$Business([void Function(BusinessBuilder)? updates]) =>
      (BusinessBuilder()..update(updates))._build();

  _$Business._({required this.id, required this.name, required this.published})
      : super._();
  @override
  Business rebuild(void Function(BusinessBuilder) updates) =>
      (toBuilder()..update(updates)).build();

  @override
  BusinessBuilder toBuilder() => BusinessBuilder()..replace(this);

  @override
  bool operator ==(Object other) {
    if (identical(other, this)) return true;
    return other is Business &&
        id == other.id &&
        name == other.name &&
        published == other.published;
  }

  @override
  int get hashCode {
    var _$hash = 0;
    _$hash = $jc(_$hash, id.hashCode);
    _$hash = $jc(_$hash, name.hashCode);
    _$hash = $jc(_$hash, published.hashCode);
    _$hash = $jf(_$hash);
    return _$hash;
  }

  @override
  String toString() {
    return (newBuiltValueToStringHelper(r'Business')
          ..add('id', id)
          ..add('name', name)
          ..add('published', published))
        .toString();
  }
}

class BusinessBuilder implements Builder<Business, BusinessBuilder> {
  _$Business? _$v;

  String? _id;
  String? get id => _$this._id;
  set id(String? id) => _$this._id = id;

  String? _name;
  String? get name => _$this._name;
  set name(String? name) => _$this._name = name;

  bool? _published;
  bool? get published => _$this._published;
  set published(bool? published) => _$this._published = published;

  BusinessBuilder() {
    Business._defaults(this);
  }

  BusinessBuilder get _$this {
    final $v = _$v;
    if ($v != null) {
      _id = $v.id;
      _name = $v.name;
      _published = $v.published;
      _$v = null;
    }
    return this;
  }

  @override
  void replace(Business other) {
    _$v = other as _$Business;
  }

  @override
  void update(void Function(BusinessBuilder)? updates) {
    if (updates != null) updates(this);
  }

  @override
  Business build() => _build();

  _$Business _build() {
    final _$result = _$v ??
        _$Business._(
          id: BuiltValueNullFieldError.checkNotNull(id, r'Business', 'id'),
          name:
              BuiltValueNullFieldError.checkNotNull(name, r'Business', 'name'),
          published: BuiltValueNullFieldError.checkNotNull(
              published, r'Business', 'published'),
        );
    replace(_$result);
    return _$result;
  }
}

// ignore_for_file: deprecated_member_use_from_same_package,type=lint
