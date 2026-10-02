# Ops 01 — Merge scaffold, make the repo public, protect main

**Lead review of PR #1:** approved. Good work. Answers to your questions:
1. Lazy env validation is fine. In Phase 0b add a unit test that `getEnv()` throws and names each missing key.
2. Keep both AGENTS.md files and leave Turborepo's agent guidance on.

## Steps (in order, stop and report if any step fails)
1. **PR #1 is merged by Dennis on GitHub.** Run `git checkout main && git pull` and delete the local `feat/scaffold` branch.
2. **Pre-public safety check** (report results; do NOT go public if anything is found):
   - No env file was ever committed: `git log --all --name-only --format= | grep -E '(^|/)\.env' | grep -v '\.env\.example$'` must print nothing.
   - Scan full history for secrets: `git log -p --all` searched for private keys (`BEGIN .*PRIVATE KEY`), JWTs (`eyJ[A-Za-z0-9_-]{10,}\.`), and `(key|secret|token|password)\s*[:=]\s*['"][^'"]{12,}`. Ignore `env(...)` placeholders in `supabase/config.toml`.
3. **Ownership notice** — append to `README.md`:
   > © 2026 mugu-labs. All rights reserved. The source is public for portfolio review only; no license is granted to use, copy, modify or distribute it.
   Do not add a LICENSE file.
4. **Update CLAUDE.md** (commit together with step 3 as `docs: ownership notice and workflow rules`):
   - Replace rule 4 with: *"Branch per task: `feat/<name>` or `fix/<name>`; open a PR with `gh pr create`. `main` is protected. **Never merge PRs yourself**: Dennis squash-merges on GitHub after the lead approves. After he says "merged", run `git checkout main && git pull` and delete the local branch."*
   - Add rule 9: *"**Acceptance tests belong to the lead.** Each spec has an 'Acceptance tests' section. Copy those cases verbatim into files named `*.acceptance.test.ts` (TypeScript) or `supabase/tests/acceptance/*.sql` (pgTAP). Never weaken, skip, delete or edit them. If one looks wrong, stop and ask. You may add as many extra tests of your own as you like."*
   - Add rule 10: *"**This repo is public.** Never commit real personal data, real phone numbers, screenshots with client data, or secrets. Seed and test data use fake names and numbers in the `+2547000000xx` range."*
   - Push this commit directly to `main` **before** step 6 (after step 6, direct pushes are blocked).
5. **Make public**: `gh repo edit dennismugu7/bookflow --visibility public --accept-visibility-change-consequences`.
6. **Protect `main`** with `gh api -X PUT repos/dennismugu7/bookflow/branches/main/protection --input -` using:
   ```json
   {
     "required_status_checks": { "strict": true, "contexts": ["check"] },
     "enforce_admins": true,
     "required_pull_request_reviews": { "required_approving_review_count": 0 },
     "restrictions": null,
     "required_linear_history": true,
     "allow_force_pushes": false,
     "allow_deletions": false
   }
   ```
   Confirm `check` is the exact name CI reports on PRs; adjust if not.
7. **Security features** (free on public repos): enable secret scanning, push protection and Dependabot alerts:
   `gh api -X PATCH repos/dennismugu7/bookflow -f "security_and_analysis[secret_scanning][status]=enabled" -f "security_and_analysis[secret_scanning_push_protection][status]=enabled"` and `gh api -X PUT repos/dennismugu7/bookflow/vulnerability-alerts`.
**If Claude Code's safety check blocks step 5, 6 or 7**, stop and report which step; Dennis will do it in GitHub settings.

8. **Verify**: try `git push origin main` with an empty commit on a scratch branch rebased onto main — it must be rejected. Then delete the scratch branch locally.

## Report
Use the CLAUDE.md report format. Include the safety-check output (counts only) and the repo URL.

## Housekeeping
Delete the folder `.git/_stale/` (a stale lock file the lead moved aside; harmless).
