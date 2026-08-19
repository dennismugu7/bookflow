import { describe, expect, it } from 'vitest';

import {
  accountWithBusiness,
  accountWithoutBusiness,
  unrelatedAccountWithBusiness,
} from '../../../test/integration/accounts.ts';
import { useTransaction } from '../../../test/integration/harness.ts';
import { findBusinessOwnedBy } from './businesses.repository.ts';
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
