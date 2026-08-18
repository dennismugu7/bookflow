import { describe, expect, it } from 'vitest';

import { isSecondBusinessConflict } from './businesses.repository.ts';

/**
 * The 23505-to-409 mapping, as a unit — **the PREDICATE, not the service.**
 *
 * Paired with `businesses.conflict-service.test.ts`, which asks the other half:
 * given that this predicate says yes, what does `createMyBusiness` do. **The two
 * were once named `conflict` and `conflict-branch`**, which distinguished them
 * to nobody choosing a file to add a test to — the names now say which question
 * each answers.
 *
 * ══ WHY THIS IS A UNIT TEST AND NOT AN INTEGRATION ONE ══════════════════════
 *
 * The index path only fires when two requests both read before either writes.
 * The integration harness has **one connection per test**, so that interleaving
 * is unreachable there — and the service's pre-check catches every sequential
 * case before the index can, which is what it is for.
 *
 * So the reachable-by-test half is the **predicate**: given the error PostgreSQL
 * raises, does the service recognise it. Asserted here against synthetic errors
 * shaped exactly as `pg` raises them.
 *
 * **What this does not claim:** that the path executes in production. It claims
 * the mapping is right if it does. Criterion 49 is not named here, and the
 * integration file says why.
 */

describe('isSecondBusinessConflict', () => {
  it('recognises the owner-membership unique violation', () => {
    expect(
      isSecondBusinessConflict({
        code: '23505',
        constraint: 'uq_memberships_one_owner_per_user',
      }),
    ).toBe(true);
  });

  it('does NOT claim a different unique violation on the same table', () => {
    // `uq_memberships_user_business` is also 23505 and also on `memberships`,
    // and means something entirely different — a repeat join to the SAME
    // business. Matching on 23505 alone would answer 409 "you already have a
    // business" to a caller who does not.
    expect(
      isSecondBusinessConflict({
        code: '23505',
        constraint: 'uq_memberships_user_business',
      }),
    ).toBe(false);
  });

  it('does not treat a different error class as a conflict', () => {
    expect(
      isSecondBusinessConflict({
        code: '23514',
        constraint: 'uq_memberships_one_owner_per_user',
      }),
    ).toBe(false);
  });

  it('survives the shapes an error is not', () => {
    // A thrown string, null, and a bare Error all reach this predicate through
    // the same `catch`. It must answer false rather than throw, or a network
    // blip becomes a 409.
    expect(isSecondBusinessConflict(null)).toBe(false);
    expect(isSecondBusinessConflict('23505')).toBe(false);
    expect(isSecondBusinessConflict(new Error('boom'))).toBe(false);
    expect(isSecondBusinessConflict(undefined)).toBe(false);
  });
});
