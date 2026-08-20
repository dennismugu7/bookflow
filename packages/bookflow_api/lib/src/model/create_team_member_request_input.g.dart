// GENERATED CODE - DO NOT MODIFY BY HAND

part of 'create_team_member_request_input.dart';

// **************************************************************************
// BuiltValueGenerator
// **************************************************************************

class _$CreateTeamMemberRequestInput extends CreateTeamMemberRequestInput {
  @override
  final String name;
  @override
  final String? role;
  @override
  final String? about;
  @override
  final String? photoUrl;
  @override
  final int? position;

  factory _$CreateTeamMemberRequestInput(
          [void Function(CreateTeamMemberRequestInputBuilder)? updates]) =>
      (CreateTeamMemberRequestInputBuilder()..update(updates))._build();

  _$CreateTeamMemberRequestInput._(
      {required this.name, this.role, this.about, this.photoUrl, this.position})
      : super._();
  @override
  CreateTeamMemberRequestInput rebuild(
          void Function(CreateTeamMemberRequestInputBuilder) updates) =>
      (toBuilder()..update(updates)).build();

  @override
  CreateTeamMemberRequestInputBuilder toBuilder() =>
      CreateTeamMemberRequestInputBuilder()..replace(this);

  @override
  bool operator ==(Object other) {
    if (identical(other, this)) return true;
    return other is CreateTeamMemberRequestInput &&
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
    return (newBuiltValueToStringHelper(r'CreateTeamMemberRequestInput')
          ..add('name', name)
          ..add('role', role)
          ..add('about', about)
          ..add('photoUrl', photoUrl)
          ..add('position', position))
        .toString();
  }
}

class CreateTeamMemberRequestInputBuilder
    implements
        Builder<CreateTeamMemberRequestInput,
            CreateTeamMemberRequestInputBuilder> {
  _$CreateTeamMemberRequestInput? _$v;

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

  CreateTeamMemberRequestInputBuilder() {
    CreateTeamMemberRequestInput._defaults(this);
  }

  CreateTeamMemberRequestInputBuilder get _$this {
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
  void replace(CreateTeamMemberRequestInput other) {
    _$v = other as _$CreateTeamMemberRequestInput;
  }

  @override
  void update(void Function(CreateTeamMemberRequestInputBuilder)? updates) {
    if (updates != null) updates(this);
  }

  @override
  CreateTeamMemberRequestInput build() => _build();

  _$CreateTeamMemberRequestInput _build() {
    final _$result = _$v ??
        _$CreateTeamMemberRequestInput._(
          name: BuiltValueNullFieldError.checkNotNull(
              name, r'CreateTeamMemberRequestInput', 'name'),
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
