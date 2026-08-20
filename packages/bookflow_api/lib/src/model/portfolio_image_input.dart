//
// AUTO-GENERATED FILE, DO NOT MODIFY!
//

// ignore_for_file: unused_element
import 'package:built_value/built_value.dart';
import 'package:built_value/serializer.dart';

part 'portfolio_image_input.g.dart';

/// A gallery image on the public booking page.
///
/// Properties:
/// * [id]
/// * [imageUrl]
/// * [position]
@BuiltValue()
abstract class PortfolioImageInput
    implements Built<PortfolioImageInput, PortfolioImageInputBuilder> {
  @BuiltValueField(wireName: r'id')
  String get id;

  @BuiltValueField(wireName: r'imageUrl')
  String get imageUrl;

  @BuiltValueField(wireName: r'position')
  int get position;

  PortfolioImageInput._();

  factory PortfolioImageInput([void updates(PortfolioImageInputBuilder b)]) =
      _$PortfolioImageInput;

  @BuiltValueHook(initializeBuilder: true)
  static void _defaults(PortfolioImageInputBuilder b) => b;

  @BuiltValueSerializer(custom: true)
  static Serializer<PortfolioImageInput> get serializer =>
      _$PortfolioImageInputSerializer();
}

class _$PortfolioImageInputSerializer
    implements PrimitiveSerializer<PortfolioImageInput> {
  @override
  final Iterable<Type> types = const [
    PortfolioImageInput,
    _$PortfolioImageInput
  ];

  @override
  final String wireName = r'PortfolioImageInput';

  Iterable<Object?> _serializeProperties(
    Serializers serializers,
    PortfolioImageInput object, {
    FullType specifiedType = FullType.unspecified,
  }) sync* {
    yield r'id';
    yield serializers.serialize(
      object.id,
      specifiedType: const FullType(String),
    );
    yield r'imageUrl';
    yield serializers.serialize(
      object.imageUrl,
      specifiedType: const FullType(String),
    );
    yield r'position';
    yield serializers.serialize(
      object.position,
      specifiedType: const FullType(int),
    );
  }

  @override
  Object serialize(
    Serializers serializers,
    PortfolioImageInput object, {
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
    required PortfolioImageInputBuilder result,
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
        case r'imageUrl':
          final valueDes = serializers.deserialize(
            value,
            specifiedType: const FullType(String),
          ) as String;
          result.imageUrl = valueDes;
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
  PortfolioImageInput deserialize(
    Serializers serializers,
    Object serialized, {
    FullType specifiedType = FullType.unspecified,
  }) {
    final result = PortfolioImageInputBuilder();
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
