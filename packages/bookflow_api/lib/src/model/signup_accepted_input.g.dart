// GENERATED CODE - DO NOT MODIFY BY HAND

part of 'signup_accepted_input.dart';

// **************************************************************************
// BuiltValueGenerator
// **************************************************************************

const SignupAcceptedInputStatusEnum
    _$signupAcceptedInputStatusEnum_confirmationRequired =
    const SignupAcceptedInputStatusEnum._('confirmationRequired');

SignupAcceptedInputStatusEnum _$signupAcceptedInputStatusEnumValueOf(
    String name) {
  switch (name) {
    case 'confirmationRequired':
      return _$signupAcceptedInputStatusEnum_confirmationRequired;
    default:
      throw ArgumentError(name);
  }
}

final BuiltSet<SignupAcceptedInputStatusEnum>
    _$signupAcceptedInputStatusEnumValues = BuiltSet<
        SignupAcceptedInputStatusEnum>(const <SignupAcceptedInputStatusEnum>[
  _$signupAcceptedInputStatusEnum_confirmationRequired,
]);

Serializer<SignupAcceptedInputStatusEnum>
    _$signupAcceptedInputStatusEnumSerializer =
    _$SignupAcceptedInputStatusEnumSerializer();

class _$SignupAcceptedInputStatusEnumSerializer
    implements PrimitiveSerializer<SignupAcceptedInputStatusEnum> {
  static const Map<String, Object> _toWire = const <String, Object>{
    'confirmationRequired': 'confirmation_required',
  };
  static const Map<Object, String> _fromWire = const <Object, String>{
    'confirmation_required': 'confirmationRequired',
  };

  @override
  final Iterable<Type> types = const <Type>[SignupAcceptedInputStatusEnum];
  @override
  final String wireName = 'SignupAcceptedInputStatusEnum';

  @override
  Object serialize(
          Serializers serializers, SignupAcceptedInputStatusEnum object,
          {FullType specifiedType = FullType.unspecified}) =>
      _toWire[object.name] ?? object.name;

  @override
  SignupAcceptedInputStatusEnum deserialize(
          Serializers serializers, Object serialized,
          {FullType specifiedType = FullType.unspecified}) =>
      SignupAcceptedInputStatusEnum.valueOf(
          _fromWire[serialized] ?? (serialized is String ? serialized : ''));
}

class _$SignupAcceptedInput extends SignupAcceptedInput {
  @override
  final SignupAcceptedInputStatusEnum status;

  factory _$SignupAcceptedInput(
          [void Function(SignupAcceptedInputBuilder)? updates]) =>
      (SignupAcceptedInputBuilder()..update(updates))._build();

  _$SignupAcceptedInput._({required this.status}) : super._();
  @override
  SignupAcceptedInput rebuild(
          void Function(SignupAcceptedInputBuilder) updates) =>
      (toBuilder()..update(updates)).build();

  @override
  SignupAcceptedInputBuilder toBuilder() =>
      SignupAcceptedInputBuilder()..replace(this);

  @override
  bool operator ==(Object other) {
    if (identical(other, this)) return true;
    return other is SignupAcceptedInput && status == other.status;
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
    return (newBuiltValueToStringHelper(r'SignupAcceptedInput')
          ..add('status', status))
        .toString();
  }
}

class SignupAcceptedInputBuilder
    implements Builder<SignupAcceptedInput, SignupAcceptedInputBuilder> {
  _$SignupAcceptedInput? _$v;

  SignupAcceptedInputStatusEnum? _status;
  SignupAcceptedInputStatusEnum? get status => _$this._status;
  set status(SignupAcceptedInputStatusEnum? status) => _$this._status = status;

  SignupAcceptedInputBuilder() {
    SignupAcceptedInput._defaults(this);
  }

  SignupAcceptedInputBuilder get _$this {
    final $v = _$v;
    if ($v != null) {
      _status = $v.status;
      _$v = null;
    }
    return this;
  }

  @override
  void replace(SignupAcceptedInput other) {
    _$v = other as _$SignupAcceptedInput;
  }

  @override
  void update(void Function(SignupAcceptedInputBuilder)? updates) {
    if (updates != null) updates(this);
  }

  @override
  SignupAcceptedInput build() => _build();

  _$SignupAcceptedInput _build() {
    final _$result = _$v ??
        _$SignupAcceptedInput._(
          status: BuiltValueNullFieldError.checkNotNull(
              status, r'SignupAcceptedInput', 'status'),
        );
    replace(_$result);
    return _$result;
  }
}

// ignore_for_file: deprecated_member_use_from_same_package,type=lint
