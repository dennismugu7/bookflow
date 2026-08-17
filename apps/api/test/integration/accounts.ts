import { randomUUID } from 'node:crypto';
import { sql } from 'kysely';

import type { IntegrationContext } from './harness.ts';

/**
 * Account fixtures for the business-setup slice.
 *
 * ══ WHY THESE ARE HELPERS AND NOT SEED ROWS ═════════════════════════════════
 *
 * `supabase/seed.sql` seeds one owner who already has a business, at fixed ids,
 * for hand-testing the app locally. It is deliberately left alone: it is a demo
 * state, and a demo state cannot also be a test fixture without every test
 * inheriting whatever the demo happens to need next.
 *
 * These build inside the caller's transaction and vanish with the rollback, so
 * a test states the account shape it needs and nothing leaks to the next one.
 * Ids are random rather than fixed: integration files run in parallel against
 * one database, and two files choosing the same constant would contend across
 * transactions rather than within one — the failure A14 describes for the
 * booking slice, avoided here by construction.
 *
 * ── WHAT RUNS AS WHICH ROLE, AND WHY IT MATTERS ─────────────────────────────
 *
 * `auth.users` is written through `asAdmin`: the migration grants the
 * application role nothing on the `auth` schema, and ADR-037 has the API create
 * users through GoTrue's admin API over HTTP. A fixture may write that table;
 * the application may not.
 *
 * **Everything in `public` is written as the application role, deliberately.**
 * `user_profiles`, `businesses` and `memberships` are inserted through `ctx.db`,
 * which the harness has already set to `bookflow_api`. Nothing in `apps/api`
 * has ever inserted into `businesses` or `memberships`, so those grants have
 * never been exercised by any code path. Building fixtures under that role
 * exercises them on every run, and a missing grant fails here — in seconds,
 * locally — rather than in `migrate-staging`.
 */

export interface Account {
  readonly userId: string;
  readonly email: string;
}

export interface AccountWithBusiness extends Account {
  readonly businessId: string;
  readonly membershipId: string;
  readonly businessName: string;
}

/** A `auth.users` row plus the `user_profiles` row ADR-037 pairs with it. */
async function makeUser(
  ctx: IntegrationContext,
  email: string,
): Promise<string> {
  const userId = randomUUID();

  await ctx.asAdmin(async () => {
    await sql`
      insert into auth.users (instance_id, id, aud, role, email, created_at, updated_at)
      values ('00000000-0000-0000-0000-000000000000', ${userId}::uuid,
              'authenticated', 'authenticated', ${email}, now(), now())
    `.execute(ctx.db);
  });

  // As the application role — this is the one profile insert the API already
  // performs at sign-up, so the grant behind it is known to work.
  await sql`
    insert into public.user_profiles (id, first_name, last_name, terms_version, terms_accepted_at)
    values (${userId}::uuid, 'Fixture', 'Owner', 'test-terms-v1', now())
  `.execute(ctx.db);

  return userId;
}

/**
 * An account that exists, can be scoped, and owns nothing.
 *
 * The state every creation criterion starts from, and the one `seed.sql`'s
 * owner cannot represent.
 */
export async function accountWithoutBusiness(
  ctx: IntegrationContext,
): Promise<Account> {
  const email = `no-business-${randomUUID()}@bookflow.test`;
  return { userId: await makeUser(ctx, email), email };
}

/** An account owning exactly one business, through one `owner` membership. */
export async function accountWithBusiness(
  ctx: IntegrationContext,
  businessName = 'Fixture Salon',
): Promise<AccountWithBusiness> {
  const email = `owner-${randomUUID()}@bookflow.test`;
  const userId = await makeUser(ctx, email);

  const business = await sql<{ id: string }>`
    insert into public.businesses (name) values (${businessName}) returning id
  `.execute(ctx.db);
  const businessId = business.rows[0]?.id;
  if (businessId === undefined) {
    throw new Error('fixture: no business id returned');
  }

  // `role` is left to its default. `ck_memberships_role` permits only 'owner'
  // today, so naming it here would imply a choice the schema does not offer.
  const membership = await sql<{ id: string }>`
    insert into public.memberships (user_id, business_id)
    values (${userId}::uuid, ${businessId}::uuid) returning id
  `.execute(ctx.db);
  const membershipId = membership.rows[0]?.id;
  if (membershipId === undefined) {
    throw new Error('fixture: no membership id returned');
  }

  return { userId, email, businessId, membershipId, businessName };
}

/**
 * A second account owning its own business, asserted to share nothing with
 * `existing`.
 *
 * For the not-yours cases (criteria 20, 21) and the two-accounts-same-name case
 * (criterion 51). It is `accountWithBusiness` plus the assertion, and the
 * assertion is the reason it exists: "unrelated" is the property those criteria
 * turn on, and a fixture that quietly returned the same account would make them
 * pass while testing nothing.
 */
export async function unrelatedAccountWithBusiness(
  ctx: IntegrationContext,
  existing: Account,
  businessName = 'Other Fixture Salon',
): Promise<AccountWithBusiness> {
  const created = await accountWithBusiness(ctx, businessName);

  if (created.userId === existing.userId) {
    throw new Error(
      'fixture: unrelated account collided with the existing one',
    );
  }
  if (created.email === existing.email) {
    throw new Error('fixture: unrelated account reused the existing email');
  }

  return created;
}
