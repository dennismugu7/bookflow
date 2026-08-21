import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

import {
  PRIVATE_MEDIA_BUCKET,
  PUBLIC_MEDIA_BUCKET,
  SIGNED_URL_TTL_SECONDS,
  createStorageClient,
} from '../../platform/storage.ts';
import { ownerBookingSchema, paymentProofSchema } from './bookings.schema.ts';

/**
 * The boundary around the payment proof.
 *
 * ══ DO-NOT-VIBE: THE PAYMENT-PROOF ACCESS PATH (`CLAUDE.md` §6) ══════════════
 *
 * A payment proof is a client's financial document. Until this change it was
 * uploaded to the PUBLIC bucket and its URL was returned in the owner's booking
 * list — permanently readable by anyone who ever saw the string, in a log, a
 * screenshot, or a database export.
 *
 * The fix has three parts and **each one is individually undoable by a small,
 * reasonable-looking edit**, which is why they are pinned here rather than only
 * described in comments:
 *
 *   1. the object goes to the private bucket,
 *   2. no URL for it is ever constructed outside the signing call, and
 *   3. the list carries a boolean, never an address.
 *
 * These are unit tests: they read source and inspect schemas, and touch neither
 * the database nor the network.
 */

const MODULE_DIR = join(process.cwd(), 'apps', 'api', 'src', 'modules');
const PLATFORM_DIR = join(process.cwd(), 'apps', 'api', 'src', 'platform');

function typeScriptFilesUnder(directory: string): string[] {
  return readdirSync(directory).flatMap((entry) => {
    const full = join(directory, entry);
    if (statSync(full).isDirectory()) return typeScriptFilesUnder(full);
    return full.endsWith('.ts') ? [full] : [];
  });
}

describe('the payment proof never acquires a public address', () => {
  const bookingsDir = join(MODULE_DIR, 'bookings');

  it('the guard can see the source it claims to check — the control', () => {
    // Without this, a wrong path yields an empty file list and every assertion
    // below passes by finding nothing.
    const files = typeScriptFilesUnder(bookingsDir);
    expect(files.length).toBeGreaterThan(3);
    expect(files.some((f) => f.endsWith('bookings.routes.ts'))).toBe(true);
  });

  it('the booking route uploads privately, and never with `storage.upload`', () => {
    const routes = readFileSync(
      join(bookingsDir, 'bookings.routes.ts'),
      'utf8',
    );

    expect(
      routes.includes('storage.uploadPrivate('),
      'the proof must go to the private bucket',
    ).toBe(true);

    // The exact call that put proofs in the public bucket. `media.routes.ts`
    // still uses it legitimately for banners and portfolio images — this
    // assertion is scoped to the bookings module, where it has no business.
    expect(
      routes.includes('storage.upload('),
      'storage.upload puts objects in the PUBLIC bucket; a payment proof must never go there',
    ).toBe(false);
  });

  it('no file in the bookings module builds a URL for a proof key', () => {
    for (const file of typeScriptFilesUnder(bookingsDir)) {
      if (file.endsWith('.test.ts')) continue;
      const source = readFileSync(file, 'utf8');
      expect(
        source.includes('publicUrl('),
        `${file} constructs a public URL inside the bookings module`,
      ).toBe(false);
    }
  });

  it('the owner booking carries a boolean, and no key or URL', () => {
    const keys = Object.keys(ownerBookingSchema.shape);

    expect(keys).toContain('hasPaymentProof');
    // The field that used to be here. Named explicitly rather than checked by a
    // pattern, because this exact name is what a revert would restore.
    expect(
      keys,
      'paymentProofUrl is back on the owner booking: a private object address is in a list response',
    ).not.toContain('paymentProofUrl');
    expect(keys).not.toContain('paymentProofKey');

    // And the type, not just the name — `hasPaymentProof: z.string()` would
    // satisfy every assertion above while carrying the key under a new name.
    expect(ownerBookingSchema.shape.hasPaymentProof.def.type).toBe('boolean');
  });

  it('the signing endpoint returns a url and nothing identifying', () => {
    // Not the key, not the bucket, not the booking. A response that echoed the
    // key would hand the caller the one string the signing call accepts.
    expect(Object.keys(paymentProofSchema.shape)).toEqual(['url']);
  });

  it('the two buckets are distinct, and the TTL is short', () => {
    expect(PRIVATE_MEDIA_BUCKET).not.toBe(PUBLIC_MEDIA_BUCKET);
    // A day-long link defeats the point; a ten-second one is unusable on a slow
    // connection. The bound is asserted rather than the exact number, so tuning
    // it does not require editing a test that is about the property.
    expect(SIGNED_URL_TTL_SECONDS).toBeGreaterThanOrEqual(60);
    expect(SIGNED_URL_TTL_SECONDS).toBeLessThanOrEqual(900);
  });

  it('`publicUrl` cannot address the private bucket', () => {
    // The structural claim `storage.ts` makes: there is no private equivalent of
    // publicUrl, so a key cannot be turned into an address by mistake. If
    // someone adds one, this fails — publicUrl would start naming both.
    const client = createStorageClient({
      baseUrl: 'http://storage.invalid',
      serviceRoleKey: 'not-a-real-key',
    });

    const addressed = client.publicUrl('business/proof/x.jpg');
    expect(addressed).toContain(PUBLIC_MEDIA_BUCKET);
    expect(
      addressed,
      'publicUrl now addresses the private bucket, which makes every proof key a URL again',
    ).not.toContain(PRIVATE_MEDIA_BUCKET);

    // A DECLARATION, not a mention. `storage.ts` names `privateUrl` in prose —
    // explaining that it deliberately does not exist — and the first version of
    // this assertion matched that comment and failed. Grepping for a bare
    // identifier catches the documentation of a rule as though it were a
    // violation, which is a good way to make people delete the documentation.
    const storageSource = readFileSync(
      join(PLATFORM_DIR, 'storage.ts'),
      'utf8',
    );
    expect(
      /^\s*(async\s+)?privateUrl\s*[(:]/m.test(storageSource),
      'a privateUrl() is declared: the signed-URL step is now skippable, which is the whole thing this design prevents',
    ).toBe(false);
  });
});
