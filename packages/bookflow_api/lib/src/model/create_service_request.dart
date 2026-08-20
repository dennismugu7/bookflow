//
// AUTO-GENERATED FILE, DO NOT MODIFY!
//

// ignore_for_file: unused_element
import 'package:built_value/built_value.dart';
import 'package:built_value/serializer.dart';

part 'create_service_request.g.dart';

/// A service to add.
///
/// Properties:
/// * [name] - Required. Trimmed. 1–200 characters after trimming.
/// * [durationMinutes] - Whole minutes. 1–1440.
/// * [priceKes] - Whole Kenyan shillings. Not minor units — see the schema note.
/// * [position] - Display order. Ties break on creation time.
@BuiltValue()
abstract class CreateServiceRequest
    implements Built<CreateServiceRequest, CreateServiceRequestBuilder> {
  /// Required. Trimmed. 1–200 characters after trimming.
  @BuiltValueField(wireName: r'name')
  String get name;

  /// Whole minutes. 1–1440.
  @BuiltValueField(wireName: r'durationMinutes')
  int get durationMinutes;

  /// Whole Kenyan shillings. Not minor units — see the schema note.
  @BuiltValueField(wireName: r'priceKes')
  int get priceKes;

  /// Display order. Ties break on creation time.
  @BuiltValueField(wireName: r'position')
  int? get position;

  CreateServiceRequest._();

  factory CreateServiceRequest([void updates(CreateServiceRequestBuilder b)]) =
      _$CreateServiceRequest;

  @BuiltValueHook(initializeBuilder: true)
  static void _defaults(CreateServiceRequestBuilder b) => b;

  @BuiltValueSerializer(custom: true)
  static Serializer<CreateServiceRequest> get serializer =>
      _$CreateServiceRequestSerializer();
}

class _$CreateServiceRequestSerializer
    implements PrimitiveSerializer<CreateServiceRequest> {
  @override
  final Iterable<Type> types = const [
    CreateServiceRequest,
    _$CreateServiceRequest
  ];

  @override
  final String wireName = r'CreateServiceRequest';

  Iterable<Object?> _serializeProperties(
    Serializers serializers,
    CreateServiceRequest object, {
    FullType specifiedType = FullType.unspecified,
  }) sync* {
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
    CreateServiceRequest object, {
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
    required CreateServiceRequestBuilder result,
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
  CreateServiceRequest deserialize(
    Serializers serializers,
    Object serialized, {
    FullType specifiedType = FullType.unspecified,
  }) {
    final result = CreateServiceRequestBuilder();
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
