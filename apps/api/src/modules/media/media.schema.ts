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
 * What the bytes actually are, or `undefined` for anything else.
 *
 * ══ THE CLIENT'S `Content-Type` IS A CLAIM, NOT A FACT ══════════════════════
 *
 * Both upload paths used to take the stored extension straight from
 * `part.mimetype` — a header the caller writes. So a caller could send
 * `content-type: image/png` with an HTML document, an SVG carrying a script, or
 * a polyglot, and the object would be stored as `.png` and served from the
 * public bucket with whatever content type Storage inferred from the extension
 * we chose on their say-so.
 *
 * **This is the same instinct as the `Content-Length` note in `app.ts`**, one
 * field over: the size cap lives at the stream because "checking
 * `Content-Length` instead would trust a header the client writes". The type
 * was still being trusted from exactly such a header.
 *
 * ── THE EXTENSION IS DERIVED FROM WHAT WAS FOUND, NOT WHAT WAS CLAIMED ─────
 *
 * That is the half that matters. Verifying the magic bytes and then still
 * storing `part.mimetype`'s extension would leave the mismatch in place; the
 * point is that the two can disagree, and the bytes win.
 *
 * ── WHY A PREFIX CHECK IS ENOUGH HERE ──────────────────────────────────────
 *
 * This is not a decoder and does not try to be. It answers "do these bytes
 * begin the way a JPEG or a PNG begins", which is what decides how a browser
 * sniffs them and what Storage records. A file that passes this and is still a
 * corrupt JPEG is a broken image, not a script — and `nosniff` plus the CSP on
 * the web app cover what is left.
 */
export type ImageFormat = 'jpg' | 'png';

export function detectImageFormat(bytes: Buffer): ImageFormat | undefined {
  // PNG: the 8-byte signature. The `\r\n` and `\x1a` in it are there to catch
  // exactly the line-ending mangling that would otherwise corrupt a transfer,
  // so all eight are checked rather than the first four.
  if (
    bytes.length >= 8 &&
    bytes[0] === 0x89 &&
    bytes[1] === 0x50 &&
    bytes[2] === 0x4e &&
    bytes[3] === 0x47 &&
    bytes[4] === 0x0d &&
    bytes[5] === 0x0a &&
    bytes[6] === 0x1a &&
    bytes[7] === 0x0a
  ) {
    return 'png';
  }

  // JPEG: SOI marker `FF D8`, followed by the start of any marker segment
  // `FF`. Two bytes alone would accept a file that merely begins `FF D8`; the
  // third is what every real JPEG has and most accidents do not.
  if (
    bytes.length >= 3 &&
    bytes[0] === 0xff &&
    bytes[1] === 0xd8 &&
    bytes[2] === 0xff
  ) {
    return 'jpg';
  }

  return undefined;
}

/** The content type to STORE for a verified format — ours, not the caller's. */
export const CONTENT_TYPE_FOR: Readonly<Record<ImageFormat, string>> = {
  jpg: 'image/jpeg',
  png: 'image/png',
};

/**
 * 5 MB.
 *
 * Enforced by `@fastify/multipart` at the stream, so an oversized body is
 * refused while it is arriving rather than after it has all been buffered —
 * the difference between rejecting a 500 MB upload and holding 500 MB in
 * memory to find out it is too big.
 */
export const MAX_IMAGE_BYTES = 5 * 1024 * 1024;
