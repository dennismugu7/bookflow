//
// AUTO-GENERATED FILE, DO NOT MODIFY!
//

// ignore_for_file: unused_element
import 'package:built_value/built_value.dart';
import 'package:built_value/serializer.dart';

part 'rename_business_request_input.g.dart';

/// A new name for the business. The only editable field.
///
/// Properties:
/// * [name] - Required. Trimmed. 1–200 characters after trimming.
@BuiltValue()
abstract class RenameBusinessRequestInput
    implements
        Built<RenameBusinessRequestInput, RenameBusinessRequestInputBuilder> {
  /// Required. Trimmed. 1–200 characters after trimming.
  @BuiltValueField(wireName: r'name')
  String get name;

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
