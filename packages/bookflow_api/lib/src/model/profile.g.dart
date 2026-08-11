// GENERATED CODE - DO NOT MODIFY BY HAND

part of 'profile.dart';

// **************************************************************************
// BuiltValueGenerator
// **************************************************************************

class _$Profile extends Profile {
  @override
  final String id;
  @override
  final String firstName;
  @override
  final String lastName;
  @override
  final String? avatarPath;

  factory _$Profile([void Function(ProfileBuilder)? updates]) =>
      (ProfileBuilder()..update(updates))._build();

  _$Profile._(
      {required this.id,
      required this.firstName,
      required this.lastName,
      this.avatarPath})
      : super._();
  @override
  Profile rebuild(void Function(ProfileBuilder) updates) =>
      (toBuilder()..update(updates)).build();

  @override
  ProfileBuilder toBuilder() => ProfileBuilder()..replace(this);

  @override
  bool operator ==(Object other) {
    if (identical(other, this)) return true;
    return other is Profile &&
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
    return (newBuiltValueToStringHelper(r'Profile')
          ..add('id', id)
          ..add('firstName', firstName)
          ..add('lastName', lastName)
          ..add('avatarPath', avatarPath))
        .toString();
  }
}

class ProfileBuilder implements Builder<Profile, ProfileBuilder> {
  _$Profile? _$v;

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

  ProfileBuilder() {
    Profile._defaults(this);
  }

  ProfileBuilder get _$this {
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
  void replace(Profile other) {
    _$v = other as _$Profile;
  }

  @override
  void update(void Function(ProfileBuilder)? updates) {
    if (updates != null) updates(this);
  }

  @override
  Profile build() => _build();

  _$Profile _build() {
    final _$result = _$v ??
        _$Profile._(
          id: BuiltValueNullFieldError.checkNotNull(id, r'Profile', 'id'),
          firstName: BuiltValueNullFieldError.checkNotNull(
              firstName, r'Profile', 'firstName'),
          lastName: BuiltValueNullFieldError.checkNotNull(
              lastName, r'Profile', 'lastName'),
          avatarPath: avatarPath,
        );
    replace(_$result);
    return _$result;
  }
}

// ignore_for_file: deprecated_member_use_from_same_package,type=lint
