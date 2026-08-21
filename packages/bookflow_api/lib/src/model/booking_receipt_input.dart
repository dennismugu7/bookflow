//
// AUTO-GENERATED FILE, DO NOT MODIFY!
//

// ignore_for_file: unused_element
import 'package:built_value/built_value.dart';
import 'package:built_value/serializer.dart';

part 'booking_receipt_input.g.dart';

/// Confirmation of a booking, as the person who made it sees it.
///
/// Properties:
/// * [id]
/// * [serviceName]
/// * [durationMinutes]
/// * [priceKes] - Whole Kenyan shillings.
/// * [startsAt] - ISO 8601 instant, UTC.
/// * [status]
@BuiltValue()
abstract class BookingReceiptInput
    implements Built<BookingReceiptInput, BookingReceiptInputBuilder> {
  @BuiltValueField(wireName: r'id')
  String get id;

  @BuiltValueField(wireName: r'serviceName')
  String get serviceName;

  @BuiltValueField(wireName: r'durationMinutes')
  int get durationMinutes;

  /// Whole Kenyan shillings.
  @BuiltValueField(wireName: r'priceKes')
  int get priceKes;

  /// ISO 8601 instant, UTC.
  @BuiltValueField(wireName: r'startsAt')
  String get startsAt;

  @BuiltValueField(wireName: r'status')
  String get status;

  BookingReceiptInput._();

  factory BookingReceiptInput([void updates(BookingReceiptInputBuilder b)]) =
      _$BookingReceiptInput;

  @BuiltValueHook(initializeBuilder: true)
  static void _defaults(BookingReceiptInputBuilder b) => b;

  @BuiltValueSerializer(custom: true)
  static Serializer<BookingReceiptInput> get serializer =>
      _$BookingReceiptInputSerializer();
}

class _$BookingReceiptInputSerializer
    implements PrimitiveSerializer<BookingReceiptInput> {
  @override
  final Iterable<Type> types = const [
    BookingReceiptInput,
    _$BookingReceiptInput
  ];

  @override
  final String wireName = r'BookingReceiptInput';

  Iterable<Object?> _serializeProperties(
    Serializers serializers,
    BookingReceiptInput object, {
    FullType specifiedType = FullType.unspecified,
  }) sync* {
    yield r'id';
    yield serializers.serialize(
      object.id,
      specifiedType: const FullType(String),
    );
    yield r'serviceName';
    yield serializers.serialize(
      object.serviceName,
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
    yield r'startsAt';
    yield serializers.serialize(
      object.startsAt,
      specifiedType: const FullType(String),
    );
    yield r'status';
    yield serializers.serialize(
      object.status,
      specifiedType: const FullType(String),
    );
  }

  @override
  Object serialize(
    Serializers serializers,
    BookingReceiptInput object, {
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
    required BookingReceiptInputBuilder result,
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
        case r'serviceName':
          final valueDes = serializers.deserialize(
            value,
            specifiedType: const FullType(String),
          ) as String;
          result.serviceName = valueDes;
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
        case r'startsAt':
          final valueDes = serializers.deserialize(
            value,
            specifiedType: const FullType(String),
          ) as String;
          result.startsAt = valueDes;
          break;
        case r'status':
          final valueDes = serializers.deserialize(
            value,
            specifiedType: const FullType(String),
          ) as String;
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
  BookingReceiptInput deserialize(
    Serializers serializers,
    Object serialized, {
    FullType specifiedType = FullType.unspecified,
  }) {
    final result = BookingReceiptInputBuilder();
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
