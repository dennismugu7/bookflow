//
// AUTO-GENERATED FILE, DO NOT MODIFY!
//

// ignore_for_file: unused_element
import 'package:built_collection/built_collection.dart';
import 'package:built_value/built_value.dart';
import 'package:built_value/serializer.dart';

part 'signup_accepted.g.dart';

/// Sign-up accepted; the address must be confirmed before login.
///
/// Properties:
/// * [status] - The request was accepted. If the address could be registered, an activation email has been sent to it.
@BuiltValue()
abstract class SignupAccepted implements Built<SignupAccepted, SignupAcceptedBuilder> {
  /// The request was accepted. If the address could be registered, an activation email has been sent to it.
  @BuiltValueField(wireName: r'status')
  SignupAcceptedStatusEnum get status;
  // enum statusEnum {  confirmation_required,  };

  SignupAccepted._();

  factory SignupAccepted([void updates(SignupAcceptedBuilder b)]) = _$SignupAccepted;

  @BuiltValueHook(initializeBuilder: true)
  static void _defaults(SignupAcceptedBuilder b) => b;

  @BuiltValueSerializer(custom: true)
  static Serializer<SignupAccepted> get serializer => _$SignupAcceptedSerializer();
}

class _$SignupAcceptedSerializer implements PrimitiveSerializer<SignupAccepted> {
  @override
  final Iterable<Type> types = const [SignupAccepted, _$SignupAccepted];

  @override
  final String wireName = r'SignupAccepted';

  Iterable<Object?> _serializeProperties(
    Serializers serializers,
    SignupAccepted object, {
    FullType specifiedType = FullType.unspecified,
  }) sync* {
    yield r'status';
    yield serializers.serialize(
      object.status,
      specifiedType: const FullType(SignupAcceptedStatusEnum),
    );
  }

  @override
  Object serialize(
    Serializers serializers,
    SignupAccepted object, {
    FullType specifiedType = FullType.unspecified,
  }) {
    return _serializeProperties(serializers, object, specifiedType: specifiedType).toList();
  }

  void _deserializeProperties(
    Serializers serializers,
    Object serialized, {
    FullType specifiedType = FullType.unspecified,
    required List<Object?> serializedList,
    required SignupAcceptedBuilder result,
    required List<Object?> unhandled,
  }) {
    for (var i = 0; i < serializedList.length; i += 2) {
      final key = serializedList[i] as String;
      final value = serializedList[i + 1];
      switch (key) {
        case r'status':
          final valueDes = serializers.deserialize(
            value,
            specifiedType: const FullType(SignupAcceptedStatusEnum),
          ) as SignupAcceptedStatusEnum;
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
  SignupAccepted deserialize(
    Serializers serializers,
    Object serialized, {
    FullType specifiedType = FullType.unspecified,
  }) {
    final result = SignupAcceptedBuilder();
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

class SignupAcceptedStatusEnum extends EnumClass {

  /// The request was accepted. If the address could be registered, an activation email has been sent to it.
  @BuiltValueEnumConst(wireName: r'confirmation_required')
  static const SignupAcceptedStatusEnum confirmationRequired = _$signupAcceptedStatusEnum_confirmationRequired;

  static Serializer<SignupAcceptedStatusEnum> get serializer => _$signupAcceptedStatusEnumSerializer;

  const SignupAcceptedStatusEnum._(String name): super(name);

  static BuiltSet<SignupAcceptedStatusEnum> get values => _$signupAcceptedStatusEnumValues;
  static SignupAcceptedStatusEnum valueOf(String name) => _$signupAcceptedStatusEnumValueOf(name);
}

