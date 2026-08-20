//
// AUTO-GENERATED FILE, DO NOT MODIFY!
//

// ignore_for_file: unused_element
import 'package:built_value/built_value.dart';
import 'package:built_value/serializer.dart';

part 'public_team_member_input.g.dart';

/// Someone a client can book with.
///
/// Properties:
/// * [id]
/// * [name]
/// * [role]
/// * [about]
/// * [photoUrl]
@BuiltValue()
abstract class PublicTeamMemberInput
    implements Built<PublicTeamMemberInput, PublicTeamMemberInputBuilder> {
  @BuiltValueField(wireName: r'id')
  String get id;

  @BuiltValueField(wireName: r'name')
  String get name;

  @BuiltValueField(wireName: r'role')
  String? get role;

  @BuiltValueField(wireName: r'about')
  String? get about;

  @BuiltValueField(wireName: r'photoUrl')
  String? get photoUrl;

  PublicTeamMemberInput._();

  factory PublicTeamMemberInput(
      [void updates(PublicTeamMemberInputBuilder b)]) = _$PublicTeamMemberInput;

  @BuiltValueHook(initializeBuilder: true)
  static void _defaults(PublicTeamMemberInputBuilder b) => b;

  @BuiltValueSerializer(custom: true)
  static Serializer<PublicTeamMemberInput> get serializer =>
      _$PublicTeamMemberInputSerializer();
}

class _$PublicTeamMemberInputSerializer
    implements PrimitiveSerializer<PublicTeamMemberInput> {
  @override
  final Iterable<Type> types = const [
    PublicTeamMemberInput,
    _$PublicTeamMemberInput
  ];

  @override
  final String wireName = r'PublicTeamMemberInput';

  Iterable<Object?> _serializeProperties(
    Serializers serializers,
    PublicTeamMemberInput object, {
    FullType specifiedType = FullType.unspecified,
  }) sync* {
    yield r'id';
    yield serializers.serialize(
      object.id,
      specifiedType: const FullType(String),
    );
    yield r'name';
    yield serializers.serialize(
      object.name,
      specifiedType: const FullType(String),
    );
    yield r'role';
    yield object.role == null
        ? null
        : serializers.serialize(
            object.role,
            specifiedType: const FullType.nullable(String),
          );
    yield r'about';
    yield object.about == null
        ? null
        : serializers.serialize(
            object.about,
            specifiedType: const FullType.nullable(String),
          );
    yield r'photoUrl';
    yield object.photoUrl == null
        ? null
        : serializers.serialize(
            object.photoUrl,
            specifiedType: const FullType.nullable(String),
          );
  }

  @override
  Object serialize(
    Serializers serializers,
    PublicTeamMemberInput object, {
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
    required PublicTeamMemberInputBuilder result,
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
            specifiedType: const FullType.nullable(String),
          ) as String?;
          if (valueDes == null) continue;
          result.role = valueDes;
          break;
        case r'about':
          final valueDes = serializers.deserialize(
            value,
            specifiedType: const FullType.nullable(String),
          ) as String?;
          if (valueDes == null) continue;
          result.about = valueDes;
          break;
        case r'photoUrl':
          final valueDes = serializers.deserialize(
            value,
            specifiedType: const FullType.nullable(String),
          ) as String?;
          if (valueDes == null) continue;
          result.photoUrl = valueDes;
          break;
        default:
          unhandled.add(key);
          unhandled.add(value);
          break;
      }
    }
  }

  @override
  PublicTeamMemberInput deserialize(
    Serializers serializers,
    Object serialized, {
    FullType specifiedType = FullType.unspecified,
  }) {
    final result = PublicTeamMemberInputBuilder();
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
