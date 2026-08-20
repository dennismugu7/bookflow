import { randomBytes } from 'node:crypto';

import type { Executor } from '../../platform/db.ts';
import { ProblemError } from '../../platform/problem.ts';
import type { OwnerScope } from '../scope.ts';
import {
  findPublishable,
  markPublished,
  publishWithHandle,
} from './publishing.repository.ts';

/** Business logic. All of it. */

export interface PublishedBusiness {
  readonly id: string;
  readonly name: string;
  readonly published: boolean;
  readonly handle: string;
}

/**
 * A name, as a URL segment.
 *
 * ── WHAT SURVIVES, AND WHAT DOES NOT ────────────────────────────────────────
 *
 * Lowercase, `NFKD`-decomposed so accents separate from their letters, combining
 * marks stripped, everything that is not `a-z0-9` collapsed to a single hyphen,
 * hyphens trimmed from the ends. `ck_businesses_handle_shape` is the same rule
 * expressed as a constraint, and the two must agree — this function is the one
 * that has to be right, because the constraint only says no afterwards.
 *
 * **A name can slugify to nothing**, and that is not exotic: v1 is a
 * Latin-script market (ADR-005) but nothing stops an owner naming their salon
 * in emoji. The fallback is `salon`, which is a real word, is in the
 * vocabulary, and will simply collide its way to `salon-a3f9` — the suffix path
 * below handles it with no special case.
 */
export function slugify(name: string): string {
  const slug = name
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    // `ck_businesses_handle_length` caps at 60. Trimmed before the suffix is
    // added, and trailing hyphens re-trimmed, so a cut that lands on one does
    // not produce `vera-s-`.
    .slice(0, 52)
    .replace(/-+$/g, '');

  return slug === '' ? 'salon' : slug;
}

/** Four hex characters. Enough to make a second collision improbable, short enough to read aloud. */
function suffix(): string {
  return randomBytes(2).toString('hex');
}

/**
 * How many handles to try before giving up.
 *
 * The first attempt is the bare slug. Each retry appends a fresh random suffix,
 * so the chance of five consecutive collisions is negligible unless something
 * is badly wrong — at which point failing loudly beats looping.
 */
const HANDLE_ATTEMPTS = 5;

/**
 * Publishes the caller's business.
 *
 * ══ IDEMPOTENT, AND THE HANDLE IS THE REASON IT HAS TO BE ═══════════════════
 *
 * ADR-021: handles are never reassigned. A second publish that minted a second
 * handle would retire the first — breaking every link and QR code already
 * printed with it — so a business that already has one is simply confirmed
 * published and handed back the handle it has.
 *
 * ── THE REQUIREMENTS ARE CHECKED, NOT ASSUMED ───────────────────────────────
 *
 * A name, at least one service, at least one open day. K27 is the standing
 * obligation behind the service rule: the client web app must never render a
 * salon with nothing bookable, and making the state unreachable is what that
 * row asked for. The opening-hours rule is the same argument — a bookable
 * service with no hours to book it in is a page that cannot be used either.
 *
 * The refusal names nothing (`publish-requirements-not-met` carries no detail):
 * the caller is the owner's own app, which has just read all three to draw the
 * screen the button is on.
 */
export async function publishMyBusiness(
  db: Executor,
  scope: OwnerScope,
): Promise<PublishedBusiness> {
  const business = await findPublishable(db, scope);
  if (business === undefined) {
    throw new ProblemError('not-found', 'no business for this principal');
  }

  if (
    business.name.trim() === '' ||
    business.serviceCount === 0 ||
    business.openDayCount === 0
  ) {
    throw new ProblemError(
      'publish-requirements-not-met',
      `name=${String(business.name.trim() !== '')} services=${String(business.serviceCount)} openDays=${String(business.openDayCount)}`,
    );
  }

  // Already has a handle: confirm published and keep it. `markPublished` is a
  // no-op on a business that is already published, which is what makes calling
  // this twice safe.
  if (business.handle !== null) {
    await markPublished(db, scope);
    return {
      id: business.id,
      name: business.name,
      published: true,
      handle: business.handle,
    };
  }

  const base = slugify(business.name);

  for (let attempt = 0; attempt < HANDLE_ATTEMPTS; attempt += 1) {
    const candidate = attempt === 0 ? base : `${base}-${suffix()}`;
    const published = await publishWithHandle(db, scope, candidate);

    if (published !== undefined) {
      return {
        id: published.id,
        name: published.name,
        published: true,
        handle: candidate,
      };
    }
  }

  // Five collisions on a four-hex-character suffix is not bad luck. Something
  // is wrong — most plausibly that the business acquired a handle between the
  // read above and now, which is a concurrent publish of the same salon.
  throw new ProblemError(
    'internal-error',
    'could not allocate a unique handle',
  );
}
