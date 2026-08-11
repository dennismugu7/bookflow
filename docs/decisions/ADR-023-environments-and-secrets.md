# ADR-023 — Environments and secrets

**Status:** Accepted

## Context

The project manual's Phase 2 requires environments and a secrets strategy "before any feature
needs a secret." Neither existed. One hosted Supabase project had ever been used — the one
spike 001 ran against — and nothing said whether staging and production were separate
projects, separate schemas, or undecided.

The spike also put real credentials on a development machine and into a conversation
transcript. That is acceptable for a throwaway project and unacceptable for anything else,
which makes the boundary worth stating rather than assuming.

## Decision

**Three environments.**

- **Local** — the Docker Supabase stack (ADR-022).
- **Staging** — a hosted Supabase project.
- **Production** — a second, separate hosted Supabase project.

Two hosted projects is also exactly the free tier's allowance, which local-first development
makes affordable: not consuming a slot for development is what leaves both remote slots for
the environments that need them.

**The `bookflow-spike` project from spike 001 is none of these and is to be deleted.**

**Local secrets live in `.env`, gitignored.** A **committed `.env.example`** lists every
variable name with its shape and where to obtain it, and **never a value**.

**Staging and production secrets live in Fly.io secrets and GitHub Actions encrypted
secrets.**

**No production credential is ever placed on a development machine. Staging is the environment
used for debugging.**

## Consequences

- The spike project holds credentials that appeared in plaintext in a session transcript.
  Deleting it retires them rather than rotating them, which is stronger.
- `.env.example` is the answer to "what variables does this need" — a question the handoff
  review found unanswerable. It is a committed file, so it stays current with the code that
  reads it.
- Debugging against staging rather than production means a production incident is reproduced,
  not poked at. It also means staging must carry realistic data, which is what ADR-026's seed
  script is for.
- Two hosted projects means schema changes are applied twice, and staging is the rehearsal.
  A migration that has not run against staging has not been tested.
- If the free tier's allowance changes, this decision needs revisiting — the environment
  count is a product of what is affordable, not of what is architecturally ideal.

## Items resolved

None in the triage. Settles the environments and secrets strategy the project manual's
Phase 2 requires.

## Items created

None.

## Amendments

**2026-08-11 — `APP_ENV`, not `NODE_ENV`, is the environment discriminator.**

This ADR names three environments — local, staging, production — without naming the variable
that carries which one a process is in. The obvious choice was `NODE_ENV`, and it does not work.

**`NODE_ENV` belongs to the JavaScript tooling, which writes to it unasked.** Vitest sets it to
`test` if it is unset, and bundlers set it to `production`. The first integration run against
the real stack failed on exactly this: the config module rejected `NODE_ENV=test` because
`test` is not one of this ADR's three environments, and the value had been overwritten by the
test runner after `.env` was loaded.

A test runner silently reclassifying which environment a process believes it is in is not a
risk this ADR can carry, given its central rule is that **no production credential is ever
placed on a development machine**. That rule is only as good as the process's belief about
where it is running.

**`APP_ENV` is therefore the discriminator**, validated in `apps/api/src/platform/config.ts`
against exactly `local | staging | production`, and documented in `.env.example`. `NODE_ENV` is
left to the tooling that owns it and is not read by this project.

**2026-08-11 — staging's mail sender, per ADR-027.**

ADR-027 routes auth email through Supabase Auth rather than the ADR-012 outbox. Staging
therefore sends through **Supabase's built-in SMTP**, which is rate-limited, shared, and
documented by Supabase as unsuitable for production.

That is acceptable for an environment only this project uses. **The trigger for provisioning a
custom SMTP provider — and with it the sending domain and the E1/E2 deliverability work — is
before any real owner signs up.** Not before staging works and not before the first deploy;
before a person outside the project receives email from this system.
