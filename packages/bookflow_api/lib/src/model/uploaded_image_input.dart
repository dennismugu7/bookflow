//
// AUTO-GENERATED FILE, DO NOT MODIFY!
//

// ignore_for_file: unused_element
import 'package:built_collection/built_collection.dart';
import 'package:built_value/built_value.dart';
import 'package:built_value/serializer.dart';

part 'uploaded_image_input.g.dart';

/// An image that is now stored and publicly readable.
///
/// Properties:
/// * [url] - The public URL. Safe to store and to render.
/// * [purpose]
/// * [portfolioImageId]
@BuiltValue()
abstract class UploadedImageInput
    implements Built<UploadedImageInput, UploadedImageInputBuilder> {
  /// The public URL. Safe to store and to render.
  @BuiltValueField(wireName: r'url')
  String get url;

  @BuiltValueField(wireName: r'purpose')
  UploadedImageInputPurposeEnum get purpose;
  // enum purposeEnum {  banner,  team,  portfolio,  };

  @BuiltValueField(wireName: r'portfolioImageId')
  String? get portfolioImageId;

  UploadedImageInput._();

  factory UploadedImageInput([void updates(UploadedImageInputBuilder b)]) =
      _$UploadedImageInput;

  @BuiltValueHook(initializeBuilder: true)
  static void _defaults(UploadedImageInputBuilder b) => b;

  @BuiltValueSerializer(custom: true)
  static Serializer<UploadedImageInput> get serializer =>
      _$UploadedImageInputSerializer();
}

class _$UploadedImageInputSerializer
    implements PrimitiveSerializer<UploadedImageInput> {
  @override
  final Iterable<Type> types = const [UploadedImageInput, _$UploadedImageInput];

  @override
  final String wireName = r'UploadedImageInput';

  Iterable<Object?> _serializeProperties(
    Serializers serializers,
    UploadedImageInput object, {
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
      specifiedType: const FullType(UploadedImageInputPurposeEnum),
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
    UploadedImageInput object, {
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
    required UploadedImageInputBuilder result,
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
            specifiedType: const FullType(UploadedImageInputPurposeEnum),
          ) as UploadedImageInputPurposeEnum;
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
  UploadedImageInput deserialize(
    Serializers serializers,
    Object serialized, {
    FullType specifiedType = FullType.unspecified,
  }) {
    final result = UploadedImageInputBuilder();
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

class UploadedImageInputPurposeEnum extends EnumClass {
  @BuiltValueEnumConst(wireName: r'banner')
  static const UploadedImageInputPurposeEnum banner =
      _$uploadedImageInputPurposeEnum_banner;
  @BuiltValueEnumConst(wireName: r'team')
  static const UploadedImageInputPurposeEnum team =
      _$uploadedImageInputPurposeEnum_team;
  @BuiltValueEnumConst(wireName: r'portfolio')
  static const UploadedImageInputPurposeEnum portfolio =
      _$uploadedImageInputPurposeEnum_portfolio;

  static Serializer<UploadedImageInputPurposeEnum> get serializer =>
      _$uploadedImageInputPurposeEnumSerializer;

  const UploadedImageInputPurposeEnum._(String name) : super(name);

  static BuiltSet<UploadedImageInputPurposeEnum> get values =>
      _$uploadedImageInputPurposeEnumValues;
  static UploadedImageInputPurposeEnum valueOf(String name) =>
      _$uploadedImageInputPurposeEnumValueOf(name);
}
