//
// AUTO-GENERATED FILE, DO NOT MODIFY!
//

// ignore_for_file: unused_element
import 'package:built_collection/built_collection.dart';
import 'package:bookflow_api/src/model/public_opening_hours_input.dart';
import 'package:bookflow_api/src/model/public_service_input.dart';
import 'package:bookflow_api/src/model/public_team_member_input.dart';
import 'package:built_value/built_value.dart';
import 'package:built_value/serializer.dart';

part 'public_salon_input.g.dart';

/// A published salon’s public booking page.
///
/// Properties:
/// * [handle]
/// * [name]
/// * [tagline]
/// * [about]
/// * [category]
/// * [bannerUrl]
/// * [address]
/// * [mapsUrl]
/// * [services]
/// * [teamMembers]
/// * [openingHours]
/// * [portfolioImageUrls]
@BuiltValue()
abstract class PublicSalonInput
    implements Built<PublicSalonInput, PublicSalonInputBuilder> {
  @BuiltValueField(wireName: r'handle')
  String get handle;

  @BuiltValueField(wireName: r'name')
  String get name;

  @BuiltValueField(wireName: r'tagline')
  String? get tagline;

  @BuiltValueField(wireName: r'about')
  String? get about;

  @BuiltValueField(wireName: r'category')
  String? get category;

  @BuiltValueField(wireName: r'bannerUrl')
  String? get bannerUrl;

  @BuiltValueField(wireName: r'address')
  String? get address;

  @BuiltValueField(wireName: r'mapsUrl')
  String? get mapsUrl;

  @BuiltValueField(wireName: r'services')
  BuiltList<PublicServiceInput> get services;

  @BuiltValueField(wireName: r'teamMembers')
  BuiltList<PublicTeamMemberInput> get teamMembers;

  @BuiltValueField(wireName: r'openingHours')
  BuiltList<PublicOpeningHoursInput> get openingHours;

  @BuiltValueField(wireName: r'portfolioImageUrls')
  BuiltList<String> get portfolioImageUrls;

  PublicSalonInput._();

  factory PublicSalonInput([void updates(PublicSalonInputBuilder b)]) =
      _$PublicSalonInput;

  @BuiltValueHook(initializeBuilder: true)
  static void _defaults(PublicSalonInputBuilder b) => b;

  @BuiltValueSerializer(custom: true)
  static Serializer<PublicSalonInput> get serializer =>
      _$PublicSalonInputSerializer();
}

class _$PublicSalonInputSerializer
    implements PrimitiveSerializer<PublicSalonInput> {
  @override
  final Iterable<Type> types = const [PublicSalonInput, _$PublicSalonInput];

  @override
  final String wireName = r'PublicSalonInput';

  Iterable<Object?> _serializeProperties(
    Serializers serializers,
    PublicSalonInput object, {
    FullType specifiedType = FullType.unspecified,
  }) sync* {
    yield r'handle';
    yield serializers.serialize(
      object.handle,
      specifiedType: const FullType(String),
    );
    yield r'name';
    yield serializers.serialize(
      object.name,
      specifiedType: const FullType(String),
    );
    yield r'tagline';
    yield object.tagline == null
        ? null
        : serializers.serialize(
            object.tagline,
            specifiedType: const FullType.nullable(String),
          );
    yield r'about';
    yield object.about == null
        ? null
        : serializers.serialize(
            object.about,
            specifiedType: const FullType.nullable(String),
          );
    yield r'category';
    yield object.category == null
        ? null
        : serializers.serialize(
            object.category,
            specifiedType: const FullType.nullable(String),
          );
    yield r'bannerUrl';
    yield object.bannerUrl == null
        ? null
        : serializers.serialize(
            object.bannerUrl,
            specifiedType: const FullType.nullable(String),
          );
    yield r'address';
    yield object.address == null
        ? null
        : serializers.serialize(
            object.address,
            specifiedType: const FullType.nullable(String),
          );
    yield r'mapsUrl';
    yield object.mapsUrl == null
        ? null
        : serializers.serialize(
            object.mapsUrl,
            specifiedType: const FullType.nullable(String),
          );
    yield r'services';
    yield serializers.serialize(
      object.services,
      specifiedType: const FullType(BuiltList, [FullType(PublicServiceInput)]),
    );
    yield r'teamMembers';
    yield serializers.serialize(
      object.teamMembers,
      specifiedType:
          const FullType(BuiltList, [FullType(PublicTeamMemberInput)]),
    );
    yield r'openingHours';
    yield serializers.serialize(
      object.openingHours,
      specifiedType:
          const FullType(BuiltList, [FullType(PublicOpeningHoursInput)]),
    );
    yield r'portfolioImageUrls';
    yield serializers.serialize(
      object.portfolioImageUrls,
      specifiedType: const FullType(BuiltList, [FullType(String)]),
    );
  }

  @override
  Object serialize(
    Serializers serializers,
    PublicSalonInput object, {
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
    required PublicSalonInputBuilder result,
    required List<Object?> unhandled,
  }) {
    for (var i = 0; i < serializedList.length; i += 2) {
      final key = serializedList[i] as String;
      final value = serializedList[i + 1];
      switch (key) {
        case r'handle':
          final valueDes = serializers.deserialize(
            value,
            specifiedType: const FullType(String),
          ) as String;
          result.handle = valueDes;
          break;
        case r'name':
          final valueDes = serializers.deserialize(
            value,
            specifiedType: const FullType(String),
          ) as String;
          result.name = valueDes;
          break;
        case r'tagline':
          final valueDes = serializers.deserialize(
            value,
            specifiedType: const FullType.nullable(String),
          ) as String?;
          if (valueDes == null) continue;
          result.tagline = valueDes;
          break;
        case r'about':
          final valueDes = serializers.deserialize(
            value,
            specifiedType: const FullType.nullable(String),
          ) as String?;
          if (valueDes == null) continue;
          result.about = valueDes;
          break;
        case r'category':
          final valueDes = serializers.deserialize(
            value,
            specifiedType: const FullType.nullable(String),
          ) as String?;
          if (valueDes == null) continue;
          result.category = valueDes;
          break;
        case r'bannerUrl':
          final valueDes = serializers.deserialize(
            value,
            specifiedType: const FullType.nullable(String),
          ) as String?;
          if (valueDes == null) continue;
          result.bannerUrl = valueDes;
          break;
        case r'address':
          final valueDes = serializers.deserialize(
            value,
            specifiedType: const FullType.nullable(String),
          ) as String?;
          if (valueDes == null) continue;
          result.address = valueDes;
          break;
        case r'mapsUrl':
          final valueDes = serializers.deserialize(
            value,
            specifiedType: const FullType.nullable(String),
          ) as String?;
          if (valueDes == null) continue;
          result.mapsUrl = valueDes;
          break;
        case r'services':
          final valueDes = serializers.deserialize(
            value,
            specifiedType:
                const FullType(BuiltList, [FullType(PublicServiceInput)]),
          ) as BuiltList<PublicServiceInput>;
          result.services.replace(valueDes);
          break;
        case r'teamMembers':
          final valueDes = serializers.deserialize(
            value,
            specifiedType:
                const FullType(BuiltList, [FullType(PublicTeamMemberInput)]),
          ) as BuiltList<PublicTeamMemberInput>;
          result.teamMembers.replace(valueDes);
          break;
        case r'openingHours':
          final valueDes = serializers.deserialize(
            value,
            specifiedType:
                const FullType(BuiltList, [FullType(PublicOpeningHoursInput)]),
          ) as BuiltList<PublicOpeningHoursInput>;
          result.openingHours.replace(valueDes);
          break;
        case r'portfolioImageUrls':
          final valueDes = serializers.deserialize(
            value,
            specifiedType: const FullType(BuiltList, [FullType(String)]),
          ) as BuiltList<String>;
          result.portfolioImageUrls.replace(valueDes);
          break;
        default:
          unhandled.add(key);
          unhandled.add(value);
          break;
      }
    }
  }

  @override
  PublicSalonInput deserialize(
    Serializers serializers,
    Object serialized, {
    FullType specifiedType = FullType.unspecified,
  }) {
    final result = PublicSalonInputBuilder();
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
