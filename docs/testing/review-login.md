# The Google Play reviewer login (release 1.0.1)

Google Play's reviewers can't create accounts, so they sign in with a fixed email and password
and land in **Demo Salon**, which is full of fake data.

- **Email:** `support@mugu-labs.com`
- **Password:** only in the Vercel variable `REVIEW_PASSWORD`. It is never in the repo, the app or the logs.

## Set the password (once)

1. In your password manager, generate a random password of **32 or more characters**.
2. Vercel → `bookflow-web` → Settings → Environment Variables → **Add**:
   - Key: `REVIEW_PASSWORD`
   - Value: the password
   - Environment: **Production** only
   - Mark it **Sensitive**.
3. Deployments → the latest Production deployment → ⋯ → **Redeploy**. The variable only applies
   to new deployments.
4. Play Console → App content → **App access** → "All or some functionality is restricted" → add
   instructions: the email above, the password, and "Type the email, then the password field
   appears. Tap Sign in."

A missing password, or one under 24 characters, turns the login off: the app then shows the
connection message, and the server logs `[review] not configured`.

## What the reviewers see

1. Welcome → **Sign in** (or Create account).
2. They type `support@mugu-labs.com`. A **Password** field appears and the button becomes **Sign in**.
3. A wrong password shows "That password isn't right. Try again." After 5 wrong tries in 15
   minutes (from anyone), the login pauses: "Too many tries. Wait 15 minutes and try again."
4. The right password goes straight to **Today** in Demo Salon (Kilimani, Nairobi): 5 services,
   8 fake clients, and bookings today (one in progress, one later, one already served),
   2 tomorrow and 1 in 3 days.

Every sign-in tops the bookings up again and removes ones older than 14 days. If a reviewer
deletes the account, the next sign-in creates the user and Demo Salon again.

Every other email works exactly as before: Google, or the 6-digit code.

## Change the password

1. Generate a new one (32+ characters).
2. Vercel → Environment Variables → `REVIEW_PASSWORD` → Edit → save the new value.
3. Redeploy Production (as above).
4. Update the password in Play Console → App content → App access.

## Check it yourself

On a phone with the Play build: sign in as above and check you land in Demo Salon's Today.
Don't use your own account for this; the review account is separate.

## Local run (developers)

`apps/owner/scripts/capture-review-login.mjs` runs the whole flow against the local Supabase stack
with a fake password and takes the design side-by-sides. See the steps at the top of the script.
