import { sql } from 'kysely';

import type { Executor } from '../../platform/db.ts';
import { ownedBusinessOf, type OwnerScope } from '../scope.ts';

/**
 * Knows the database. Applies the membership scoping rule (`CLAUDE.md` §4, §5).
 *
 * Every statement carries `ownedBusinessOf` in its own `where` — see
 * `../scope.ts`.
 */

export interface TeamMemberRow {
  readonly id: string;
  readonly name: string;
  readonly role: string | null;
  readonly about: string | null;
  readonly photoUrl: string | null;
  readonly position: number;
}

const COLUMNS = sql`
  id,
  name,
  role,
  about,
  photo_url as "photoUrl",
  position
`;

export async function listTeamMembers(
  executor: Executor,
  scope: OwnerScope,
): Promise<TeamMemberRow[]> {
  const result = await sql<TeamMemberRow>`
    select ${COLUMNS}
      from public.team_members
     where business_id = ${ownedBusinessOf(scope.userId)}
     order by position asc, created_at asc
  `.execute(executor);

  return result.rows;
}

export async function insertTeamMember(
  executor: Executor,
  scope: OwnerScope,
  input: {
    readonly name: string;
    readonly role: string | undefined;
    readonly about: string | undefined;
    readonly photoUrl: string | undefined;
    readonly position: number | undefined;
  },
): Promise<TeamMemberRow | undefined> {
  const result = await sql<TeamMemberRow>`
    insert into public.team_members (business_id, name, role, about, photo_url, position)
    select
      ${ownedBusinessOf(scope.userId)},
      ${input.name},
      ${input.role ?? null}::text,
      ${input.about ?? null}::text,
      ${input.photoUrl ?? null}::text,
      coalesce(${input.position ?? null}::int, 0)
    where ${ownedBusinessOf(scope.userId)} is not null
    returning ${COLUMNS}
  `.execute(executor);

  return result.rows[0];
}

export async function updateTeamMember(
  executor: Executor,
  scope: OwnerScope,
  memberId: string,
  input: {
    readonly name: string | undefined;
    readonly role: string | undefined;
    readonly about: string | undefined;
    readonly photoUrl: string | undefined;
    readonly position: number | undefined;
  },
): Promise<TeamMemberRow | undefined> {
  // `coalesce(param, column)` — an absent field is untouched. See the same note
  // in `services.repository.ts` for why the SET list is not assembled.
  const result = await sql<TeamMemberRow>`
    update public.team_members
       set name = coalesce(${input.name ?? null}::text, name),
           role = coalesce(${input.role ?? null}::text, role),
           about = coalesce(${input.about ?? null}::text, about),
           photo_url = coalesce(${input.photoUrl ?? null}::text, photo_url),
           position = coalesce(${input.position ?? null}::int, position)
     where id = ${memberId}::uuid
       and business_id = ${ownedBusinessOf(scope.userId)}
    returning ${COLUMNS}
  `.execute(executor);

  return result.rows[0];
}

export async function deleteTeamMember(
  executor: Executor,
  scope: OwnerScope,
  memberId: string,
): Promise<boolean> {
  const result = await sql<{ id: string }>`
    delete from public.team_members
     where id = ${memberId}::uuid
       and business_id = ${ownedBusinessOf(scope.userId)}
    returning id
  `.execute(executor);

  return result.rows.length > 0;
}
