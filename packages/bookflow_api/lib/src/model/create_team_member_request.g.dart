// GENERATED CODE - DO NOT MODIFY BY HAND

part of 'create_team_member_request.dart';

// **************************************************************************
// BuiltValueGenerator
// **************************************************************************

class _$CreateTeamMemberRequest extends CreateTeamMemberRequest {
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

  factory _$CreateTeamMemberRequest(
          [void Function(CreateTeamMemberRequestBuilder)? updates]) =>
      (CreateTeamMemberRequestBuilder()..update(updates))._build();

  _$CreateTeamMemberRequest._(
      {required this.name, this.role, this.about, this.photoUrl, this.position})
      : super._();
  @override
  CreateTeamMemberRequest rebuild(
          void Function(CreateTeamMemberRequestBuilder) updates) =>
      (toBuilder()..update(updates)).build();

  @override
  CreateTeamMemberRequestBuilder toBuilder() =>
      CreateTeamMemberRequestBuilder()..replace(this);

  @override
  bool operator ==(Object other) {
    if (identical(other, this)) return true;
    return other is CreateTeamMemberRequest &&
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
    return (newBuiltValueToStringHelper(r'CreateTeamMemberRequest')
          ..add('name', name)
          ..add('role', role)
          ..add('about', about)
          ..add('photoUrl', photoUrl)
          ..add('position', position))
        .toString();
  }
}

class CreateTeamMemberRequestBuilder
    implements
        Builder<CreateTeamMemberRequest, CreateTeamMemberRequestBuilder> {
  _$CreateTeamMemberRequest? _$v;

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

  CreateTeamMemberRequestBuilder() {
    CreateTeamMemberRequest._defaults(this);
  }

  CreateTeamMemberRequestBuilder get _$this {
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
  void replace(CreateTeamMemberRequest other) {
    _$v = other as _$CreateTeamMemberRequest;
  }

  @override
  void update(void Function(CreateTeamMemberRequestBuilder)? updates) {
    if (updates != null) updates(this);
  }

  @override
  CreateTeamMemberRequest build() => _build();

  _$CreateTeamMemberRequest _build() {
    final _$result = _$v ??
        _$CreateTeamMemberRequest._(
          name: BuiltValueNullFieldError.checkNotNull(
              name, r'CreateTeamMemberRequest', 'name'),
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
