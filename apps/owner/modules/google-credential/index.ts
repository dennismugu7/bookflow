import { requireNativeModule } from "expo";

/** The local Credential Manager module (android/…/GoogleCredentialModule.kt). Android only. */
type GoogleCredentialModule = {
  createNonce(): { raw: string; hashed: string };
  sha256Hex(text: string): string;
  signIn(serverClientId: string, hashedNonce: string): Promise<{ idToken: string }>;
  clearCredentialState(): Promise<void>;
};

export default requireNativeModule<GoogleCredentialModule>("GoogleCredential");
