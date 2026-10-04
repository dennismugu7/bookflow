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
