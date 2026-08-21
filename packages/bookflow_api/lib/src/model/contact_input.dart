//
// AUTO-GENERATED FILE, DO NOT MODIFY!
//

// ignore_for_file: unused_element
import 'package:built_value/built_value.dart';
import 'package:built_value/serializer.dart';

part 'contact_input.g.dart';

/// Someone who has booked, derived from bookings.
///
/// Properties:
/// * [name]
/// * [email]
/// * [phone]
/// * [bookingCount]
/// * [lastBookingAt]
@BuiltValue()
abstract class ContactInput
    implements Built<ContactInput, ContactInputBuilder> {
  @BuiltValueField(wireName: r'name')
  String get name;

  @BuiltValueField(wireName: r'email')
  String get email;

  @BuiltValueField(wireName: r'phone')
  String get phone;

  @BuiltValueField(wireName: r'bookingCount')
  int get bookingCount;

  @BuiltValueField(wireName: r'lastBookingAt')
  String get lastBookingAt;

  ContactInput._();

  factory ContactInput([void updates(ContactInputBuilder b)]) = _$ContactInput;

  @BuiltValueHook(initializeBuilder: true)
  static void _defaults(ContactInputBuilder b) => b;

  @BuiltValueSerializer(custom: true)
  static Serializer<ContactInput> get serializer => _$ContactInputSerializer();
}

class _$ContactInputSerializer implements PrimitiveSerializer<ContactInput> {
  @override
  final Iterable<Type> types = const [ContactInput, _$ContactInput];

  @override
  final String wireName = r'ContactInput';

  Iterable<Object?> _serializeProperties(
    Serializers serializers,
    ContactInput object, {
    FullType specifiedType = FullType.unspecified,
  }) sync* {
    yield r'name';
    yield serializers.serialize(
      object.name,
      specifiedType: const FullType(String),
    );
    yield r'email';
    yield serializers.serialize(
      object.email,
      specifiedType: const FullType(String),
    );
    yield r'phone';
    yield serializers.serialize(
      object.phone,
      specifiedType: const FullType(String),
    );
    yield r'bookingCount';
    yield serializers.serialize(
      object.bookingCount,
      specifiedType: const FullType(int),
    );
    yield r'lastBookingAt';
    yield serializers.serialize(
      object.lastBookingAt,
      specifiedType: const FullType(String),
    );
  }

  @override
  Object serialize(
    Serializers serializers,
    ContactInput object, {
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
    required ContactInputBuilder result,
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
        case r'email':
          final valueDes = serializers.deserialize(
            value,
            specifiedType: const FullType(String),
          ) as String;
          result.email = valueDes;
          break;
        case r'phone':
          final valueDes = serializers.deserialize(
            value,
            specifiedType: const FullType(String),
          ) as String;
          result.phone = valueDes;
          break;
        case r'bookingCount':
          final valueDes = serializers.deserialize(
            value,
            specifiedType: const FullType(int),
          ) as int;
          result.bookingCount = valueDes;
          break;
        case r'lastBookingAt':
          final valueDes = serializers.deserialize(
            value,
            specifiedType: const FullType(String),
          ) as String;
          result.lastBookingAt = valueDes;
          break;
        default:
          unhandled.add(key);
          unhandled.add(value);
          break;
      }
    }
  }

  @override
  ContactInput deserialize(
    Serializers serializers,
    Object serialized, {
    FullType specifiedType = FullType.unspecified,
  }) {
    final result = ContactInputBuilder();
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
