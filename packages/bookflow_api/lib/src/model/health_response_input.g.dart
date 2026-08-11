// GENERATED CODE - DO NOT MODIFY BY HAND

part of 'health_response_input.dart';

// **************************************************************************
// BuiltValueGenerator
// **************************************************************************

const HealthResponseInputStatusEnum _$healthResponseInputStatusEnum_ok =
    const HealthResponseInputStatusEnum._('ok');

HealthResponseInputStatusEnum _$healthResponseInputStatusEnumValueOf(
    String name) {
  switch (name) {
    case 'ok':
      return _$healthResponseInputStatusEnum_ok;
    default:
      throw ArgumentError(name);
  }
}

final BuiltSet<HealthResponseInputStatusEnum>
    _$healthResponseInputStatusEnumValues = BuiltSet<
        HealthResponseInputStatusEnum>(const <HealthResponseInputStatusEnum>[
  _$healthResponseInputStatusEnum_ok,
]);

Serializer<HealthResponseInputStatusEnum>
    _$healthResponseInputStatusEnumSerializer =
    _$HealthResponseInputStatusEnumSerializer();

class _$HealthResponseInputStatusEnumSerializer
    implements PrimitiveSerializer<HealthResponseInputStatusEnum> {
  static const Map<String, Object> _toWire = const <String, Object>{
    'ok': 'ok',
  };
  static const Map<Object, String> _fromWire = const <Object, String>{
    'ok': 'ok',
  };

  @override
  final Iterable<Type> types = const <Type>[HealthResponseInputStatusEnum];
  @override
  final String wireName = 'HealthResponseInputStatusEnum';

  @override
  Object serialize(
          Serializers serializers, HealthResponseInputStatusEnum object,
          {FullType specifiedType = FullType.unspecified}) =>
      _toWire[object.name] ?? object.name;

  @override
  HealthResponseInputStatusEnum deserialize(
          Serializers serializers, Object serialized,
          {FullType specifiedType = FullType.unspecified}) =>
      HealthResponseInputStatusEnum.valueOf(
          _fromWire[serialized] ?? (serialized is String ? serialized : ''));
}

class _$HealthResponseInput extends HealthResponseInput {
  @override
  final HealthResponseInputStatusEnum status;

  factory _$HealthResponseInput(
          [void Function(HealthResponseInputBuilder)? updates]) =>
      (HealthResponseInputBuilder()..update(updates))._build();

  _$HealthResponseInput._({required this.status}) : super._();
  @override
  HealthResponseInput rebuild(
          void Function(HealthResponseInputBuilder) updates) =>
      (toBuilder()..update(updates)).build();

  @override
  HealthResponseInputBuilder toBuilder() =>
      HealthResponseInputBuilder()..replace(this);

  @override
  bool operator ==(Object other) {
    if (identical(other, this)) return true;
    return other is HealthResponseInput && status == other.status;
  }

  @override
  int get hashCode {
    var _$hash = 0;
    _$hash = $jc(_$hash, status.hashCode);
    _$hash = $jf(_$hash);
    return _$hash;
  }

  @override
  String toString() {
    return (newBuiltValueToStringHelper(r'HealthResponseInput')
          ..add('status', status))
        .toString();
  }
}

class HealthResponseInputBuilder
    implements Builder<HealthResponseInput, HealthResponseInputBuilder> {
  _$HealthResponseInput? _$v;

  HealthResponseInputStatusEnum? _status;
  HealthResponseInputStatusEnum? get status => _$this._status;
  set status(HealthResponseInputStatusEnum? status) => _$this._status = status;

  HealthResponseInputBuilder() {
    HealthResponseInput._defaults(this);
  }

  HealthResponseInputBuilder get _$this {
    final $v = _$v;
    if ($v != null) {
      _status = $v.status;
      _$v = null;
    }
    return this;
  }

  @override
  void replace(HealthResponseInput other) {
    _$v = other as _$HealthResponseInput;
  }

  @override
  void update(void Function(HealthResponseInputBuilder)? updates) {
    if (updates != null) updates(this);
  }

  @override
  HealthResponseInput build() => _build();

  _$HealthResponseInput _build() {
    final _$result = _$v ??
        _$HealthResponseInput._(
          status: BuiltValueNullFieldError.checkNotNull(
              status, r'HealthResponseInput', 'status'),
        );
    replace(_$result);
    return _$result;
  }
}

// ignore_for_file: deprecated_member_use_from_same_package,type=lint
