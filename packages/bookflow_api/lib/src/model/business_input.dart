//
// AUTO-GENERATED FILE, DO NOT MODIFY!
//

// ignore_for_file: unused_element
import 'package:built_value/built_value.dart';
import 'package:built_value/serializer.dart';

part 'business_input.g.dart';

/// A business the caller is a member of.
///
/// Properties:
/// * [id]
/// * [name]
/// * [published]
/// * [handle]
/// * [tagline]
/// * [about]
/// * [category]
/// * [address]
/// * [mapsUrl]
/// * [bannerUrl]
@BuiltValue()
abstract class BusinessInput
    implements Built<BusinessInput, BusinessInputBuilder> {
  @BuiltValueField(wireName: r'id')
  String get id;

  @BuiltValueField(wireName: r'name')
  String get name;

  @BuiltValueField(wireName: r'published')
  bool get published;

  @BuiltValueField(wireName: r'handle')
  String? get handle;

  @BuiltValueField(wireName: r'tagline')
  String? get tagline;

  @BuiltValueField(wireName: r'about')
  String? get about;

  @BuiltValueField(wireName: r'category')
  String? get category;

  @BuiltValueField(wireName: r'address')
  String? get address;

  @BuiltValueField(wireName: r'mapsUrl')
  String? get mapsUrl;

  @BuiltValueField(wireName: r'bannerUrl')
  String? get bannerUrl;

  BusinessInput._();

  factory BusinessInput([void updates(BusinessInputBuilder b)]) =
      _$BusinessInput;

  @BuiltValueHook(initializeBuilder: true)
  static void _defaults(BusinessInputBuilder b) => b;

  @BuiltValueSerializer(custom: true)
  static Serializer<BusinessInput> get serializer =>
      _$BusinessInputSerializer();
}

class _$BusinessInputSerializer implements PrimitiveSerializer<BusinessInput> {
  @override
  final Iterable<Type> types = const [BusinessInput, _$BusinessInput];

  @override
  final String wireName = r'BusinessInput';

  Iterable<Object?> _serializeProperties(
    Serializers serializers,
    BusinessInput object, {
    FullType specifiedType = FullType.unspecified,
  }) sync* {
    yield r'id';
    yield serializers.serialize(
      object.id,
      specifiedType: const FullType(String),
    );
    yield r'name';
    yield serializers.serialize(
      object.name,
      specifiedType: const FullType(String),
    );
    yield r'published';
    yield serializers.serialize(
      object.published,
      specifiedType: const FullType(bool),
    );
    yield r'handle';
    yield object.handle == null
        ? null
        : serializers.serialize(
            object.handle,
            specifiedType: const FullType.nullable(String),
          );
    yield r'tagline';
    yield object.tagline == null
        ? null
        : serializers.serialize(
            object.tagline,
            specifiedType: const FullType.nullable(String),
          );
    yield r'about';
    yield object.about == null
        ? null
        : serializers.serialize(
            object.about,
            specifiedType: const FullType.nullable(String),
          );
    yield r'category';
    yield object.category == null
        ? null
        : serializers.serialize(
            object.category,
            specifiedType: const FullType.nullable(String),
          );
    yield r'address';
    yield object.address == null
        ? null
        : serializers.serialize(
            object.address,
            specifiedType: const FullType.nullable(String),
          );
    yield r'mapsUrl';
    yield object.mapsUrl == null
        ? null
        : serializers.serialize(
            object.mapsUrl,
            specifiedType: const FullType.nullable(String),
          );
    yield r'bannerUrl';
    yield object.bannerUrl == null
        ? null
        : serializers.serialize(
            object.bannerUrl,
            specifiedType: const FullType.nullable(String),
          );
  }

  @override
  Object serialize(
    Serializers serializers,
    BusinessInput object, {
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
    required BusinessInputBuilder result,
    required List<Object?> unhandled,
  }) {
    for (var i = 0; i < serializedList.length; i += 2) {
      final key = serializedList[i] as String;
      final value = serializedList[i + 1];
      switch (key) {
        case r'id':
          final valueDes = serializers.deserialize(
            value,
            specifiedType: const FullType(String),
          ) as String;
          result.id = valueDes;
          break;
        case r'name':
          final valueDes = serializers.deserialize(
            value,
            specifiedType: const FullType(String),
          ) as String;
          result.name = valueDes;
          break;
        case r'published':
          final valueDes = serializers.deserialize(
            value,
            specifiedType: const FullType(bool),
          ) as bool;
          result.published = valueDes;
          break;
        case r'handle':
          final valueDes = serializers.deserialize(
            value,
            specifiedType: const FullType.nullable(String),
          ) as String?;
          if (valueDes == null) continue;
          result.handle = valueDes;
          break;
        case r'tagline':
          final valueDes = serializers.deserialize(
            value,
            specifiedType: const FullType.nullable(String),
          ) as String?;
          if (valueDes == null) continue;
          result.tagline = valueDes;
          break;
        case r'about':
          final valueDes = serializers.deserialize(
            value,
            specifiedType: const FullType.nullable(String),
          ) as String?;
          if (valueDes == null) continue;
          result.about = valueDes;
          break;
        case r'category':
          final valueDes = serializers.deserialize(
            value,
            specifiedType: const FullType.nullable(String),
          ) as String?;
          if (valueDes == null) continue;
          result.category = valueDes;
          break;
        case r'address':
          final valueDes = serializers.deserialize(
            value,
            specifiedType: const FullType.nullable(String),
          ) as String?;
          if (valueDes == null) continue;
          result.address = valueDes;
          break;
        case r'mapsUrl':
          final valueDes = serializers.deserialize(
            value,
            specifiedType: const FullType.nullable(String),
          ) as String?;
          if (valueDes == null) continue;
          result.mapsUrl = valueDes;
          break;
        case r'bannerUrl':
          final valueDes = serializers.deserialize(
            value,
            specifiedType: const FullType.nullable(String),
          ) as String?;
          if (valueDes == null) continue;
          result.bannerUrl = valueDes;
          break;
        default:
          unhandled.add(key);
          unhandled.add(value);
          break;
      }
    }
  }

  @override
  BusinessInput deserialize(
    Serializers serializers,
    Object serialized, {
    FullType specifiedType = FullType.unspecified,
  }) {
    final result = BusinessInputBuilder();
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
