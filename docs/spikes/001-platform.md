# Spike 001 — Platform capability verification (K1 / K2)

**Date:** 2026-08-10 · **Status:** concluded · **Code:** deleted (`spikes/001-platform/`, gitignored)

Timeboxed throwaway spike per the Project-Scaffolding manual's Phase 0: "Throw the spike code
away, keep the answer." This file is the answer. It exists to close K2 in
`docs/analysis/05-triage.md`, which carries six named capability requirements imposed by
ADR-001 through ADR-012.

Everything below was executed against the real hosted Supabase project
(`iohxfurykkocqfagdkzy`, PostgreSQL 17.6, eu-central-1, session-mode pooler on :5432).
Nothing was simulated or inferred from documentation.

## Toolchain

| Tool | Result |
|---|---|
| node | v24.19.0 |
| npm | 11.17.0 |
| git | 2.55.0.windows.3 |
| flutter | 3.44.8 stable (Dart 3.12.2) |
| psql | **not installed** |

`psql` absent is not a blocker — the database work was driven from Node via `pg`, which is
closer to how the API layer will actually connect. No Docker, no Supabase CLI; neither was
needed against a hosted project.

**Credential note.** The supplied `SUPABASE_DB_URL` was not a valid URI: it contained two
spaces in the userinfo section. Probing three candidates established that the password
contained no spaces — both were paste artifacts. Recorded because the working connection
string is a real output of this spike.

> The password value stood here in plaintext until 2026-08-10. It is
> **`[REDACTED — see Amendments]`**. See the Amendments section for what was committed, and
> what that does and does not mean now.

---

## C1 — Exclusion constraint (decisive)

**Requirement (ADR-007):** one booking per team member per overlapping time range, enforced
in the database, and only for statuses that occupy a slot.

**Tested:** `btree_gist` install, then

```sql
create extension if not exists btree_gist;
create table spike.bookings(
  id uuid primary key default gen_random_uuid(),
  team_member_id uuid not null,
  during tstzrange not null,
  status text not null);
alter table spike.bookings add constraint bookings_no_overlap
  exclude using gist (team_member_id with =, during with &&)
  where (status in ('booked','confirmed'));
```

**Observed** (`node c1-exclusion.mjs`):

| Step | Expected | Observed |
|---|---|---|
| `create extension btree_gist` | succeeds | succeeded |
| create partial EXCLUDE constraint | succeeds | succeeded |
| 1. insert 10:00–11:00, M1, booked | accept | accepted |
| 2. insert 10:30–11:30, M1, booked | reject | **rejected, SQLSTATE 23P01** |
| 3. insert 11:00–12:00, M1, booked | accept | accepted (`[)` bounds, no overlap) |
| 4. insert 10:30–11:30, **M2**, booked | accept | accepted |
| 5a. insert 10:15–10:45, M1, booked | reject | rejected, 23P01 |
| 5b. cancel baseline, retry 10:15–10:45 | accept | accepted |

**Verdict: PASS.** The constraint is creatable and behaves exactly as ADR-007 specifies,
including the status predicate — cancelling a booking genuinely releases its slot to the
constraint.

*Test-design note: an earlier run failed step 5 because the retry range 10:30–11:30 also
overlapped the 11:00–12:00 booking from step 3. That was my error, not the platform's; the
corrected range 10:15–10:45 isolates the baseline. Recorded so the failure is not mistaken
for a platform limitation.*

---

## C2 — Money and time columns

**Requirement (ADR-009, ADR-010):** `bigint` money in minor units; `timestamptz` instants
that round-trip through the API layer without timezone loss.

**Tested:** inserted `9007199254740993` (2⁵³+1, deliberately unrepresentable as an IEEE 754
double) and `2026-09-01T16:00:00+03:00`, then read back over SQL and over PostgREST.

**Observed:**

| Path | Value | Result |
|---|---|---|
| SQL, `amount_minor::text` | `9007199254740993` | exact |
| SQL via node-pg | `"9007199254740993"` (JS string) | exact — the driver does not coerce bigint to float |
| SQL, timestamptz | `2026-09-01T13:00:00.000Z` | instant preserved |
| **REST, `select=amount_minor`** | **`9007199254740992`** | **drifted by 1** |
| REST, `select=amount_minor::text` | `"9007199254740993"` | exact |
| REST, timestamptz | `2026-09-01T13:00:00+00:00` | instant preserved, no tz loss |

**Verdict: PARTIAL.** `timestamptz` is clean end to end. `bigint` is exact in the database
and over the Postgres driver, but PostgREST serialises it as a JSON number, so values above
2⁵³ silently lose precision. Casting to text at the API boundary restores exactness.

Practically this ceiling is 90 trillion shillings, so real money values are never near it —
but "practically safe" is not the same as safe, and the mitigation is one cast. The relevant
constraint for the build: **do not let bigint columns reach a JSON client uncast** if the
value can exceed 2⁵³.

---

## C3 — Scheduled work

**Requirement (ADR-012, ADR-007):** something must run the outbox worker and the
booking-expiry job. E11 was classified F on the assumption this might be external.

**Tested:** queried `pg_available_extensions`, installed, scheduled and unscheduled a job.

**Observed:**

| Extension | Default version | Install |
|---|---|---|
| `pg_cron` | 1.6.4 | succeeded |
| `pg_net` | 0.20.4 | succeeded |
| `pgmq` | 1.5.1 | available (not installed) |

`cron.schedule('spike-probe','*/5 * * * *','select 1')` returned jobid 1 and the row appeared
in `cron.job` as `active: true`. `cron.unschedule` cleaned up.

**Verdict: PASS.** In-database scheduling is available on this project. E11 does **not**
have to move to external infrastructure — `pg_cron` can drive both jobs, with `pg_net` for
outbound HTTP from the database and `pgmq` available if a real queue is wanted later.

---

## C4 — Storage

**Requirement (ADR-011):** two buckets with different access rules; payment proofs never
served from a guessable path; short-lived signed URLs.

**Tested:** created `spike-public` (public) and `spike-private` (private), uploaded one
object to each, then fetched with **no credentials at all**.

**Observed:**

| Check | Result |
|---|---|
| public object, unauthenticated GET | **200** — readable |
| private object at the equivalent public path, unauthenticated GET | **400** — not readable |
| signed URL (2s TTL), immediate GET | **200** |
| same signed URL after 5s | **400 `InvalidJWT` — `"exp" claim timestamp check failed`** |

**Verdict: PASS.** The two-bucket model in ADR-011 is directly supported, and signed-URL
expiry is enforced server-side by the storage service rather than by convention.

---

## C5 — Auth handoff (the integration risk)

**Requirement:** a session issued by Supabase Auth must be verifiable by a separate Node
service — fetching public keys, validating signature and claims — **without calling back to
Supabase on every request**.

**Tested:** created a user via the admin API, signed in to mint a real session, then verified
the token with `jose` alone against the published JWKS. No Supabase SDK in the verification
path.

**Observed:**

- JWT header: `{"alg":"ES256","kid":"14283d41-…","typ":"JWT"}` — **asymmetric**, not HS256.
- `GET /auth/v1/.well-known/jwks.json` → 200, one ES256 key.
- `jwtVerify` against the remote JWKS succeeded: `sub=7f24120c-…`, `role=authenticated`,
  `aud=authenticated`, `iss=https://<ref>.supabase.co/auth/v1`.
- Negative control: a token with three signature bytes altered was **rejected**.

**Verdict: PASS.** This was the largest integration unknown and it clears cleanly. Because
tokens are ES256 with a published JWKS, any service can verify locally with cached keys.
Had they been HS256 shared-secret tokens, independent verification would have required
distributing the signing secret — a materially worse posture.

---

## C6 — Realtime

**Requirement:** K31 (live calendar sync) depends on subscribing to booking changes.

**Tested:** added a table to the `supabase_realtime` publication, set `replica identity full`,
subscribed from a client, inserted a row out of band, waited for the event.

**Observed:** the first attempt **timed out with no event**. Diagnosis showed the publication
and replication slots were healthy (`wal2json` and `pgoutput` slots both `active: true`); the
fault was in the test — it inserted the row immediately on `SUBSCRIBED`, before the
subscription had settled. With a 2-second settle delay, **both anon and service_role clients
received the INSERT** with the full new row.

**Verdict: PASS**, with a caveat worth carrying into the build: there is a window after
`SUBSCRIBED` during which changes are missed. A live calendar must **fetch current state
after subscribing** rather than treating the subscription as the sole source of truth. That
is a design consequence for K31, discovered here rather than in production.

---

## C7 — RLS as defence in depth

**Requirement:** confirm the I3b conclusion that the API layer, not RLS, is the primary
enforcement point.

**Tested:** a table with RLS enabled, **no policies**, and `SELECT` granted to `anon`.

**Observed:**

| Caller | Result |
|---|---|
| anon key | 200, **0 rows** — blocked by RLS despite the grant |
| service_role key | 200, **2 rows** — bypasses RLS |
| anon, after adding a permissive policy | 200, 2 rows |

**Verdict: PASS.** RLS gates independently of table grants, and `service_role` bypasses it
entirely. This confirms the ADR-003 / I3b position: because our API layer will connect as
`service_role`, RLS cannot be the primary control — it is a backstop that catches anything
reaching the database on an anon or authenticated connection.

---

## Overall verdict

**Supabase satisfies K1.** All six capability requirements accepted across ADR-001 to ADR-012
are met, five cleanly and one with a known, cheap mitigation.

| # | Requirement | Source | Verdict |
|---|---|---|---|
| 1 | Time-range exclusion constraint with status predicate | ADR-007 | PASS |
| 2 | Single-layer `user → membership → business` scoping | ADR-003, I3b | PASS (C7) |
| 3 | `bigint` money column | ADR-009 | PARTIAL — cast to text at the JSON boundary |
| 4 | `timestamptz` with native range type | ADR-010 | PASS |
| 5 | Background worker for outbox and booking expiry | ADR-012, ADR-007 | PASS — `pg_cron` |
| 6 | Two buckets, differing access, on-demand signed URLs | ADR-011 | PASS |

**Nothing has to move elsewhere.** E11 in particular — "what runs the outbox worker" — was
classified F on the possibility that it needed external infrastructure. C3 shows it does not;
`pg_cron` is available and functional on this project, so E11 narrows from an
infrastructure-procurement question to a choice between in-database scheduling and an
external worker.

### Carried forward

1. **C2 mitigation is binding.** Any `bigint` that can exceed 2⁵³ must be cast to text before
   it reaches a JSON client. This belongs in the API contract decision (K4).
2. **K31 needs a fetch-after-subscribe step.** The realtime settle window is real.
3. **`replica identity full`** is required on any table whose realtime payloads need previous
   values — relevant if the calendar wants to diff status transitions.
4. **Free-tier caveat.** These results are from one project on its current plan. Availability
   of `pg_cron` was verified, not assumed, but plan changes could affect it.

### Cleanup

All spike objects removed from the project and verified: 0 `spike*` tables in `public`, the
`spike` schema dropped, the cron job unscheduled, both buckets emptied and deleted (0
remaining). `spikes/` and `.env*` are gitignored; the spike code is deleted with the
directory and only this file survives.

---

## Amendments

**2026-08-10 — the toolchain gaps recorded above are closed, and the spike project is gone.**

Per the amendment convention in `CLAUDE.md` §3, everything above this line stands as executed
and is not revised. This section records only what has changed since.

**Toolchain.** The Toolchain table above records "No Docker, no Supabase CLI", correctly: this
spike ran against a hosted project and needed neither. Both are now installed, Docker on the
WSL2 backend ADR-022 requires. `psql` is still absent, and still not a blocker, for the reason
given above. Current versions are in `docs/ENVIRONMENT.md` §2 — not repeated here, so that
this entry cannot go stale.

**The spike project has been deleted.** `iohxfurykkocqfagdkzy`, the hosted project every
verdict above was executed against, no longer exists — confirmed against the account, not
merely reported. ADR-023 required this.

Two consequences follow:

1. **The verdicts are no longer re-runnable as written.** Every command above targeted that
   project. Re-verifying any of them means pointing at the local stack or a new hosted
   project. The verdicts stand; the environment that produced them does not.
2. **Deleting the project did not, on its own, retire the credential.** ADR-023 expected it
   would — that is the "retired rather than rotated, which is stronger" argument. That
   argument holds only for a credential the platform generated for that project alone, and
   this was not one. See the entry below.

**2026-08-10 — the plaintext credential in the Credential note is redacted.**

Three facts, recorded rather than quietly erased:

1. **A credential was committed.** The Credential note above carried a working database
   password in plaintext, in a tracked file, from this spike's first commit until now. That
   is a defect regardless of what the credential opened. `CLAUDE.md` §5 now states the rule it
   broke.
2. **It was a reused password, not a project-scoped one, and it has been rotated.** The value
   was not generated by Supabase for `iohxfurykkocqfagdkzy`; it was a password already in use
   on other accounts, supplied to the spike. **Deleting the project therefore did not retire
   it** — it stayed live everywhere else it had been reused, and stayed live in this file, for
   as long as it took to notice. It was **rotated on discovery**. That rotation, not the
   project deletion, is what made the committed value inert.
3. **It remains in git history before this commit.** Redacting the file changes the current
   tree, not the past; anyone with a clone can still recover the value from an earlier
   revision. **History was left unrewritten only because rotation had already made the value
   inert** — the order matters, and it is the order that was followed here: rotate first, then
   decide what to do about history. **A live credential is never handled this way.** Had the
   password still been in use anywhere, redacting the current tree would have been theatre,
   and the rewrite would not have been optional.

The observation the note actually records — that the supplied `SUPABASE_DB_URL` was
unparseable because of paste-artifact spaces in the userinfo section — is a real finding and
is unchanged. Only the value is gone.

**Carried-forward item 4** ("these results are from one project on its current plan") is
therefore sharper than when written: the next environments are a local Docker stack and two
hosted projects that do not exist yet. `pg_cron` availability was verified on the deleted
project and should be re-checked on staging before anything depends on it.
