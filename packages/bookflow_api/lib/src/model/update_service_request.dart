//
// AUTO-GENERATED FILE, DO NOT MODIFY!
//

// ignore_for_file: unused_element
import 'package:built_value/built_value.dart';
import 'package:built_value/serializer.dart';

part 'update_service_request.g.dart';

/// The fields to change. At least one.
///
/// Properties:
/// * [name] - Required. Trimmed. 1–200 characters after trimming.
/// * [durationMinutes] - Whole minutes. 1–1440.
/// * [priceKes] - Whole Kenyan shillings. Not minor units — see the schema note.
/// * [position] - Display order. Ties break on creation time.
@BuiltValue()
abstract class UpdateServiceRequest
    implements Built<UpdateServiceRequest, UpdateServiceRequestBuilder> {
  /// Required. Trimmed. 1–200 characters after trimming.
  @BuiltValueField(wireName: r'name')
  String? get name;

  /// Whole minutes. 1–1440.
  @BuiltValueField(wireName: r'durationMinutes')
  int? get durationMinutes;

  /// Whole Kenyan shillings. Not minor units — see the schema note.
  @BuiltValueField(wireName: r'priceKes')
  int? get priceKes;

  /// Display order. Ties break on creation time.
  @BuiltValueField(wireName: r'position')
  int? get position;

  UpdateServiceRequest._();

  factory UpdateServiceRequest([void updates(UpdateServiceRequestBuilder b)]) =
      _$UpdateServiceRequest;

  @BuiltValueHook(initializeBuilder: true)
  static void _defaults(UpdateServiceRequestBuilder b) => b;

  @BuiltValueSerializer(custom: true)
  static Serializer<UpdateServiceRequest> get serializer =>
      _$UpdateServiceRequestSerializer();
}

class _$UpdateServiceRequestSerializer
    implements PrimitiveSerializer<UpdateServiceRequest> {
  @override
  final Iterable<Type> types = const [
    UpdateServiceRequest,
    _$UpdateServiceRequest
  ];

  @override
  final String wireName = r'UpdateServiceRequest';

  Iterable<Object?> _serializeProperties(
    Serializers serializers,
    UpdateServiceRequest object, {
    FullType specifiedType = FullType.unspecified,
  }) sync* {
    if (object.name != null) {
      yield r'name';
      yield serializers.serialize(
        object.name,
        specifiedType: const FullType(String),
      );
    }
    if (object.durationMinutes != null) {
      yield r'durationMinutes';
      yield serializers.serialize(
        object.durationMinutes,
        specifiedType: const FullType(int),
      );
    }
    if (object.priceKes != null) {
      yield r'priceKes';
      yield serializers.serialize(
        object.priceKes,
        specifiedType: const FullType(int),
      );
    }
    if (object.position != null) {
      yield r'position';
      yield serializers.serialize(
        object.position,
        specifiedType: const FullType(int),
      );
    }
  }

  @override
  Object serialize(
    Serializers serializers,
    UpdateServiceRequest object, {
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
    required UpdateServiceRequestBuilder result,
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
        case r'position':
          final valueDes = serializers.deserialize(
            value,
            specifiedType: const FullType(int),
          ) as int;
          result.position = valueDes;
          break;
        default:
          unhandled.add(key);
          unhandled.add(value);
          break;
      }
    }
  }

  @override
  UpdateServiceRequest deserialize(
    Serializers serializers,
    Object serialized, {
    FullType specifiedType = FullType.unspecified,
  }) {
    final result = UpdateServiceRequestBuilder();
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
