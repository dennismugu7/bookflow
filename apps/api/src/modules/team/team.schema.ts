import { z } from 'zod';

import { httpUrl } from '../../platform/url.ts';

/**
 * The team contract (ADR-014, ADR-025).
 *
 * ── ONE NAME FIELD, AND THAT IS ADR-005 ─────────────────────────────────────
 *
 * A team member is a CONTENT record in a Latin-script-only market, and ADR-005
 * gives content records one name field. The two-field rule in that same ADR
 * applies to the owner's own account and to nothing else — `auth.schema.ts` has
 * `firstName`/`lastName` for exactly that reason, and copying it here would be
 * reading the ADR backwards.
 */

const TEAM_NAME_MAX_LENGTH = 200;
const ROLE_MAX_LENGTH = 100;
const ABOUT_MAX_LENGTH = 2000;

/** `.trim()` first — see `businesses.schema.ts` for why the order is the mechanism. */
const memberName = z
  .string()
  .trim()
  .min(1)
  .max(TEAM_NAME_MAX_LENGTH)
  .describe('Required. Trimmed. 1–200 characters after trimming.');

/**
 * A JOB TITLE. "Senior stylist", not an authorization role.
 *
 * Nothing branches on it and nothing ever should; `memberships.role` is the one
 * that means anything, and I9 is where that vocabulary widens. The column
 * comment in the migration says the same thing, because the field is called
 * `role` on both sides and the name is the whole risk.
 */
const memberRole = z
  .string()
  .trim()
  .max(ROLE_MAX_LENGTH)
  .describe('Job title, e.g. "Senior stylist". NOT an authorization role.');

const about = z.string().trim().max(ABOUT_MAX_LENGTH);

const PHOTO_URL_MAX_LENGTH = 2000;

/**
 * The team member's photograph.
 *
 * ── IT WAS `z.url()`, WHICH ACCEPTS `javascript:` ──────────────────────────
 *
 * The client web app renders this as an `<img src>` on the salon's public team
 * section. `z.url()` validates syntax and says nothing about the scheme, so
 * `javascript:` and `data:text/html` both passed — stored, and handed to
 * whatever renders it next.
 *
 * The allowlist lives in `platform/url.ts` and is shared with `mapsUrl`. See it
 * for why the check belongs at the boundary where the value ENTERS rather than
 * at every place it might leave.
 *
 * **In practice this URL is one we produced**: the upload endpoint returns it
 * and the client hands it straight back. But this route accepts it as input
 * from an authenticated owner, so it is caller-supplied whatever the happy path
 * does — and "the client only ever sends what we gave it" is a property of the
 * client, not of the endpoint.
 */
const photoUrl = httpUrl(PHOTO_URL_MAX_LENGTH);
const position = z.int().min(0);

export const teamMemberSchema = z
  .object({
    id: z.uuid(),
    name: z.string(),
    role: z.string().nullable(),
    about: z.string().nullable(),
    photoUrl: z.string().nullable(),
    position: z.int(),
  })
  .describe('Someone a client can book with.')
  .meta({ id: 'TeamMember' });

export const teamMembersSchema = z
  .array(teamMemberSchema)
  .describe('The salon’s team, in display order.');

export const createTeamMemberRequestSchema = z
  .object({
    name: memberName,
    role: memberRole.optional(),
    about: about.optional(),
    photoUrl: photoUrl.optional(),
    position: position.optional(),
  })
  .describe('Someone to add to the team.')
  .meta({ id: 'CreateTeamMemberRequest' });

/** At least one field, for the reason `updateServiceRequestSchema` gives. */
export const updateTeamMemberRequestSchema = z
  .object({
    name: memberName.optional(),
    role: memberRole.optional(),
    about: about.optional(),
    photoUrl: photoUrl.optional(),
    position: position.optional(),
  })
  .refine((body) => Object.keys(body).length > 0, {
    message: 'at least one field must be present',
  })
  .describe('The fields to change. At least one.')
  .meta({ id: 'UpdateTeamMemberRequest' });
