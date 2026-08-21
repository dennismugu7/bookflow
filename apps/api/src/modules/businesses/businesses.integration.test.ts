import { sql } from 'kysely';
import { describe, expect, it } from 'vitest';

import {
  accountWithBusiness,
  accountWithoutBusiness,
  unrelatedAccountWithBusiness,
} from '../../../test/integration/accounts.ts';
import { useTransaction } from '../../../test/integration/harness.ts';
import {
  createBusinessForUser,
  findBusinessOwnedBy,
  renameBusinessForUser,
} from './businesses.repository.ts';
import { getMyBusiness } from './businesses.service.ts';

/**
 * ══ THE POINT OF EVERY TEST HERE IS THE DISTRACTOR ══════════════════════════
 *
 * `findBusinessOwnedBy` takes no business id. Its whole job is to pick the
 * caller's business out of a table that contains other people's — so a test
 * where the caller's business is the ONLY business proves nothing at all. It
 * would pass against a query with no `where` clause on `user_id`.
 *
 * **Every case below therefore plants a business owned by somebody else**, and
 * the negative cases plant one too: "returns nothing" against an empty table is
 * indistinguishable from "returns nothing because the query is broken".
 *
 * This is the same standard as `accounts.integration.test.ts` — assert the
 * property that matters, against a database where the wrong answer is
 * available to be returned.
 */

const ctx = useTransaction();

describe('findBusinessOwnedBy — the caller’s business, without being given its id', () => {
  it('returns the caller’s own business while somebody else’s exists', async () => {
    const mine = await accountWithBusiness(ctx, 'My Salon');
    // The distractor. Without it a query missing its user_id filter passes.
    await unrelatedAccountWithBusiness(ctx, mine, 'Not My Salon');

    const found = await findBusinessOwnedBy(ctx.db, { userId: mine.userId });

    expect(found, 'an owner must resolve to a business').toBeDefined();
    expect(found?.id).toBe(mine.businessId);
    expect(found?.name).toBe('My Salon');
    expect(found?.published).toBe(false);
  });

  it('returns nothing for an account with no business, while businesses exist', async () => {
    const noBusiness = await accountWithoutBusiness(ctx);
    // Two of them, owned by other people. An empty table would make the
    // assertion below meaningless.
    const first = await accountWithBusiness(ctx, 'Somebody’s Salon');
    await unrelatedAccountWithBusiness(ctx, first, 'Somebody Else’s Salon');

    const found = await findBusinessOwnedBy(ctx.db, {
      userId: noBusiness.userId,
    });

    expect(
      found,
      'an account with no membership must resolve to no business, even when businesses exist',
    ).toBeUndefined();
  });

  it('never returns another account’s business, driven both ways round', async () => {
    const first = await accountWithBusiness(ctx, 'First Salon');
    const second = await unrelatedAccountWithBusiness(
      ctx,
      first,
      'Second Salon',
    );

    const forFirst = await findBusinessOwnedBy(ctx.db, {
      userId: first.userId,
    });
    const forSecond = await findBusinessOwnedBy(ctx.db, {
      userId: second.userId,
    });

    // Both directions. One passing is consistent with a query that always
    // returns whichever row was inserted first.
    expect(forFirst?.id).toBe(first.businessId);
    expect(forSecond?.id).toBe(second.businessId);
    expect(forFirst?.id).not.toBe(forSecond?.id);
  });

  it('returns nothing for a user id that belongs to nobody', async () => {
    // A well-formed uuid that is not an account. Distinct from "an account with
    // no business": this one has no `auth.users` row at all, and the query must
    // answer rather than fail.
    const found = await findBusinessOwnedBy(ctx.db, {
      userId: '99999999-9999-4999-8999-999999999999',
    });

    expect(found).toBeUndefined();
  });
});

describe('getMyBusiness — the service layer', () => {
  it('returns what the repository returns, for an owner', async () => {
    const mine = await accountWithBusiness(ctx, 'Vera’s Salon');
    await unrelatedAccountWithBusiness(ctx, mine, 'Decoy Salon');

    const viaService = await getMyBusiness(ctx.db, { userId: mine.userId });
    const viaRepository = await findBusinessOwnedBy(ctx.db, {
      userId: mine.userId,
    });

    // Asserted equal rather than just "defined": a pass-through that quietly
    // reshaped the row would still be defined.
    expect(viaService).toEqual(viaRepository);
    expect(viaService?.id).toBe(mine.businessId);
  });

  it('passes the no-business answer through as undefined, not as a throw', async () => {
    const noBusiness = await accountWithoutBusiness(ctx);
    const other = await accountWithBusiness(ctx, 'Somebody’s Salon');
    expect(other.businessId).toBeDefined();

    // The distinction the whole read path rests on: having no business is an
    // ordinary answer travelling up the stack, not an error thrown down it.
    await expect(
      getMyBusiness(ctx.db, { userId: noBusiness.userId }),
    ).resolves.toBeUndefined();
  });
});

/**
 * ══ THE FOUR STATEMENTS THAT HAVE TO AGREE ══════════════════════════════════
 *
 * A business row is produced by two selects, one `returning`, and a raw
 * `returning` inside the creation CTE. Three read `BUSINESS_COLUMNS`; the fourth
 * cannot, because it is raw SQL, and it is therefore the one that will drift.
 *
 * **Drift here is silent in the worst way.** The route serialises through
 * `businessSchema`, and Zod strips what it does not recognise — so a CTE that
 * returned `maps_url` instead of `"mapsUrl"` would produce a 201 whose body is
 * missing a field, with no error anywhere, and the client would conclude the
 * salon has no maps link rather than that the response forgot to mention it.
 *
 * Comparing KEY SETS rather than values is deliberate: the values legitimately
 * differ (a created business has no handle), and it is the shape that drifts.
 */
describe('the created row and the read row are the same shape', () => {
  it('createBusinessForUser returns exactly what findBusinessOwnedBy returns', async () => {
    const account = await accountWithoutBusiness(ctx);

    const created = await createBusinessForUser(
      ctx.db,
      account.userId,
      'Shape Salon',
    );
    const read = await findBusinessOwnedBy(ctx.db, { userId: account.userId });

    expect(created, 'the CTE must return its row').toBeDefined();
    expect(read, 'the created business must then be readable').toBeDefined();

    expect(Object.keys(created ?? {}).sort()).toEqual(
      Object.keys(read ?? {}).sort(),
    );
    // And the aliases specifically, since those are what raw SQL gets wrong:
    // an unquoted `maps_url as mapsUrl` is folded to `mapsurl` by PostgreSQL,
    // which is a key neither TypeScript nor Zod would recognise.
    expect(Object.keys(created ?? {})).toContain('mapsUrl');
    expect(Object.keys(created ?? {})).toContain('bannerUrl');
  });
});

/**
 * ══ CLEARING A FIELD, WHICH WAS NOT POSSIBLE UNTIL NOW ══════════════════════
 *
 * The old shape was `coalesce(param, column)` throughout: an omitted field was
 * left alone and **so was a blank one**, because the client could not read these
 * values back and a form showing an empty box where a stored tagline lived must
 * not wipe it.
 *
 * Now the form prefills, so an empty box means the owner emptied it. These two
 * tests pin the pair — and they are a pair on purpose, because either one alone
 * is satisfied by a broken implementation. Only-clears passes for an update that
 * writes every column unconditionally, which destroys untouched fields.
 * Only-unchanged passes for the `coalesce` this replaced.
 */
describe('renameBusinessForUser — omitted leaves alone, empty clears', () => {
  it('an empty string clears the column to NULL', async () => {
    const mine = await accountWithBusiness(ctx, 'Clearable Salon');
    await unrelatedAccountWithBusiness(ctx, mine, 'Decoy Salon');

    await renameBusinessForUser(
      ctx.db,
      { userId: mine.userId, businessId: mine.businessId },
      {
        name: 'Clearable Salon',
        tagline: 'Cuts and colour',
        about: 'A long story',
        category: 'salon',
        address: 'Kilimani',
        mapsUrl: 'https://maps.example.invalid/vera',
      },
    );

    const cleared = await renameBusinessForUser(
      ctx.db,
      { userId: mine.userId, businessId: mine.businessId },
      {
        // Empty, not absent. The distinction is the feature.
        name: 'Clearable Salon',
        tagline: '',
        about: '',
        category: '',
        address: '',
        mapsUrl: '',
      },
    );

    // NULL, not `''`. What the client sends and what the column holds are
    // deliberately different: a cleared field and a never-set field must be the
    // same row, or `tagline is not null` starts lying.
    expect(cleared?.tagline).toBeNull();
    expect(cleared?.about).toBeNull();
    expect(cleared?.category).toBeNull();
    expect(cleared?.address).toBeNull();
    expect(cleared?.mapsUrl).toBeNull();

    // Read back rather than trusting `returning`: the point is what is STORED,
    // and an update that returned the right thing while writing the wrong one
    // is precisely the bug this guards.
    const read = await findBusinessOwnedBy(ctx.db, { userId: mine.userId });
    expect(read?.tagline).toBeNull();
    expect(read?.mapsUrl).toBeNull();
  });

  it('an omitted field is left exactly as it was', async () => {
    const mine = await accountWithBusiness(ctx, 'Partial Salon');

    await renameBusinessForUser(
      ctx.db,
      { userId: mine.userId, businessId: mine.businessId },
      {
        name: 'Partial Salon',
        tagline: 'Cuts and colour',
        about: 'A long story',
        category: 'salon',
        address: 'Kilimani',
        mapsUrl: 'https://maps.example.invalid/vera',
      },
    );

    // Only the name is sent. Every other key is absent — not null.
    const renamed = await renameBusinessForUser(
      ctx.db,
      { userId: mine.userId, businessId: mine.businessId },
      {
        name: 'Partial Salon Renamed',
        tagline: undefined,
        about: undefined,
        category: undefined,
        address: undefined,
        mapsUrl: undefined,
      },
    );

    expect(renamed?.name).toBe('Partial Salon Renamed');
    expect(renamed?.tagline).toBe('Cuts and colour');
    expect(renamed?.about).toBe('A long story');
    expect(renamed?.category).toBe('salon');
    expect(renamed?.address).toBe('Kilimani');
    expect(renamed?.mapsUrl).toBe('https://maps.example.invalid/vera');
  });

  it('never writes banner_url, whatever the profile save contains', async () => {
    const mine = await accountWithBusiness(ctx, 'Bannered Salon');

    await sql`
      update public.businesses
      set banner_url = 'https://cdn.invalid/uploaded.jpg'
      where id = ${mine.businessId}::uuid
    `.execute(ctx.db);

    // The scenario the boundary exists for: an upload lands, then a profile
    // save follows. The save must not touch the column the upload just wrote.
    const saved = await renameBusinessForUser(
      ctx.db,
      { userId: mine.userId, businessId: mine.businessId },
      {
        name: 'Bannered Salon',
        tagline: '',
        about: '',
        category: '',
        address: '',
        mapsUrl: '',
      },
    );

    expect(
      saved?.bannerUrl,
      'a profile save overwrote the banner the image route had just uploaded',
    ).toBe('https://cdn.invalid/uploaded.jpg');
  });
});
