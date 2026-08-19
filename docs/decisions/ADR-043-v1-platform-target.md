# ADR-043 — Android is the v1 platform target; iOS is out of scope for v1

**Status:** Accepted

## Context

**No ADR has ever named iOS as a target platform.** That is the finding this decision rests on,
and it was established by reading rather than assumed.

**ADR-015 decided Flutter and nothing about platforms.** Its Decision section, in full, is three
statements:

> **Flutter** for the owner app.
>
> Accepted cost: **no shared types with the TypeScript backend.** Mitigated by ADR-014's
> generated Dart client.
>
> **iOS builds require cloud CI**, since the development machine is Windows.

**The third statement is a constraint on HOW iOS would be built if it were built.** It
presupposes iOS; it does not choose it. Its other mentions are of the same kind — a rationale for
choosing Flutter (*"pixel-fidelity across iOS and Android"*) and a consequence (*"Windows as the
development machine means iOS builds and signing never run locally"*). **Neither is a decision
that the product ships on iOS.**

**ADR-005 decided the market and said nothing about platforms.** It states **"Kenya only for
v1"**, makes phone validation assume Kenyan format, and turns the timezone into an application
constant. It does not mention iOS, Android, the App Store or Play Store.

**The design documents name no platform at all.** `DD-Bookflow-Native.md` — the specification for
all 28 owner-app screens — contains **zero matches** for `iOS`, `Android`, `App Store` or
`Play Store`.

**So iOS is in this repository because `flutter create` produces an `ios/` directory**, and
ADR-024 later gave that directory a macOS runner. A folder nobody chose to create acquired a CI
job, and the job acquired a 10× billing multiplier.

### How the question was actually raised, recorded rather than tidied

**It was raised because macOS runners bill at 10×**, during an audit of what consumes the
repository's GitHub Actions allowance. That is the honest provenance and it is written here
because a reader deserves to know what prompted the question.

**The answer does not stand on cost, and would be the same at zero cost.** A platform nobody
decided to support, which no design document mentions, for a market whose ADR does not name it,
is out of scope by default rather than by economy. **Cost made the question visible; scope
answers it.** If iOS were a target, the correct response to the 10× multiplier would be
`ci/ios-build-cadence`'s weekly schedule, not deletion.

## Decision

**Android is the v1 platform target for the owner app. iOS is out of scope for v1.**

**`apps/mobile/ios/` remains in the repository and is not built.** It is stock `flutter create`
scaffolding — 40 tracked files under `Runner`, `Runner.xcodeproj`, `Runner.xcworkspace`,
`RunnerTests` and `Flutter`, none of it hand-edited for this app. **Its presence is not support
and must not be read as support.** Deleting it would buy nothing and would make the eventual
reversal marginally harder.

**The `ios-build` CI job is removed.** This ends the project's only use of a 10× runner.

**This ADR does not amend ADR-015.** ADR-015 decided Flutter and stated a constraint on how iOS
would be built if built; it did not decide iOS, so there is nothing in it to reverse or correct.
This is the same shape as ADR-042 to ADR-028 — a new decision on a question the earlier ADR never
addressed. ADR-024 gets an amendment, because its statement about *when* `ios-build` runs is a
fact that has moved on.

## Rationale

**Why Android and not both.** Kenya's smartphone market is overwhelmingly Android, and ADR-005
already narrowed v1 to Kenya. Shipping one platform well is the same argument ADR-001 makes for
build order: the owner app must be usable before the client web app starts.

**Why this is NOT a weakened gate under `CLAUDE.md` §6.** The rule is that no gate is ever
lowered to work around the Actions ceiling, and it is a good rule. **It does not apply, because a
gate protects a property somebody chose to hold, and nobody chose iOS.** Removing the job does not
stop verifying something the project decided to guarantee — it stops verifying something the
project never decided to have. **The test is whether a decision is being reversed. None is.** Had
any ADR named iOS as a target, this would be a scope reduction requiring its own justification and
the answer would likely have been the weekly cadence instead.

**What would have been lost is smaller than it looks.** The job ran `flutter build ios
--no-codesign` and discarded the output. It was a compile check, not an artifact: there is no
Apple Developer account, so unsigned was the ceiling. Nothing was shipped from it, and no test
depended on it.

## Consequences

- **`ci.yml` loses one job — seven remain**, all Ubuntu at 1×. The header comment naming
  `ios-build` is corrected in the same commit.
- **The project's only 10× runner usage ends.** Whether that is most of the allowance is
  unproven: the billing endpoint requires a token scope this project's credential does not hold,
  and the timing API reports zero billable milliseconds per job.
- **`apps/mobile/ios/` stays, unbuilt.** Nothing compiles it, nothing tests it, and its Xcode
  project will drift out of date with Flutter releases.
- **Reversing this costs about one afternoon** — `flutter create --platforms=ios` to regenerate
  the scaffolding, then whatever iOS configuration the plugins then present
  (`flutter_secure_storage`, `supabase_flutter`, CocoaPods). **That is what it would cost today
  too**, because nothing iOS-specific has ever been written here. The cost of reversal does not
  grow much with delay; only the scaffolding staleness does.
- **`DEFINITION_OF_DONE.md`'s "the build step" is settled as PLATFORM-TARGETED**, and this is the
  consequence with the longest reach. The item was read two ways in one day. The rejected reading
  — *every build CI performs* — would make the Definition of Done depend on `ci.yml`'s current
  contents, so adding a job would silently raise the bar and removing one would lower it. **A
  Definition of Done may not have that property.** Under the settled reading, the item means the
  build for each platform the project targets, which after this ADR is the Android build in the
  `mobile` job.
- **Phase 3's closure remains valid and `09-phase3-close.md` is NOT edited.** Its record of the
  build item lists the `main` run's jobs and adds that *"`ios-build` compiles the app unsigned on
  macOS"* — an explanation of the least self-evident job in the list, not a dependency on it.
  **That run included an Android build, which is what the item required then and requires now.**
  It is a point-in-time record of what was observed, and it was true when written.
- **K53 — iOS signing and which cloud CI provider does it — is no longer an `S` item for v1.**
  It cannot block a slice for a platform v1 does not target. It needs reclassifying in
  `docs/analysis/05-triage.md`, not closing: it becomes live again the day iOS does.
- **`ci/ios-build-cadence`'s primary purpose evaporates.** It exists to move `ios-build` to a
  weekly schedule, and there is no job to schedule. **It is not wholly redundant** — it also
  carries `BUILD_LOG.md` §8 and a fold-in of a stray ADR-024 amendment — so it needs reconciling
  rather than merging or deleting on autopilot.

## Items resolved

**None in the triage directly.** K53 is reclassified rather than resolved — see Consequences.

## Items created

None.
