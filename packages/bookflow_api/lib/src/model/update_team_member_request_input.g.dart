// GENERATED CODE - DO NOT MODIFY BY HAND

part of 'update_team_member_request_input.dart';

// **************************************************************************
// BuiltValueGenerator
// **************************************************************************

class _$UpdateTeamMemberRequestInput extends UpdateTeamMemberRequestInput {
  @override
  final String? name;
  @override
  final String? role;
  @override
  final String? about;
  @override
  final String? photoUrl;
  @override
  final int? position;

  factory _$UpdateTeamMemberRequestInput(
          [void Function(UpdateTeamMemberRequestInputBuilder)? updates]) =>
      (UpdateTeamMemberRequestInputBuilder()..update(updates))._build();

  _$UpdateTeamMemberRequestInput._(
      {this.name, this.role, this.about, this.photoUrl, this.position})
      : super._();
  @override
  UpdateTeamMemberRequestInput rebuild(
          void Function(UpdateTeamMemberRequestInputBuilder) updates) =>
      (toBuilder()..update(updates)).build();

  @override
  UpdateTeamMemberRequestInputBuilder toBuilder() =>
      UpdateTeamMemberRequestInputBuilder()..replace(this);

  @override
  bool operator ==(Object other) {
    if (identical(other, this)) return true;
    return other is UpdateTeamMemberRequestInput &&
        name == other.name &&
        role == other.role &&
        about == other.about &&
        photoUrl == other.photoUrl &&
        position == other.position;
  }

  @override
  int get hashCode {
    var _$hash = 0;
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
    return (newBuiltValueToStringHelper(r'UpdateTeamMemberRequestInput')
          ..add('name', name)
          ..add('role', role)
          ..add('about', about)
          ..add('photoUrl', photoUrl)
          ..add('position', position))
        .toString();
  }
}

class UpdateTeamMemberRequestInputBuilder
    implements
        Builder<UpdateTeamMemberRequestInput,
            UpdateTeamMemberRequestInputBuilder> {
  _$UpdateTeamMemberRequestInput? _$v;

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

  UpdateTeamMemberRequestInputBuilder() {
    UpdateTeamMemberRequestInput._defaults(this);
  }

  UpdateTeamMemberRequestInputBuilder get _$this {
    final $v = _$v;
    if ($v != null) {
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
  void replace(UpdateTeamMemberRequestInput other) {
    _$v = other as _$UpdateTeamMemberRequestInput;
  }

  @override
  void update(void Function(UpdateTeamMemberRequestInputBuilder)? updates) {
    if (updates != null) updates(this);
  }

  @override
  UpdateTeamMemberRequestInput build() => _build();

  _$UpdateTeamMemberRequestInput _build() {
    final _$result = _$v ??
        _$UpdateTeamMemberRequestInput._(
          name: name,
          role: role,
          about: about,
          photoUrl: photoUrl,
          position: position,
        );
    replace(_$result);
    return _$result;
  }
}

// ignore_for_file: deprecated_member_use_from_same_package,type=lint
