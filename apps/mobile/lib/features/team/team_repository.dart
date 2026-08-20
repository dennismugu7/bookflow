import 'package:bookflow/features/team/team_models.dart';
import 'package:bookflow_api/bookflow_api.dart' hide TeamMember;
import 'package:bookflow_api/bookflow_api.dart' as api show TeamMember;
import 'package:built_collection/built_collection.dart';
import 'package:dio/dio.dart';

/// Knows the data source and nothing else (ADR-028).
///
/// **The only file in `features/team/` that may import
/// `package:bookflow_api`.**
abstract interface class TeamRepository {
  Future<List<TeamMember>> list();

  Future<TeamMember> create({
    required String name,
    required String? role,
    required String? about,
    required String? photoUrl,
  });

  Future<TeamMember> update({
    required String id,
    required String name,
    required String? role,
    required String? about,
    required String? photoUrl,
  });

  Future<void> delete(String id);
}

class ApiTeamRepository implements TeamRepository {
  const ApiTeamRepository(this._api);

  final BookflowApi _api;

  @override
  Future<List<TeamMember>> list() async {
    final Response<BuiltList<api.TeamMember>> response = await _api
        .getTeamApi()
        .listMyTeamMembers();

    return (response.data ?? BuiltList<api.TeamMember>())
        .map(_toModel)
        .toList();
  }

  @override
  Future<TeamMember> create({
    required String name,
    required String? role,
    required String? about,
    required String? photoUrl,
  }) async {
    final Response<api.TeamMember> response = await _api
        .getTeamApi()
        .createTeamMember(
          createTeamMemberRequestInput: CreateTeamMemberRequestInput((
            CreateTeamMemberRequestInputBuilder b,
          ) {
            b.name = name;
            // ── ABSENT, NOT EMPTY ────────────────────────────────────────
            //
            // An optional field the owner left blank is omitted rather than
            // sent as `""`. The API's column is nullable and its schema
            // treats an absent field as unset; sending an empty string would
            // store one, and a public page would then render an empty role
            // line instead of no role line.
            if (role != null && role.isNotEmpty) b.role = role;
            if (about != null && about.isNotEmpty) b.about = about;
            if (photoUrl != null && photoUrl.isNotEmpty) {
              b.photoUrl = photoUrl;
            }
          }),
        );

    final api.TeamMember? created = response.data;
    if (created == null) {
      throw StateError('POST /v1/me/business/team-members returned no body');
    }
    return _toModel(created);
  }

  @override
  Future<TeamMember> update({
    required String id,
    required String name,
    required String? role,
    required String? about,
    required String? photoUrl,
  }) async {
    final Response<api.TeamMember> response = await _api
        .getTeamApi()
        .updateTeamMember(
          memberId: id,
          updateTeamMemberRequestInput: UpdateTeamMemberRequestInput((
            UpdateTeamMemberRequestInputBuilder b,
          ) {
            b.name = name;
            if (role != null && role.isNotEmpty) b.role = role;
            if (about != null && about.isNotEmpty) b.about = about;
            if (photoUrl != null && photoUrl.isNotEmpty) {
              b.photoUrl = photoUrl;
            }
          }),
        );

    final api.TeamMember? updated = response.data;
    if (updated == null) {
      throw StateError(
        'PATCH /v1/me/business/team-members/{id} returned no body',
      );
    }
    return _toModel(updated);
  }

  @override
  Future<void> delete(String id) async {
    await _api.getTeamApi().deleteTeamMember(memberId: id);
  }

  static TeamMember _toModel(api.TeamMember member) => TeamMember(
    id: member.id,
    name: member.name,
    role: member.role,
    about: member.about,
    photoUrl: member.photoUrl,
    position: member.position,
  );
}
