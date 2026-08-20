import type { FastifyInstance } from 'fastify';
import type { ZodTypeProvider } from 'fastify-type-provider-zod';
import { z } from 'zod';

import type { Executor } from '../../platform/db.ts';
import { principalOf } from '../../platform/auth.ts';
import { ProblemError } from '../../platform/problem.ts';
import type { StorageClient } from '../../platform/storage.ts';
import {
  imagePurposes,
  portfolioImagesSchema,
  uploadedImageSchema,
  type ImagePurpose,
} from './media.schema.ts';
import {
  getPortfolioImages,
  removePortfolioImage,
  uploadImage,
} from './media.service.ts';

/** Knows HTTP. Parses, calls the service, serialises. No logic. */

const purposeSchema = z.enum(imagePurposes);

export function registerMediaRoutes(
  app: FastifyInstance,
  db: () => Executor,
  storage: StorageClient,
): void {
  // ── THE ONE ROUTE WITH NO ZOD BODY SCHEMA ─────────────────────────────────
  //
  // `multipart/form-data`, so there is no JSON body for the type provider to
  // validate and declaring one would make it try. The parts are checked in the
  // handler instead, and this comment exists because the pattern everywhere
  // else in this API is the opposite and a reader is entitled to ask.
  //
  // The RESPONSE is still declared, so the spec and the Dart client know what
  // comes back.
  app.withTypeProvider<ZodTypeProvider>().post(
    '/v1/me/business/images',
    {
      schema: {
        operationId: 'uploadBusinessImage',
        summary: 'Upload an image',
        description:
          'multipart/form-data with a `file` part and a `purpose` field of banner, team or portfolio. JPEG and PNG only, 5 MB maximum. Returns a public URL: a banner is stored on the business, a portfolio image creates a gallery row, and a team photo is handed back for the caller to attach with PATCH.',
        tags: ['media'],
        consumes: ['multipart/form-data'],
        response: { 201: uploadedImageSchema },
      },
    },
    async (request, reply) => {
      const part = await request.file();
      if (part === undefined) {
        throw new ProblemError('validation-failed', 'no file part');
      }

      // Read BEFORE inspecting the fields: `@fastify/multipart` streams, and
      // the size limit only fires while the body is being consumed. Buffering
      // first is what makes `file.truncated` meaningful below.
      const body = await part.toBuffer();

      if (part.file.truncated) {
        throw new ProblemError(
          'upload-rejected',
          'file exceeds the size limit',
        );
      }

      const purpose = purposeSchema.safeParse(
        // `fields.purpose` is a field part when present. Reached through the
        // part rather than through `request.body`, which multipart does not
        // populate.
        (part.fields as Record<string, { value?: unknown } | undefined>)[
          'purpose'
        ]?.value,
      );
      if (!purpose.success) {
        throw new ProblemError(
          'validation-failed',
          'missing or invalid purpose',
        );
      }

      const uploaded = await uploadImage(
        { db: db(), storage, log: request.log },
        principalOf(request),
        {
          purpose: purpose.data satisfies ImagePurpose,
          contentType: part.mimetype,
          body,
        },
      );

      return await reply.code(201).send(uploaded);
    },
  );

  app.withTypeProvider<ZodTypeProvider>().get(
    '/v1/me/business/portfolio-images',
    {
      schema: {
        operationId: 'listMyPortfolioImages',
        summary: "The caller's gallery",
        description: 'In display order, ties broken by creation time.',
        tags: ['media'],
        response: { 200: portfolioImagesSchema },
      },
    },
    async (request) => await getPortfolioImages(db(), principalOf(request)),
  );

  app.withTypeProvider<ZodTypeProvider>().delete(
    '/v1/me/business/portfolio-images/:imageId',
    {
      schema: {
        operationId: 'deletePortfolioImage',
        summary: 'Remove a gallery image',
        description:
          'Removes the row and then the stored object. If the object cannot be removed the request still succeeds — the image is off the page, which is what was asked, and the orphan is logged.',
        tags: ['media'],
        params: z.object({ imageId: z.uuid() }),
        response: { 204: z.null() },
      },
    },
    async (request, reply) => {
      await removePortfolioImage(
        { db: db(), storage, log: request.log },
        principalOf(request),
        request.params.imageId,
      );
      return await reply.code(204).send(null);
    },
  );
}
