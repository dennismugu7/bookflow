//
// AUTO-GENERATED FILE, DO NOT MODIFY!
//

// ignore_for_file: unused_element
import 'package:built_value/built_value.dart';
import 'package:built_value/serializer.dart';

part 'published_business_input.g.dart';

/// A business that is now live on its public booking page.
///
/// Properties:
/// * [id]
/// * [name]
/// * [published]
/// * [handle]
@BuiltValue()
abstract class PublishedBusinessInput
    implements Built<PublishedBusinessInput, PublishedBusinessInputBuilder> {
  @BuiltValueField(wireName: r'id')
  String get id;

  @BuiltValueField(wireName: r'name')
  String get name;

  @BuiltValueField(wireName: r'published')
  bool get published;

  @BuiltValueField(wireName: r'handle')
  String get handle;

  PublishedBusinessInput._();

  factory PublishedBusinessInput(
          [void updates(PublishedBusinessInputBuilder b)]) =
      _$PublishedBusinessInput;

  @BuiltValueHook(initializeBuilder: true)
  static void _defaults(PublishedBusinessInputBuilder b) => b;

  @BuiltValueSerializer(custom: true)
  static Serializer<PublishedBusinessInput> get serializer =>
      _$PublishedBusinessInputSerializer();
}

class _$PublishedBusinessInputSerializer
    implements PrimitiveSerializer<PublishedBusinessInput> {
  @override
  final Iterable<Type> types = const [
    PublishedBusinessInput,
    _$PublishedBusinessInput
  ];

  @override
  final String wireName = r'PublishedBusinessInput';

  Iterable<Object?> _serializeProperties(
    Serializers serializers,
    PublishedBusinessInput object, {
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
    yield serializers.serialize(
      object.handle,
      specifiedType: const FullType(String),
    );
  }

  @override
  Object serialize(
    Serializers serializers,
    PublishedBusinessInput object, {
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
    required PublishedBusinessInputBuilder result,
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
            specifiedType: const FullType(String),
          ) as String;
          result.handle = valueDes;
          break;
        default:
          unhandled.add(key);
          unhandled.add(value);
          break;
      }
    }
  }

  @override
  PublishedBusinessInput deserialize(
    Serializers serializers,
    Object serialized, {
    FullType specifiedType = FullType.unspecified,
  }) {
    final result = PublishedBusinessInputBuilder();
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
