//
// AUTO-GENERATED FILE, DO NOT MODIFY!
//

// ignore_for_file: unused_element
import 'package:built_collection/built_collection.dart';
import 'package:built_value/built_value.dart';
import 'package:built_value/serializer.dart';

part 'signup_accepted_input.g.dart';

/// Sign-up accepted; the address must be confirmed before login.
///
/// Properties:
/// * [status] - The request was accepted. If the address could be registered, an activation email has been sent to it.
@BuiltValue()
abstract class SignupAcceptedInput
    implements Built<SignupAcceptedInput, SignupAcceptedInputBuilder> {
  /// The request was accepted. If the address could be registered, an activation email has been sent to it.
  @BuiltValueField(wireName: r'status')
  SignupAcceptedInputStatusEnum get status;
  // enum statusEnum {  confirmation_required,  };

  SignupAcceptedInput._();

  factory SignupAcceptedInput([void updates(SignupAcceptedInputBuilder b)]) =
      _$SignupAcceptedInput;

  @BuiltValueHook(initializeBuilder: true)
  static void _defaults(SignupAcceptedInputBuilder b) => b;

  @BuiltValueSerializer(custom: true)
  static Serializer<SignupAcceptedInput> get serializer =>
      _$SignupAcceptedInputSerializer();
}

class _$SignupAcceptedInputSerializer
    implements PrimitiveSerializer<SignupAcceptedInput> {
  @override
  final Iterable<Type> types = const [
    SignupAcceptedInput,
    _$SignupAcceptedInput
  ];

  @override
  final String wireName = r'SignupAcceptedInput';

  Iterable<Object?> _serializeProperties(
    Serializers serializers,
    SignupAcceptedInput object, {
    FullType specifiedType = FullType.unspecified,
  }) sync* {
    yield r'status';
    yield serializers.serialize(
      object.status,
      specifiedType: const FullType(SignupAcceptedInputStatusEnum),
    );
  }

  @override
  Object serialize(
    Serializers serializers,
    SignupAcceptedInput object, {
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
    required SignupAcceptedInputBuilder result,
    required List<Object?> unhandled,
  }) {
    for (var i = 0; i < serializedList.length; i += 2) {
      final key = serializedList[i] as String;
      final value = serializedList[i + 1];
      switch (key) {
        case r'status':
          final valueDes = serializers.deserialize(
            value,
            specifiedType: const FullType(SignupAcceptedInputStatusEnum),
          ) as SignupAcceptedInputStatusEnum;
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
  SignupAcceptedInput deserialize(
    Serializers serializers,
    Object serialized, {
    FullType specifiedType = FullType.unspecified,
  }) {
    final result = SignupAcceptedInputBuilder();
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

class SignupAcceptedInputStatusEnum extends EnumClass {
  /// The request was accepted. If the address could be registered, an activation email has been sent to it.
  @BuiltValueEnumConst(wireName: r'confirmation_required')
  static const SignupAcceptedInputStatusEnum confirmationRequired =
      _$signupAcceptedInputStatusEnum_confirmationRequired;

  static Serializer<SignupAcceptedInputStatusEnum> get serializer =>
      _$signupAcceptedInputStatusEnumSerializer;

  const SignupAcceptedInputStatusEnum._(String name) : super(name);

  static BuiltSet<SignupAcceptedInputStatusEnum> get values =>
      _$signupAcceptedInputStatusEnumValues;
  static SignupAcceptedInputStatusEnum valueOf(String name) =>
      _$signupAcceptedInputStatusEnumValueOf(name);
}
