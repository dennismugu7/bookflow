# ADR-013 — Platform and backend architecture

**Status:** Accepted

## Context

K1 (the platform) and K2 (the spike verifying it) were the two items every other foundation
decision hung off. Twelve accepted ADRs had attached six hard capability requirements to the
platform choice, and K2 was explicit that a negative on any one would invalidate K1 rather
than merely complicate it.

Spike 001 (`docs/spikes/001-platform.md`) executed all six against the real project. Five
passed cleanly; C2 (bigint over JSON) returned PARTIAL with a one-cast mitigation. The
platform question is therefore answerable from evidence rather than from documentation.

Two further findings shape the architecture rather than merely permitting it. Spike C7
established that a `service_role` connection bypasses RLS entirely, which settles where
authorization can and cannot live. Spike C3 established that `pg_cron` is available — which
means in-database scheduling is *possible*, and therefore that choosing against it has to be
a deliberate decision rather than an absence of options.

## Decision

**PostgreSQL on Supabase**, validated by spike 001. Supabase provides managed Postgres, Auth,
Storage and Realtime.

**Supabase does not serve clients directly.** A TypeScript API service (Fastify) sits in
front. No client ever talks to PostgREST.

**Layering** follows the Feature-Scaffolding manual: repository → service → endpoint. All
booking validation — opening hours, staff schedules, service durations, the exclusion
constraint, expiry — lives in the **service layer**.

**Authorization enforcement point:** the **repository layer** applies the ADR-003 membership
scoping rule. RLS is defence-in-depth only, because the API connects with a service credential
that bypasses it (spike C7).

**Background work:** outbox and booking-expiry are processed by a **Node worker process in the
same repository**, sharing the same service layer, deployed alongside the API. Not `pg_cron`,
not `pg_net`, not in-database logic — the manual requires this logic to be unit-testable.
`pg_cron` remains available as a heartbeat safety net.

## Consequences

- Closing PostgREST to clients means the ADR-011 payment-proof endpoint, the ADR-004 published
  filter and the ADR-003 scoping rule are all enforced in one place we own, rather than
  distributed across RLS policies we would have to keep in sync with them.
- Choosing the repository layer over RLS is forced, not preferred: spike C7 showed the service
  credential reads through RLS regardless of policy. RLS still catches anything that reaches
  the database on an anon or authenticated connection, which is why it stays on.
- The worker sharing the service layer means expiry and outbox delivery run the same validated
  code paths as the API, and both are unit-testable without a database scheduler.
- Two deployable processes now exist where the design implied one.
- Supabase Auth is used for identity but its JWTs are verified independently by the API
  (spike C5: ES256 with a published JWKS), so the API does not call Supabase per request.

## Items resolved

K1 (platform), K2 (the spike itself), I3b (authorization enforcement point),
E11 (what runs the outbox worker), K51 (what expires an unverified booking). All were F.
E13 (does expiry share the outbox worker) — yes, the same Node worker. It was S.

## Items created

None.
