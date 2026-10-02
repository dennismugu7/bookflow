# 0003 — Public repository, all rights reserved

**Status:** Accepted · 2026-10-02

## Context
Constraints: free tiers only. GitHub Free doesn't enforce branch protection on private repos and caps Actions minutes. The code also serves as portfolio evidence.

## Decision
Make the repo public with an ownership notice and no open-source license. Before switching, scan the full history for secrets.

## Consequences
- Unlimited standard CI minutes; enforced protection on `main`; free secret scanning and push protection.
- Anyone can read the code. The advantage is in execution and sales, not secrecy.
- Strict rule: no real personal data, phone numbers or secrets are ever committed.
