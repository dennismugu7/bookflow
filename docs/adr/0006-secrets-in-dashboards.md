# 0006 — Secrets live in service dashboards

**Status:** Accepted · 2026-10-02

## Context
Development happens over remote control from a phone. Secrets must not be pasted into chats or committed to a public repo.

## Decision
- Runtime secrets live in the dashboards of Vercel, Supabase, Expo and GitHub Actions, all of which can be edited from a phone.
- Public browser keys (Supabase URL and anon key) are stored as Vercel **Config** variables, not Secrets.
- Expo builds and updates run in GitHub Actions using an `EXPO_TOKEN` repository secret, so the laptop never needs to log in to Expo.
- Claude Code is denied read access to `.env` files.
- We declined the Vercel Marketplace Supabase product: it would have created a second, Vercel-billed Supabase project.

## Consequences
- Rotating a key is a dashboard change; no secret is ever in git history.
