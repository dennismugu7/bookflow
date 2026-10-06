# Release 1.0.0, part 3: Google settings done, bare address forwarding (2026-10-06)

Same branch and PR (#33). Add this spec to the PR.

## Google Cloud (done by Dennis)
- The repository variable `GOOGLE_WEB_CLIENT_ID` is set (the public web client ID).
- Android OAuth clients exist for `com.mugulabs.bookflow` with:
  - the laptop debug key (`18:31:99:D1:…:1A:A1`);
  - the EAS release key.
  - The Play App Signing key gets added after the first Play upload.
- Branding:
  - app name **Bookflow**;
  - home page `https://mugu-labs.com/products/bookflow/`;
  - privacy `https://bookflow.mugu-labs.com/privacy`;
  - terms `https://bookflow.mugu-labs.com/terms`;
  - authorized domain `mugu-labs.com`;
  - no logo yet.

## What to do
1. **Builds get the web client ID:**
   - the debug-APK script reads it with `gh variable get GOOGLE_WEB_CLIENT_ID` when it isn't passed in;
   - `.github/workflows/eas-env-sync.yml` also writes `EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID` (plaintext) to the EAS `preview`, `development` and `production` environments;
   - the variable runs on main after merge; say so in the PR.
2. **Bare address → product page:** `https://bookflow.mugu-labs.com/` (exactly the root path, any host in production) gets a **308** to `https://mugu-labs.com/products/bookflow/`.
   - Everything else is unchanged: `/s/*`, `/b/*`, `/me`, `/privacy`, `/terms`, `/delete-account`, `/api/*` and so on.
   - Preview deployments still show their root, for testing.
   - Add a test for the redirect rule, and include it in the post-merge `curl -I` checks.
3. **Rebuild the debug APK** with the client ID and install it on Dennis's phone (USB). The signing key changed, so uninstall the old debug app once.
4. **Phone checks:**
   - **Google sign-in shows the native chooser** and the text names **Bookflow**;
     - a new account → create your salon;
     - an existing account (dennismugu7) → Today;
     - log out, then sign in again → the chooser appears again;
   - everything still open from part 2 (C to F): every sheet closes by dragging down, the toasts, the phone error text, the notification icon.

## Acceptance criteria
- [ ] `pnpm check` and CI green; the new redirect test passes.
- [ ] The phone checks above, done with Dennis, with the results in the PR.
- [ ] Don't merge.
