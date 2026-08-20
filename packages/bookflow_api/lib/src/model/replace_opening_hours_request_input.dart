//
// AUTO-GENERATED FILE, DO NOT MODIFY!
//

// ignore_for_file: unused_element
import 'package:built_collection/built_collection.dart';
import 'package:bookflow_api/src/model/opening_hours_entry_input.dart';
import 'package:built_value/built_value.dart';
import 'package:built_value/serializer.dart';

part 'replace_opening_hours_request_input.g.dart';

/// The week’s opening hours. Replaces whatever is there.
///
/// Properties:
/// * [days]
@BuiltValue()
abstract class ReplaceOpeningHoursRequestInput
    implements
        Built<ReplaceOpeningHoursRequestInput,
            ReplaceOpeningHoursRequestInputBuilder> {
  @BuiltValueField(wireName: r'days')
  BuiltList<OpeningHoursEntryInput> get days;

  ReplaceOpeningHoursRequestInput._();

  factory ReplaceOpeningHoursRequestInput(
          [void updates(ReplaceOpeningHoursRequestInputBuilder b)]) =
      _$ReplaceOpeningHoursRequestInput;

  @BuiltValueHook(initializeBuilder: true)
  static void _defaults(ReplaceOpeningHoursRequestInputBuilder b) => b;

  @BuiltValueSerializer(custom: true)
  static Serializer<ReplaceOpeningHoursRequestInput> get serializer =>
      _$ReplaceOpeningHoursRequestInputSerializer();
}

class _$ReplaceOpeningHoursRequestInputSerializer
    implements PrimitiveSerializer<ReplaceOpeningHoursRequestInput> {
  @override
  final Iterable<Type> types = const [
    ReplaceOpeningHoursRequestInput,
    _$ReplaceOpeningHoursRequestInput
  ];

  @override
  final String wireName = r'ReplaceOpeningHoursRequestInput';

  Iterable<Object?> _serializeProperties(
    Serializers serializers,
    ReplaceOpeningHoursRequestInput object, {
    FullType specifiedType = FullType.unspecified,
  }) sync* {
    yield r'days';
    yield serializers.serialize(
      object.days,
      specifiedType:
          const FullType(BuiltList, [FullType(OpeningHoursEntryInput)]),
    );
  }

  @override
  Object serialize(
    Serializers serializers,
    ReplaceOpeningHoursRequestInput object, {
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
    required ReplaceOpeningHoursRequestInputBuilder result,
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
                const FullType(BuiltList, [FullType(OpeningHoursEntryInput)]),
          ) as BuiltList<OpeningHoursEntryInput>;
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
  ReplaceOpeningHoursRequestInput deserialize(
    Serializers serializers,
    Object serialized, {
    FullType specifiedType = FullType.unspecified,
  }) {
    final result = ReplaceOpeningHoursRequestInputBuilder();
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
