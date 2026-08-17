//
// AUTO-GENERATED FILE, DO NOT MODIFY!
//

// ignore_for_file: unused_element
import 'package:built_value/built_value.dart';
import 'package:built_value/serializer.dart';

part 'create_business_request_input.g.dart';

/// The business to create. Name only.
///
/// Properties:
/// * [name] - Required. Trimmed. 1–200 characters after trimming.
@BuiltValue()
abstract class CreateBusinessRequestInput implements Built<CreateBusinessRequestInput, CreateBusinessRequestInputBuilder> {
  /// Required. Trimmed. 1–200 characters after trimming.
  @BuiltValueField(wireName: r'name')
  String get name;

  CreateBusinessRequestInput._();

  factory CreateBusinessRequestInput([void updates(CreateBusinessRequestInputBuilder b)]) = _$CreateBusinessRequestInput;

  @BuiltValueHook(initializeBuilder: true)
  static void _defaults(CreateBusinessRequestInputBuilder b) => b;

  @BuiltValueSerializer(custom: true)
  static Serializer<CreateBusinessRequestInput> get serializer => _$CreateBusinessRequestInputSerializer();
}

class _$CreateBusinessRequestInputSerializer implements PrimitiveSerializer<CreateBusinessRequestInput> {
  @override
  final Iterable<Type> types = const [CreateBusinessRequestInput, _$CreateBusinessRequestInput];

  @override
  final String wireName = r'CreateBusinessRequestInput';

  Iterable<Object?> _serializeProperties(
    Serializers serializers,
    CreateBusinessRequestInput object, {
    FullType specifiedType = FullType.unspecified,
  }) sync* {
    yield r'name';
    yield serializers.serialize(
      object.name,
      specifiedType: const FullType(String),
    );
  }

  @override
  Object serialize(
    Serializers serializers,
    CreateBusinessRequestInput object, {
    FullType specifiedType = FullType.unspecified,
  }) {
    return _serializeProperties(serializers, object, specifiedType: specifiedType).toList();
  }

  void _deserializeProperties(
    Serializers serializers,
    Object serialized, {
    FullType specifiedType = FullType.unspecified,
    required List<Object?> serializedList,
    required CreateBusinessRequestInputBuilder result,
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
        default:
          unhandled.add(key);
          unhandled.add(value);
          break;
      }
    }
  }

  @override
  CreateBusinessRequestInput deserialize(
    Serializers serializers,
    Object serialized, {
    FullType specifiedType = FullType.unspecified,
  }) {
    final result = CreateBusinessRequestInputBuilder();
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

