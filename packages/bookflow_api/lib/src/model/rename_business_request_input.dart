//
// AUTO-GENERATED FILE, DO NOT MODIFY!
//

// ignore_for_file: unused_element
import 'package:built_value/built_value.dart';
import 'package:built_value/serializer.dart';

part 'rename_business_request_input.g.dart';

/// The business’s editable profile. The name is required.
///
/// Properties:
/// * [name] - Required. Trimmed. 1–200 characters after trimming.
/// * [tagline]
/// * [about]
/// * [category]
/// * [address]
/// * [mapsUrl]
@BuiltValue()
abstract class RenameBusinessRequestInput
    implements
        Built<RenameBusinessRequestInput, RenameBusinessRequestInputBuilder> {
  /// Required. Trimmed. 1–200 characters after trimming.
  @BuiltValueField(wireName: r'name')
  String get name;

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

  RenameBusinessRequestInput._();

  factory RenameBusinessRequestInput(
          [void updates(RenameBusinessRequestInputBuilder b)]) =
      _$RenameBusinessRequestInput;

  @BuiltValueHook(initializeBuilder: true)
  static void _defaults(RenameBusinessRequestInputBuilder b) => b;

  @BuiltValueSerializer(custom: true)
  static Serializer<RenameBusinessRequestInput> get serializer =>
      _$RenameBusinessRequestInputSerializer();
}

class _$RenameBusinessRequestInputSerializer
    implements PrimitiveSerializer<RenameBusinessRequestInput> {
  @override
  final Iterable<Type> types = const [
    RenameBusinessRequestInput,
    _$RenameBusinessRequestInput
  ];

  @override
  final String wireName = r'RenameBusinessRequestInput';

  Iterable<Object?> _serializeProperties(
    Serializers serializers,
    RenameBusinessRequestInput object, {
    FullType specifiedType = FullType.unspecified,
  }) sync* {
    yield r'name';
    yield serializers.serialize(
      object.name,
      specifiedType: const FullType(String),
    );
    if (object.tagline != null) {
      yield r'tagline';
      yield serializers.serialize(
        object.tagline,
        specifiedType: const FullType(String),
      );
    }
    if (object.about != null) {
      yield r'about';
      yield serializers.serialize(
        object.about,
        specifiedType: const FullType(String),
      );
    }
    if (object.category != null) {
      yield r'category';
      yield serializers.serialize(
        object.category,
        specifiedType: const FullType(String),
      );
    }
    if (object.address != null) {
      yield r'address';
      yield serializers.serialize(
        object.address,
        specifiedType: const FullType(String),
      );
    }
    if (object.mapsUrl != null) {
      yield r'mapsUrl';
      yield serializers.serialize(
        object.mapsUrl,
        specifiedType: const FullType(String),
      );
    }
  }

  @override
  Object serialize(
    Serializers serializers,
    RenameBusinessRequestInput object, {
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
    required RenameBusinessRequestInputBuilder result,
    required List<Object?> unhandled,
  }) {
    for (var i = 0; i < serializedList.length; i += 2) {
      final key = serializedList[i] as String;
      final value = serializedList[i + 1];
      switch (key) {
        case r'name':
          final valueDes = serializers.deserialize(
            value,
            specifiedType: const FullType(String),
          ) as String;
          result.name = valueDes;
          break;
        case r'tagline':
          final valueDes = serializers.deserialize(
            value,
            specifiedType: const FullType(String),
          ) as String;
          result.tagline = valueDes;
          break;
        case r'about':
          final valueDes = serializers.deserialize(
            value,
            specifiedType: const FullType(String),
          ) as String;
          result.about = valueDes;
          break;
        case r'category':
          final valueDes = serializers.deserialize(
            value,
            specifiedType: const FullType(String),
          ) as String;
          result.category = valueDes;
          break;
        case r'address':
          final valueDes = serializers.deserialize(
            value,
            specifiedType: const FullType(String),
          ) as String;
          result.address = valueDes;
          break;
        case r'mapsUrl':
          final valueDes = serializers.deserialize(
            value,
            specifiedType: const FullType(String),
          ) as String;
          result.mapsUrl = valueDes;
          break;
        default:
          unhandled.add(key);
          unhandled.add(value);
          break;
      }
    }
  }

  @override
  RenameBusinessRequestInput deserialize(
    Serializers serializers,
    Object serialized, {
    FullType specifiedType = FullType.unspecified,
  }) {
    final result = RenameBusinessRequestInputBuilder();
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
