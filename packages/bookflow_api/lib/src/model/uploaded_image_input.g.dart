// GENERATED CODE - DO NOT MODIFY BY HAND

part of 'uploaded_image_input.dart';

// **************************************************************************
// BuiltValueGenerator
// **************************************************************************

const UploadedImageInputPurposeEnum _$uploadedImageInputPurposeEnum_banner =
    const UploadedImageInputPurposeEnum._('banner');
const UploadedImageInputPurposeEnum _$uploadedImageInputPurposeEnum_team =
    const UploadedImageInputPurposeEnum._('team');
const UploadedImageInputPurposeEnum _$uploadedImageInputPurposeEnum_portfolio =
    const UploadedImageInputPurposeEnum._('portfolio');

UploadedImageInputPurposeEnum _$uploadedImageInputPurposeEnumValueOf(
    String name) {
  switch (name) {
    case 'banner':
      return _$uploadedImageInputPurposeEnum_banner;
    case 'team':
      return _$uploadedImageInputPurposeEnum_team;
    case 'portfolio':
      return _$uploadedImageInputPurposeEnum_portfolio;
    default:
      throw ArgumentError(name);
  }
}

final BuiltSet<UploadedImageInputPurposeEnum>
    _$uploadedImageInputPurposeEnumValues = BuiltSet<
        UploadedImageInputPurposeEnum>(const <UploadedImageInputPurposeEnum>[
  _$uploadedImageInputPurposeEnum_banner,
  _$uploadedImageInputPurposeEnum_team,
  _$uploadedImageInputPurposeEnum_portfolio,
]);

Serializer<UploadedImageInputPurposeEnum>
    _$uploadedImageInputPurposeEnumSerializer =
    _$UploadedImageInputPurposeEnumSerializer();

class _$UploadedImageInputPurposeEnumSerializer
    implements PrimitiveSerializer<UploadedImageInputPurposeEnum> {
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
  final Iterable<Type> types = const <Type>[UploadedImageInputPurposeEnum];
  @override
  final String wireName = 'UploadedImageInputPurposeEnum';

  @override
  Object serialize(
          Serializers serializers, UploadedImageInputPurposeEnum object,
          {FullType specifiedType = FullType.unspecified}) =>
      _toWire[object.name] ?? object.name;

  @override
  UploadedImageInputPurposeEnum deserialize(
          Serializers serializers, Object serialized,
          {FullType specifiedType = FullType.unspecified}) =>
      UploadedImageInputPurposeEnum.valueOf(
          _fromWire[serialized] ?? (serialized is String ? serialized : ''));
}

class _$UploadedImageInput extends UploadedImageInput {
  @override
  final String url;
  @override
  final UploadedImageInputPurposeEnum purpose;
  @override
  final String? portfolioImageId;

  factory _$UploadedImageInput(
          [void Function(UploadedImageInputBuilder)? updates]) =>
      (UploadedImageInputBuilder()..update(updates))._build();

  _$UploadedImageInput._(
      {required this.url, required this.purpose, this.portfolioImageId})
      : super._();
  @override
  UploadedImageInput rebuild(
          void Function(UploadedImageInputBuilder) updates) =>
      (toBuilder()..update(updates)).build();

  @override
  UploadedImageInputBuilder toBuilder() =>
      UploadedImageInputBuilder()..replace(this);

  @override
  bool operator ==(Object other) {
    if (identical(other, this)) return true;
    return other is UploadedImageInput &&
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
    return (newBuiltValueToStringHelper(r'UploadedImageInput')
          ..add('url', url)
          ..add('purpose', purpose)
          ..add('portfolioImageId', portfolioImageId))
        .toString();
  }
}

class UploadedImageInputBuilder
    implements Builder<UploadedImageInput, UploadedImageInputBuilder> {
  _$UploadedImageInput? _$v;

  String? _url;
  String? get url => _$this._url;
  set url(String? url) => _$this._url = url;

  UploadedImageInputPurposeEnum? _purpose;
  UploadedImageInputPurposeEnum? get purpose => _$this._purpose;
  set purpose(UploadedImageInputPurposeEnum? purpose) =>
      _$this._purpose = purpose;

  String? _portfolioImageId;
  String? get portfolioImageId => _$this._portfolioImageId;
  set portfolioImageId(String? portfolioImageId) =>
      _$this._portfolioImageId = portfolioImageId;

  UploadedImageInputBuilder() {
    UploadedImageInput._defaults(this);
  }

  UploadedImageInputBuilder get _$this {
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
  void replace(UploadedImageInput other) {
    _$v = other as _$UploadedImageInput;
  }

  @override
  void update(void Function(UploadedImageInputBuilder)? updates) {
    if (updates != null) updates(this);
  }

  @override
  UploadedImageInput build() => _build();

  _$UploadedImageInput _build() {
    final _$result = _$v ??
        _$UploadedImageInput._(
          url: BuiltValueNullFieldError.checkNotNull(
              url, r'UploadedImageInput', 'url'),
          purpose: BuiltValueNullFieldError.checkNotNull(
              purpose, r'UploadedImageInput', 'purpose'),
          portfolioImageId: portfolioImageId,
        );
    replace(_$result);
    return _$result;
  }
}

// ignore_for_file: deprecated_member_use_from_same_package,type=lint
