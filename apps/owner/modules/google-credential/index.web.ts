/**
 * The web target exists only for design captures (CAPTURE_WEB, ADR 0009), where there is no
 * Credential Manager. Every call fails, so "Continue with Google" shows its error instead of
 * the whole app failing to load.
 */
const unavailable = (): never => {
  throw new Error("Google sign-in is Android only");
};

export default {
  createNonce: unavailable,
  sha256Hex: unavailable,
  signIn: async () => unavailable(),
  clearCredentialState: async () => {},
};
