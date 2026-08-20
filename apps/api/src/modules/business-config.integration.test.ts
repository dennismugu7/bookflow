import { sql } from 'kysely';
import { describe, expect, it } from 'vitest';

import {
  accountWithBusiness,
  unrelatedAccountWithBusiness,
  type AccountWithBusiness,
} from '../../test/integration/accounts.ts';
import { useTransaction } from '../../test/integration/harness.ts';
import { ProblemError } from '../platform/problem.ts';
import {
  addService,
  editService,
  removeService,
} from './services/services.service.ts';
import { getOpeningHours, setOpeningHours } from './hours/hours.service.ts';
import { publishMyBusiness, slugify } from './publishing/publishing.service.ts';
import { findPublishedSalon } from './public/public.repository.ts';

/**
 * The four things in this feature that a reading cannot settle.
 *
 * ══ WHY THESE FOUR AND NOT A SUITE PER ENDPOINT ═════════════════════════════
 *
 * Most of what was built is a CRUD shape repeated four times, and a test that
 * inserts a row then reads it back proves the row round-trips. These are the
 * places where the obvious implementation is wrong and the wrong one looks
 * right:
 *
 *   1. the week replace, which fights a unique index if the CTEs run in the
 *      wrong order — and CTE order is unspecified, so it would pass in testing
 *   2. publishing, which mints a permanent public address and must not mint two
 *   3. the public projection, which is the one place a leak is invisible
 *      because nobody is authenticated to notice
 *   4. cross-tenant scoping, which every single-account test passes
 *
 * Driven through the SERVICE layer rather than through HTTP: the routes add
 * parsing and nothing else, and `businesses.routes.integration.test.ts` already
 * covers the HTTP path for this module's shape.
 */

const ctx = useTransaction();

const MONDAY = 0;
const TUESDAY = 1;

async function serviced(owner: AccountWithBusiness): Promise<void> {
  await addService(
    ctx.db,
    { userId: owner.userId },
    {
      name: 'Silk press',
      durationMinutes: 90,
      priceKes: 2500,
      position: undefined,
    },
  );
}

describe('replacing the week', () => {
  it('rewrites a day that already exists — the case a delete-then-insert loses to the unique index', async () => {
    const owner = await accountWithBusiness(ctx);
    const scope = { userId: owner.userId };

    await setOpeningHours(ctx.db, scope, [
      { dayOfWeek: MONDAY, openTime: '09:00', closeTime: '17:00' },
    ]);

    // ── THE ASSERTION THIS FILE EXISTS FOR ──────────────────────────────────
    //
    // Monday is present in both the old week and the new one. A naive
    // "delete everything, then insert everything" inside one statement can
    // have the insert run first, and `uq_opening_hours_business_day` then
    // refuses the new Monday against the old one that has not been deleted
    // yet. The disjoint delete/upsert shape in the repository is what makes
    // this pass regardless of the order PostgreSQL chooses.
    const stored = await setOpeningHours(ctx.db, scope, [
      { dayOfWeek: MONDAY, openTime: '10:00', closeTime: '18:00' },
      { dayOfWeek: TUESDAY, openTime: '09:30', closeTime: '16:00' },
    ]);

    expect(stored).toEqual([
      { dayOfWeek: MONDAY, openTime: '10:00', closeTime: '18:00' },
      { dayOfWeek: TUESDAY, openTime: '09:30', closeTime: '16:00' },
    ]);
    // Read back rather than trusting the write's own return value: the two are
    // produced by different clauses of the same statement.
    expect(await getOpeningHours(ctx.db, scope)).toEqual(stored);
  });

  it('removes a day the new week omits, and can clear the week entirely', async () => {
    const owner = await accountWithBusiness(ctx);
    const scope = { userId: owner.userId };

    await setOpeningHours(ctx.db, scope, [
      { dayOfWeek: MONDAY, openTime: '09:00', closeTime: '17:00' },
      { dayOfWeek: TUESDAY, openTime: '09:00', closeTime: '17:00' },
    ]);

    const withoutTuesday = await setOpeningHours(ctx.db, scope, [
      { dayOfWeek: MONDAY, openTime: '09:00', closeTime: '17:00' },
    ]);
    expect(withoutTuesday).toHaveLength(1);

    // A6: an absent day is closed, so an empty week has to be expressible.
    // This is also the one success that returns no rows, which is why the
    // service disambiguates it from "no business" rather than 404-ing.
    expect(await setOpeningHours(ctx.db, scope, [])).toEqual([]);
    expect(await getOpeningHours(ctx.db, scope)).toEqual([]);
  });
});

describe('publishing', () => {
  it('refuses until there is a name, a service and an open day', async () => {
    const owner = await accountWithBusiness(ctx, 'Vera Salon');
    const scope = { userId: owner.userId };

    await expect(publishMyBusiness(ctx.db, scope)).rejects.toMatchObject({
      slug: 'publish-requirements-not-met',
    });

    await serviced(owner);
    // Still refused: a bookable service with no hours to book it in is a page
    // that cannot be used either.
    await expect(publishMyBusiness(ctx.db, scope)).rejects.toMatchObject({
      slug: 'publish-requirements-not-met',
    });

    await setOpeningHours(ctx.db, scope, [
      { dayOfWeek: MONDAY, openTime: '09:00', closeTime: '17:00' },
    ]);

    const published = await publishMyBusiness(ctx.db, scope);
    expect(published.published).toBe(true);
    expect(published.handle).toBe('vera-salon');
  });

  it('is idempotent and never mints a second handle (ADR-021)', async () => {
    const owner = await accountWithBusiness(ctx, 'Handle Keeper');
    const scope = { userId: owner.userId };
    await serviced(owner);
    await setOpeningHours(ctx.db, scope, [
      { dayOfWeek: MONDAY, openTime: '09:00', closeTime: '17:00' },
    ]);

    const first = await publishMyBusiness(ctx.db, scope);
    const second = await publishMyBusiness(ctx.db, scope);

    // The property, not merely "it did not throw". A second handle would
    // retire the first, breaking every link and QR code already printed.
    expect(second.handle).toBe(first.handle);

    const handles = await sql<{ count: string }>`
      select count(*)::text as count
        from public.businesses
       where handle = ${first.handle}
    `.execute(ctx.db);
    expect(handles.rows[0]?.count).toBe('1');
  });

  it('suffixes the handle when the slug is taken, rather than failing or colliding', async () => {
    const first = await accountWithBusiness(ctx, 'Twin Salon');
    await serviced(first);
    await setOpeningHours(ctx.db, { userId: first.userId }, [
      { dayOfWeek: MONDAY, openTime: '09:00', closeTime: '17:00' },
    ]);
    const firstPublished = await publishMyBusiness(ctx.db, {
      userId: first.userId,
    });

    const second = await unrelatedAccountWithBusiness(ctx, first, 'Twin Salon');
    await serviced(second);
    await setOpeningHours(ctx.db, { userId: second.userId }, [
      { dayOfWeek: MONDAY, openTime: '09:00', closeTime: '17:00' },
    ]);
    const secondPublished = await publishMyBusiness(ctx.db, {
      userId: second.userId,
    });

    expect(firstPublished.handle).toBe('twin-salon');
    expect(secondPublished.handle).not.toBe(firstPublished.handle);
    expect(secondPublished.handle).toMatch(/^twin-salon-[0-9a-f]{4}$/);
  });

  it('slugifies a name that has nothing usable in it, rather than producing an empty handle', () => {
    // `ck_businesses_handle_shape` and `ck_businesses_handle_length` would both
    // refuse an empty string, so the fallback is what stops a valid name being
    // unpublishable. Not exotic: nothing stops an owner naming a salon in emoji.
    expect(slugify('***')).toBe('salon');
    expect(slugify('  Vera’s Salon  ')).toBe('vera-s-salon');
    expect(slugify('Café Noir')).toBe('cafe-noir');
  });
});

describe('the public projection', () => {
  it('is invisible until published, and identical for a handle that does not exist', async () => {
    const owner = await accountWithBusiness(ctx, 'Draft Salon');
    const scope = { userId: owner.userId };
    await serviced(owner);
    await setOpeningHours(ctx.db, scope, [
      { dayOfWeek: MONDAY, openTime: '09:00', closeTime: '17:00' },
    ]);

    // A handle exists only after publishing, so the unpublished case is
    // constructed directly: give the row a handle without setting `published`.
    await sql`
      update public.businesses
         set handle = 'draft-salon'
       where id = ${owner.businessId}::uuid
    `.execute(ctx.db);

    expect(await findPublishedSalon(ctx.db, 'draft-salon')).toBeUndefined();
    expect(await findPublishedSalon(ctx.db, 'no-such-salon')).toBeUndefined();

    await sql`
      update public.businesses set published = true
       where id = ${owner.businessId}::uuid
    `.execute(ctx.db);

    expect(await findPublishedSalon(ctx.db, 'draft-salon')).toBeDefined();
  });

  it('emits the allowlist and nothing else — no ids beyond booking’s, no owner, no timestamps', async () => {
    const owner = await accountWithBusiness(ctx, 'Open Salon');
    const scope = { userId: owner.userId };
    await serviced(owner);
    await setOpeningHours(ctx.db, scope, [
      { dayOfWeek: MONDAY, openTime: '09:00', closeTime: '17:00' },
    ]);
    const published = await publishMyBusiness(ctx.db, scope);

    const salon = await findPublishedSalon(ctx.db, published.handle);
    expect(salon).toBeDefined();

    // ── ASSERTED AS AN EXACT KEY SET, NOT AS "DOES NOT CONTAIN EMAIL" ───────
    //
    // A denylist test fails open in the same way a denylist projection does: it
    // passes for every field nobody thought to name. This fails the day a
    // column is added to the projection without being added here.
    expect(Object.keys(salon ?? {}).sort()).toEqual([
      'about',
      'address',
      'bannerUrl',
      'category',
      'handle',
      'mapsUrl',
      'name',
      'openingHours',
      'portfolioImageUrls',
      'services',
      'tagline',
      'teamMembers',
    ]);

    // The business id is the one absence worth naming twice: every
    // owner-scoped route is keyed on it.
    expect(JSON.stringify(salon)).not.toContain(owner.businessId);
    expect(JSON.stringify(salon)).not.toContain(owner.email);

    // Service ids ARE present, deliberately — booking will reference them.
    expect(salon?.services[0]).toMatchObject({
      name: 'Silk press',
      durationMinutes: 90,
      priceKes: 2500,
    });
    expect(salon?.services[0]?.id).toMatch(/^[0-9a-f-]{36}$/);
    expect(salon?.openingHours).toEqual([
      { dayOfWeek: MONDAY, openTime: '09:00', closeTime: '17:00' },
    ]);
  });
});

describe('the scoping rule, across two tenants', () => {
  it('refuses to read, edit or delete another owner’s service', async () => {
    const mine = await accountWithBusiness(ctx, 'Mine');
    const theirs = await unrelatedAccountWithBusiness(ctx, mine, 'Theirs');

    const theirService = await addService(
      ctx.db,
      { userId: theirs.userId },
      {
        name: 'Their cut',
        durationMinutes: 30,
        priceKes: 500,
        position: undefined,
      },
    );

    const attacker = { userId: mine.userId };

    // A 404 rather than a 403, for the reason `businesses.routes.ts` records:
    // a distinct status would confirm which ids exist.
    await expect(
      editService(ctx.db, attacker, theirService.id, {
        name: 'Renamed by a stranger',
        durationMinutes: undefined,
        priceKes: undefined,
        position: undefined,
      }),
    ).rejects.toBeInstanceOf(ProblemError);

    await expect(
      removeService(ctx.db, attacker, theirService.id),
    ).rejects.toBeInstanceOf(ProblemError);

    // And the row is untouched — the refusal is not merely reported.
    const after = await sql<{ name: string }>`
      select name from public.services where id = ${theirService.id}::uuid
    `.execute(ctx.db);
    expect(after.rows[0]?.name).toBe('Their cut');
  });

  it('does not let one owner’s week overwrite another’s', async () => {
    const mine = await accountWithBusiness(ctx, 'Week Mine');
    const theirs = await unrelatedAccountWithBusiness(ctx, mine, 'Week Theirs');

    await setOpeningHours(ctx.db, { userId: theirs.userId }, [
      { dayOfWeek: TUESDAY, openTime: '08:00', closeTime: '12:00' },
    ]);

    await setOpeningHours(ctx.db, { userId: mine.userId }, [
      { dayOfWeek: MONDAY, openTime: '09:00', closeTime: '17:00' },
    ]);

    // The replace deletes "days not in the request" — scoped to the caller's
    // own business. Unscoped, this would have cleared Tuesday.
    expect(await getOpeningHours(ctx.db, { userId: theirs.userId })).toEqual([
      { dayOfWeek: TUESDAY, openTime: '08:00', closeTime: '12:00' },
    ]);
  });
});
