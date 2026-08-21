//
// AUTO-GENERATED FILE, DO NOT MODIFY!
//

// ignore_for_file: unused_element
import 'package:built_collection/built_collection.dart';
import 'package:built_value/built_value.dart';
import 'package:built_value/serializer.dart';

part 'owner_booking.g.dart';

/// A booking, as the salon owner sees it.
///
/// Properties:
/// * [id]
/// * [serviceName]
/// * [durationMinutes]
/// * [priceKes]
/// * [serviceId]
/// * [teamMemberId]
/// * [teamMemberName]
/// * [clientName]
/// * [clientEmail]
/// * [clientPhone]
/// * [startsAt]
/// * [status]
/// * [paymentProofUrl]
@BuiltValue()
abstract class OwnerBooking
    implements Built<OwnerBooking, OwnerBookingBuilder> {
  @BuiltValueField(wireName: r'id')
  String get id;

  @BuiltValueField(wireName: r'serviceName')
  String get serviceName;

  @BuiltValueField(wireName: r'durationMinutes')
  int get durationMinutes;

  @BuiltValueField(wireName: r'priceKes')
  int get priceKes;

  @BuiltValueField(wireName: r'serviceId')
  String? get serviceId;

  @BuiltValueField(wireName: r'teamMemberId')
  String? get teamMemberId;

  @BuiltValueField(wireName: r'teamMemberName')
  String? get teamMemberName;

  @BuiltValueField(wireName: r'clientName')
  String get clientName;

  @BuiltValueField(wireName: r'clientEmail')
  String get clientEmail;

  @BuiltValueField(wireName: r'clientPhone')
  String get clientPhone;

  @BuiltValueField(wireName: r'startsAt')
  String get startsAt;

  @BuiltValueField(wireName: r'status')
  OwnerBookingStatusEnum get status;
  // enum statusEnum {  booked,  confirmed,  cancelled,  };

  @BuiltValueField(wireName: r'paymentProofUrl')
  String? get paymentProofUrl;

  OwnerBooking._();

  factory OwnerBooking([void updates(OwnerBookingBuilder b)]) = _$OwnerBooking;

  @BuiltValueHook(initializeBuilder: true)
  static void _defaults(OwnerBookingBuilder b) => b;

  @BuiltValueSerializer(custom: true)
  static Serializer<OwnerBooking> get serializer => _$OwnerBookingSerializer();
}

class _$OwnerBookingSerializer implements PrimitiveSerializer<OwnerBooking> {
  @override
  final Iterable<Type> types = const [OwnerBooking, _$OwnerBooking];

  @override
  final String wireName = r'OwnerBooking';

  Iterable<Object?> _serializeProperties(
    Serializers serializers,
    OwnerBooking object, {
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
    yield r'serviceId';
    yield object.serviceId == null
        ? null
        : serializers.serialize(
            object.serviceId,
            specifiedType: const FullType.nullable(String),
          );
    yield r'teamMemberId';
    yield object.teamMemberId == null
        ? null
        : serializers.serialize(
            object.teamMemberId,
            specifiedType: const FullType.nullable(String),
          );
    yield r'teamMemberName';
    yield object.teamMemberName == null
        ? null
        : serializers.serialize(
            object.teamMemberName,
            specifiedType: const FullType.nullable(String),
          );
    yield r'clientName';
    yield serializers.serialize(
      object.clientName,
      specifiedType: const FullType(String),
    );
    yield r'clientEmail';
    yield serializers.serialize(
      object.clientEmail,
      specifiedType: const FullType(String),
    );
    yield r'clientPhone';
    yield serializers.serialize(
      object.clientPhone,
      specifiedType: const FullType(String),
    );
    yield r'startsAt';
    yield serializers.serialize(
      object.startsAt,
      specifiedType: const FullType(String),
    );
    yield r'status';
    yield serializers.serialize(
      object.status,
      specifiedType: const FullType(OwnerBookingStatusEnum),
    );
    yield r'paymentProofUrl';
    yield object.paymentProofUrl == null
        ? null
        : serializers.serialize(
            object.paymentProofUrl,
            specifiedType: const FullType.nullable(String),
          );
  }

  @override
  Object serialize(
    Serializers serializers,
    OwnerBooking object, {
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
    required OwnerBookingBuilder result,
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
        case r'serviceId':
          final valueDes = serializers.deserialize(
            value,
            specifiedType: const FullType.nullable(String),
          ) as String?;
          if (valueDes == null) continue;
          result.serviceId = valueDes;
          break;
        case r'teamMemberId':
          final valueDes = serializers.deserialize(
            value,
            specifiedType: const FullType.nullable(String),
          ) as String?;
          if (valueDes == null) continue;
          result.teamMemberId = valueDes;
          break;
        case r'teamMemberName':
          final valueDes = serializers.deserialize(
            value,
            specifiedType: const FullType.nullable(String),
          ) as String?;
          if (valueDes == null) continue;
          result.teamMemberName = valueDes;
          break;
        case r'clientName':
          final valueDes = serializers.deserialize(
            value,
            specifiedType: const FullType(String),
          ) as String;
          result.clientName = valueDes;
          break;
        case r'clientEmail':
          final valueDes = serializers.deserialize(
            value,
            specifiedType: const FullType(String),
          ) as String;
          result.clientEmail = valueDes;
          break;
        case r'clientPhone':
          final valueDes = serializers.deserialize(
            value,
            specifiedType: const FullType(String),
          ) as String;
          result.clientPhone = valueDes;
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
            specifiedType: const FullType(OwnerBookingStatusEnum),
          ) as OwnerBookingStatusEnum;
          result.status = valueDes;
          break;
        case r'paymentProofUrl':
          final valueDes = serializers.deserialize(
            value,
            specifiedType: const FullType.nullable(String),
          ) as String?;
          if (valueDes == null) continue;
          result.paymentProofUrl = valueDes;
          break;
        default:
          unhandled.add(key);
          unhandled.add(value);
          break;
      }
    }
  }

  @override
  OwnerBooking deserialize(
    Serializers serializers,
    Object serialized, {
    FullType specifiedType = FullType.unspecified,
  }) {
    final result = OwnerBookingBuilder();
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

class OwnerBookingStatusEnum extends EnumClass {
  @BuiltValueEnumConst(wireName: r'booked')
  static const OwnerBookingStatusEnum booked = _$ownerBookingStatusEnum_booked;
  @BuiltValueEnumConst(wireName: r'confirmed')
  static const OwnerBookingStatusEnum confirmed =
      _$ownerBookingStatusEnum_confirmed;
  @BuiltValueEnumConst(wireName: r'cancelled')
  static const OwnerBookingStatusEnum cancelled =
      _$ownerBookingStatusEnum_cancelled;

  static Serializer<OwnerBookingStatusEnum> get serializer =>
      _$ownerBookingStatusEnumSerializer;

  const OwnerBookingStatusEnum._(String name) : super(name);

  static BuiltSet<OwnerBookingStatusEnum> get values =>
      _$ownerBookingStatusEnumValues;
  static OwnerBookingStatusEnum valueOf(String name) =>
      _$ownerBookingStatusEnumValueOf(name);
}
