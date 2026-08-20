// GENERATED CODE - DO NOT MODIFY BY HAND

part of 'public_team_member_input.dart';

// **************************************************************************
// BuiltValueGenerator
// **************************************************************************

class _$PublicTeamMemberInput extends PublicTeamMemberInput {
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

  factory _$PublicTeamMemberInput(
          [void Function(PublicTeamMemberInputBuilder)? updates]) =>
      (PublicTeamMemberInputBuilder()..update(updates))._build();

  _$PublicTeamMemberInput._(
      {required this.id,
      required this.name,
      this.role,
      this.about,
      this.photoUrl})
      : super._();
  @override
  PublicTeamMemberInput rebuild(
          void Function(PublicTeamMemberInputBuilder) updates) =>
      (toBuilder()..update(updates)).build();

  @override
  PublicTeamMemberInputBuilder toBuilder() =>
      PublicTeamMemberInputBuilder()..replace(this);

  @override
  bool operator ==(Object other) {
    if (identical(other, this)) return true;
    return other is PublicTeamMemberInput &&
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
    return (newBuiltValueToStringHelper(r'PublicTeamMemberInput')
          ..add('id', id)
          ..add('name', name)
          ..add('role', role)
          ..add('about', about)
          ..add('photoUrl', photoUrl))
        .toString();
  }
}

class PublicTeamMemberInputBuilder
    implements Builder<PublicTeamMemberInput, PublicTeamMemberInputBuilder> {
  _$PublicTeamMemberInput? _$v;

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

  PublicTeamMemberInputBuilder() {
    PublicTeamMemberInput._defaults(this);
  }

  PublicTeamMemberInputBuilder get _$this {
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
  void replace(PublicTeamMemberInput other) {
    _$v = other as _$PublicTeamMemberInput;
  }

  @override
  void update(void Function(PublicTeamMemberInputBuilder)? updates) {
    if (updates != null) updates(this);
  }

  @override
  PublicTeamMemberInput build() => _build();

  _$PublicTeamMemberInput _build() {
    final _$result = _$v ??
        _$PublicTeamMemberInput._(
          id: BuiltValueNullFieldError.checkNotNull(
              id, r'PublicTeamMemberInput', 'id'),
          name: BuiltValueNullFieldError.checkNotNull(
              name, r'PublicTeamMemberInput', 'name'),
          role: role,
          about: about,
          photoUrl: photoUrl,
        );
    replace(_$result);
    return _$result;
  }
}

// ignore_for_file: deprecated_member_use_from_same_package,type=lint
