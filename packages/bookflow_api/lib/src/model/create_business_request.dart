//
// AUTO-GENERATED FILE, DO NOT MODIFY!
//

// ignore_for_file: unused_element
import 'package:built_value/built_value.dart';
import 'package:built_value/serializer.dart';

part 'create_business_request.g.dart';

/// The business to create. Name only.
///
/// Properties:
/// * [name] - Required. Trimmed. 1–200 characters after trimming.
@BuiltValue()
abstract class CreateBusinessRequest
    implements Built<CreateBusinessRequest, CreateBusinessRequestBuilder> {
  /// Required. Trimmed. 1–200 characters after trimming.
  @BuiltValueField(wireName: r'name')
  String get name;

  CreateBusinessRequest._();

  factory CreateBusinessRequest(
      [void updates(CreateBusinessRequestBuilder b)]) = _$CreateBusinessRequest;

  @BuiltValueHook(initializeBuilder: true)
  static void _defaults(CreateBusinessRequestBuilder b) => b;

  @BuiltValueSerializer(custom: true)
  static Serializer<CreateBusinessRequest> get serializer =>
      _$CreateBusinessRequestSerializer();
}

class _$CreateBusinessRequestSerializer
    implements PrimitiveSerializer<CreateBusinessRequest> {
  @override
  final Iterable<Type> types = const [
    CreateBusinessRequest,
    _$CreateBusinessRequest
  ];

  @override
  final String wireName = r'CreateBusinessRequest';

  Iterable<Object?> _serializeProperties(
    Serializers serializers,
    CreateBusinessRequest object, {
    FullType specifiedType = FullType.unspecified,
  }) sync* {
    yield r'name';
    yield serializers.serialize(
      object.name,
      specifiedType: const FullType(String),
    );
  }

  @override
  Object serialize(
    Serializers serializers,
    CreateBusinessRequest object, {
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
    required CreateBusinessRequestBuilder result,
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
        default:
          unhandled.add(key);
          unhandled.add(value);
          break;
      }
    }
  }

  @override
  CreateBusinessRequest deserialize(
    Serializers serializers,
    Object serialized, {
    FullType specifiedType = FullType.unspecified,
  }) {
    final result = CreateBusinessRequestBuilder();
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
