# ADR-042 — Two levels of navigation: shell selection and movement within a shell

**Status:** Accepted

## Context

ADR-028 chose `go_router` and put the auth-aware redirect on the router. Phase 3's
`platform/router.dart` implemented that, and the implementation has a property nobody decided:
**the redirect is total.** It returns `destination.path` unless the user is already there, no
`GoRoute` has children, and **nothing anywhere calls `context.go` or `context.push`.** Every
screen change in the app today is a consequence of state.

That was sufficient while the signed-in shell held one screen. The business-setup slice makes it
hold four — the dashboard (#12), the account menu (#17), the profile (#20) and the onboarding
form (#5) — and an owner must move between them by tapping. **A pushed route is not the
destination the provider computes, so a total redirect pulls the user straight back**, which is
the concrete failure this ADR exists to prevent.

**The ambiguity is real and it was resolved by reading source.** ADR-028 §Decision says, in full:

> **Routing: `go_router`.** Declarative routes, and the auth-aware redirect between the
> logged-out and logged-in shells expressed as a `redirect` on the router rather than as
> navigation scattered through widgets. One place decides whether an unauthenticated user may be
> where they are.

Read quickly, that forbids push navigation. Read carefully, it decides three things — the
library, that the **auth-aware** redirect lives on the router, and that its purpose is *"whether
an unauthenticated user may be where they are"* — and **says nothing about the redirect being
total or about navigation that has nothing to do with auth.** `router.dart`'s own comment stays
inside that scope: *"no screen in this app pushes a route **to keep an unauthenticated user
out**."*

**No other ADR addresses routing.** Searching `docs/decisions/` for `go_router` or `redirect`
returns ADR-028 and ADR-021, whose matches are HTTP redirects for retired salon handles — an
unrelated sense of the word.

**This ADR exists because the next reader would otherwise do what the business-setup design had
to do: settle the question by reading `router.dart` and inferring intent from its shape.** An
emergent property that everyone treats as a rule is a rule nobody can find, disagree with, or
change deliberately.

## Decision

**Navigation has two levels, and they are decided by different mechanisms.**

### Level 1 — shell selection, by the redirect

**Which shell the user is in is computed from state and enforced by the router's `redirect`.**
This is ADR-028's rule and it is unchanged. The shells are the `AppDestination` values that
answer "what is true about this user": signed-out, startup, setup-required, home, unavailable.

A user never navigates *between shells* by tapping. Signing out does not push the welcome screen;
it ends the session, and the redirect moves them. Creating a business does not push the
dashboard; it changes the membership status, and the redirect moves them.

### Level 2 — movement within the signed-in shell, by push

**Screens inside a shell are reached by pushing, from a tap.** The dashboard pushes the account
menu; the account menu pushes the profile; a back affordance pops.

### Where the boundary sits

**A destination is a shell if the answer to "why am I here?" is a fact about the user's account
that the app computed. It is a pushed screen if the answer is "because I tapped something."**

Applied: `signedOut`, `startup`, `setupRequired`, `home` and `unavailable` are shells — each
answers a question about session or membership. Screens #17 and #20 are pushed — an owner is
looking at them because they chose to be. Screen #5 is a **shell-owned entry point**: it is
reached from `setupRequired`, whose selection is computed.

### How the redirect must be written

**The redirect must return `null` — "stay put" — whenever the current location is a pushed route
belonging to the shell the state already selects.** It may not compare the matched location to
the computed destination and redirect on any difference, which is what it does today.

Two requirements follow, and both are testable without a widget tree:

1. **A pushed route declares which shell it belongs to**, so the redirect can ask "is this
   location within the currently-selected shell?" rather than "does this location equal the
   destination?"
2. **A change of shell still wins.** If the session ends while the profile is pushed, the
   redirect moves the user to the signed-out shell and the stack is discarded. **Level 1 always
   overrides level 2** — that is what keeps ADR-028's guarantee intact.

### What this ADR does NOT do

**ADR-028 is neither amended nor superseded.** It decided `go_router` and the auth-aware
redirect, and both stand exactly as written. Its Context, Decision and Consequences are
untouched, and this ADR reverses nothing in it.

**This decides something ADR-028 never addressed.** ADR-028 is silent on within-shell
navigation, not wrong about it — which is why the answer is a new ADR rather than an amendment.
An amendment records a fact that has moved on; nothing in ADR-028 has moved.

## Rationale

**The two-level split is what the app already believes, written down.** `router.dart` argues at
length that `/unavailable` deserves its own destination because sending a user with a business to
`/setup` "would lie". That is level-1 reasoning — destinations assert something about the user.
Pushing the account menu asserts nothing; it is where the user went.

**The alternative — everything as a shell — was considered and is worse.** Adding `#17` and `#20`
to `AppDestination` would make the redirect responsible for "the user tapped the avatar", which
means routing state and UI intent in the same computed value. Every tap becomes a state change
the redirect must be taught about, and the file that decides whether an unauthenticated user may
be somewhere fills with reasons unrelated to authentication.

**The boundary is stated as a question rather than a list** because a list goes stale the first
time a screen is added and nobody updates the ADR. "Did the app compute this, or did the user
choose it?" survives new screens.

## Consequences

- **`router.dart` changes shape**, in the one file that decides where a user may be. It is a
  small change with a large blast radius, and it belongs on the reviewed path.
- **`router_redirect_test.dart` gains a case it cannot currently express**: push a within-shell
  route and assert the redirect returns `null`. It already drives both membership statuses
  without a widget tree, so this is cheap and comes before any screen exists.
- **Back navigation becomes real**, and screens that faked it must stop. `profile_screen.dart`'s
  back arrow signs out, with a comment saying it does so because "there is one screen behind the
  shell". That comment expires the moment a screen is behind it.
- **Deep links are not addressed here.** Nothing in the app opens one today. When something
  does, the question of whether a deep link may land on a pushed route is a new decision, not an
  inference from this one.
- **A screen can now be unreachable, which was impossible before.** When every destination was
  computed, every screen had a path by construction. With push, a screen exists only if
  something navigates to it — the failure the business-setup slice hit when moving `/home` to
  the dashboard would have left the profile with no path at all.

## Items resolved

**None in the triage.** This settles a question the triage never captured, in the same way
ADR-036 settled schema conventions and ADR-041 settled the descoping test. Recorded so the gap
closes explicitly rather than by whatever the first pushed route happened to do.

## Items created

None.
