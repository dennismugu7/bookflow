// GENERATED CODE - DO NOT MODIFY BY HAND

part of 'portfolio_image_input.dart';

// **************************************************************************
// BuiltValueGenerator
// **************************************************************************

class _$PortfolioImageInput extends PortfolioImageInput {
  @override
  final String id;
  @override
  final String imageUrl;
  @override
  final int position;

  factory _$PortfolioImageInput(
          [void Function(PortfolioImageInputBuilder)? updates]) =>
      (PortfolioImageInputBuilder()..update(updates))._build();

  _$PortfolioImageInput._(
      {required this.id, required this.imageUrl, required this.position})
      : super._();
  @override
  PortfolioImageInput rebuild(
          void Function(PortfolioImageInputBuilder) updates) =>
      (toBuilder()..update(updates)).build();

  @override
  PortfolioImageInputBuilder toBuilder() =>
      PortfolioImageInputBuilder()..replace(this);

  @override
  bool operator ==(Object other) {
    if (identical(other, this)) return true;
    return other is PortfolioImageInput &&
        id == other.id &&
        imageUrl == other.imageUrl &&
        position == other.position;
  }

  @override
  int get hashCode {
    var _$hash = 0;
    _$hash = $jc(_$hash, id.hashCode);
    _$hash = $jc(_$hash, imageUrl.hashCode);
    _$hash = $jc(_$hash, position.hashCode);
    _$hash = $jf(_$hash);
    return _$hash;
  }

  @override
  String toString() {
    return (newBuiltValueToStringHelper(r'PortfolioImageInput')
          ..add('id', id)
          ..add('imageUrl', imageUrl)
          ..add('position', position))
        .toString();
  }
}

class PortfolioImageInputBuilder
    implements Builder<PortfolioImageInput, PortfolioImageInputBuilder> {
  _$PortfolioImageInput? _$v;

  String? _id;
  String? get id => _$this._id;
  set id(String? id) => _$this._id = id;

  String? _imageUrl;
  String? get imageUrl => _$this._imageUrl;
  set imageUrl(String? imageUrl) => _$this._imageUrl = imageUrl;

  int? _position;
  int? get position => _$this._position;
  set position(int? position) => _$this._position = position;

  PortfolioImageInputBuilder() {
    PortfolioImageInput._defaults(this);
  }

  PortfolioImageInputBuilder get _$this {
    final $v = _$v;
    if ($v != null) {
      _id = $v.id;
      _imageUrl = $v.imageUrl;
      _position = $v.position;
      _$v = null;
    }
    return this;
  }

  @override
  void replace(PortfolioImageInput other) {
    _$v = other as _$PortfolioImageInput;
  }

  @override
  void update(void Function(PortfolioImageInputBuilder)? updates) {
    if (updates != null) updates(this);
  }

  @override
  PortfolioImageInput build() => _build();

  _$PortfolioImageInput _build() {
    final _$result = _$v ??
        _$PortfolioImageInput._(
          id: BuiltValueNullFieldError.checkNotNull(
              id, r'PortfolioImageInput', 'id'),
          imageUrl: BuiltValueNullFieldError.checkNotNull(
              imageUrl, r'PortfolioImageInput', 'imageUrl'),
          position: BuiltValueNullFieldError.checkNotNull(
              position, r'PortfolioImageInput', 'position'),
        );
    replace(_$result);
    return _$result;
  }
}

// ignore_for_file: deprecated_member_use_from_same_package,type=lint
