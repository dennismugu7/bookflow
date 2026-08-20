import type { FastifyInstance } from 'fastify';
import type { ZodTypeProvider } from 'fastify-type-provider-zod';
import { z } from 'zod';

import type { Executor } from '../../platform/db.ts';
import { principalOf } from '../../platform/auth.ts';
import {
  createTeamMemberRequestSchema,
  teamMemberSchema,
  teamMembersSchema,
  updateTeamMemberRequestSchema,
} from './team.schema.ts';
import {
  addTeamMember,
  editTeamMember,
  getTeam,
  removeTeamMember,
} from './team.service.ts';

/** Knows HTTP. Parses, calls the service, serialises. No logic. */

export function registerTeamRoutes(
  app: FastifyInstance,
  db: () => Executor,
): void {
  app.withTypeProvider<ZodTypeProvider>().get(
    '/v1/me/business/team-members',
    {
      schema: {
        operationId: 'listMyTeamMembers',
        summary: "The caller's team",
        description:
          'In display order, ties broken by creation time. An account with no business gets an empty list.',
        tags: ['team'],
        response: { 200: teamMembersSchema },
      },
    },
    async (request) => await getTeam(db(), principalOf(request)),
  );

  app.withTypeProvider<ZodTypeProvider>().post(
    '/v1/me/business/team-members',
    {
      schema: {
        operationId: 'createTeamMember',
        summary: 'Add a team member',
        description:
          'One name field (ADR-005): team members are content records, unlike the owner’s own account. `role` is a job title, never an authorization role. Names are not unique — two stylists may share one.',
        tags: ['team'],
        body: createTeamMemberRequestSchema,
        response: { 201: teamMemberSchema },
      },
    },
    async (request, reply) => {
      const member = await addTeamMember(db(), principalOf(request), {
        name: request.body.name,
        role: request.body.role,
        about: request.body.about,
        photoUrl: request.body.photoUrl,
        position: request.body.position,
      });
      return await reply.code(201).send(member);
    },
  );

  app.withTypeProvider<ZodTypeProvider>().patch(
    '/v1/me/business/team-members/:memberId',
    {
      schema: {
        operationId: 'updateTeamMember',
        summary: 'Change a team member',
        description:
          'Every field is optional and at least one must be present. A member who is not the caller’s is indistinguishable from one who does not exist.',
        tags: ['team'],
        params: z.object({ memberId: z.uuid() }),
        body: updateTeamMemberRequestSchema,
        response: { 200: teamMemberSchema },
      },
    },
    async (request) =>
      await editTeamMember(
        db(),
        principalOf(request),
        request.params.memberId,
        {
          name: request.body.name,
          role: request.body.role,
          about: request.body.about,
          photoUrl: request.body.photoUrl,
          position: request.body.position,
        },
      ),
  );

  app.withTypeProvider<ZodTypeProvider>().delete(
    '/v1/me/business/team-members/:memberId',
    {
      schema: {
        operationId: 'deleteTeamMember',
        summary: 'Remove a team member',
        description:
          'Hard delete (ADR-036). ADR-006 snapshots the team member onto every booking, so removing one never rewrites a booking they took.',
        tags: ['team'],
        params: z.object({ memberId: z.uuid() }),
        response: { 204: z.null() },
      },
    },
    async (request, reply) => {
      await removeTeamMember(
        db(),
        principalOf(request),
        request.params.memberId,
      );
      return await reply.code(204).send(null);
    },
  );
}
