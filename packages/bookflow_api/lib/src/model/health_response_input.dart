//
// AUTO-GENERATED FILE, DO NOT MODIFY!
//

// ignore_for_file: unused_element
import 'package:built_collection/built_collection.dart';
import 'package:built_value/built_value.dart';
import 'package:built_value/serializer.dart';

part 'health_response_input.g.dart';

/// Liveness response.
///
/// Properties:
/// * [status]
@BuiltValue()
abstract class HealthResponseInput
    implements Built<HealthResponseInput, HealthResponseInputBuilder> {
  @BuiltValueField(wireName: r'status')
  HealthResponseInputStatusEnum get status;
  // enum statusEnum {  ok,  };

  HealthResponseInput._();

  factory HealthResponseInput([void updates(HealthResponseInputBuilder b)]) =
      _$HealthResponseInput;

  @BuiltValueHook(initializeBuilder: true)
  static void _defaults(HealthResponseInputBuilder b) => b;

  @BuiltValueSerializer(custom: true)
  static Serializer<HealthResponseInput> get serializer =>
      _$HealthResponseInputSerializer();
}

class _$HealthResponseInputSerializer
    implements PrimitiveSerializer<HealthResponseInput> {
  @override
  final Iterable<Type> types = const [
    HealthResponseInput,
    _$HealthResponseInput
  ];

  @override
  final String wireName = r'HealthResponseInput';

  Iterable<Object?> _serializeProperties(
    Serializers serializers,
    HealthResponseInput object, {
    FullType specifiedType = FullType.unspecified,
  }) sync* {
    yield r'status';
    yield serializers.serialize(
      object.status,
      specifiedType: const FullType(HealthResponseInputStatusEnum),
    );
  }

  @override
  Object serialize(
    Serializers serializers,
    HealthResponseInput object, {
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
    required HealthResponseInputBuilder result,
    required List<Object?> unhandled,
  }) {
    for (var i = 0; i < serializedList.length; i += 2) {
      final key = serializedList[i] as String;
      final value = serializedList[i + 1];
      switch (key) {
        case r'status':
          final valueDes = serializers.deserialize(
            value,
            specifiedType: const FullType(HealthResponseInputStatusEnum),
          ) as HealthResponseInputStatusEnum;
          result.status = valueDes;
          break;
        default:
          unhandled.add(key);
          unhandled.add(value);
          break;
      }
    }
  }

  @override
  HealthResponseInput deserialize(
    Serializers serializers,
    Object serialized, {
    FullType specifiedType = FullType.unspecified,
  }) {
    final result = HealthResponseInputBuilder();
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

class HealthResponseInputStatusEnum extends EnumClass {
  @BuiltValueEnumConst(wireName: r'ok')
  static const HealthResponseInputStatusEnum ok =
      _$healthResponseInputStatusEnum_ok;

  static Serializer<HealthResponseInputStatusEnum> get serializer =>
      _$healthResponseInputStatusEnumSerializer;

  const HealthResponseInputStatusEnum._(String name) : super(name);

  static BuiltSet<HealthResponseInputStatusEnum> get values =>
      _$healthResponseInputStatusEnumValues;
  static HealthResponseInputStatusEnum valueOf(String name) =>
      _$healthResponseInputStatusEnumValueOf(name);
}
