// GENERATED CODE - DO NOT MODIFY BY HAND

part of 'signup_request.dart';

// **************************************************************************
// BuiltValueGenerator
// **************************************************************************

class _$SignupRequest extends SignupRequest {
  @override
  final String email;
  @override
  final String password;
  @override
  final String firstName;
  @override
  final String lastName;

  factory _$SignupRequest([void Function(SignupRequestBuilder)? updates]) =>
      (SignupRequestBuilder()..update(updates))._build();

  _$SignupRequest._(
      {required this.email,
      required this.password,
      required this.firstName,
      required this.lastName})
      : super._();
  @override
  SignupRequest rebuild(void Function(SignupRequestBuilder) updates) =>
      (toBuilder()..update(updates)).build();

  @override
  SignupRequestBuilder toBuilder() => SignupRequestBuilder()..replace(this);

  @override
  bool operator ==(Object other) {
    if (identical(other, this)) return true;
    return other is SignupRequest &&
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
    return (newBuiltValueToStringHelper(r'SignupRequest')
          ..add('email', email)
          ..add('password', password)
          ..add('firstName', firstName)
          ..add('lastName', lastName))
        .toString();
  }
}

class SignupRequestBuilder
    implements Builder<SignupRequest, SignupRequestBuilder> {
  _$SignupRequest? _$v;

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

  SignupRequestBuilder() {
    SignupRequest._defaults(this);
  }

  SignupRequestBuilder get _$this {
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
  void replace(SignupRequest other) {
    _$v = other as _$SignupRequest;
  }

  @override
  void update(void Function(SignupRequestBuilder)? updates) {
    if (updates != null) updates(this);
  }

  @override
  SignupRequest build() => _build();

  _$SignupRequest _build() {
    final _$result = _$v ??
        _$SignupRequest._(
          email: BuiltValueNullFieldError.checkNotNull(
              email, r'SignupRequest', 'email'),
          password: BuiltValueNullFieldError.checkNotNull(
              password, r'SignupRequest', 'password'),
          firstName: BuiltValueNullFieldError.checkNotNull(
              firstName, r'SignupRequest', 'firstName'),
          lastName: BuiltValueNullFieldError.checkNotNull(
              lastName, r'SignupRequest', 'lastName'),
        );
    replace(_$result);
    return _$result;
  }
}

// ignore_for_file: deprecated_member_use_from_same_package,type=lint
