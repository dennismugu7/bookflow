// GENERATED CODE - DO NOT MODIFY BY HAND

part of 'signup_request_input.dart';

// **************************************************************************
// BuiltValueGenerator
// **************************************************************************

class _$SignupRequestInput extends SignupRequestInput {
  @override
  final String email;
  @override
  final String password;
  @override
  final String firstName;
  @override
  final String lastName;

  factory _$SignupRequestInput(
          [void Function(SignupRequestInputBuilder)? updates]) =>
      (SignupRequestInputBuilder()..update(updates))._build();

  _$SignupRequestInput._(
      {required this.email,
      required this.password,
      required this.firstName,
      required this.lastName})
      : super._();
  @override
  SignupRequestInput rebuild(
          void Function(SignupRequestInputBuilder) updates) =>
      (toBuilder()..update(updates)).build();

  @override
  SignupRequestInputBuilder toBuilder() =>
      SignupRequestInputBuilder()..replace(this);

  @override
  bool operator ==(Object other) {
    if (identical(other, this)) return true;
    return other is SignupRequestInput &&
        email == other.email &&
        password == other.password &&
        firstName == other.firstName &&
        lastName == other.lastName;
  }

  @override
  int get hashCode {
    var _$hash = 0;
    _$hash = $jc(_$hash, email.hashCode);
    _$hash = $jc(_$hash, password.hashCode);
    _$hash = $jc(_$hash, firstName.hashCode);
    _$hash = $jc(_$hash, lastName.hashCode);
    _$hash = $jf(_$hash);
    return _$hash;
  }

  @override
  String toString() {
    return (newBuiltValueToStringHelper(r'SignupRequestInput')
          ..add('email', email)
          ..add('password', password)
          ..add('firstName', firstName)
          ..add('lastName', lastName))
        .toString();
  }
}

class SignupRequestInputBuilder
    implements Builder<SignupRequestInput, SignupRequestInputBuilder> {
  _$SignupRequestInput? _$v;

  String? _email;
  String? get email => _$this._email;
  set email(String? email) => _$this._email = email;

  String? _password;
  String? get password => _$this._password;
  set password(String? password) => _$this._password = password;

  String? _firstName;
  String? get firstName => _$this._firstName;
  set firstName(String? firstName) => _$this._firstName = firstName;

  String? _lastName;
  String? get lastName => _$this._lastName;
  set lastName(String? lastName) => _$this._lastName = lastName;

  SignupRequestInputBuilder() {
    SignupRequestInput._defaults(this);
  }

  SignupRequestInputBuilder get _$this {
    final $v = _$v;
    if ($v != null) {
      _email = $v.email;
      _password = $v.password;
      _firstName = $v.firstName;
      _lastName = $v.lastName;
      _$v = null;
    }
    return this;
  }

  @override
  void replace(SignupRequestInput other) {
    _$v = other as _$SignupRequestInput;
  }

  @override
  void update(void Function(SignupRequestInputBuilder)? updates) {
    if (updates != null) updates(this);
  }

  @override
  SignupRequestInput build() => _build();

  _$SignupRequestInput _build() {
    final _$result = _$v ??
        _$SignupRequestInput._(
          email: BuiltValueNullFieldError.checkNotNull(
              email, r'SignupRequestInput', 'email'),
          password: BuiltValueNullFieldError.checkNotNull(
              password, r'SignupRequestInput', 'password'),
          firstName: BuiltValueNullFieldError.checkNotNull(
              firstName, r'SignupRequestInput', 'firstName'),
          lastName: BuiltValueNullFieldError.checkNotNull(
              lastName, r'SignupRequestInput', 'lastName'),
        );
    replace(_$result);
    return _$result;
  }
}

// ignore_for_file: deprecated_member_use_from_same_package,type=lint
