import { describe, expect, it } from 'vitest';

import { findBusinessForUser } from '../../src/modules/businesses/businesses.repository.ts';
import { findProfileByUserId } from '../../src/modules/me/me.repository.ts';
import {
  accountWithBusiness,
  accountWithoutBusiness,
  unrelatedAccountWithBusiness,
} from './accounts.ts';
import { useTransaction } from './harness.ts';

/**
 * ══ THESE TESTS DRIVE THE FIXTURES, THEY DO NOT COUNT THEIR ROWS ════════════
 *
 * This project has been wrong about a fixture before, in the way that is hard
 * to see: rows were counted, the count was right, and the seeded user could
 * never actually log in. `seed.integration.test.ts` is the correction — it
 * signs the seeded owner in against real GoTrue rather than asserting that a
 * row exists.
 *
 * The same standard applies here. **A `select count(*)` proves the insert ran;
 * it does not prove the fixture is the thing the tests below it will assume.**
 * So each helper is verified by pushing it through the production code that
 * will consume it — `findBusinessForUser`, which applies the membership scoping
 * rule, and `findProfileByUserId` — and asserting the property that matters
 * rather than the number of rows behind it.
 *
 * A fixture that passes these is usable by the slice. One that merely inserted
 * rows would pass a count and fail here.
 */

const ctx = useTransaction();

describe('accountWithoutBusiness', () => {
  it('is a usable account: its profile reads back through the real repository', async () => {
    const account = await accountWithoutBusiness(ctx);

    // Not "a row exists" — the code the app runs, returning what the app needs.
    const profile = await findProfileByUserId(ctx.db, {
      userId: account.userId,
    });

    expect(
      profile,
      'the account must be readable by GET /v1/me’s repository',
    ).toBeDefined();
    expect(profile?.id).toBe(account.userId);
  });

  it('genuinely owns nothing: the scoping rule finds no business for it', async () => {
    const account = await accountWithoutBusiness(ctx);
    // A business exists in the database — owned by somebody else. Without this
    // the assertion below would pass against an empty table and prove nothing.
    const other = await accountWithBusiness(ctx, 'Somebody Else’s Salon');

    const found = await findBusinessForUser(ctx.db, {
      userId: account.userId,
      businessId: other.businessId,
    });

    expect(
      found,
      'an account with no membership must resolve to no business, even when businesses exist',
    ).toBeUndefined();
  });
});

describe('accountWithBusiness', () => {
  it('owns exactly the business it claims, through the membership scoping rule', async () => {
    const account = await accountWithBusiness(ctx, 'Vera’s Salon');

    const found = await findBusinessForUser(ctx.db, {
      userId: account.userId,
      businessId: account.businessId,
    });

    expect(
      found,
      'the claimed business must resolve through membership',
    ).toBeDefined();
    expect(found?.id).toBe(account.businessId);
    expect(found?.name).toBe('Vera’s Salon');
    // ADR-004: a new business is private until explicitly published.
    expect(found?.published).toBe(false);
  });

  it('is also a usable account, not just a pair of rows', async () => {
    const account = await accountWithBusiness(ctx);

    const profile = await findProfileByUserId(ctx.db, {
      userId: account.userId,
    });

    expect(profile?.id).toBe(account.userId);
  });
});

describe('unrelatedAccountWithBusiness', () => {
  it('is genuinely unrelated: neither account can see the other’s business', async () => {
    const first = await accountWithBusiness(ctx, 'First Salon');
    const second = await unrelatedAccountWithBusiness(
      ctx,
      first,
      'Second Salon',
    );

    // Driven both ways round. One direction passing is consistent with a
    // scoping bug that happens to favour the account created first.
    const firstSeesSecond = await findBusinessForUser(ctx.db, {
      userId: first.userId,
      businessId: second.businessId,
    });
    const secondSeesFirst = await findBusinessForUser(ctx.db, {
      userId: second.userId,
      businessId: first.businessId,
    });

    expect(
      firstSeesSecond,
      'the first account must not reach the second’s business',
    ).toBeUndefined();
    expect(
      secondSeesFirst,
      'the second account must not reach the first’s business',
    ).toBeUndefined();

    // And each still reaches its own — otherwise the two assertions above are
    // satisfied by a repository that finds nothing at all.
    expect(
      await findBusinessForUser(ctx.db, {
        userId: first.userId,
        businessId: first.businessId,
      }),
      'the first account must still reach its own business',
    ).toBeDefined();
    expect(
      await findBusinessForUser(ctx.db, {
        userId: second.userId,
        businessId: second.businessId,
      }),
      'the second account must still reach its own business',
    ).toBeDefined();
  });

  it('criterion 24, 51 — two accounts may hold businesses with the identical name', async () => {
    const first = await accountWithBusiness(ctx, 'Sharp Cuts');
    const second = await unrelatedAccountWithBusiness(ctx, first, 'Sharp Cuts');

    expect(second.businessName).toBe(first.businessName);
    expect(second.businessId).not.toBe(first.businessId);
  });
});
