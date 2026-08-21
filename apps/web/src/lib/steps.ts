/**
 * The booking flow's step sequence.
 *
 * ══ COMPUTED, NEVER HARDCODED — AND THE DOC INSISTS ON THIS ═════════════════
 *
 * "Select professional" is skipped entirely when the salon has no team members.
 * The spec's own guidance: implement the flow "as an array of active steps
 * computed at flow-start based on salon config ... rather than hardcoding
 * 'step 2 = professional'", because otherwise **back-navigation is wrong**.
 *
 * That is the real cost, and it is not hypothetical. With a fixed sequence, a
 * salon with no team sends the visitor forward from services to date-and-time
 * (skip logic in the Continue handler), and then BACK from date-and-time to a
 * professional step that was never shown — a screen with one option that they
 * did not choose, appearing out of nowhere. Every skip needs its mirror in the
 * back handler, and one of the two always gets forgotten.
 *
 * Here there is nothing to mirror: the array either contains `professional` or
 * it does not, and forward and back are both `index ± 1` over the same array.
 */

export const ALL_STEPS = [
  'services',
  'professional',
  'datetime',
  'review',
  'confirm',
] as const;

export type Step = (typeof ALL_STEPS)[number];

/**
 * The steps this salon's flow actually has.
 *
 * @param hasTeamMembers whether the salon configured anyone at all
 */
export function stepsFor(hasTeamMembers: boolean): readonly Step[] {
  return ALL_STEPS.filter((step) => step !== 'professional' || hasTeamMembers);
}

/**
 * The step after `current`, or `current` itself at the end.
 *
 * Saturating rather than wrapping or returning null: "advance past the last
 * step" is not a thing the UI asks for — the final step submits instead of
 * continuing — and returning null would make every caller handle a case that
 * cannot happen.
 */
export function nextStep(steps: readonly Step[], current: Step): Step {
  const index = steps.indexOf(current);
  return steps[Math.min(index + 1, steps.length - 1)] ?? current;
}

/**
 * The step before `current`, or `null` at the start.
 *
 * **Null is meaningful here where it was not for `next`**: the back arrow on
 * the first step leaves the flow entirely and returns to the salon page, and the
 * caller needs to be able to tell that apart from moving within it.
 */
export function previousStep(
  steps: readonly Step[],
  current: Step,
): Step | null {
  const index = steps.indexOf(current);
  if (index <= 0) return null;
  return steps[index - 1] ?? null;
}

/** The heading each step shows. The confirmation's lives in its own view. */
export const STEP_TITLES: Record<Step, string> = {
  services: 'Select services',
  professional: 'Select professional',
  datetime: 'Select date and time',
  review: 'Review and continue',
  confirm: "You're all set! 🎉",
};
