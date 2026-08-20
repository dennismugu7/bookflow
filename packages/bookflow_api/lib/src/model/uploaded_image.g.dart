// GENERATED CODE - DO NOT MODIFY BY HAND

part of 'uploaded_image.dart';

// **************************************************************************
// BuiltValueGenerator
// **************************************************************************

const UploadedImagePurposeEnum _$uploadedImagePurposeEnum_banner =
    const UploadedImagePurposeEnum._('banner');
const UploadedImagePurposeEnum _$uploadedImagePurposeEnum_team =
    const UploadedImagePurposeEnum._('team');
const UploadedImagePurposeEnum _$uploadedImagePurposeEnum_portfolio =
    const UploadedImagePurposeEnum._('portfolio');

UploadedImagePurposeEnum _$uploadedImagePurposeEnumValueOf(String name) {
  switch (name) {
    case 'banner':
      return _$uploadedImagePurposeEnum_banner;
    case 'team':
      return _$uploadedImagePurposeEnum_team;
    case 'portfolio':
      return _$uploadedImagePurposeEnum_portfolio;
    default:
      throw ArgumentError(name);
  }
}

final BuiltSet<UploadedImagePurposeEnum> _$uploadedImagePurposeEnumValues =
    BuiltSet<UploadedImagePurposeEnum>(const <UploadedImagePurposeEnum>[
  _$uploadedImagePurposeEnum_banner,
  _$uploadedImagePurposeEnum_team,
  _$uploadedImagePurposeEnum_portfolio,
]);

Serializer<UploadedImagePurposeEnum> _$uploadedImagePurposeEnumSerializer =
    _$UploadedImagePurposeEnumSerializer();

class _$UploadedImagePurposeEnumSerializer
    implements PrimitiveSerializer<UploadedImagePurposeEnum> {
  static const Map<String, Object> _toWire = const <String, Object>{
    'banner': 'banner',
    'team': 'team',
    'portfolio': 'portfolio',
  };
  static const Map<Object, String> _fromWire = const <Object, String>{
    'banner': 'banner',
    'team': 'team',
    'portfolio': 'portfolio',
  };

  @override
  final Iterable<Type> types = const <Type>[UploadedImagePurposeEnum];
  @override
  final String wireName = 'UploadedImagePurposeEnum';

  @override
  Object serialize(Serializers serializers, UploadedImagePurposeEnum object,
          {FullType specifiedType = FullType.unspecified}) =>
      _toWire[object.name] ?? object.name;

  @override
  UploadedImagePurposeEnum deserialize(
          Serializers serializers, Object serialized,
          {FullType specifiedType = FullType.unspecified}) =>
      UploadedImagePurposeEnum.valueOf(
          _fromWire[serialized] ?? (serialized is String ? serialized : ''));
}

class _$UploadedImage extends UploadedImage {
  @override
  final String url;
  @override
  final UploadedImagePurposeEnum purpose;
  @override
  final String? portfolioImageId;

  factory _$UploadedImage([void Function(UploadedImageBuilder)? updates]) =>
      (UploadedImageBuilder()..update(updates))._build();

  _$UploadedImage._(
      {required this.url, required this.purpose, this.portfolioImageId})
      : super._();
  @override
  UploadedImage rebuild(void Function(UploadedImageBuilder) updates) =>
      (toBuilder()..update(updates)).build();

  @override
  UploadedImageBuilder toBuilder() => UploadedImageBuilder()..replace(this);

  @override
  bool operator ==(Object other) {
    if (identical(other, this)) return true;
    return other is UploadedImage &&
        url == other.url &&
        purpose == other.purpose &&
        portfolioImageId == other.portfolioImageId;
  }

  @override
  int get hashCode {
    var _$hash = 0;
    _$hash = $jc(_$hash, url.hashCode);
    _$hash = $jc(_$hash, purpose.hashCode);
    _$hash = $jc(_$hash, portfolioImageId.hashCode);
    _$hash = $jf(_$hash);
    return _$hash;
  }

  @override
  String toString() {
    return (newBuiltValueToStringHelper(r'UploadedImage')
          ..add('url', url)
          ..add('purpose', purpose)
          ..add('portfolioImageId', portfolioImageId))
        .toString();
  }
}

class UploadedImageBuilder
    implements Builder<UploadedImage, UploadedImageBuilder> {
  _$UploadedImage? _$v;

  String? _url;
  String? get url => _$this._url;
  set url(String? url) => _$this._url = url;

  UploadedImagePurposeEnum? _purpose;
  UploadedImagePurposeEnum? get purpose => _$this._purpose;
  set purpose(UploadedImagePurposeEnum? purpose) => _$this._purpose = purpose;

  String? _portfolioImageId;
  String? get portfolioImageId => _$this._portfolioImageId;
  set portfolioImageId(String? portfolioImageId) =>
      _$this._portfolioImageId = portfolioImageId;

  UploadedImageBuilder() {
    UploadedImage._defaults(this);
  }

  UploadedImageBuilder get _$this {
    final $v = _$v;
    if ($v != null) {
      _url = $v.url;
      _purpose = $v.purpose;
      _portfolioImageId = $v.portfolioImageId;
      _$v = null;
    }
    return this;
  }

  @override
  void replace(UploadedImage other) {
    _$v = other as _$UploadedImage;
  }

  @override
  void update(void Function(UploadedImageBuilder)? updates) {
    if (updates != null) updates(this);
  }

  @override
  UploadedImage build() => _build();

  _$UploadedImage _build() {
    final _$result = _$v ??
        _$UploadedImage._(
          url: BuiltValueNullFieldError.checkNotNull(
              url, r'UploadedImage', 'url'),
          purpose: BuiltValueNullFieldError.checkNotNull(
              purpose, r'UploadedImage', 'purpose'),
          portfolioImageId: portfolioImageId,
        );
    replace(_$result);
    return _$result;
  }
}

// ignore_for_file: deprecated_member_use_from_same_package,type=lint
