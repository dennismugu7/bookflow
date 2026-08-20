// GENERATED CODE - DO NOT MODIFY BY HAND

part of 'team_member_input.dart';

// **************************************************************************
// BuiltValueGenerator
// **************************************************************************

class _$TeamMemberInput extends TeamMemberInput {
  @override
  final String id;
  @override
  final String name;
  @override
  final String? role;
  @override
  final String? about;
  @override
  final String? photoUrl;
  @override
  final int position;

  factory _$TeamMemberInput([void Function(TeamMemberInputBuilder)? updates]) =>
      (TeamMemberInputBuilder()..update(updates))._build();

  _$TeamMemberInput._(
      {required this.id,
      required this.name,
      this.role,
      this.about,
      this.photoUrl,
      required this.position})
      : super._();
  @override
  TeamMemberInput rebuild(void Function(TeamMemberInputBuilder) updates) =>
      (toBuilder()..update(updates)).build();

  @override
  TeamMemberInputBuilder toBuilder() => TeamMemberInputBuilder()..replace(this);

  @override
  bool operator ==(Object other) {
    if (identical(other, this)) return true;
    return other is TeamMemberInput &&
        id == other.id &&
        name == other.name &&
        role == other.role &&
        about == other.about &&
        photoUrl == other.photoUrl &&
        position == other.position;
  }

  @override
  int get hashCode {
    var _$hash = 0;
    _$hash = $jc(_$hash, id.hashCode);
    _$hash = $jc(_$hash, name.hashCode);
    _$hash = $jc(_$hash, role.hashCode);
    _$hash = $jc(_$hash, about.hashCode);
    _$hash = $jc(_$hash, photoUrl.hashCode);
    _$hash = $jc(_$hash, position.hashCode);
    _$hash = $jf(_$hash);
    return _$hash;
  }

  @override
  String toString() {
    return (newBuiltValueToStringHelper(r'TeamMemberInput')
          ..add('id', id)
          ..add('name', name)
          ..add('role', role)
          ..add('about', about)
          ..add('photoUrl', photoUrl)
          ..add('position', position))
        .toString();
  }
}

class TeamMemberInputBuilder
    implements Builder<TeamMemberInput, TeamMemberInputBuilder> {
  _$TeamMemberInput? _$v;

  String? _id;
  String? get id => _$this._id;
  set id(String? id) => _$this._id = id;

  String? _name;
  String? get name => _$this._name;
  set name(String? name) => _$this._name = name;

  String? _role;
  String? get role => _$this._role;
  set role(String? role) => _$this._role = role;

  String? _about;
  String? get about => _$this._about;
  set about(String? about) => _$this._about = about;

  String? _photoUrl;
  String? get photoUrl => _$this._photoUrl;
  set photoUrl(String? photoUrl) => _$this._photoUrl = photoUrl;

  int? _position;
  int? get position => _$this._position;
  set position(int? position) => _$this._position = position;

  TeamMemberInputBuilder() {
    TeamMemberInput._defaults(this);
  }

  TeamMemberInputBuilder get _$this {
    final $v = _$v;
    if ($v != null) {
      _id = $v.id;
      _name = $v.name;
      _role = $v.role;
      _about = $v.about;
      _photoUrl = $v.photoUrl;
      _position = $v.position;
      _$v = null;
    }
    return this;
  }

  @override
  void replace(TeamMemberInput other) {
    _$v = other as _$TeamMemberInput;
  }

  @override
  void update(void Function(TeamMemberInputBuilder)? updates) {
    if (updates != null) updates(this);
  }

  @override
  TeamMemberInput build() => _build();

  _$TeamMemberInput _build() {
    final _$result = _$v ??
        _$TeamMemberInput._(
          id: BuiltValueNullFieldError.checkNotNull(
              id, r'TeamMemberInput', 'id'),
          name: BuiltValueNullFieldError.checkNotNull(
              name, r'TeamMemberInput', 'name'),
          role: role,
          about: about,
          photoUrl: photoUrl,
          position: BuiltValueNullFieldError.checkNotNull(
              position, r'TeamMemberInput', 'position'),
        );
    replace(_$result);
    return _$result;
  }
}

// ignore_for_file: deprecated_member_use_from_same_package,type=lint
