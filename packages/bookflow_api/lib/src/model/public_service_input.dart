//
// AUTO-GENERATED FILE, DO NOT MODIFY!
//

// ignore_for_file: unused_element
import 'package:built_value/built_value.dart';
import 'package:built_value/serializer.dart';

part 'public_service_input.g.dart';

/// A bookable service, as a client sees it.
///
/// Properties:
/// * [id]
/// * [name]
/// * [durationMinutes]
/// * [priceKes] - Whole Kenyan shillings.
@BuiltValue()
abstract class PublicServiceInput
    implements Built<PublicServiceInput, PublicServiceInputBuilder> {
  @BuiltValueField(wireName: r'id')
  String get id;

  @BuiltValueField(wireName: r'name')
  String get name;

  @BuiltValueField(wireName: r'durationMinutes')
  int get durationMinutes;

  /// Whole Kenyan shillings.
  @BuiltValueField(wireName: r'priceKes')
  int get priceKes;

  PublicServiceInput._();

  factory PublicServiceInput([void updates(PublicServiceInputBuilder b)]) =
      _$PublicServiceInput;

  @BuiltValueHook(initializeBuilder: true)
  static void _defaults(PublicServiceInputBuilder b) => b;

  @BuiltValueSerializer(custom: true)
  static Serializer<PublicServiceInput> get serializer =>
      _$PublicServiceInputSerializer();
}

class _$PublicServiceInputSerializer
    implements PrimitiveSerializer<PublicServiceInput> {
  @override
  final Iterable<Type> types = const [PublicServiceInput, _$PublicServiceInput];

  @override
  final String wireName = r'PublicServiceInput';

  Iterable<Object?> _serializeProperties(
    Serializers serializers,
    PublicServiceInput object, {
    FullType specifiedType = FullType.unspecified,
  }) sync* {
    yield r'id';
    yield serializers.serialize(
      object.id,
      specifiedType: const FullType(String),
    );
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
  }

  @override
  Object serialize(
    Serializers serializers,
    PublicServiceInput object, {
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
    required PublicServiceInputBuilder result,
    required List<Object?> unhandled,
  }) {
    for (var i = 0; i < serializedList.length; i += 2) {
      final key = serializedList[i] as String;
      final value = serializedList[i + 1];
      switch (key) {
        case r'id':
          final valueDes = serializers.deserialize(
            value,
            specifiedType: const FullType(String),
          ) as String;
          result.id = valueDes;
          break;
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
        default:
          unhandled.add(key);
          unhandled.add(value);
          break;
      }
    }
  }

  @override
  PublicServiceInput deserialize(
    Serializers serializers,
    Object serialized, {
    FullType specifiedType = FullType.unspecified,
  }) {
    final result = PublicServiceInputBuilder();
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
