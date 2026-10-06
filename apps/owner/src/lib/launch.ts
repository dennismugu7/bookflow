// Android's system splash (the B on purple, app.json) is the only splash: it stays up until fonts
// and the session are known, then the first screen shows (Dennis, 2026-10-04).

/** Whether we know enough to show the first screen: fonts settled and, when signed in, the salon. */
export function appReady({
  fontsSettled,
  signedIn,
  sessionKnown,
  membershipKnown,
}: {
  fontsSettled: boolean;
  signedIn: boolean;
  sessionKnown: boolean;
  membershipKnown: boolean;
}): boolean {
  return fontsSettled && sessionKnown && (!signedIn || membershipKnown);
}

/** Which screens a user may see: signed out, signed in without a salon yet, or with one. */
export function screenGroup({
  signedIn,
  hasSalon,
}: {
  signedIn: boolean;
  hasSalon: boolean;
}): "auth" | "onboarding" | "app" {
  if (!signedIn) return "auth";
  return hasSalon ? "app" : "onboarding";
}

export type ScreenGroup = ReturnType<typeof screenGroup>;

/**
 * The group to show after launch (release 1.0.0 part 4): stay on the current one until the session
 * and, when signed in, the salon are both known, then move once. The screens stay mounted
 * meanwhile, so a sign-in never shows a blank, grey or spinner frame between them.
 */
export function settledGroup(
  current: ScreenGroup | undefined,
  state: { sessionKnown: boolean; signedIn: boolean; membershipKnown: boolean; hasSalon: boolean },
): ScreenGroup | undefined {
  if (!state.sessionKnown) return current;
  if (state.signedIn && !state.membershipKnown) return current;
  return screenGroup({ signedIn: state.signedIn, hasSalon: state.hasSalon });
}
