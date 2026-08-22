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
 * ══ NO PRIVILEGED CREDENTIALS ═══════════════════════════════════════════════
 *
 * Every assertion below uses PUBLIC endpoints, plus — in section 5 — the
 * staging ANON key, which is a published client credential: it ships inside the
 * Flutter app and inside the browser bundle, and holding it grants exactly what
 * any user of the product already has.
 *
 * What this script still refuses is a staging `service_role` key, which
 * bypasses RLS entirely (spike 001/C7). Making a smoke test slightly richer is
 * not worth putting that in CI, and the surface reachable without it turns out
 * to be enough — to prove the database is reachable (section 4) and to prove
 * both storage buckets exist with the right visibility (section 5).
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

// ── 5. ADR-011's buckets exist on the deployed environment ──────────────────
//
// ══ WHY THIS SECTION EXISTS ═════════════════════════════════════════════════
//
// Every image path was broken on staging from the day the media endpoints
// merged until a human opened the Supabase dashboard — because the buckets had
// never been created there. **Eight green jobs certified a dead feature.** CI
// excluded `storage-api` from the local stack, every storage test used a fake,
// and a fake is exactly as green when the real bucket does not exist.
//
// `apps/api/src/platform/storage.integration.test.ts` now round-trips real
// bytes and closes that hole for the LOCAL stack. This closes it for the
// DEPLOYED one, which is a different environment configured by a different
// hand: `supabase/config.toml` provisions local, and staging is still
// configured in the dashboard (docs/ENVIRONMENT.md). Nothing but this section
// compares the two.
//
// ── WHAT THIS IS NOT, STATED PLAINLY ───────────────────────────────────────
//
// **It is not a byte round-trip.** A write to either bucket needs a
// `service_role` key, which the header above refuses to put in CI, or an owner
// session with a business — and staging's e2e account is deliberately cleared
// of its business before every run, so a smoke test depending on one would be
// asserting another job's leftovers.
//
// What it does instead is separate the four ways a bucket can be wrong, using
// only the anon key. The distinction Storage hands us is precise, and it is
// worth writing down because it is not obvious and it is what these assertions
// key on. **Every one of these is HTTP 400** — Storage puts the real status in
// the body — so the `code` field is the signal and the status is not:
//
//   with the anon key, GET /object/{bucket}/{key}   → bucket exists?
//        NoSuchKey    the bucket is there, that object is not  ✅
//        NoSuchBucket the bucket is not there                  ❌
//
//   with NO credential, GET /object/public/{bucket}/{key}  → bucket is public?
//        NoSuchKey    the bucket is public
//        NoSuchBucket the bucket is private *or absent*
//
// The second probe alone cannot tell private from missing, which is exactly why
// both run: existence comes from the first, visibility from the second.
const SUPABASE_URL = process.env.STAGING_SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.STAGING_SUPABASE_ANON_KEY;

// ── MISSING CONFIGURATION FAILS; IT DOES NOT SKIP ──────────────────────────
//
// A skip here would reproduce the original defect in a new place: the job would
// stay green while proving nothing, and the reason would be invisible. The
// general rule this whole change enforces — an exclusion justified by "not
// exercised yet" needs something that fails when that stops being true — is
// worth nothing if the check quietly opts itself out.
if (
  SUPABASE_URL === undefined ||
  SUPABASE_URL === '' ||
  SUPABASE_ANON_KEY === undefined ||
  SUPABASE_ANON_KEY === ''
) {
  check(
    false,
    'the storage probe is configured',
    'STAGING_SUPABASE_URL and STAGING_SUPABASE_ANON_KEY must both be set — ' +
      'see docs/ENVIRONMENT.md §3. This assertion FAILS rather than skipping ' +
      'on purpose: an unconfigured storage check that reports green is the ' +
      'exact failure this section was added to end',
  );
} else {
  /** One probe: the `code` Storage returns, or a description of why not. */
  async function probeOnce(path, headers) {
    // A key nobody will ever have uploaded, so the answer is always about the
    // BUCKET rather than about an object. Nothing is written by any of this.
    const response = await fetch(`${SUPABASE_URL}/storage/v1${path}`, {
      headers,
      signal: AbortSignal.timeout(30_000),
    });
    const text = await response.text();
    try {
      return String(JSON.parse(text).code ?? '(none)');
    } catch {
      return `(unparseable: HTTP ${response.status})`;
    }
  }

  // ── WHY THREE PROBES THAT MUST AGREE ───────────────────────────────────────
  //
  // Measured while writing this, against the self-hosted `storage-api` image
  // the CI stack runs: on the `/object/public/…` path, over 20 rounds, a
  // PRIVATE bucket answered `NoSuchKey` 5 times out of 20, and a bucket that
  // did not exist at all answered `NoSuchKey` 3 times out of 20. The same
  // request, back to back, returns different codes — there is a bucket-metadata
  // cache in there that a neighbouring request can pollute.
  //
  // The hosted Storage this script actually talks to did NOT reproduce it:
  // 12 rounds, three buckets, 36/36 consistent. So this could be written as a
  // single fetch and would pass.
  //
  // It is not, because the assertion below decides whether clients' payment
  // screenshots are world-readable, and one cache race between that question
  // and its answer is too thin a margin. Three probes, and they must AGREE:
  // disagreement is reported as its own failure naming the cache rather than
  // the bucket, so if hosted Storage ever starts behaving like the local image
  // the message says so instead of blaming a bucket that is fine.
  async function storageCode(path, headers) {
    const seen = new Set();
    for (let attempt = 0; attempt < 3; attempt += 1) {
      seen.add(await probeOnce(path, headers));
    }
    return seen.size === 1
      ? [...seen][0]
      : `INCONSISTENT(${[...seen].sort().join('|')})`;
  }

  /**
   * What a failing code means. Disagreement between probes is its own cause and
   * must not be reported as the bucket being wrong.
   */
  function because(code, meaning) {
    return code.startsWith('INCONSISTENT')
      ? `${code} — Storage gave DIFFERENT answers to the same probe. That is the bucket-metadata cache, not the bucket; see the note above this check`
      : `${code} — ${meaning}`;
  }

  const probeKey = `smoke/${crypto.randomUUID()}.png`;
  const withAnon = {
    apikey: SUPABASE_ANON_KEY,
    authorization: `Bearer ${SUPABASE_ANON_KEY}`,
  };

  for (const bucket of ['public-media', 'private-media']) {
    const code = await storageCode(`/object/${bucket}/${probeKey}`, withAnon);
    check(
      code === 'NoSuchKey',
      `the ${bucket} bucket exists on staging`,
      because(code, 'NoSuchBucket means it was never created there (ADR-011)'),
    );
  }

  // A banner is fetched by a stranger's browser with no token at all. If this
  // is not public, every image on every published booking page is a 400.
  const publicVisibility = await storageCode(
    `/object/public/public-media/${probeKey}`,
    undefined,
  );
  check(
    publicVisibility === 'NoSuchKey',
    'public-media serves anonymously',
    because(
      publicVisibility,
      'NoSuchBucket here means it is private or absent, and every image on every published booking page is a 400',
    ),
  );

  // ══ THE ONE THAT WOULD BE A BREACH ═════════════════════════════════════════
  //
  // `private-media` holds clients' M-Pesa screenshots. Public is one toggle in
  // the dashboard, and if it were flipped every proof would be world-readable
  // at a guessable path, the API would keep signing URLs that work, and **every
  // other assertion in this file would still pass.**
  const privateVisibility = await storageCode(
    `/object/public/private-media/${probeKey}`,
    undefined,
  );
  check(
    privateVisibility === 'NoSuchBucket',
    'private-media does NOT serve anonymously',
    because(
      privateVisibility,
      'NoSuchKey means the bucket is PUBLIC and every payment proof on staging is readable by anyone (ADR-011)',
    ),
  );

  // Writes come through our API or not at all. The anon key is in the Flutter
  // app and in every browser that loads a booking page; a storage policy that
  // let it write would let any visitor put objects in either bucket.
  for (const bucket of ['public-media', 'private-media']) {
    const response = await fetch(
      `${SUPABASE_URL}/storage/v1/object/${bucket}/${probeKey}`,
      {
        method: 'POST',
        headers: { ...withAnon, 'content-type': 'image/png' },
        // Eight bytes that begin as a PNG does, so a rejection is about the
        // credential and not about the content.
        body: new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
        signal: AbortSignal.timeout(30_000),
      },
    );
    check(
      response.status >= 400,
      `an anonymous client cannot write to ${bucket}`,
      `HTTP ${response.status} — a 200 means this run just uploaded ${probeKey} and anyone can do the same`,
    );
  }
}

console.log('');
if (failures > 0) {
  console.error(`SMOKE FAILED — ${failures} assertion(s)`);
  process.exit(1);
}
console.log('smoke passed');
