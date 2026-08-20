// GENERATED CODE - DO NOT MODIFY BY HAND

part of 'public_team_member.dart';

// **************************************************************************
// BuiltValueGenerator
// **************************************************************************

class _$PublicTeamMember extends PublicTeamMember {
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

  factory _$PublicTeamMember(
          [void Function(PublicTeamMemberBuilder)? updates]) =>
      (PublicTeamMemberBuilder()..update(updates))._build();

  _$PublicTeamMember._(
      {required this.id,
      required this.name,
      this.role,
      this.about,
      this.photoUrl})
      : super._();
  @override
  PublicTeamMember rebuild(void Function(PublicTeamMemberBuilder) updates) =>
      (toBuilder()..update(updates)).build();

  @override
  PublicTeamMemberBuilder toBuilder() =>
      PublicTeamMemberBuilder()..replace(this);

  @override
  bool operator ==(Object other) {
    if (identical(other, this)) return true;
    return other is PublicTeamMember &&
        id == other.id &&
        name == other.name &&
        role == other.role &&
        about == other.about &&
        photoUrl == other.photoUrl;
  }

  @override
  int get hashCode {
    var _$hash = 0;
    _$hash = $jc(_$hash, id.hashCode);
    _$hash = $jc(_$hash, name.hashCode);
    _$hash = $jc(_$hash, role.hashCode);
    _$hash = $jc(_$hash, about.hashCode);
    _$hash = $jc(_$hash, photoUrl.hashCode);
    _$hash = $jf(_$hash);
    return _$hash;
  }

  @override
  String toString() {
    return (newBuiltValueToStringHelper(r'PublicTeamMember')
          ..add('id', id)
          ..add('name', name)
          ..add('role', role)
          ..add('about', about)
          ..add('photoUrl', photoUrl))
        .toString();
  }
}

class PublicTeamMemberBuilder
    implements Builder<PublicTeamMember, PublicTeamMemberBuilder> {
  _$PublicTeamMember? _$v;

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

  PublicTeamMemberBuilder() {
    PublicTeamMember._defaults(this);
  }

  PublicTeamMemberBuilder get _$this {
    final $v = _$v;
    if ($v != null) {
      _id = $v.id;
      _name = $v.name;
      _role = $v.role;
      _about = $v.about;
      _photoUrl = $v.photoUrl;
      _$v = null;
    }
    return this;
  }

  @override
  void replace(PublicTeamMember other) {
    _$v = other as _$PublicTeamMember;
  }

  @override
  void update(void Function(PublicTeamMemberBuilder)? updates) {
    if (updates != null) updates(this);
  }

  @override
  PublicTeamMember build() => _build();

  _$PublicTeamMember _build() {
    final _$result = _$v ??
        _$PublicTeamMember._(
          id: BuiltValueNullFieldError.checkNotNull(
              id, r'PublicTeamMember', 'id'),
          name: BuiltValueNullFieldError.checkNotNull(
              name, r'PublicTeamMember', 'name'),
          role: role,
          about: about,
          photoUrl: photoUrl,
        );
    replace(_$result);
    return _$result;
  }
}

// ignore_for_file: deprecated_member_use_from_same_package,type=lint
