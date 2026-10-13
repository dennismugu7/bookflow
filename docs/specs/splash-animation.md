# Splash screen animation spec: "The fold"

From Dennis, 2026-10-13 (PDF, converted to Markdown). The approved motion is
[`docs/design/brand/splash-animation.html`](../design/brand/splash-animation.html). This replaces the
"system splash only, no second splash" decision of 2026-10-04.

Implement an animated splash screen for the app. The B logo assembles itself like a ribbon being
folded into shape, then gives one soft "heartbeat" pulse before the app appears. Match the reference
file's timing and easing. The rendering technology is up to you; pick whatever fits this codebase.

## Goal and feel

- Warm, friendly, calm. Nothing snappy or mechanical.
- Total duration: about 2.4 s, then hand off to the app.
- One play only. No looping.

## Logo geometry

The vector paths in splash-animation.html were traced by eye from a 1024×1024 PNG. They're
approximate. If the project has the real vector logo (SVG/AI/PDF, or an existing icon asset), use
that geometry and split it into the three parts described below. Use the traced paths only if no
vector source exists.

> Decision (Dennis, 2026-10-13): use the traced paths. The app icon only exists as PNG, and the one
> vector B (`src/ui/illustrations/logo-mark.svg`) is a different drawing with no gap between the
> bowls. The splash should match the launcher icon the user just tapped.

## Colours

| Element | Hex |
| --- | --- |
| Background (full screen, solid) | `#2B2183` |
| Halo behind logo | `#3D2FA8` |
| Stem and upper bowl (pale) | `#E8FBF8` |
| Lower bowl and bottom-left corner wedge (mint) | `#A6F2E8` |

The original artwork has a subtle diagonal gradient on the background (slightly lighter at the
top-right) and faint facet shading on the stem. These are optional. A solid background is acceptable.

## Logo parts

The logo is in a 1024×1024 coordinate space and centred on screen. Logo width is about 35–40% of
the screen width.

1. **Stem**: the vertical bar on the left (pale). Traced: rect x=343, y=278, w=87, h=467.
2. **Upper bowl**: the top loop, including the short tail that drops down inside the counter (pale).
3. **Lower bowl**: the bottom loop plus the small triangular wedge at the bottom-left of the stem
   (mint). These two shapes animate together as one group.

There's a small gap between the upper and lower bowls. Keep it.

## Timeline

All times are measured from when the animation starts. Transform origins are relative to each
element's own bounding box.

| # | Element | Start | Duration | Motion | Transform origin | Easing |
| --- | --- | --- | --- | --- | --- | --- |
| 1 | Halo (circle r250, centred) | 0.00 s | 2.60 s | Opacity 0 → 0.35 (at 60%) → 0.18. Scale 0.4 → 1.0 (at 60%) → 1.15 | Centre | ease-out |
| 2 | Stem | 0.25 s | 0.55 s | Opacity 0 → 1. scaleY 0 → 1 (grows upward) | Bottom centre | cubic-bezier(0.2, 0.8, 0.2, 1) |
| 3 | Upper bowl | 0.65 s | 0.60 s | Opacity 0 → 1. scaleX 0 → 1 (sweeps right out of the stem) | Left edge, vertical centre | cubic-bezier(0.34, 1.56, 0.64, 1) (overshoot) |
| 4 | Lower bowl group | 1.00 s | 0.70 s | Opacity 0 → 1. Rotate −35° → 0°. Scale 0.6 → 1 (swings up and tucks in) | Bottom-left of the group | cubic-bezier(0.34, 1.56, 0.64, 1) (overshoot) |
| 5 | Whole logo (stem and both bowls) | 1.75 s | 0.60 s | Scale 1 → 1.06 (at 45%) → 1 | Centre of logo | ease-in-out |
| 6 | Exit transition | ~2.35 s | 0.30 s | Cross-fade the splash out to the first app screen | — | ease-out |

## Behaviour

- **Native static splash first.** The OS launch screen (Android 12+ SplashScreen API or equivalent)
  should show the solid `#2B2183` background only, with no logo, so it hands off seamlessly to
  frame 0 of the animation. Nothing should flash or jump between the two.
- **Hold while loading.** If the app isn't ready at 2.35 s, hold the final frame (logo at rest, halo
  at 0.18 opacity) until it is, then run the exit.
- **Ready early.** If the app is ready before the animation finishes, still let it finish through
  the heartbeat. It's short enough not to annoy anyone.
- **Reduced motion.** If the OS "reduce motion" setting is on, skip all transforms. Fade the logo and
  halo in over 0.4 s, then exit.
- **Performance.** Animate only transform and opacity. It should hold 60 fps on low-end Android
  devices.

## Implementation options (choose what fits the stack)

- Lottie or Rive: recreate the timeline above and play the file.
- Native or framework animation APIs: draw the three logo parts as vector shapes and drive them with
  the timeline above.
- Web or PWA: the CSS in splash-animation.html can be used almost directly.

> Chosen: React Native's `Animated` on the native driver, with each part drawn by `react-native-svg`
> (dependency approved by Dennis, 2026-10-13). Needs a new native build, not an OTA update.

## Acceptance checklist

- [ ] Motion matches splash-animation.html side by side (order, timing, overshoot, heartbeat)
- [ ] No flash or jump between the OS launch screen and animation frame 0
- [ ] Logo is centred and correctly proportioned on small phones, large phones and tablets
- [ ] Reduced-motion setting results in a simple fade
- [ ] The final frame holds if loading takes longer than the animation
- [ ] Smooth on a low-end Android device

## Release

> Version **1.0.1** (Dennis, 2026-10-13). `react-native-svg` is a new native module, and
> `runtimeVersion` follows the app version, so 1.0.0 builds (Play bundles 4–6, the shared release
> APK) never receive an over-the-air update that needs it. Ship it as a new Play bundle (7 or
> later) built from `main` after this merges; bundle 6 was built as 1.0.0 and doesn't go to Play.
