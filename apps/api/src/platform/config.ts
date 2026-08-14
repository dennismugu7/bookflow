import { z } from 'zod';

/**
 * Environment configuration: declared once, validated once, fail-fast.
 *
 * Every variable in `.env.example` appears here. That file is the human
 * documentation — name, shape, where to obtain it — and this is the machine
 * enforcement of the same list (ADR-023). If they disagree, one of them is
 * wrong and it is usually this one.
 *
 * NOTHING IN HERE EVER PRINTS A VALUE. Half these variables are credentials,
 * and a validation error is exactly the moment a careless implementation
 * echoes one into a log aggregator. `describeIssue` below is built from the
 * issue *code* and the *schema's* expectations, never from the input — which
 * is why it does not simply forward Zod's own messages: Zod reports the
 * received value for enum and literal mismatches.
 */

const nonEmpty = z.string().trim().min(1);

export const configSchema = z.object({
  // ─── API process ───────────────────────────────────────────────────────────
  // APP_ENV, not NODE_ENV. ADR-023's three environments are ours; NODE_ENV
  // belongs to the JavaScript tooling, which writes to it without asking —
  // Vitest forces it to `test`, bundlers force it to `production`. Overloading
  // it would mean the test runner silently reclassifying which environment the
  // process believes it is in, which is exactly the confusion ADR-023's
  // "no production credential on a development machine" rule cannot afford.
  APP_ENV: z.enum(['local', 'staging', 'production']),
  PORT: z.coerce.number().int().min(1).max(65535).default(3000),
  HOST: nonEmpty.default('0.0.0.0'),

  // ─── Database ──────────────────────────────────────────────────────────────
  // The APPLICATION's connection, as the `bookflow_api` role (ADR-038) — CRUD,
  // no DDL, no ownership. Nothing in the application connects as `postgres`, in
  // any environment. Required: the API cannot do anything useful without it, so
  // failing at startup beats failing on the first request.
  DATABASE_URL: nonEmpty.startsWith('postgres'),

  // A PRIVILEGED connection, as `postgres`. Used by tooling only — the
  // integration test harness, which creates `auth.users` rows and switches
  // roles, and `npm run db:types`, which introspects. **The API never reads
  // this.** Optional, because a deployed API has no business holding it: it is
  // absent in staging and production by design, and its absence there is the
  // point rather than an oversight.
  ADMIN_DATABASE_URL: nonEmpty.startsWith('postgres').optional(),

  // ─── Supabase ──────────────────────────────────────────────────────────────
  // REQUIRED as of the auth slice. Both the JWKS URI and the expected `iss`
  // are derived from it (`jwt.ts`), so a wrong value does not degrade
  // authentication — it disables it, loudly, at startup. The issuer check is
  // what stops a token minted by a different Supabase project authenticating
  // here, and it is only as good as this value.
  SUPABASE_URL: z.url(),

  // The expected `aud`. GoTrue issues `authenticated` for a signed-in user;
  // the publishable anon key carries a different audience, which is what stops
  // it being presented as a session.
  SUPABASE_JWT_AUDIENCE: nonEmpty.default('authenticated'),

  // Both REQUIRED as of the mediated sign-up slice (ADR-037), where they stop
  // being optional extras and become the credentials the endpoint cannot work
  // without. The service-role key creates and deletes users; the anon key sends
  // the activation email through the public `/resend` endpoint, which is the
  // credential spike 002 verified that call with (L6).
  //
  // Required rather than checked at call time, so a misconfigured deployment
  // fails at startup instead of on a user's first sign-up — the compensating
  // delete needs the service-role key too, and discovering it is missing
  // halfway through the flow is how an orphan gets made.
  SUPABASE_ANON_KEY: nonEmpty,
  SUPABASE_SERVICE_ROLE_KEY: nonEmpty,

  // ─── Not yet decided ───────────────────────────────────────────────────────
  // Blocked on E1/E2 in docs/analysis/05-triage.md, both S, both answered in
  // the auth slice's Phase 0. Optional until then.
  MAIL_PROVIDER_API_KEY: nonEmpty.optional(),
  MAIL_FROM_ADDRESS: z.email().optional(),
  PUBLIC_WEB_ORIGIN: z.url().optional(),
});

export type Config = z.infer<typeof configSchema>;

export class ConfigError extends Error {
  readonly problems: readonly string[];

  constructor(problems: readonly string[]) {
    super(
      [
        'Invalid environment configuration:',
        ...problems.map((problem) => `  - ${problem}`),
        '',
        'See .env.example for every variable, its shape, and where to obtain it.',
        'Only variable names are shown above — never their values, by design.',
      ].join('\n'),
    );
    this.name = 'ConfigError';
    this.problems = problems;
  }
}

type Issue = z.core.$ZodIssue;

/**
 * Turns one Zod issue into a human sentence using only the issue code and the
 * schema's own expectations. Never the received value.
 */
function describeIssue(issue: Issue): string {
  switch (issue.code) {
    case 'invalid_type':
      // `issue.input` is compared, never interpolated.
      return issue.input === undefined
        ? 'is required but is not set'
        : `must be of type ${issue.expected}`;
    case 'invalid_value':
      return `must be one of: ${issue.values.map((value) => String(value)).join(', ')}`;
    case 'too_small':
      return 'must not be empty';
    case 'too_big':
      return 'is out of the allowed range';
    case 'invalid_format':
      return `must be a valid ${issue.format}`;
    default:
      return 'is invalid';
  }
}

function variableName(issue: Issue): string {
  const [first] = issue.path;
  return typeof first === 'string' ? first : '(unknown variable)';
}

/**
 * An empty environment variable is not a value. Copying `.env.example` to
 * `.env` leaves every variable set to the empty string, and treating those as
 * present would turn "you forgot to fill this in" into a confusing type error
 * — or worse, an empty password silently accepted.
 */
function withoutBlanks(
  env: Record<string, string | undefined>,
): Record<string, string> {
  return Object.fromEntries(
    Object.entries(env).filter(
      (entry): entry is [string, string] =>
        entry[1] !== undefined && entry[1].trim() !== '',
    ),
  );
}

/**
 * Parses configuration from a given environment. Pure — takes the environment
 * as an argument so it is testable without touching `process.env`.
 *
 * @throws ConfigError listing every problem at once, by variable name.
 */
export function loadConfig(
  env: Record<string, string | undefined> = process.env,
): Config {
  const result = configSchema.safeParse(withoutBlanks(env));

  if (!result.success) {
    const problems = result.error.issues
      .map((issue) => `${variableName(issue)} ${describeIssue(issue)}`)
      .sort((a, b) => a.localeCompare(b));
    throw new ConfigError([...new Set(problems)]);
  }

  return result.data;
}

let cached: Config | undefined;

/**
 * The process-wide configuration, parsed on first use and reused thereafter.
 * "Parsed once at startup" in practice: `server.ts` calls this before building
 * anything, so an invalid environment fails before a port is bound.
 */
export function getConfig(): Config {
  cached ??= loadConfig();
  return cached;
}

/** Test seam. Not for production code. */
export function resetConfigForTesting(): void {
  cached = undefined;
}
