import 'package:test/test.dart';
import 'package:bookflow_api/bookflow_api.dart';

/// tests for TeamApi
void main() {
  final instance = BookflowApi().getTeamApi();

  group(TeamApi, () {
    // Add a team member
    //
    // One name field (ADR-005): team members are content records, unlike the owner’s own account. `role` is a job title, never an authorization role. Names are not unique — two stylists may share one.
    //
    //Future<TeamMember> createTeamMember(CreateTeamMemberRequestInput createTeamMemberRequestInput) async
    test('test createTeamMember', () async {
      // TODO
    });

    // Remove a team member
    //
    // Hard delete (ADR-036). ADR-006 snapshots the team member onto every booking, so removing one never rewrites a booking they took.
    //
    //Future deleteTeamMember(String memberId) async
    test('test deleteTeamMember', () async {
      // TODO
    });

    // The caller's team
    //
    // In display order, ties broken by creation time. An account with no business gets an empty list.
    //
    //Future<BuiltList<TeamMember>> listMyTeamMembers() async
    test('test listMyTeamMembers', () async {
      // TODO
    });

    // Change a team member
    //
    // Every field is optional and at least one must be present. A member who is not the caller’s is indistinguishable from one who does not exist.
    //
    //Future<TeamMember> updateTeamMember(String memberId, UpdateTeamMemberRequestInput updateTeamMemberRequestInput) async
    test('test updateTeamMember', () async {
      // TODO
    });
  });
}
