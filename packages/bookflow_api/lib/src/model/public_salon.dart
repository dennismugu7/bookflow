//
// AUTO-GENERATED FILE, DO NOT MODIFY!
//

// ignore_for_file: unused_element
import 'package:bookflow_api/src/model/public_team_member.dart';
import 'package:bookflow_api/src/model/public_opening_hours.dart';
import 'package:built_collection/built_collection.dart';
import 'package:bookflow_api/src/model/public_service.dart';
import 'package:built_value/built_value.dart';
import 'package:built_value/serializer.dart';

part 'public_salon.g.dart';

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
abstract class PublicSalon implements Built<PublicSalon, PublicSalonBuilder> {
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
  BuiltList<PublicService> get services;

  @BuiltValueField(wireName: r'teamMembers')
  BuiltList<PublicTeamMember> get teamMembers;

  @BuiltValueField(wireName: r'openingHours')
  BuiltList<PublicOpeningHours> get openingHours;

  @BuiltValueField(wireName: r'portfolioImageUrls')
  BuiltList<String> get portfolioImageUrls;

  PublicSalon._();

  factory PublicSalon([void updates(PublicSalonBuilder b)]) = _$PublicSalon;

  @BuiltValueHook(initializeBuilder: true)
  static void _defaults(PublicSalonBuilder b) => b;

  @BuiltValueSerializer(custom: true)
  static Serializer<PublicSalon> get serializer => _$PublicSalonSerializer();
}

class _$PublicSalonSerializer implements PrimitiveSerializer<PublicSalon> {
  @override
  final Iterable<Type> types = const [PublicSalon, _$PublicSalon];

  @override
  final String wireName = r'PublicSalon';

  Iterable<Object?> _serializeProperties(
    Serializers serializers,
    PublicSalon object, {
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
      specifiedType: const FullType(BuiltList, [FullType(PublicService)]),
    );
    yield r'teamMembers';
    yield serializers.serialize(
      object.teamMembers,
      specifiedType: const FullType(BuiltList, [FullType(PublicTeamMember)]),
    );
    yield r'openingHours';
    yield serializers.serialize(
      object.openingHours,
      specifiedType: const FullType(BuiltList, [FullType(PublicOpeningHours)]),
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
    PublicSalon object, {
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
    required PublicSalonBuilder result,
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
            specifiedType: const FullType(BuiltList, [FullType(PublicService)]),
          ) as BuiltList<PublicService>;
          result.services.replace(valueDes);
          break;
        case r'teamMembers':
          final valueDes = serializers.deserialize(
            value,
            specifiedType:
                const FullType(BuiltList, [FullType(PublicTeamMember)]),
          ) as BuiltList<PublicTeamMember>;
          result.teamMembers.replace(valueDes);
          break;
        case r'openingHours':
          final valueDes = serializers.deserialize(
            value,
            specifiedType:
                const FullType(BuiltList, [FullType(PublicOpeningHours)]),
          ) as BuiltList<PublicOpeningHours>;
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
  PublicSalon deserialize(
    Serializers serializers,
    Object serialized, {
    FullType specifiedType = FullType.unspecified,
  }) {
    final result = PublicSalonBuilder();
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
