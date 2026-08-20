import { z } from 'zod';

/**
 * The media contract (ADR-014, ADR-025).
 *
 * ── THE UPLOAD REQUEST IS NOT DECLARED HERE, AND CANNOT BE ──────────────────
 *
 * It is `multipart/form-data`, and a Zod body schema would tell
 * `fastify-type-provider-zod` to parse and validate a JSON body that does not
 * exist. So the upload route declares its RESPONSE here and validates its parts
 * in the handler, which is the one place in this API where a request shape is
 * checked outside a schema — stated plainly because the pattern everywhere else
 * is the opposite.
 */

/**
 * What the image is for.
 *
 * A closed vocabulary rather than free text, because it becomes a path segment
 * in object storage and it decides which table (if any) records the result.
 * Adding a fourth is a deliberate change in three places, which is the right
 * amount of friction.
 */
export const imagePurposes = ['banner', 'team', 'portfolio'] as const;
export type ImagePurpose = (typeof imagePurposes)[number];

export const uploadedImageSchema = z
  .object({
    url: z.url().describe('The public URL. Safe to store and to render.'),
    purpose: z.enum(imagePurposes),
    /**
     * Present only for `portfolio`, which is the one purpose that creates a
     * row of its own. A banner is a column on `businesses` and a team photo is
     * a column on `team_members`; neither has an id the client did not already
     * have.
     */
    portfolioImageId: z.uuid().nullable(),
  })
  .describe('An image that is now stored and publicly readable.')
  .meta({ id: 'UploadedImage' });

export const portfolioImageSchema = z
  .object({
    id: z.uuid(),
    imageUrl: z.string(),
    position: z.int(),
  })
  .describe('A gallery image on the public booking page.')
  .meta({ id: 'PortfolioImage' });

export const portfolioImagesSchema = z
  .array(portfolioImageSchema)
  .describe('The salon’s gallery, in display order.');

/** The two the design's screens use, and nothing else. ADR-011. */
export const ACCEPTED_IMAGE_TYPES: ReadonlyMap<string, string> = new Map([
  ['image/jpeg', 'jpg'],
  ['image/png', 'png'],
]);

/**
 * 5 MB.
 *
 * Enforced by `@fastify/multipart` at the stream, so an oversized body is
 * refused while it is arriving rather than after it has all been buffered —
 * the difference between rejecting a 500 MB upload and holding 500 MB in
 * memory to find out it is too big.
 */
export const MAX_IMAGE_BYTES = 5 * 1024 * 1024;
