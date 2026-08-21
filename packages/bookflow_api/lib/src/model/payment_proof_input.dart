//
// AUTO-GENERATED FILE, DO NOT MODIFY!
//

// ignore_for_file: unused_element
import 'package:built_value/built_value.dart';
import 'package:built_value/serializer.dart';

part 'payment_proof_input.g.dart';

/// Temporary access to a booking’s payment proof.
///
/// Properties:
/// * [url] - A signed URL valid for about five minutes. Do not store it — request another.
@BuiltValue()
abstract class PaymentProofInput
    implements Built<PaymentProofInput, PaymentProofInputBuilder> {
  /// A signed URL valid for about five minutes. Do not store it — request another.
  @BuiltValueField(wireName: r'url')
  String get url;

  PaymentProofInput._();

  factory PaymentProofInput([void updates(PaymentProofInputBuilder b)]) =
      _$PaymentProofInput;

  @BuiltValueHook(initializeBuilder: true)
  static void _defaults(PaymentProofInputBuilder b) => b;

  @BuiltValueSerializer(custom: true)
  static Serializer<PaymentProofInput> get serializer =>
      _$PaymentProofInputSerializer();
}

class _$PaymentProofInputSerializer
    implements PrimitiveSerializer<PaymentProofInput> {
  @override
  final Iterable<Type> types = const [PaymentProofInput, _$PaymentProofInput];

  @override
  final String wireName = r'PaymentProofInput';

  Iterable<Object?> _serializeProperties(
    Serializers serializers,
    PaymentProofInput object, {
    FullType specifiedType = FullType.unspecified,
  }) sync* {
    yield r'url';
    yield serializers.serialize(
      object.url,
      specifiedType: const FullType(String),
    );
  }

  @override
  Object serialize(
    Serializers serializers,
    PaymentProofInput object, {
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
    required PaymentProofInputBuilder result,
    required List<Object?> unhandled,
  }) {
    for (var i = 0; i < serializedList.length; i += 2) {
      final key = serializedList[i] as String;
      final value = serializedList[i + 1];
      switch (key) {
        case r'url':
          final valueDes = serializers.deserialize(
            value,
            specifiedType: const FullType(String),
          ) as String;
          result.url = valueDes;
          break;
        default:
          unhandled.add(key);
          unhandled.add(value);
          break;
      }
    }
  }

  @override
  PaymentProofInput deserialize(
    Serializers serializers,
    Object serialized, {
    FullType specifiedType = FullType.unspecified,
  }) {
    final result = PaymentProofInputBuilder();
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
