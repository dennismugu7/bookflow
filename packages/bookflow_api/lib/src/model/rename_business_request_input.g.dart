// GENERATED CODE - DO NOT MODIFY BY HAND

part of 'rename_business_request_input.dart';

// **************************************************************************
// BuiltValueGenerator
// **************************************************************************

class _$RenameBusinessRequestInput extends RenameBusinessRequestInput {
  @override
  final String name;
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

  factory _$RenameBusinessRequestInput(
          [void Function(RenameBusinessRequestInputBuilder)? updates]) =>
      (RenameBusinessRequestInputBuilder()..update(updates))._build();

  _$RenameBusinessRequestInput._(
      {required this.name,
      this.tagline,
      this.about,
      this.category,
      this.address,
      this.mapsUrl})
      : super._();
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
    return other is RenameBusinessRequestInput &&
        name == other.name &&
        tagline == other.tagline &&
        about == other.about &&
        category == other.category &&
        address == other.address &&
        mapsUrl == other.mapsUrl;
  }

  @override
  int get hashCode {
    var _$hash = 0;
    _$hash = $jc(_$hash, name.hashCode);
    _$hash = $jc(_$hash, tagline.hashCode);
    _$hash = $jc(_$hash, about.hashCode);
    _$hash = $jc(_$hash, category.hashCode);
    _$hash = $jc(_$hash, address.hashCode);
    _$hash = $jc(_$hash, mapsUrl.hashCode);
    _$hash = $jf(_$hash);
    return _$hash;
  }

  @override
  String toString() {
    return (newBuiltValueToStringHelper(r'RenameBusinessRequestInput')
          ..add('name', name)
          ..add('tagline', tagline)
          ..add('about', about)
          ..add('category', category)
          ..add('address', address)
          ..add('mapsUrl', mapsUrl))
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

  RenameBusinessRequestInputBuilder() {
    RenameBusinessRequestInput._defaults(this);
  }

  RenameBusinessRequestInputBuilder get _$this {
    final $v = _$v;
    if ($v != null) {
      _name = $v.name;
      _tagline = $v.tagline;
      _about = $v.about;
      _category = $v.category;
      _address = $v.address;
      _mapsUrl = $v.mapsUrl;
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
          tagline: tagline,
          about: about,
          category: category,
          address: address,
          mapsUrl: mapsUrl,
        );
    replace(_$result);
    return _$result;
  }
}

// ignore_for_file: deprecated_member_use_from_same_package,type=lint
