//
// AUTO-GENERATED FILE, DO NOT MODIFY!
//

// ignore_for_file: unused_element
import 'package:built_value/built_value.dart';
import 'package:built_value/serializer.dart';

part 'delete_account_request_input.g.dart';

/// Optional feedback accompanying an account deletion.
///
/// Properties:
/// * [reason] - Free text from the exit survey. Logged, never stored.
@BuiltValue()
abstract class DeleteAccountRequestInput
    implements
        Built<DeleteAccountRequestInput, DeleteAccountRequestInputBuilder> {
  /// Free text from the exit survey. Logged, never stored.
  @BuiltValueField(wireName: r'reason')
  String? get reason;

  DeleteAccountRequestInput._();

  factory DeleteAccountRequestInput(
          [void updates(DeleteAccountRequestInputBuilder b)]) =
      _$DeleteAccountRequestInput;

  @BuiltValueHook(initializeBuilder: true)
  static void _defaults(DeleteAccountRequestInputBuilder b) => b;

  @BuiltValueSerializer(custom: true)
  static Serializer<DeleteAccountRequestInput> get serializer =>
      _$DeleteAccountRequestInputSerializer();
}

class _$DeleteAccountRequestInputSerializer
    implements PrimitiveSerializer<DeleteAccountRequestInput> {
  @override
  final Iterable<Type> types = const [
    DeleteAccountRequestInput,
    _$DeleteAccountRequestInput
  ];

  @override
  final String wireName = r'DeleteAccountRequestInput';

  Iterable<Object?> _serializeProperties(
    Serializers serializers,
    DeleteAccountRequestInput object, {
    FullType specifiedType = FullType.unspecified,
  }) sync* {
    if (object.reason != null) {
      yield r'reason';
      yield serializers.serialize(
        object.reason,
        specifiedType: const FullType(String),
      );
    }
  }

  @override
  Object serialize(
    Serializers serializers,
    DeleteAccountRequestInput object, {
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
    required DeleteAccountRequestInputBuilder result,
    required List<Object?> unhandled,
  }) {
    for (var i = 0; i < serializedList.length; i += 2) {
      final key = serializedList[i] as String;
      final value = serializedList[i + 1];
      switch (key) {
        case r'reason':
          final valueDes = serializers.deserialize(
            value,
            specifiedType: const FullType(String),
          ) as String;
          result.reason = valueDes;
          break;
        default:
          unhandled.add(key);
          unhandled.add(value);
          break;
      }
    }
  }

  @override
  DeleteAccountRequestInput deserialize(
    Serializers serializers,
    Object serialized, {
    FullType specifiedType = FullType.unspecified,
  }) {
    final result = DeleteAccountRequestInputBuilder();
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
