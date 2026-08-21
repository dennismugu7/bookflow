import { describe, expect, it } from 'vitest';

import { nextStep, previousStep, stepsFor } from './steps';

/**
 * The step sequence, which is the flow's only branching logic.
 *
 * ══ WHY THIS AND NOT THE COMPONENTS ═════════════════════════════════════════
 *
 * Everything else in the booking flow is a form that posts what was typed. This
 * is the one place where being wrong is invisible until someone walks backwards
 * through a salon with no team — and finds a screen they never saw on the way
 * forward, with one option they did not choose.
 */
describe('the professional step exists only when there is a team', () => {
  it('is present for a salon with team members', () => {
    expect(stepsFor(true)).toEqual([
      'services',
      'professional',
      'datetime',
      'review',
      'confirm',
    ]);
  });

  it('is absent for a salon with none', () => {
    expect(stepsFor(false)).toEqual([
      'services',
      'datetime',
      'review',
      'confirm',
    ]);
  });
});

describe('walking the flow', () => {
  const withTeam = stepsFor(true);
  const soloSalon = stepsFor(false);

  it('goes services → professional → datetime when there is a team', () => {
    expect(nextStep(withTeam, 'services')).toBe('professional');
    expect(nextStep(withTeam, 'professional')).toBe('datetime');
  });

  it('goes services → datetime directly when there is not', () => {
    expect(nextStep(soloSalon, 'services')).toBe('datetime');
  });

  it('walks BACK over the same gap, which is the whole point', () => {
    // ── THE ASSERTION THE ARRAY EXISTS FOR ────────────────────────────────
    //
    // With a hardcoded sequence, forward navigation gets skip logic and
    // backward navigation gets it added later, or not at all. Here the two
    // read the same array, so a solo salon cannot reach a step it never had.
    expect(previousStep(soloSalon, 'datetime')).toBe('services');
    expect(previousStep(withTeam, 'datetime')).toBe('professional');
  });

  it('reports null going back from the first step, so the flow can exit', () => {
    // Distinct from "stay here": the back arrow on step one leaves for the
    // salon page, and the caller has to be able to tell the two apart.
    expect(previousStep(withTeam, 'services')).toBeNull();
    expect(previousStep(soloSalon, 'services')).toBeNull();
  });

  it('saturates at the last step rather than wrapping', () => {
    // Wrapping would send a visitor who taps Continue on the final step back to
    // the beginning with their details still typed in.
    expect(nextStep(withTeam, 'confirm')).toBe('confirm');
  });
});
