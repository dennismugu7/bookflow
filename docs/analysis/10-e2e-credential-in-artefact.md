> Derived record, not source. Written during PR 4c review, 2026-08-16, in answer to a question
> about `--dart-define-from-file` in the `e2e-staging` job.

> **§1–§3 describe the position as found. §5 records what replaced it** — the password no longer
> enters a build at all. The earlier sections are kept because the measurement in §1 is what makes
> the current arrangement necessary rather than decorative, and because §3's choice of a comment
> was correct for the position it addressed and would be the wrong lesson to delete silently.

# The e2e credential is compiled into the test binary

**Confirmed by experiment, not by reasoning.** The question was whether protecting the defines
*file* protects the *value*. It does not.

## 1. What was checked, and how

A local debug build with a throwaway password, `ZZTHROWAWAY-9f3a1c22-NEVER-A-REAL-SECRET`, in a
defines file of the same shape CI writes.

**First attempt was a false negative, and is worth recording as one.** `flutter build apk --debug`
with the defines file produced an APK in which the string appears **zero** times — because that
builds the *app*, whose entrypoint (`lib/main.dart`) never references `E2E_PASSWORD`. An unread
`String.fromEnvironment` is not compiled in. That is not the artefact the job produces, and taking
that zero at face value would have answered the question backwards.

**The instrument was proved before the result was believed**, on the same extracted APK:

```
grep -c "My profile" assets/flutter_assets/kernel_blob.bin   →  3
grep -c "Bookflow"   assets/flutter_assets/kernel_blob.bin   →  101
```

The search works; the zero was real, and about the wrong binary.

**The build the job actually makes** is the test entrypoint — `flutter test
integration_test/profile_e2e_test.dart` compiles `profile_e2e_test.dart`, which *does* read the
define. Reproduced with `flutter build apk --debug -t integration_test/profile_e2e_test.dart`:

```
grep -c "screen #20 renders the profile" kernel_blob.bin              →  2   (instrument control)
grep -c "ZZTHROWAWAY-9f3a1c22-NEVER-A-REAL-SECRET" kernel_blob.bin    →  1   ← the password
grep -c "throwaway-probe@example.invalid" kernel_blob.bin             →  1   ← the email
grep -c "throwaway-anon-key-value" kernel_blob.bin                    →  2
```

In context, the constants sit adjacent to one another exactly as written in the defines file:

```
robe@example.invalidZZTHROWAWAY-9f3a1c22-NEVER-A-REAL-SECRETbuild-time configura
```

**Inside the workspace**, two paths under `apps/mobile/build/` carry it:

```
build/app/intermediates/assets/debug/mergeDebugAssets/flutter_assets/kernel_blob.bin
build/app/intermediates/flutter/debug/flutter_assets/kernel_blob.bin
```

One nuance, and it cuts the wrong way for anyone hoping it helps: `strings -n 20` does **not** find
it, because the constant is stored without a NUL terminator between neighbours. `grep -a` finds it
immediately. **This is not obscurity worth anything** — it means a casual scan misses it and a
deliberate one does not, which is the worst combination.

Cleanup: the throwaway defines file, both extraction directories and the build output were deleted;
`grep -rl ZZTHROWAWAY` over `apps/mobile` returns nothing.

## 2. Verdict on the question asked

**The password is recoverable from the built binary.** Protecting the defines file — `RUNNER_TEMP`,
`chmod 600`, `rm` on `always()`, never in argv — protects the file and not the value. Those
measures are still right, because they stop the value reaching `ps`, the workspace and the logs;
they simply do not do the job everyone would assume from reading them.

**Nothing leaks today.** No step in `e2e-staging` uploads anything, and the runner image is
destroyed with the job. **But the protection is the absence of a step, not a property of the
value** — and "we are safe because nobody has written that line yet" is the kind of safety that
ends without an announcement.

## 3. What makes the future addition visible — a comment, at the point of the mistake

Three options were available. The choice is **a comment in `ci.yml`, immediately where an upload
step would be typed.**

**Why not a guard in the job** (a step scanning `build/` for the secret before upload): it is
tooling, and this project has already ruled on that pattern. `CLAUDE.md` §7 refuses tooling as the
remedy for a discipline failure — *"no pre-commit hook, no wrapper script, no safe sed"* — on the
grounds that the tool becomes the thing people trust and route around. A scanner here would also be
the only thing in the pipeline that needs the secret's *value* in order to check for it, which
means giving one more step a reason to hold it.

**Why not a rule in `CLAUDE.md`:** a rule is read at the start of a session; this mistake is made
in the middle of one, by someone debugging a flaky emulator run who wants the failure screenshot.
The distance between where the rule lives and where the mistake is typed is the whole problem. The
project already carries evidence for this: the CI comment that said a service was no longer
excluded while the `-x` line sat two lines below it survived precisely because nobody reads
distant prose at the moment of editing.

**Why a comment wins here:** it is in the diff of the change that would cause the leak. Someone
adding `actions/upload-artifact` to that job has to type past it, and a reviewer of that PR sees it
in context. It is weaker than a mechanical guard and that is accepted deliberately — the failure
mode it addresses is a person adding a step, and the intervention lands on that person at that
moment.

**It is not a substitute for §4.** A comment can be deleted by the same hand that adds the upload.
The durable protection is the credential's blast radius, below.

## 4. Scoping and rotation — what actually contains this

**The binary is not the interesting exposure.** It exists for the life of one job on a runner that
is destroyed afterwards. What changed is the *class* of thing that can reach the credential: it was
"whatever can read Actions secrets", and it is now also "whatever can read a build directory or an
uploaded artifact on that runner". That is a wider set, and it includes a future `upload-artifact`
step, a future third-party action added to the job, and anything that caches `apps/mobile/build/`.

**So the question "should this be a long-lived secret" is the right one, and the answer is that
the containment should come from the account, not from the secret's lifetime.**

What already contains it, and should be stated so it is not eroded by accident:

- The account owns **one `user_profiles` row on staging** and nothing else.
- It has **no membership and no business** — the e2e overrides `membershipRepositoryProvider` to
  `member` precisely because the real answer is `none`. So the credential cannot read business
  data, because there is none it is scoped to (`CLAUDE.md` §5, the membership scoping rule).
- Staging holds **no production data** (ADR-023).
- It is a **password grant against staging GoTrue only**. It is not a service-role key; it bypasses
  nothing.

**Scheduled rotation is rejected as security theatre for this credential.** A calendar-driven
rotation of a staging account with no privileges buys nothing and creates a recurring chore whose
skipping is invisible. **Trigger-based rotation is the honest form**, and the triggers are:

1. **Any step is added to `e2e-staging` that uploads, caches or persists anything** — the exposure
   class changes at that moment, and the credential in the previously-built binaries should be
   considered spent.
2. **The account is ever granted a membership, a business, or any privilege beyond its own profile
   row** — at which point it stops being a credential whose theft costs nothing.
3. **Staging is ever pointed at real data.**

Tracked as **K78**. The rule that matters more than the rotation: **this account must never be
given a membership.** The day it has one, a password compiled into a debug build on a hosted
runner is protecting real business data, and none of the reasoning above survives that change.

---

## 5. Superseded — CI mints the session, 2026-08-16

Everything above stands as the finding. **The remedy changed**, at review, from documenting the
exposure to removing most of it. The idea was Dennis's: *the test needs a session, not a password.*

### 5.1 What it does now

The workflow performs the password grant itself, against staging GoTrue, and passes only the
resulting **`access_token`** as a define. `E2E_STAGING_PASSWORD` stays in Actions secrets and
**never enters a build artefact**. What is compiled into `kernel_blob.bin` is a bearer token with
**one hour** of life (ADR-017), not a credential that works forever.

**No refresh token is compiled in either**, and that is the part worth stating precisely because it
looks like a technicality. `setSession(refreshToken, {accessToken})` in gotrue 2.27.2:

```dart
if (refreshToken.isEmpty) throw AuthSessionMissingException(...);
if (accessToken == null)  return await _callRefreshToken(refreshToken);
...
if (hasExpired)           return await _callRefreshToken(refreshToken);
final userResponse = await getUser(accessToken);   // ← the path taken here
```

A non-empty refresh token is **required by the signature and unused on this path**. So the test
passes the literal string `no-refresh-token-is-compiled-into-this-build`. The consequence is real
rather than cosmetic: **the artefact cannot mint itself a new token when the hour ends**, and if
anything ever tried, it would fail loudly instead of quietly extending the artefact's reach.

The device still makes a real call to real GoTrue — `getUser` — so nothing was stubbed out. Only
the minting moved off the device.

### 5.2 Checked, not assumed

**At REST level**, against staging, using a temporary user created and deleted for the purpose so
the e2e account was untouched:

```
1. admin create           : 200
2. password grant         : 200 | access_token len 862 | refresh_token len 12 | expires_in 3600
3. GET /auth/v1/user      : 200 | id matches: true | email present: true   ← the call setSession makes
4. deployed GET /v1/me    : 404   (correct — the probe had no profile row)
5. probe deleted          : 200
6. users remaining        : 1     ← the identity check in ENVIRONMENT.md §3
```

**At Dart level**, by running the gate: **run 31936130639, `🎉 1 test passed`**, with the session
installed from a token and no password anywhere in the build. `grep -c "eyJhbGciOi"` over the full
job log returns **0** — the token is masked with `::add-mask::` before any later step runs.

### 5.3 What it costs

- **No extra job, and no extra step** — the grant folds into the step that already composed the
  defines file. The password reaches `curl` through a file on stdin rather than `-d`, for the same
  argv reason as everything else, and both temporary files are deleted in the same step.
- **A new failure mode, and it is an improvement.** If the grant fails — staging down, password
  rotated, account deleted — the job now fails at a named step in seconds, *before* paying ten
  minutes for an emulator and a Gradle build. Previously the same causes surfaced as a test failure
  at the very end.
- **A token could in principle expire before it is used.** The grant runs at the start of the job;
  the emulator boot and APK build take about ten minutes; the token lives sixty. The margin is
  roughly 50 minutes, and if it were ever exhausted the failure is explicit — `setSession` would
  try `_callRefreshToken` with the placeholder and fail — with a `reason:` on the assertion naming
  expiry first among the causes. **It does not fail silently, and it does not fall back to
  anything.**
- **The exposure is bounded, not eliminated.** For the minutes between the grant and the sign-out,
  the built artefact contains a live credential. An artifact uploaded from a run that failed
  *before* the sign-out would carry a working token for up to an hour.

### 5.4 What this changes about §3 and §4

**§3's comment stays, rewritten** for what is actually compiled in. It is no longer the answer —
the design is — but the reason for a comment at that spot is unchanged: someone adding
`upload-artifact` should know the build is not inert. It now says the exposure is a bounded token
rather than a permanent password, because a comment that overstates its danger gets discounted.

**§4's containment argument is unchanged and still does the real work.** The account owns one
profile row, has no membership and no business, and lives only on staging. The token narrows the
window; the account is what makes the window survivable.

**§4's rotation triggers change, though — trigger 1 is weaker now.** Adding an upload step no
longer means "the password is published"; it means "a token with up to an hour left is published".
The trigger stands, at lower severity: rotate if an upload step is added *and* any run failed
before its sign-out. **Triggers 2 and 3 are unchanged and remain the important ones**, as does the
rule that outlives every rotation policy: **this account must never be given a membership.**
