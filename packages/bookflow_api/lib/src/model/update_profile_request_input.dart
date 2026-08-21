//
// AUTO-GENERATED FILE, DO NOT MODIFY!
//

// ignore_for_file: unused_element
import 'package:built_value/built_value.dart';
import 'package:built_value/serializer.dart';

part 'update_profile_request_input.g.dart';

/// The owner’s own name. Both fields are required.
///
/// Properties:
/// * [firstName] - Required. Trimmed. 1–100 characters after trimming.
/// * [lastName] - Required. Trimmed. 1–100 characters after trimming.
@BuiltValue()
abstract class UpdateProfileRequestInput
    implements
        Built<UpdateProfileRequestInput, UpdateProfileRequestInputBuilder> {
  /// Required. Trimmed. 1–100 characters after trimming.
  @BuiltValueField(wireName: r'firstName')
  String get firstName;

  /// Required. Trimmed. 1–100 characters after trimming.
  @BuiltValueField(wireName: r'lastName')
  String get lastName;

  UpdateProfileRequestInput._();

  factory UpdateProfileRequestInput(
          [void updates(UpdateProfileRequestInputBuilder b)]) =
      _$UpdateProfileRequestInput;

  @BuiltValueHook(initializeBuilder: true)
  static void _defaults(UpdateProfileRequestInputBuilder b) => b;

  @BuiltValueSerializer(custom: true)
  static Serializer<UpdateProfileRequestInput> get serializer =>
      _$UpdateProfileRequestInputSerializer();
}

class _$UpdateProfileRequestInputSerializer
    implements PrimitiveSerializer<UpdateProfileRequestInput> {
  @override
  final Iterable<Type> types = const [
    UpdateProfileRequestInput,
    _$UpdateProfileRequestInput
  ];

  @override
  final String wireName = r'UpdateProfileRequestInput';

  Iterable<Object?> _serializeProperties(
    Serializers serializers,
    UpdateProfileRequestInput object, {
    FullType specifiedType = FullType.unspecified,
  }) sync* {
    yield r'firstName';
    yield serializers.serialize(
      object.firstName,
      specifiedType: const FullType(String),
    );
    yield r'lastName';
    yield serializers.serialize(
      object.lastName,
      specifiedType: const FullType(String),
    );
  }

  @override
  Object serialize(
    Serializers serializers,
    UpdateProfileRequestInput object, {
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
    required UpdateProfileRequestInputBuilder result,
    required List<Object?> unhandled,
  }) {
    for (var i = 0; i < serializedList.length; i += 2) {
      final key = serializedList[i] as String;
      final value = serializedList[i + 1];
      switch (key) {
        case r'firstName':
          final valueDes = serializers.deserialize(
            value,
            specifiedType: const FullType(String),
          ) as String;
          result.firstName = valueDes;
          break;
        case r'lastName':
          final valueDes = serializers.deserialize(
            value,
            specifiedType: const FullType(String),
          ) as String;
          result.lastName = valueDes;
          break;
        default:
          unhandled.add(key);
          unhandled.add(value);
          break;
      }
    }
  }

  @override
  UpdateProfileRequestInput deserialize(
    Serializers serializers,
    Object serialized, {
    FullType specifiedType = FullType.unspecified,
  }) {
    final result = UpdateProfileRequestInputBuilder();
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
