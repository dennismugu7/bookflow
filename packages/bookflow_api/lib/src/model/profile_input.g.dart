// GENERATED CODE - DO NOT MODIFY BY HAND

part of 'profile_input.dart';

// **************************************************************************
// BuiltValueGenerator
// **************************************************************************

class _$ProfileInput extends ProfileInput {
  @override
  final String id;
  @override
  final String firstName;
  @override
  final String lastName;
  @override
  final String? avatarPath;

  factory _$ProfileInput([void Function(ProfileInputBuilder)? updates]) =>
      (ProfileInputBuilder()..update(updates))._build();

  _$ProfileInput._(
      {required this.id,
      required this.firstName,
      required this.lastName,
      this.avatarPath})
      : super._();
  @override
  ProfileInput rebuild(void Function(ProfileInputBuilder) updates) =>
      (toBuilder()..update(updates)).build();

  @override
  ProfileInputBuilder toBuilder() => ProfileInputBuilder()..replace(this);

  @override
  bool operator ==(Object other) {
    if (identical(other, this)) return true;
    return other is ProfileInput &&
        id == other.id &&
        firstName == other.firstName &&
        lastName == other.lastName &&
        avatarPath == other.avatarPath;
  }

  @override
  int get hashCode {
    var _$hash = 0;
    _$hash = $jc(_$hash, id.hashCode);
    _$hash = $jc(_$hash, firstName.hashCode);
    _$hash = $jc(_$hash, lastName.hashCode);
    _$hash = $jc(_$hash, avatarPath.hashCode);
    _$hash = $jf(_$hash);
    return _$hash;
  }

  @override
  String toString() {
    return (newBuiltValueToStringHelper(r'ProfileInput')
          ..add('id', id)
          ..add('firstName', firstName)
          ..add('lastName', lastName)
          ..add('avatarPath', avatarPath))
        .toString();
  }
}

class ProfileInputBuilder
    implements Builder<ProfileInput, ProfileInputBuilder> {
  _$ProfileInput? _$v;

  String? _id;
  String? get id => _$this._id;
  set id(String? id) => _$this._id = id;

  String? _firstName;
  String? get firstName => _$this._firstName;
  set firstName(String? firstName) => _$this._firstName = firstName;

  String? _lastName;
  String? get lastName => _$this._lastName;
  set lastName(String? lastName) => _$this._lastName = lastName;

  String? _avatarPath;
  String? get avatarPath => _$this._avatarPath;
  set avatarPath(String? avatarPath) => _$this._avatarPath = avatarPath;

  ProfileInputBuilder() {
    ProfileInput._defaults(this);
  }

  ProfileInputBuilder get _$this {
    final $v = _$v;
    if ($v != null) {
      _id = $v.id;
      _firstName = $v.firstName;
      _lastName = $v.lastName;
      _avatarPath = $v.avatarPath;
      _$v = null;
    }
    return this;
  }

  @override
  void replace(ProfileInput other) {
    _$v = other as _$ProfileInput;
  }

  @override
  void update(void Function(ProfileInputBuilder)? updates) {
    if (updates != null) updates(this);
  }

  @override
  ProfileInput build() => _build();

  _$ProfileInput _build() {
    final _$result = _$v ??
        _$ProfileInput._(
          id: BuiltValueNullFieldError.checkNotNull(id, r'ProfileInput', 'id'),
          firstName: BuiltValueNullFieldError.checkNotNull(
              firstName, r'ProfileInput', 'firstName'),
          lastName: BuiltValueNullFieldError.checkNotNull(
              lastName, r'ProfileInput', 'lastName'),
          avatarPath: avatarPath,
        );
    replace(_$result);
    return _$result;
  }
}

// ignore_for_file: deprecated_member_use_from_same_package,type=lint
