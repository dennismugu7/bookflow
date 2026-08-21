//
// AUTO-GENERATED FILE, DO NOT MODIFY!
//

// ignore_for_file: unused_element
import 'package:built_collection/built_collection.dart';
import 'package:built_value/built_value.dart';
import 'package:built_value/serializer.dart';

part 'owner_booking_input.g.dart';

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
abstract class OwnerBookingInput
    implements Built<OwnerBookingInput, OwnerBookingInputBuilder> {
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
  OwnerBookingInputStatusEnum get status;
  // enum statusEnum {  booked,  confirmed,  cancelled,  };

  @BuiltValueField(wireName: r'paymentProofUrl')
  String? get paymentProofUrl;

  OwnerBookingInput._();

  factory OwnerBookingInput([void updates(OwnerBookingInputBuilder b)]) =
      _$OwnerBookingInput;

  @BuiltValueHook(initializeBuilder: true)
  static void _defaults(OwnerBookingInputBuilder b) => b;

  @BuiltValueSerializer(custom: true)
  static Serializer<OwnerBookingInput> get serializer =>
      _$OwnerBookingInputSerializer();
}

class _$OwnerBookingInputSerializer
    implements PrimitiveSerializer<OwnerBookingInput> {
  @override
  final Iterable<Type> types = const [OwnerBookingInput, _$OwnerBookingInput];

  @override
  final String wireName = r'OwnerBookingInput';

  Iterable<Object?> _serializeProperties(
    Serializers serializers,
    OwnerBookingInput object, {
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
      specifiedType: const FullType(OwnerBookingInputStatusEnum),
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
    OwnerBookingInput object, {
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
    required OwnerBookingInputBuilder result,
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
            specifiedType: const FullType(OwnerBookingInputStatusEnum),
          ) as OwnerBookingInputStatusEnum;
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
  OwnerBookingInput deserialize(
    Serializers serializers,
    Object serialized, {
    FullType specifiedType = FullType.unspecified,
  }) {
    final result = OwnerBookingInputBuilder();
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

class OwnerBookingInputStatusEnum extends EnumClass {
  @BuiltValueEnumConst(wireName: r'booked')
  static const OwnerBookingInputStatusEnum booked =
      _$ownerBookingInputStatusEnum_booked;
  @BuiltValueEnumConst(wireName: r'confirmed')
  static const OwnerBookingInputStatusEnum confirmed =
      _$ownerBookingInputStatusEnum_confirmed;
  @BuiltValueEnumConst(wireName: r'cancelled')
  static const OwnerBookingInputStatusEnum cancelled =
      _$ownerBookingInputStatusEnum_cancelled;

  static Serializer<OwnerBookingInputStatusEnum> get serializer =>
      _$ownerBookingInputStatusEnumSerializer;

  const OwnerBookingInputStatusEnum._(String name) : super(name);

  static BuiltSet<OwnerBookingInputStatusEnum> get values =>
      _$ownerBookingInputStatusEnumValues;
  static OwnerBookingInputStatusEnum valueOf(String name) =>
      _$ownerBookingInputStatusEnumValueOf(name);
}
