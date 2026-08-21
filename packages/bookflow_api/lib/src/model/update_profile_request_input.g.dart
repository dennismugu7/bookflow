// GENERATED CODE - DO NOT MODIFY BY HAND

part of 'update_profile_request_input.dart';

// **************************************************************************
// BuiltValueGenerator
// **************************************************************************

class _$UpdateProfileRequestInput extends UpdateProfileRequestInput {
  @override
  final String firstName;
  @override
  final String lastName;

  factory _$UpdateProfileRequestInput(
          [void Function(UpdateProfileRequestInputBuilder)? updates]) =>
      (UpdateProfileRequestInputBuilder()..update(updates))._build();

  _$UpdateProfileRequestInput._(
      {required this.firstName, required this.lastName})
      : super._();
  @override
  UpdateProfileRequestInput rebuild(
          void Function(UpdateProfileRequestInputBuilder) updates) =>
      (toBuilder()..update(updates)).build();

  @override
  UpdateProfileRequestInputBuilder toBuilder() =>
      UpdateProfileRequestInputBuilder()..replace(this);

  @override
  bool operator ==(Object other) {
    if (identical(other, this)) return true;
    return other is UpdateProfileRequestInput &&
        firstName == other.firstName &&
        lastName == other.lastName;
  }

  @override
  int get hashCode {
    var _$hash = 0;
    _$hash = $jc(_$hash, firstName.hashCode);
    _$hash = $jc(_$hash, lastName.hashCode);
    _$hash = $jf(_$hash);
    return _$hash;
  }

  @override
  String toString() {
    return (newBuiltValueToStringHelper(r'UpdateProfileRequestInput')
          ..add('firstName', firstName)
          ..add('lastName', lastName))
        .toString();
  }
}

class UpdateProfileRequestInputBuilder
    implements
        Builder<UpdateProfileRequestInput, UpdateProfileRequestInputBuilder> {
  _$UpdateProfileRequestInput? _$v;

  String? _firstName;
  String? get firstName => _$this._firstName;
  set firstName(String? firstName) => _$this._firstName = firstName;

  String? _lastName;
  String? get lastName => _$this._lastName;
  set lastName(String? lastName) => _$this._lastName = lastName;

  UpdateProfileRequestInputBuilder() {
    UpdateProfileRequestInput._defaults(this);
  }

  UpdateProfileRequestInputBuilder get _$this {
    final $v = _$v;
    if ($v != null) {
      _firstName = $v.firstName;
      _lastName = $v.lastName;
      _$v = null;
    }
    return this;
  }

  @override
  void replace(UpdateProfileRequestInput other) {
    _$v = other as _$UpdateProfileRequestInput;
  }

  @override
  void update(void Function(UpdateProfileRequestInputBuilder)? updates) {
    if (updates != null) updates(this);
  }

  @override
  UpdateProfileRequestInput build() => _build();

  _$UpdateProfileRequestInput _build() {
    final _$result = _$v ??
        _$UpdateProfileRequestInput._(
          firstName: BuiltValueNullFieldError.checkNotNull(
              firstName, r'UpdateProfileRequestInput', 'firstName'),
          lastName: BuiltValueNullFieldError.checkNotNull(
              lastName, r'UpdateProfileRequestInput', 'lastName'),
        );
    replace(_$result);
    return _$result;
  }
}

// ignore_for_file: deprecated_member_use_from_same_package,type=lint
