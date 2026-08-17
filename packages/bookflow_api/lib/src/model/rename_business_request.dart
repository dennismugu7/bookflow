//
// AUTO-GENERATED FILE, DO NOT MODIFY!
//

// ignore_for_file: unused_element
import 'package:built_value/built_value.dart';
import 'package:built_value/serializer.dart';

part 'rename_business_request.g.dart';

/// A new name for the business. The only editable field.
///
/// Properties:
/// * [name] - Required. Trimmed. 1–200 characters after trimming.
@BuiltValue()
abstract class RenameBusinessRequest implements Built<RenameBusinessRequest, RenameBusinessRequestBuilder> {
  /// Required. Trimmed. 1–200 characters after trimming.
  @BuiltValueField(wireName: r'name')
  String get name;

  RenameBusinessRequest._();

  factory RenameBusinessRequest([void updates(RenameBusinessRequestBuilder b)]) = _$RenameBusinessRequest;

  @BuiltValueHook(initializeBuilder: true)
  static void _defaults(RenameBusinessRequestBuilder b) => b;

  @BuiltValueSerializer(custom: true)
  static Serializer<RenameBusinessRequest> get serializer => _$RenameBusinessRequestSerializer();
}

class _$RenameBusinessRequestSerializer implements PrimitiveSerializer<RenameBusinessRequest> {
  @override
  final Iterable<Type> types = const [RenameBusinessRequest, _$RenameBusinessRequest];

  @override
  final String wireName = r'RenameBusinessRequest';

  Iterable<Object?> _serializeProperties(
    Serializers serializers,
    RenameBusinessRequest object, {
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
    RenameBusinessRequest object, {
    FullType specifiedType = FullType.unspecified,
  }) {
    return _serializeProperties(serializers, object, specifiedType: specifiedType).toList();
  }

  void _deserializeProperties(
    Serializers serializers,
    Object serialized, {
    FullType specifiedType = FullType.unspecified,
    required List<Object?> serializedList,
    required RenameBusinessRequestBuilder result,
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
  RenameBusinessRequest deserialize(
    Serializers serializers,
    Object serialized, {
    FullType specifiedType = FullType.unspecified,
  }) {
    final result = RenameBusinessRequestBuilder();
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

