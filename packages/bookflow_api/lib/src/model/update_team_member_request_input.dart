//
// AUTO-GENERATED FILE, DO NOT MODIFY!
//

// ignore_for_file: unused_element
import 'package:built_value/built_value.dart';
import 'package:built_value/serializer.dart';

part 'update_team_member_request_input.g.dart';

/// The fields to change. At least one.
///
/// Properties:
/// * [name] - Required. Trimmed. 1–200 characters after trimming.
/// * [role] - Job title, e.g. \"Senior stylist\". NOT an authorization role.
/// * [about]
/// * [photoUrl]
/// * [position]
@BuiltValue()
abstract class UpdateTeamMemberRequestInput
    implements
        Built<UpdateTeamMemberRequestInput,
            UpdateTeamMemberRequestInputBuilder> {
  /// Required. Trimmed. 1–200 characters after trimming.
  @BuiltValueField(wireName: r'name')
  String? get name;

  /// Job title, e.g. \"Senior stylist\". NOT an authorization role.
  @BuiltValueField(wireName: r'role')
  String? get role;

  @BuiltValueField(wireName: r'about')
  String? get about;

  @BuiltValueField(wireName: r'photoUrl')
  String? get photoUrl;

  @BuiltValueField(wireName: r'position')
  int? get position;

  UpdateTeamMemberRequestInput._();

  factory UpdateTeamMemberRequestInput(
          [void updates(UpdateTeamMemberRequestInputBuilder b)]) =
      _$UpdateTeamMemberRequestInput;

  @BuiltValueHook(initializeBuilder: true)
  static void _defaults(UpdateTeamMemberRequestInputBuilder b) => b;

  @BuiltValueSerializer(custom: true)
  static Serializer<UpdateTeamMemberRequestInput> get serializer =>
      _$UpdateTeamMemberRequestInputSerializer();
}

class _$UpdateTeamMemberRequestInputSerializer
    implements PrimitiveSerializer<UpdateTeamMemberRequestInput> {
  @override
  final Iterable<Type> types = const [
    UpdateTeamMemberRequestInput,
    _$UpdateTeamMemberRequestInput
  ];

  @override
  final String wireName = r'UpdateTeamMemberRequestInput';

  Iterable<Object?> _serializeProperties(
    Serializers serializers,
    UpdateTeamMemberRequestInput object, {
    FullType specifiedType = FullType.unspecified,
  }) sync* {
    if (object.name != null) {
      yield r'name';
      yield serializers.serialize(
        object.name,
        specifiedType: const FullType(String),
      );
    }
    if (object.role != null) {
      yield r'role';
      yield serializers.serialize(
        object.role,
        specifiedType: const FullType(String),
      );
    }
    if (object.about != null) {
      yield r'about';
      yield serializers.serialize(
        object.about,
        specifiedType: const FullType(String),
      );
    }
    if (object.photoUrl != null) {
      yield r'photoUrl';
      yield serializers.serialize(
        object.photoUrl,
        specifiedType: const FullType(String),
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
    UpdateTeamMemberRequestInput object, {
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
    required UpdateTeamMemberRequestInputBuilder result,
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
        case r'role':
          final valueDes = serializers.deserialize(
            value,
            specifiedType: const FullType(String),
          ) as String;
          result.role = valueDes;
          break;
        case r'about':
          final valueDes = serializers.deserialize(
            value,
            specifiedType: const FullType(String),
          ) as String;
          result.about = valueDes;
          break;
        case r'photoUrl':
          final valueDes = serializers.deserialize(
            value,
            specifiedType: const FullType(String),
          ) as String;
          result.photoUrl = valueDes;
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
  UpdateTeamMemberRequestInput deserialize(
    Serializers serializers,
    Object serialized, {
    FullType specifiedType = FullType.unspecified,
  }) {
    final result = UpdateTeamMemberRequestInputBuilder();
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
