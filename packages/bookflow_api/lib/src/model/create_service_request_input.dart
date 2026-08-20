//
// AUTO-GENERATED FILE, DO NOT MODIFY!
//

// ignore_for_file: unused_element
import 'package:built_value/built_value.dart';
import 'package:built_value/serializer.dart';

part 'create_service_request_input.g.dart';

/// A service to add.
///
/// Properties:
/// * [name] - Required. Trimmed. 1–200 characters after trimming.
/// * [durationMinutes] - Whole minutes. 1–1440.
/// * [priceKes] - Whole Kenyan shillings. Not minor units — see the schema note.
/// * [position] - Display order. Ties break on creation time.
@BuiltValue()
abstract class CreateServiceRequestInput
    implements
        Built<CreateServiceRequestInput, CreateServiceRequestInputBuilder> {
  /// Required. Trimmed. 1–200 characters after trimming.
  @BuiltValueField(wireName: r'name')
  String get name;

  /// Whole minutes. 1–1440.
  @BuiltValueField(wireName: r'durationMinutes')
  int get durationMinutes;

  /// Whole Kenyan shillings. Not minor units — see the schema note.
  @BuiltValueField(wireName: r'priceKes')
  int get priceKes;

  /// Display order. Ties break on creation time.
  @BuiltValueField(wireName: r'position')
  int? get position;

  CreateServiceRequestInput._();

  factory CreateServiceRequestInput(
          [void updates(CreateServiceRequestInputBuilder b)]) =
      _$CreateServiceRequestInput;

  @BuiltValueHook(initializeBuilder: true)
  static void _defaults(CreateServiceRequestInputBuilder b) => b;

  @BuiltValueSerializer(custom: true)
  static Serializer<CreateServiceRequestInput> get serializer =>
      _$CreateServiceRequestInputSerializer();
}

class _$CreateServiceRequestInputSerializer
    implements PrimitiveSerializer<CreateServiceRequestInput> {
  @override
  final Iterable<Type> types = const [
    CreateServiceRequestInput,
    _$CreateServiceRequestInput
  ];

  @override
  final String wireName = r'CreateServiceRequestInput';

  Iterable<Object?> _serializeProperties(
    Serializers serializers,
    CreateServiceRequestInput object, {
    FullType specifiedType = FullType.unspecified,
  }) sync* {
    yield r'name';
    yield serializers.serialize(
      object.name,
      specifiedType: const FullType(String),
    );
    yield r'durationMinutes';
    yield serializers.serialize(
      object.durationMinutes,
      specifiedType: const FullType(int),
    );
    yield r'priceKes';
    yield serializers.serialize(
      object.priceKes,
      specifiedType: const FullType(int),
    );
    if (object.position != null) {
      yield r'position';
      yield serializers.serialize(
        object.position,
        specifiedType: const FullType(int),
      );
    }
  }

  @override
  Object serialize(
    Serializers serializers,
    CreateServiceRequestInput object, {
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
    required CreateServiceRequestInputBuilder result,
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
        case r'durationMinutes':
          final valueDes = serializers.deserialize(
            value,
            specifiedType: const FullType(int),
          ) as int;
          result.durationMinutes = valueDes;
          break;
        case r'priceKes':
          final valueDes = serializers.deserialize(
            value,
            specifiedType: const FullType(int),
          ) as int;
          result.priceKes = valueDes;
          break;
        case r'position':
          final valueDes = serializers.deserialize(
            value,
            specifiedType: const FullType(int),
          ) as int;
          result.position = valueDes;
          break;
        default:
          unhandled.add(key);
          unhandled.add(value);
          break;
      }
    }
  }

  @override
  CreateServiceRequestInput deserialize(
    Serializers serializers,
    Object serialized, {
    FullType specifiedType = FullType.unspecified,
  }) {
    final result = CreateServiceRequestInputBuilder();
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
