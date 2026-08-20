// GENERATED CODE - DO NOT MODIFY BY HAND

part of 'portfolio_image.dart';

// **************************************************************************
// BuiltValueGenerator
// **************************************************************************

class _$PortfolioImage extends PortfolioImage {
  @override
  final String id;
  @override
  final String imageUrl;
  @override
  final int position;

  factory _$PortfolioImage([void Function(PortfolioImageBuilder)? updates]) =>
      (PortfolioImageBuilder()..update(updates))._build();

  _$PortfolioImage._(
      {required this.id, required this.imageUrl, required this.position})
      : super._();
  @override
  PortfolioImage rebuild(void Function(PortfolioImageBuilder) updates) =>
      (toBuilder()..update(updates)).build();

  @override
  PortfolioImageBuilder toBuilder() => PortfolioImageBuilder()..replace(this);

  @override
  bool operator ==(Object other) {
    if (identical(other, this)) return true;
    return other is PortfolioImage &&
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
    return (newBuiltValueToStringHelper(r'PortfolioImage')
          ..add('id', id)
          ..add('imageUrl', imageUrl)
          ..add('position', position))
        .toString();
  }
}

class PortfolioImageBuilder
    implements Builder<PortfolioImage, PortfolioImageBuilder> {
  _$PortfolioImage? _$v;

  String? _id;
  String? get id => _$this._id;
  set id(String? id) => _$this._id = id;

  String? _imageUrl;
  String? get imageUrl => _$this._imageUrl;
  set imageUrl(String? imageUrl) => _$this._imageUrl = imageUrl;

  int? _position;
  int? get position => _$this._position;
  set position(int? position) => _$this._position = position;

  PortfolioImageBuilder() {
    PortfolioImage._defaults(this);
  }

  PortfolioImageBuilder get _$this {
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
  void replace(PortfolioImage other) {
    _$v = other as _$PortfolioImage;
  }

  @override
  void update(void Function(PortfolioImageBuilder)? updates) {
    if (updates != null) updates(this);
  }

  @override
  PortfolioImage build() => _build();

  _$PortfolioImage _build() {
    final _$result = _$v ??
        _$PortfolioImage._(
          id: BuiltValueNullFieldError.checkNotNull(
              id, r'PortfolioImage', 'id'),
          imageUrl: BuiltValueNullFieldError.checkNotNull(
              imageUrl, r'PortfolioImage', 'imageUrl'),
          position: BuiltValueNullFieldError.checkNotNull(
              position, r'PortfolioImage', 'position'),
        );
    replace(_$result);
    return _$result;
  }
}

// ignore_for_file: deprecated_member_use_from_same_package,type=lint
