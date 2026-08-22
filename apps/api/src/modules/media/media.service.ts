import { randomUUID } from 'node:crypto';

import type { Executor } from '../../platform/db.ts';
import { ProblemError } from '../../platform/problem.ts';
import {
  keyFromPublicUrl,
  removeQuietly as removeQuietlyFrom,
  StorageError,
  type StorageClient,
} from '../../platform/storage.ts';
import type { OwnerScope } from '../scope.ts';
import {
  deletePortfolioImage,
  insertPortfolioImage,
  listPortfolioImages,
  ownedBusinessIdOf,
  setBannerUrl,
  type PortfolioImageRow,
} from './media.repository.ts';
import {
  CONTENT_TYPE_FOR,
  detectImageFormat,
  type ImagePurpose,
} from './media.schema.ts';

/** Business logic. All of it. */

export interface MediaLogger {
  warn(payload: Record<string, unknown>, message: string): void;
}

export interface UploadResult {
  readonly url: string;
  readonly purpose: ImagePurpose;
  readonly portfolioImageId: string | null;
}

/**
 * Turns a storage failure into a problem document.
 *
 * `rejected` is a 503 rather than a 400 on purpose: by the time the object
 * store refuses, this service has already checked the type and the size, so a
 * refusal is a disagreement between us and the provider — a server-side problem
 * the caller cannot fix by sending something different.
 */
function problemFor(error: StorageError): ProblemError {
  return new ProblemError('storage-unavailable', error.message);
}

export async function getPortfolioImages(
  db: Executor,
  scope: OwnerScope,
): Promise<PortfolioImageRow[]> {
  return await listPortfolioImages(db, scope);
}

/**
 * Stores an image and records it wherever that purpose is recorded.
 *
 * ══ THE ORDER IS UPLOAD, THEN WRITE — AND IT IS THE SAFE ONE ════════════════
 *
 * The two systems cannot be made atomic. One of the two failure modes has to be
 * chosen, and they are not equally bad:
 *
 *   upload first, then write  → a failed write leaves an ORPHANED OBJECT.
 *                               Costs storage. Nothing points at it, nothing
 *                               serves it, nobody sees it.
 *   write first, then upload  → a failed upload leaves a ROW POINTING AT
 *                               NOTHING, which is a broken image on a live
 *                               public booking page.
 *
 * So: upload, then write. **And when the write fails, the object is removed
 * again** rather than left, which turns the chosen failure mode into no failure
 * at all in every case where the delete succeeds. The delete that cleans up is
 * itself allowed to fail — it is logged and swallowed, because the request has
 * already failed and re-raising would replace an accurate error with a
 * misleading one.
 */
export async function uploadImage(
  deps: {
    readonly db: Executor;
    readonly storage: StorageClient;
    readonly log: MediaLogger;
  },
  scope: OwnerScope,
  input: {
    readonly purpose: ImagePurpose;
    readonly contentType: string;
    readonly body: Buffer;
  },
): Promise<UploadResult> {
  // ══ THE BYTES DECIDE, NOT THE HEADER ═══════════════════════════════════════
  //
  // This was `ACCEPTED_IMAGE_TYPES.get(input.contentType)` — the extension taken
  // from a header the CALLER writes. `content-type: image/png` on an HTML
  // document produced an object stored as `.png`, in the public bucket, served
  // with whatever type Storage inferred from the extension we chose on their
  // say-so.
  //
  // `detectImageFormat` reads the magic bytes and the extension comes from what
  // it FOUND. Verifying and then still using the claimed extension would leave
  // the mismatch exactly where it was.
  //
  // The claimed type is not even consulted: a caller who sends the right bytes
  // with a wrong header gets the right file, and one who sends the right header
  // with wrong bytes gets refused. Neither outcome depends on the header at all.
  const extension = detectImageFormat(input.body);
  if (extension === undefined) {
    // Deliberately the same message whether the header was wrong, the bytes
    // were, or the two disagreed. `problem.ts`: no reflected value, no probe.
    throw new ProblemError('upload-rejected', 'unsupported image type');
  }

  const businessId = await ownedBusinessIdOf(deps.db, scope);
  if (businessId === undefined) {
    throw new ProblemError('not-found', 'no business for this principal');
  }

  const key = `${businessId}/${input.purpose}/${randomUUID()}.${extension}`;

  let url: string;
  try {
    ({ url } = await deps.storage.upload({
      key,
      body: input.body,
      // OURS, derived from the verified format — never `input.contentType`.
      // Storage echoes this back on every read, so a caller-supplied value here
      // is a caller-chosen `Content-Type` on a public URL.
      contentType: CONTENT_TYPE_FOR[extension],
    }));
  } catch (error) {
    if (error instanceof StorageError) throw problemFor(error);
    throw error;
  }

  try {
    if (input.purpose === 'portfolio') {
      const row = await insertPortfolioImage(deps.db, scope, url);
      if (row === undefined) {
        throw new ProblemError('not-found', 'no business for this principal');
      }
      return { url, purpose: input.purpose, portfolioImageId: row.id };
    }

    if (input.purpose === 'banner') {
      const updated = await setBannerUrl(deps.db, scope, url);
      if (!updated) {
        throw new ProblemError('not-found', 'no business for this principal');
      }
      return { url, purpose: input.purpose, portfolioImageId: null };
    }

    // `team`: the URL is handed back and the client attaches it to a member
    // with PATCH. Doing it here would mean this route also took a member id and
    // decided whose photo it is, which is the team module's job and is already
    // scoped there.
    return { url, purpose: input.purpose, portfolioImageId: null };
  } catch (error) {
    await removeQuietly(deps, key, 'upload recorded nowhere');
    throw error;
  }
}

/**
 * Removes a gallery image: the row first, then the object.
 *
 * ── ROW FIRST HERE, WHICH IS THE OPPOSITE ORDER TO UPLOAD ───────────────────
 *
 * And for the same reason. What must never exist is a row pointing at an object
 * that is gone — a broken image on a public page. Deleting the row first means
 * the worst outcome is an object nobody references.
 *
 * **The object delete is allowed to fail without failing the request.** The
 * image is off the page, which is what the owner asked for; reporting failure
 * would invite them to press delete again on a row that no longer exists.
 */
export async function removePortfolioImage(
  deps: {
    readonly db: Executor;
    readonly storage: StorageClient;
    readonly log: MediaLogger;
  },
  scope: OwnerScope,
  imageId: string,
): Promise<void> {
  const removed = await deletePortfolioImage(deps.db, scope, imageId);
  if (removed === undefined) {
    throw new ProblemError('not-found', 'no such image for this user');
  }

  const key = keyFromPublicUrl(deps.storage, removed.imageUrl);
  if (key === undefined) {
    // The URL does not point into our bucket, so it is not ours to delete —
    // see `keyFromPublicUrl`. The row is gone either way.
    deps.log.warn(
      { event: 'media.object_not_ours', imageId },
      'portfolio image url is not a public-media object; row removed, nothing deleted',
    );
    return;
  }

  await removeQuietly(deps, key, 'portfolio object left behind');
}

/**
 * The public-bucket flavour of `platform/storage.ts`'s `removeQuietly`.
 *
 * The implementation used to live here in full. It was lifted to the platform
 * when the booking route turned out to need the same thing for the PRIVATE
 * bucket — one rule, one implementation. This wrapper stays so the three call
 * sites in this file keep reading as they did.
 */
async function removeQuietly(
  deps: { readonly storage: StorageClient; readonly log: MediaLogger },
  key: string,
  message: string,
): Promise<void> {
  await removeQuietlyFrom(
    (target) => deps.storage.remove(target),
    deps.log,
    key,
    message,
  );
}
