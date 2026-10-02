# 0004 — v1 launches without deposits

**Status:** Accepted · 2026-10-02

## Context
Deposits must go to each salon's own M-Pesa till. With Daraja, each till may need its own app and go-live approval, which is slow and outside our control.

## Decision
Build payments behind a provider interface. v1 launches with booking only; deposits switch on once the go-live route (direct Daraja per till, or an aggregator) is confirmed. Research is due by 2026-10-09.

## Consequences
- Payments can only add value; they can't block launch.
- The deposit screens stay in the design and are built behind a switch.
