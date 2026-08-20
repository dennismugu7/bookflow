import type { FastifyInstance } from 'fastify';
import type { ZodTypeProvider } from 'fastify-type-provider-zod';
import { z } from 'zod';

import type { Executor } from '../../platform/db.ts';
import { principalOf } from '../../platform/auth.ts';
import {
  createServiceRequestSchema,
  serviceSchema,
  servicesSchema,
  updateServiceRequestSchema,
} from './services.schema.ts';
import {
  addService,
  editService,
  getServices,
  removeService,
} from './services.service.ts';

/** Knows HTTP. Parses, calls the service, serialises. No logic. */

export function registerServiceRoutes(
  app: FastifyInstance,
  db: () => Executor,
): void {
  // ── /v1/me/business/... AND NOT /v1/businesses/:id/... ────────────────────
  //
  // ADR-003 gives an account exactly one business, so a path that carried its
  // id would ask the client to send back something the server already knows —
  // and would give every route an id to get wrong. `GET /v1/me/business` set
  // this shape; these follow it.
  app.withTypeProvider<ZodTypeProvider>().get(
    '/v1/me/business/services',
    {
      schema: {
        operationId: 'listMyServices',
        summary: "The caller's services",
        description:
          'In display order, ties broken by creation time. An account with no business gets an empty list, not a 404 — nothing was refused.',
        tags: ['services'],
        response: { 200: servicesSchema },
      },
    },
    async (request) => await getServices(db(), principalOf(request)),
  );

  app.withTypeProvider<ZodTypeProvider>().post(
    '/v1/me/business/services',
    {
      schema: {
        operationId: 'createService',
        summary: 'Add a service',
        description:
          'Names are unique within a salon: a duplicate is refused with 409 duplicate-name and writes nothing. Price is in whole Kenyan shillings.',
        tags: ['services'],
        body: createServiceRequestSchema,
        response: { 201: serviceSchema },
      },
    },
    async (request, reply) => {
      const service = await addService(db(), principalOf(request), {
        ...request.body,
        position: request.body.position,
      });
      return await reply.code(201).send(service);
    },
  );

  app.withTypeProvider<ZodTypeProvider>().patch(
    '/v1/me/business/services/:serviceId',
    {
      schema: {
        operationId: 'updateService',
        summary: 'Change a service',
        description:
          'Every field is optional and at least one must be present. A service that is not the caller’s is indistinguishable from one that does not exist.',
        tags: ['services'],
        params: z.object({ serviceId: z.uuid() }),
        body: updateServiceRequestSchema,
        response: { 200: serviceSchema },
      },
    },
    async (request) =>
      await editService(db(), principalOf(request), request.params.serviceId, {
        name: request.body.name,
        durationMinutes: request.body.durationMinutes,
        priceKes: request.body.priceKes,
        position: request.body.position,
      }),
  );

  // 204 rather than 200-with-a-body. There is nothing to return: the resource
  // is gone, and a body describing what used to be there invites a client to
  // render it.
  app.withTypeProvider<ZodTypeProvider>().delete(
    '/v1/me/business/services/:serviceId',
    {
      schema: {
        operationId: 'deleteService',
        summary: 'Remove a service',
        description:
          'Hard delete (ADR-036). Bookings snapshot their service (ADR-006), so removing one never rewrites a booking that used it.',
        tags: ['services'],
        params: z.object({ serviceId: z.uuid() }),
        response: { 204: z.null() },
      },
    },
    async (request, reply) => {
      await removeService(db(), principalOf(request), request.params.serviceId);
      // `send(null)` rather than `send()`: the response schema is `z.null()`,
      // so the type provider requires the body it declared. A 204 carries no
      // bytes either way — Fastify drops the payload for that status.
      return await reply.code(204).send(null);
    },
  );
}
