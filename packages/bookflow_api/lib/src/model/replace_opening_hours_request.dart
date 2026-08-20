//
// AUTO-GENERATED FILE, DO NOT MODIFY!
//

// ignore_for_file: unused_element
import 'package:built_collection/built_collection.dart';
import 'package:bookflow_api/src/model/opening_hours_entry.dart';
import 'package:built_value/built_value.dart';
import 'package:built_value/serializer.dart';

part 'replace_opening_hours_request.g.dart';

/// The week’s opening hours. Replaces whatever is there.
///
/// Properties:
/// * [days]
@BuiltValue()
abstract class ReplaceOpeningHoursRequest
    implements
        Built<ReplaceOpeningHoursRequest, ReplaceOpeningHoursRequestBuilder> {
  @BuiltValueField(wireName: r'days')
  BuiltList<OpeningHoursEntry> get days;

  ReplaceOpeningHoursRequest._();

  factory ReplaceOpeningHoursRequest(
          [void updates(ReplaceOpeningHoursRequestBuilder b)]) =
      _$ReplaceOpeningHoursRequest;

  @BuiltValueHook(initializeBuilder: true)
  static void _defaults(ReplaceOpeningHoursRequestBuilder b) => b;

  @BuiltValueSerializer(custom: true)
  static Serializer<ReplaceOpeningHoursRequest> get serializer =>
      _$ReplaceOpeningHoursRequestSerializer();
}

class _$ReplaceOpeningHoursRequestSerializer
    implements PrimitiveSerializer<ReplaceOpeningHoursRequest> {
  @override
  final Iterable<Type> types = const [
    ReplaceOpeningHoursRequest,
    _$ReplaceOpeningHoursRequest
  ];

  @override
  final String wireName = r'ReplaceOpeningHoursRequest';

  Iterable<Object?> _serializeProperties(
    Serializers serializers,
    ReplaceOpeningHoursRequest object, {
    FullType specifiedType = FullType.unspecified,
  }) sync* {
    yield r'days';
    yield serializers.serialize(
      object.days,
      specifiedType: const FullType(BuiltList, [FullType(OpeningHoursEntry)]),
    );
  }

  @override
  Object serialize(
    Serializers serializers,
    ReplaceOpeningHoursRequest object, {
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
    required ReplaceOpeningHoursRequestBuilder result,
    required List<Object?> unhandled,
  }) {
    for (var i = 0; i < serializedList.length; i += 2) {
      final key = serializedList[i] as String;
      final value = serializedList[i + 1];
      switch (key) {
        case r'days':
          final valueDes = serializers.deserialize(
            value,
            specifiedType:
                const FullType(BuiltList, [FullType(OpeningHoursEntry)]),
          ) as BuiltList<OpeningHoursEntry>;
          result.days.replace(valueDes);
          break;
        default:
          unhandled.add(key);
          unhandled.add(value);
          break;
      }
    }
  }

  @override
  ReplaceOpeningHoursRequest deserialize(
    Serializers serializers,
    Object serialized, {
    FullType specifiedType = FullType.unspecified,
  }) {
    final result = ReplaceOpeningHoursRequestBuilder();
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
