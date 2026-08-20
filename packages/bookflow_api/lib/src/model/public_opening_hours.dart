//
// AUTO-GENERATED FILE, DO NOT MODIFY!
//

// ignore_for_file: unused_element
import 'package:built_value/built_value.dart';
import 'package:built_value/serializer.dart';

part 'public_opening_hours.g.dart';

/// One day’s opening hours. An absent day is closed.
///
/// Properties:
/// * [dayOfWeek] - 0 = Monday.
/// * [openTime] - HH:MM, Africa/Nairobi.
/// * [closeTime] - HH:MM, Africa/Nairobi.
@BuiltValue()
abstract class PublicOpeningHours
    implements Built<PublicOpeningHours, PublicOpeningHoursBuilder> {
  /// 0 = Monday.
  @BuiltValueField(wireName: r'dayOfWeek')
  int get dayOfWeek;

  /// HH:MM, Africa/Nairobi.
  @BuiltValueField(wireName: r'openTime')
  String get openTime;

  /// HH:MM, Africa/Nairobi.
  @BuiltValueField(wireName: r'closeTime')
  String get closeTime;

  PublicOpeningHours._();

  factory PublicOpeningHours([void updates(PublicOpeningHoursBuilder b)]) =
      _$PublicOpeningHours;

  @BuiltValueHook(initializeBuilder: true)
  static void _defaults(PublicOpeningHoursBuilder b) => b;

  @BuiltValueSerializer(custom: true)
  static Serializer<PublicOpeningHours> get serializer =>
      _$PublicOpeningHoursSerializer();
}

class _$PublicOpeningHoursSerializer
    implements PrimitiveSerializer<PublicOpeningHours> {
  @override
  final Iterable<Type> types = const [PublicOpeningHours, _$PublicOpeningHours];

  @override
  final String wireName = r'PublicOpeningHours';

  Iterable<Object?> _serializeProperties(
    Serializers serializers,
    PublicOpeningHours object, {
    FullType specifiedType = FullType.unspecified,
  }) sync* {
    yield r'dayOfWeek';
    yield serializers.serialize(
      object.dayOfWeek,
      specifiedType: const FullType(int),
    );
    yield r'openTime';
    yield serializers.serialize(
      object.openTime,
      specifiedType: const FullType(String),
    );
    yield r'closeTime';
    yield serializers.serialize(
      object.closeTime,
      specifiedType: const FullType(String),
    );
  }

  @override
  Object serialize(
    Serializers serializers,
    PublicOpeningHours object, {
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
    required PublicOpeningHoursBuilder result,
    required List<Object?> unhandled,
  }) {
    for (var i = 0; i < serializedList.length; i += 2) {
      final key = serializedList[i] as String;
      final value = serializedList[i + 1];
      switch (key) {
        case r'dayOfWeek':
          final valueDes = serializers.deserialize(
            value,
            specifiedType: const FullType(int),
          ) as int;
          result.dayOfWeek = valueDes;
          break;
        case r'openTime':
          final valueDes = serializers.deserialize(
            value,
            specifiedType: const FullType(String),
          ) as String;
          result.openTime = valueDes;
          break;
        case r'closeTime':
          final valueDes = serializers.deserialize(
            value,
            specifiedType: const FullType(String),
          ) as String;
          result.closeTime = valueDes;
          break;
        default:
          unhandled.add(key);
          unhandled.add(value);
          break;
      }
    }
  }

  @override
  PublicOpeningHours deserialize(
    Serializers serializers,
    Object serialized, {
    FullType specifiedType = FullType.unspecified,
  }) {
    final result = PublicOpeningHoursBuilder();
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
