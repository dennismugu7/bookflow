// Google sign-in returns to bookflow://auth/callback. openAuthSessionAsync reads that link itself;
// the router must not also open it as a screen, so it lands where the app already is.
export function redirectSystemPath({ path }: { path: string; initial: boolean }): string {
  return path.includes("auth/callback") ? "/" : path;
}
