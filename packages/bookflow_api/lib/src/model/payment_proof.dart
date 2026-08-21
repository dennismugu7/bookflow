//
// AUTO-GENERATED FILE, DO NOT MODIFY!
//

// ignore_for_file: unused_element
import 'package:built_value/built_value.dart';
import 'package:built_value/serializer.dart';

part 'payment_proof.g.dart';

/// Temporary access to a booking’s payment proof.
///
/// Properties:
/// * [url] - A signed URL valid for about five minutes. Do not store it — request another.
@BuiltValue()
abstract class PaymentProof
    implements Built<PaymentProof, PaymentProofBuilder> {
  /// A signed URL valid for about five minutes. Do not store it — request another.
  @BuiltValueField(wireName: r'url')
  String get url;

  PaymentProof._();

  factory PaymentProof([void updates(PaymentProofBuilder b)]) = _$PaymentProof;

  @BuiltValueHook(initializeBuilder: true)
  static void _defaults(PaymentProofBuilder b) => b;

  @BuiltValueSerializer(custom: true)
  static Serializer<PaymentProof> get serializer => _$PaymentProofSerializer();
}

class _$PaymentProofSerializer implements PrimitiveSerializer<PaymentProof> {
  @override
  final Iterable<Type> types = const [PaymentProof, _$PaymentProof];

  @override
  final String wireName = r'PaymentProof';

  Iterable<Object?> _serializeProperties(
    Serializers serializers,
    PaymentProof object, {
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
    PaymentProof object, {
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
    required PaymentProofBuilder result,
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
  PaymentProof deserialize(
    Serializers serializers,
    Object serialized, {
    FullType specifiedType = FullType.unspecified,
  }) {
    final result = PaymentProofBuilder();
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
