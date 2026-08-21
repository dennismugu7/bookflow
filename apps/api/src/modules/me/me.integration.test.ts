import { sql } from 'kysely';
import { describe, expect, it } from 'vitest';

import {
  accountWithBusiness,
  accountWithoutBusiness,
  unrelatedAccountWithBusiness,
} from '../../../test/integration/accounts.ts';
import { useTransaction } from '../../../test/integration/harness.ts';
import { StorageError, type StorageClient } from '../../platform/storage.ts';
import { addService } from '../services/services.service.ts';
import { setOpeningHours } from '../hours/hours.service.ts';
import { deleteMyAccount } from './me.service.ts';
import { findProfileByUserId } from './me.repository.ts';

/**
 * `DELETE /v1/me`, which is irreversible and therefore worth driving.
 *
 * ══ WHAT IS UNDER TEST IS THE ORDER, NOT THE DELETES ════════════════════════
 *
 * That rows disappear is unsurprising. What is worth proving:
 *
 *   1. **GoTrue goes LAST.** Delete it first and a later failure strands an
 *      account that cannot sign in and cannot be finished off — no request the
 *      visitor can make will ever reach their surviving data again. In this
 *      order the same failure leaves them able to retry. Asserted by recording
 *      the sequence, not by reading the source.
 *   2. **Owning nothing is ordinary, not an error.** Every owner between
 *      sign-up and onboarding is in that state, and a version that treated zero
 *      businesses as a reason to stop would leave their profile and their auth
 *      user behind.
 *   3. **Somebody else's salon is untouched.** The cascade is keyed on a
 *      subquery; a missing predicate would delete every business in the table
 *      and no assertion about the caller's own rows would notice.
 */

const ctx = useTransaction();

const testLog = { info: (): void => {}, warn: (): void => {} };

/** Records what happened, in order, and can be told to fail. */
function recorder(options: { storageFails?: boolean } = {}): {
  readonly steps: string[];
  readonly gotrue: { deleteUser: (userId: string) => Promise<void> };
  readonly storage: Pick<StorageClient, 'remove' | 'publicUrl'>;
} {
  const steps: string[] = [];

  return {
    steps,
    gotrue: {
      deleteUser: (userId: string) => {
        steps.push(`gotrue:${userId}`);
        return Promise.resolve();
      },
    },
    storage: {
      remove: (key: string) => {
        steps.push(`storage:${key}`);
        if (options.storageFails === true) {
          // ── A `StorageError`, NOT A BARE `Error`, AND THE DIFFERENCE IS REAL
          //
          // The first version of this fake threw `new Error('storage is down')`
          // and the test failed — because `removeObjects` rethrows anything
          // that is not a `StorageError`. That is the code being right and the
          // fake being unfaithful: the real client only ever throws
          // `StorageError`, so a bare `Error` from it would mean a BUG in this
          // process, not an outage.
          //
          // The distinction is worth keeping. An outage is swallowed so the
          // deletion completes; a programming error propagates so somebody
          // finds out. Swallowing both would make a `TypeError` in this path
          // invisible forever.
          return Promise.reject(
            new StorageError('unavailable', 'object storage unreachable'),
          );
        }
        return Promise.resolve();
      },
      publicUrl: (key: string) =>
        `http://127.0.0.1:54321/storage/v1/object/public/public-media/${key}`,
    },
  };
}

async function countFor(table: string, businessId: string): Promise<number> {
  const result = await sql<{ n: number }>`
    select count(*)::int as n from ${sql.raw(`public.${table}`)}
     where business_id = ${businessId}::uuid
  `.execute(ctx.db);
  return result.rows[0]?.n ?? 0;
}

describe('deleting an account that owns a business', () => {
  it('removes the business and every child, and calls GoTrue last', async () => {
    const mine = await accountWithBusiness(ctx, 'Doomed Salon');
    const scope = { userId: mine.userId };

    await addService(ctx.db, scope, {
      name: 'Silk press',
      durationMinutes: 60,
      priceKes: 2500,
      position: undefined,
    });
    await setOpeningHours(ctx.db, scope, [
      { dayOfWeek: 0, openTime: '09:00', closeTime: '17:00' },
    ]);

    // A distractor: another owner's salon, which must survive. Without one, a
    // cascade missing its `where` would pass every assertion below.
    const stranger = await unrelatedAccountWithBusiness(
      ctx,
      mine,
      'Untouched Salon',
    );

    const fake = recorder();
    await deleteMyAccount(
      { db: ctx.db, gotrue: fake.gotrue, storage: fake.storage, log: testLog },
      scope,
      'I created this account by accident.',
    );

    expect(await countFor('services', mine.businessId)).toBe(0);
    expect(await countFor('opening_hours', mine.businessId)).toBe(0);
    expect(await countFor('memberships', mine.businessId)).toBe(0);

    const businesses = await sql<{ n: number }>`
      select count(*)::int as n from public.businesses
       where id = ${mine.businessId}::uuid
    `.execute(ctx.db);
    expect(businesses.rows[0]?.n).toBe(0);

    // The profile row goes too, and it is not part of the business cascade.
    expect(await findProfileByUserId(ctx.db, scope)).toBeUndefined();

    // ── THE ORDERING ASSERTION ──────────────────────────────────────────
    //
    // GoTrue is the LAST recorded step. Asserted on position rather than mere
    // presence: a version that deleted the auth user first would still call it
    // exactly once, and "was called" would pass while the recoverability
    // property this whole ordering exists for was gone.
    expect(fake.steps.at(-1)).toBe(`gotrue:${mine.userId}`);

    // And the stranger's salon is untouched.
    const survivor = await sql<{ n: number }>`
      select count(*)::int as n from public.businesses
       where id = ${stranger.businessId}::uuid
    `.execute(ctx.db);
    expect(
      survivor.rows[0]?.n,
      'the cascade reached another owner’s business',
    ).toBe(1);
  });

  it('removes the business’s storage objects before touching GoTrue', async () => {
    const mine = await accountWithBusiness(ctx, 'Media Salon');
    const scope = { userId: mine.userId };

    const bannerUrl =
      'http://127.0.0.1:54321/storage/v1/object/public/public-media/biz/banner/a.jpg';
    await sql`
      update public.businesses set banner_url = ${bannerUrl}
       where id = ${mine.businessId}::uuid
    `.execute(ctx.db);

    const fake = recorder();
    await deleteMyAccount(
      { db: ctx.db, gotrue: fake.gotrue, storage: fake.storage, log: testLog },
      scope,
      undefined,
    );

    // The URL was read BEFORE the row was deleted — which is the only order
    // that can work, since the row is what names the object.
    expect(fake.steps).toContain('storage:biz/banner/a.jpg');
    expect(fake.steps.at(-1)).toBe(`gotrue:${mine.userId}`);
  });

  it('finishes the deletion even when storage is down', async () => {
    const mine = await accountWithBusiness(ctx, 'Unlucky Salon');
    const scope = { userId: mine.userId };

    await sql`
      update public.businesses
         set banner_url = 'http://127.0.0.1:54321/storage/v1/object/public/public-media/biz/banner/a.jpg'
       where id = ${mine.businessId}::uuid
    `.execute(ctx.db);

    const fake = recorder({ storageFails: true });

    // ── AN OUTAGE MUST NOT REFUSE SOMEBODY THEIR OWN DELETION ───────────
    //
    // The cost of continuing is orphaned bytes an operator can sweep. The cost
    // of stopping is refusing an erasure request for a reason that has nothing
    // to do with the person asking.
    await expect(
      deleteMyAccount(
        {
          db: ctx.db,
          gotrue: fake.gotrue,
          storage: fake.storage,
          log: testLog,
        },
        scope,
        undefined,
      ),
    ).resolves.toBeUndefined();

    expect(await findProfileByUserId(ctx.db, scope)).toBeUndefined();
    expect(fake.steps.at(-1)).toBe(`gotrue:${mine.userId}`);
  });
});

describe('deleting an account that owns nothing', () => {
  it('is an ordinary deletion, not an error', async () => {
    // The state of every owner between sign-up and onboarding.
    const account = await accountWithoutBusiness(ctx);
    const scope = { userId: account.userId };

    // Somebody else's business exists, so "deleted nothing" cannot pass by the
    // table being empty.
    const other = await accountWithBusiness(ctx, 'Somebody’s Salon');

    const fake = recorder();
    await expect(
      deleteMyAccount(
        {
          db: ctx.db,
          gotrue: fake.gotrue,
          storage: fake.storage,
          log: testLog,
        },
        scope,
        undefined,
      ),
    ).resolves.toBeUndefined();

    // Both later steps still ran. A version that short-circuited on "no
    // business" would leave the profile and the auth user behind — an account
    // the visitor believes is deleted and can still sign in to.
    expect(await findProfileByUserId(ctx.db, scope)).toBeUndefined();
    expect(fake.steps).toEqual([`gotrue:${account.userId}`]);

    const survivor = await sql<{ n: number }>`
      select count(*)::int as n from public.businesses
       where id = ${other.businessId}::uuid
    `.execute(ctx.db);
    expect(survivor.rows[0]?.n).toBe(1);
  });
});
