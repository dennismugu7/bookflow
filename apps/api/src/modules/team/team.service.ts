import type { Executor } from '../../platform/db.ts';
import { ProblemError } from '../../platform/problem.ts';
import type { OwnerScope } from '../scope.ts';
import {
  deleteTeamMember,
  insertTeamMember,
  listTeamMembers,
  updateTeamMember,
  type TeamMemberRow,
} from './team.repository.ts';

/** Business logic. All of it. */

export async function getTeam(
  db: Executor,
  scope: OwnerScope,
): Promise<TeamMemberRow[]> {
  return await listTeamMembers(db, scope);
}

/**
 * ── NO UNIQUENESS ON A TEAM MEMBER'S NAME, AND THAT IS DELIBERATE ───────────
 *
 * Services are unique per salon because two identically-named services are
 * indistinguishable to a client choosing between them. **People are not
 * services.** Two stylists called Grace is an ordinary fact about a salon, and
 * a constraint refusing the second would be the API telling an owner their
 * colleague may not be hired.
 *
 * So there is no `duplicate-name` branch here and no index behind one.
 */
export async function addTeamMember(
  db: Executor,
  scope: OwnerScope,
  input: {
    readonly name: string;
    readonly role: string | undefined;
    readonly about: string | undefined;
    readonly photoUrl: string | undefined;
    readonly position: number | undefined;
  },
): Promise<TeamMemberRow> {
  const row = await insertTeamMember(db, scope, input);
  if (row === undefined) {
    throw new ProblemError('not-found', 'no business for this principal');
  }
  return row;
}

export async function editTeamMember(
  db: Executor,
  scope: OwnerScope,
  memberId: string,
  input: {
    readonly name: string | undefined;
    readonly role: string | undefined;
    readonly about: string | undefined;
    readonly photoUrl: string | undefined;
    readonly position: number | undefined;
  },
): Promise<TeamMemberRow> {
  const row = await updateTeamMember(db, scope, memberId, input);
  if (row === undefined) {
    throw new ProblemError('not-found', 'no such team member for this user');
  }
  return row;
}

export async function removeTeamMember(
  db: Executor,
  scope: OwnerScope,
  memberId: string,
): Promise<void> {
  const removed = await deleteTeamMember(db, scope, memberId);
  if (!removed) {
    throw new ProblemError('not-found', 'no such team member for this user');
  }
}
