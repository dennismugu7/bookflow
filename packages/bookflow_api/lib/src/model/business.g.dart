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
  @override
  final String? handle;
  @override
  final String? tagline;
  @override
  final String? about;
  @override
  final String? category;
  @override
  final String? address;
  @override
  final String? mapsUrl;
  @override
  final String? bannerUrl;

  factory _$Business([void Function(BusinessBuilder)? updates]) =>
      (BusinessBuilder()..update(updates))._build();

  _$Business._(
      {required this.id,
      required this.name,
      required this.published,
      this.handle,
      this.tagline,
      this.about,
      this.category,
      this.address,
      this.mapsUrl,
      this.bannerUrl})
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
        published == other.published &&
        handle == other.handle &&
        tagline == other.tagline &&
        about == other.about &&
        category == other.category &&
        address == other.address &&
        mapsUrl == other.mapsUrl &&
        bannerUrl == other.bannerUrl;
  }

  @override
  int get hashCode {
    var _$hash = 0;
    _$hash = $jc(_$hash, id.hashCode);
    _$hash = $jc(_$hash, name.hashCode);
    _$hash = $jc(_$hash, published.hashCode);
    _$hash = $jc(_$hash, handle.hashCode);
    _$hash = $jc(_$hash, tagline.hashCode);
    _$hash = $jc(_$hash, about.hashCode);
    _$hash = $jc(_$hash, category.hashCode);
    _$hash = $jc(_$hash, address.hashCode);
    _$hash = $jc(_$hash, mapsUrl.hashCode);
    _$hash = $jc(_$hash, bannerUrl.hashCode);
    _$hash = $jf(_$hash);
    return _$hash;
  }

  @override
  String toString() {
    return (newBuiltValueToStringHelper(r'Business')
          ..add('id', id)
          ..add('name', name)
          ..add('published', published)
          ..add('handle', handle)
          ..add('tagline', tagline)
          ..add('about', about)
          ..add('category', category)
          ..add('address', address)
          ..add('mapsUrl', mapsUrl)
          ..add('bannerUrl', bannerUrl))
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

  String? _handle;
  String? get handle => _$this._handle;
  set handle(String? handle) => _$this._handle = handle;

  String? _tagline;
  String? get tagline => _$this._tagline;
  set tagline(String? tagline) => _$this._tagline = tagline;

  String? _about;
  String? get about => _$this._about;
  set about(String? about) => _$this._about = about;

  String? _category;
  String? get category => _$this._category;
  set category(String? category) => _$this._category = category;

  String? _address;
  String? get address => _$this._address;
  set address(String? address) => _$this._address = address;

  String? _mapsUrl;
  String? get mapsUrl => _$this._mapsUrl;
  set mapsUrl(String? mapsUrl) => _$this._mapsUrl = mapsUrl;

  String? _bannerUrl;
  String? get bannerUrl => _$this._bannerUrl;
  set bannerUrl(String? bannerUrl) => _$this._bannerUrl = bannerUrl;

  BusinessBuilder() {
    Business._defaults(this);
  }

  BusinessBuilder get _$this {
    final $v = _$v;
    if ($v != null) {
      _id = $v.id;
      _name = $v.name;
      _published = $v.published;
      _handle = $v.handle;
      _tagline = $v.tagline;
      _about = $v.about;
      _category = $v.category;
      _address = $v.address;
      _mapsUrl = $v.mapsUrl;
      _bannerUrl = $v.bannerUrl;
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
          handle: handle,
          tagline: tagline,
          about: about,
          category: category,
          address: address,
          mapsUrl: mapsUrl,
          bannerUrl: bannerUrl,
        );
    replace(_$result);
    return _$result;
  }
}

// ignore_for_file: deprecated_member_use_from_same_package,type=lint
