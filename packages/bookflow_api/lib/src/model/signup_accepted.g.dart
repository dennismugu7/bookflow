// GENERATED CODE - DO NOT MODIFY BY HAND

part of 'signup_accepted.dart';

// **************************************************************************
// BuiltValueGenerator
// **************************************************************************

const SignupAcceptedStatusEnum _$signupAcceptedStatusEnum_confirmationRequired =
    const SignupAcceptedStatusEnum._('confirmationRequired');

SignupAcceptedStatusEnum _$signupAcceptedStatusEnumValueOf(String name) {
  switch (name) {
    case 'confirmationRequired':
      return _$signupAcceptedStatusEnum_confirmationRequired;
    default:
      throw ArgumentError(name);
  }
}

final BuiltSet<SignupAcceptedStatusEnum> _$signupAcceptedStatusEnumValues =
    BuiltSet<SignupAcceptedStatusEnum>(const <SignupAcceptedStatusEnum>[
  _$signupAcceptedStatusEnum_confirmationRequired,
]);

Serializer<SignupAcceptedStatusEnum> _$signupAcceptedStatusEnumSerializer =
    _$SignupAcceptedStatusEnumSerializer();

class _$SignupAcceptedStatusEnumSerializer
    implements PrimitiveSerializer<SignupAcceptedStatusEnum> {
  static const Map<String, Object> _toWire = const <String, Object>{
    'confirmationRequired': 'confirmation_required',
  };
  static const Map<Object, String> _fromWire = const <Object, String>{
    'confirmation_required': 'confirmationRequired',
  };

  @override
  final Iterable<Type> types = const <Type>[SignupAcceptedStatusEnum];
  @override
  final String wireName = 'SignupAcceptedStatusEnum';

  @override
  Object serialize(Serializers serializers, SignupAcceptedStatusEnum object,
          {FullType specifiedType = FullType.unspecified}) =>
      _toWire[object.name] ?? object.name;

  @override
  SignupAcceptedStatusEnum deserialize(
          Serializers serializers, Object serialized,
          {FullType specifiedType = FullType.unspecified}) =>
      SignupAcceptedStatusEnum.valueOf(
          _fromWire[serialized] ?? (serialized is String ? serialized : ''));
}

class _$SignupAccepted extends SignupAccepted {
  @override
  final SignupAcceptedStatusEnum status;

  factory _$SignupAccepted([void Function(SignupAcceptedBuilder)? updates]) =>
      (SignupAcceptedBuilder()..update(updates))._build();

  _$SignupAccepted._({required this.status}) : super._();
  @override
  SignupAccepted rebuild(void Function(SignupAcceptedBuilder) updates) =>
      (toBuilder()..update(updates)).build();

  @override
  SignupAcceptedBuilder toBuilder() => SignupAcceptedBuilder()..replace(this);

  @override
  bool operator ==(Object other) {
    if (identical(other, this)) return true;
    return other is SignupAccepted && status == other.status;
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
    return (newBuiltValueToStringHelper(r'SignupAccepted')
          ..add('status', status))
        .toString();
  }
}

class SignupAcceptedBuilder
    implements Builder<SignupAccepted, SignupAcceptedBuilder> {
  _$SignupAccepted? _$v;

  SignupAcceptedStatusEnum? _status;
  SignupAcceptedStatusEnum? get status => _$this._status;
  set status(SignupAcceptedStatusEnum? status) => _$this._status = status;

  SignupAcceptedBuilder() {
    SignupAccepted._defaults(this);
  }

  SignupAcceptedBuilder get _$this {
    final $v = _$v;
    if ($v != null) {
      _status = $v.status;
      _$v = null;
    }
    return this;
  }

  @override
  void replace(SignupAccepted other) {
    _$v = other as _$SignupAccepted;
  }

  @override
  void update(void Function(SignupAcceptedBuilder)? updates) {
    if (updates != null) updates(this);
  }

  @override
  SignupAccepted build() => _build();

  _$SignupAccepted _build() {
    final _$result = _$v ??
        _$SignupAccepted._(
          status: BuiltValueNullFieldError.checkNotNull(
              status, r'SignupAccepted', 'status'),
        );
    replace(_$result);
    return _$result;
  }
}

// ignore_for_file: deprecated_member_use_from_same_package,type=lint
