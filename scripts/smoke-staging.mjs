/**
 * Staging smoke test — asserts the DEPLOYED service, over the public internet.
 *
 * `DEFINITION_OF_DONE.md` requires "deployed to staging and smoke-tested there,
 * not only locally". This is that. It runs in CI after `deploy-staging`, and it
 * is the only check in the pipeline that exercises the deployed artefact rather
 * than the source it was built from.
 *
 * ══ WHAT THIS IS NOT ════════════════════════════════════════════════════════
 *
 * **This is not the e2e test.** ADR-033 is explicit: the e2e requirement is
 * satisfied by Flutter's `integration_test` driving a real build, "and nothing
 * else. An API integration test is not an e2e test, however end-to-end it
 * feels." This is an API-level smoke test and the box it ticks is the staging
 * one. See `docs/analysis/09-phase3-close.md` for why the e2e box does not tick
 * in Phase 3.
 *
 * ══ NO CREDENTIALS ══════════════════════════════════════════════════════════
 *
 * Every assertion below uses PUBLIC endpoints. That is deliberate: giving CI a
 * staging `service_role` key — which bypasses RLS entirely (spike 001/C7) — to
 * make a smoke test slightly richer would be a poor trade, and the public
 * surface turns out to be enough to prove the database is reachable (see the
 * last assertion).
 */

const BASE =
  process.env.STAGING_BASE_URL ??
  'https://bookflow-api-staging-gabm.onrender.com';

let failures = 0;

function check(ok, label, detail = '') {
  console.log(
    `${ok ? 'ok  ' : 'FAIL'}  ${label}${detail ? '  — ' + detail : ''}`,
  );
  if (!ok) failures += 1;
}

async function get(path, init) {
  // Generous: the free instance sleeps after 15 minutes and takes about a
  // minute to wake, so the first request of a run pays a cold start. A timeout
  // shorter than that would make this test fail for the tier working exactly as
  // documented.
  const response = await fetch(`${BASE}${path}`, {
    ...init,
    signal: AbortSignal.timeout(120_000),
  });
  const text = await response.text();
  let json;
  try {
    json = text === '' ? undefined : JSON.parse(text);
  } catch {
    json = undefined;
  }
  return { status: response.status, headers: response.headers, json, text };
}

console.log(`smoke: ${BASE}`);
console.log('');

// ── 1. The service is up and is our build ───────────────────────────────────
const health = await get('/health');
check(health.status === 200, 'GET /health is 200', `HTTP ${health.status}`);
check(
  health.json?.status === 'ok',
  'GET /health returns the contract body',
  JSON.stringify(health.json),
);

// ── 2. Default-deny survived the deploy ─────────────────────────────────────
//
// The single most important property to re-check on a deployed artefact: a
// build or configuration mistake that disabled the auth hook would leave every
// owner-scoped route open, and nothing else in the pipeline looks at the
// running service.
const me = await get('/v1/me');
check(
  me.status === 401,
  'GET /v1/me without a token is 401',
  `HTTP ${me.status}`,
);
check(
  me.headers.get('content-type')?.includes('application/problem+json') === true,
  'and answers RFC 9457 (ADR-014)',
  me.headers.get('content-type') ?? '(none)',
);
check(
  me.json?.type === '/problems/missing-token',
  'with the missing-token slug',
  String(me.json?.type),
);

const business = await get(
  '/v1/businesses/00000000-0000-4000-8000-000000000002',
);
check(
  business.status === 401,
  'GET /v1/businesses/:id without a token is 401',
  `HTTP ${business.status}`,
);

// Authentication is checked before the shape of the input: a malformed id must
// not be a way to learn anything without a token.
const malformedUnauthed = await get('/v1/businesses/not-a-uuid');
check(
  malformedUnauthed.status === 401,
  'a malformed id without a token is 401, not 400',
  `HTTP ${malformedUnauthed.status}`,
);

// ── 3. The error contract holds on the deployed build ───────────────────────
const badBody = await get('/v1/auth/signup', {
  method: 'POST',
  headers: { 'content-type': 'application/json' },
  body: JSON.stringify({}),
});
check(
  badBody.status === 400,
  'POST /v1/auth/signup with an empty body is 400',
  `HTTP ${badBody.status}`,
);
check(
  badBody.json?.type === '/problems/validation-failed',
  'with the validation-failed slug',
  String(badBody.json?.type),
);

// ── 4. The database is reachable from the deployed service ──────────────────
//
// This is the assertion that costs nothing and proves the most, and it is worth
// understanding why it is shaped this way.
//
// A real sign-up against staging runs: breach check → GoTrue admin create →
// **INSERT into user_profiles on staging Postgres** → GoTrue resend. Staging's
// sender is Resend's test address, which delivers only to the account owner's
// own inbox, so `resend` fails for any other address and the endpoint
// compensates — deleting both rows and answering 503 `auth-unavailable`.
//
// **A 503 therefore proves the database write succeeded.** If Postgres were
// unreachable the profile insert would fail first, and the endpoint would
// answer 500 `internal-error` instead. So this distinguishes "the mail failed"
// from "the database failed" using nothing but a public endpoint, and it leaves
// no rows behind because the compensation removes them.
//
// **If this ever returns 202**, staging's sender has been changed to one that
// can deliver to arbitrary addresses. That is good news and it breaks this
// assertion: the run will have left a real user and profile in staging. Clean
// them up and rewrite this check — see docs/analysis/09-phase3-close.md.
const probeEmail = `smoke-${crypto.randomUUID()}@bookflow.test`;
const signup = await get('/v1/auth/signup', {
  method: 'POST',
  headers: { 'content-type': 'application/json' },
  body: JSON.stringify({
    email: probeEmail,
    password: `Smoke-${crypto.randomUUID()}`,
    firstName: 'Smoke',
    lastName: 'Probe',
  }),
});

if (signup.status === 202) {
  // ── THE PREMISE DIED, AND THIS SAYS SO ────────────────────────────────────
  //
  // This assertion proves the database is reachable via a 503 that exists ONLY
  // because staging's mailer is broken for every address but one (E14). That
  // coupling is acceptable exactly as long as the test announces it when the
  // coupling breaks — a check whose premise has quietly evaporated is worse
  // than no check, because it still reports green.
  //
  // So: **fail**, name the cause rather than the symptom, and name the row that
  // was left behind so it can actually be removed. A message that says "clean
  // up" without saying what to clean up is an instruction nobody can follow.
  check(
    false,
    'PREMISE GONE: staging’s sender now delivers to arbitrary recipients, so sign-up SUCCEEDS',
    `this assertion inferred a working database from a FAILING mailer, and the mailer no longer fails — ` +
      `it must be rewritten to prove database reachability some other way. ` +
      `This run also created a real account that compensation did NOT remove: ` +
      `delete the auth.users row for ${probeEmail} (its user_profiles row cascades). ` +
      `Context: E14 in docs/analysis/05-triage.md and docs/analysis/09-phase3-close.md §3`,
  );
} else {
  // Status AND body together, in ONE assertion, deliberately.
  //
  // These were two checks until a red-proof run caught the flaw: with the
  // service suspended, Render's own edge answers **503** to everything, and a
  // status-only check reported "the database is reachable" for a service that
  // was not running at all. The problem document is what distinguishes our 503
  // from the platform's — the platform does not emit RFC 9457 — so the two
  // conditions have to pass or fail as one thing.
  check(
    signup.status === 503 && signup.json?.type === '/problems/auth-unavailable',
    'a real sign-up reaches the database and compensates',
    `HTTP ${signup.status} type=${String(signup.json?.type)} — 500 would mean the DATABASE failed rather than the mailer, and a 503 without our problem document means the SERVICE is down`,
  );
}

console.log('');
if (failures > 0) {
  console.error(`SMOKE FAILED — ${failures} assertion(s)`);
  process.exit(1);
}
console.log('smoke passed');
