//
// AUTO-GENERATED FILE, DO NOT MODIFY!
//

// ignore_for_file: unused_element
import 'package:built_collection/built_collection.dart';
import 'package:built_value/built_value.dart';
import 'package:built_value/serializer.dart';

part 'uploaded_image.g.dart';

/// An image that is now stored and publicly readable.
///
/// Properties:
/// * [url] - The public URL. Safe to store and to render.
/// * [purpose]
/// * [portfolioImageId]
@BuiltValue()
abstract class UploadedImage
    implements Built<UploadedImage, UploadedImageBuilder> {
  /// The public URL. Safe to store and to render.
  @BuiltValueField(wireName: r'url')
  String get url;

  @BuiltValueField(wireName: r'purpose')
  UploadedImagePurposeEnum get purpose;
  // enum purposeEnum {  banner,  team,  portfolio,  };

  @BuiltValueField(wireName: r'portfolioImageId')
  String? get portfolioImageId;

  UploadedImage._();

  factory UploadedImage([void updates(UploadedImageBuilder b)]) =
      _$UploadedImage;

  @BuiltValueHook(initializeBuilder: true)
  static void _defaults(UploadedImageBuilder b) => b;

  @BuiltValueSerializer(custom: true)
  static Serializer<UploadedImage> get serializer =>
      _$UploadedImageSerializer();
}

class _$UploadedImageSerializer implements PrimitiveSerializer<UploadedImage> {
  @override
  final Iterable<Type> types = const [UploadedImage, _$UploadedImage];

  @override
  final String wireName = r'UploadedImage';

  Iterable<Object?> _serializeProperties(
    Serializers serializers,
    UploadedImage object, {
    FullType specifiedType = FullType.unspecified,
  }) sync* {
    yield r'url';
    yield serializers.serialize(
      object.url,
      specifiedType: const FullType(String),
    );
    yield r'purpose';
    yield serializers.serialize(
      object.purpose,
      specifiedType: const FullType(UploadedImagePurposeEnum),
    );
    yield r'portfolioImageId';
    yield object.portfolioImageId == null
        ? null
        : serializers.serialize(
            object.portfolioImageId,
            specifiedType: const FullType.nullable(String),
          );
  }

  @override
  Object serialize(
    Serializers serializers,
    UploadedImage object, {
    FullType specifiedType = FullType.unspecified,
  }) {
    return _serializeProperties(serializers, object,
            specifiedType: specifiedType)
        .toList();
  }

  void _deserializeProperties(
    Serializers serializers,
    Object serialized, {
    FullType specifiedType = FullType.unspecified,
    required List<Object?> serializedList,
    required UploadedImageBuilder result,
    required List<Object?> unhandled,
  }) {
    for (var i = 0; i < serializedList.length; i += 2) {
      final key = serializedList[i] as String;
      final value = serializedList[i + 1];
      switch (key) {
        case r'url':
          final valueDes = serializers.deserialize(
            value,
            specifiedType: const FullType(String),
          ) as String;
          result.url = valueDes;
          break;
        case r'purpose':
          final valueDes = serializers.deserialize(
            value,
            specifiedType: const FullType(UploadedImagePurposeEnum),
          ) as UploadedImagePurposeEnum;
          result.purpose = valueDes;
          break;
        case r'portfolioImageId':
          final valueDes = serializers.deserialize(
            value,
            specifiedType: const FullType.nullable(String),
          ) as String?;
          if (valueDes == null) continue;
          result.portfolioImageId = valueDes;
          break;
        default:
          unhandled.add(key);
          unhandled.add(value);
          break;
      }
    }
  }

  @override
  UploadedImage deserialize(
    Serializers serializers,
    Object serialized, {
    FullType specifiedType = FullType.unspecified,
  }) {
    final result = UploadedImageBuilder();
    final serializedList = (serialized as Iterable<Object?>).toList();
    final unhandled = <Object?>[];
    _deserializeProperties(
      serializers,
      serialized,
      specifiedType: specifiedType,
      serializedList: serializedList,
      unhandled: unhandled,
      result: result,
    );
    return result.build();
  }
}

class UploadedImagePurposeEnum extends EnumClass {
  @BuiltValueEnumConst(wireName: r'banner')
  static const UploadedImagePurposeEnum banner =
      _$uploadedImagePurposeEnum_banner;
  @BuiltValueEnumConst(wireName: r'team')
  static const UploadedImagePurposeEnum team = _$uploadedImagePurposeEnum_team;
  @BuiltValueEnumConst(wireName: r'portfolio')
  static const UploadedImagePurposeEnum portfolio =
      _$uploadedImagePurposeEnum_portfolio;

  static Serializer<UploadedImagePurposeEnum> get serializer =>
      _$uploadedImagePurposeEnumSerializer;

  const UploadedImagePurposeEnum._(String name) : super(name);

  static BuiltSet<UploadedImagePurposeEnum> get values =>
      _$uploadedImagePurposeEnumValues;
  static UploadedImagePurposeEnum valueOf(String name) =>
      _$uploadedImagePurposeEnumValueOf(name);
}
