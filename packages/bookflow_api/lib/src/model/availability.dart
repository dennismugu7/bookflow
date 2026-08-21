//
// AUTO-GENERATED FILE, DO NOT MODIFY!
//

// ignore_for_file: unused_element
import 'package:built_collection/built_collection.dart';
import 'package:built_value/built_value.dart';
import 'package:built_value/serializer.dart';

part 'availability.g.dart';

/// The bookable start times for one service on one day.
///
/// Properties:
/// * [slots] - Start times as HH:MM, local. Empty when nothing is free.
@BuiltValue()
abstract class Availability
    implements Built<Availability, AvailabilityBuilder> {
  /// Start times as HH:MM, local. Empty when nothing is free.
  @BuiltValueField(wireName: r'slots')
  BuiltList<String> get slots;

  Availability._();

  factory Availability([void updates(AvailabilityBuilder b)]) = _$Availability;

  @BuiltValueHook(initializeBuilder: true)
  static void _defaults(AvailabilityBuilder b) => b;

  @BuiltValueSerializer(custom: true)
  static Serializer<Availability> get serializer => _$AvailabilitySerializer();
}

class _$AvailabilitySerializer implements PrimitiveSerializer<Availability> {
  @override
  final Iterable<Type> types = const [Availability, _$Availability];

  @override
  final String wireName = r'Availability';

  Iterable<Object?> _serializeProperties(
    Serializers serializers,
    Availability object, {
    FullType specifiedType = FullType.unspecified,
  }) sync* {
    yield r'slots';
    yield serializers.serialize(
      object.slots,
      specifiedType: const FullType(BuiltList, [FullType(String)]),
    );
  }

  @override
  Object serialize(
    Serializers serializers,
    Availability object, {
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
    required AvailabilityBuilder result,
    required List<Object?> unhandled,
  }) {
    for (var i = 0; i < serializedList.length; i += 2) {
      final key = serializedList[i] as String;
      final value = serializedList[i + 1];
      switch (key) {
        case r'slots':
          final valueDes = serializers.deserialize(
            value,
            specifiedType: const FullType(BuiltList, [FullType(String)]),
          ) as BuiltList<String>;
          result.slots.replace(valueDes);
          break;
        default:
          unhandled.add(key);
          unhandled.add(value);
          break;
      }
    }
  }

  @override
  Availability deserialize(
    Serializers serializers,
    Object serialized, {
    FullType specifiedType = FullType.unspecified,
  }) {
    final result = AvailabilityBuilder();
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
