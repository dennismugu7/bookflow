// GENERATED CODE - DO NOT MODIFY BY HAND

part of 'team_member.dart';

// **************************************************************************
// BuiltValueGenerator
// **************************************************************************

class _$TeamMember extends TeamMember {
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

  factory _$TeamMember([void Function(TeamMemberBuilder)? updates]) =>
      (TeamMemberBuilder()..update(updates))._build();

  _$TeamMember._(
      {required this.id,
      required this.name,
      this.role,
      this.about,
      this.photoUrl,
      required this.position})
      : super._();
  @override
  TeamMember rebuild(void Function(TeamMemberBuilder) updates) =>
      (toBuilder()..update(updates)).build();

  @override
  TeamMemberBuilder toBuilder() => TeamMemberBuilder()..replace(this);

  @override
  bool operator ==(Object other) {
    if (identical(other, this)) return true;
    return other is TeamMember &&
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
    return (newBuiltValueToStringHelper(r'TeamMember')
          ..add('id', id)
          ..add('name', name)
          ..add('role', role)
          ..add('about', about)
          ..add('photoUrl', photoUrl)
          ..add('position', position))
        .toString();
  }
}

class TeamMemberBuilder implements Builder<TeamMember, TeamMemberBuilder> {
  _$TeamMember? _$v;

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

  TeamMemberBuilder() {
    TeamMember._defaults(this);
  }

  TeamMemberBuilder get _$this {
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
  void replace(TeamMember other) {
    _$v = other as _$TeamMember;
  }

  @override
  void update(void Function(TeamMemberBuilder)? updates) {
    if (updates != null) updates(this);
  }

  @override
  TeamMember build() => _build();

  _$TeamMember _build() {
    final _$result = _$v ??
        _$TeamMember._(
          id: BuiltValueNullFieldError.checkNotNull(id, r'TeamMember', 'id'),
          name: BuiltValueNullFieldError.checkNotNull(
              name, r'TeamMember', 'name'),
          role: role,
          about: about,
          photoUrl: photoUrl,
          position: BuiltValueNullFieldError.checkNotNull(
              position, r'TeamMember', 'position'),
        );
    replace(_$result);
    return _$result;
  }
}

// ignore_for_file: deprecated_member_use_from_same_package,type=lint
