# 0001 — Expo (React Native) for the Android owner app

**Status:** Accepted · 2026-10-02

## Context
The owner app is Android-only. Development is driven remotely: Dennis tests on his phone while the code is built on a laptop he isn't sitting at.

## Options
- **Kotlin + Jetpack Compose:** best native performance and a strong signal for native Android roles. Separate language from the web app; every change needs a new APK installed.
- **Expo (React Native):** shares TypeScript, types and validation with the web app; over-the-air updates reach the phone in seconds; iOS later is cheap.

## Decision
Expo. Reliability is the same either way because it comes from the backend. Iteration speed under a remote workflow decides it.

## Consequences
- Estimated full-scope build of 12–16 weeks, versus 15–20 with Kotlin.
- Native-only APIs need an Expo module or a config plugin.
