import { describe, expect, it } from 'vitest';

import { PROBLEM_TYPES, type ProblemSlug, problemBody } from './problem.ts';

/**
 * ADR-014's error contract, asserted against the registry itself.
 *
 * ══ WHAT THIS FILE CAN AND CANNOT PROVE ═════════════════════════════════════
 *
 * **No acceptance criterion is mapped here, and that is not an oversight.**
 * Criteria 34 and 35 are about what `POST /v1/businesses` DOES with
 * `business-already-exists` — refuse a second creation, and answer with a
 * problem document whose `type` names a conflict. **That route does not exist**,
 * so neither criterion is testable and neither is named below. Adding the slug
 * is a prerequisite for them, not a partial satisfaction of them.
 *
 * What IS provable now is that the registry is well-formed and that the entry
 * says what the design says it says.
 */

const slugs = Object.keys(PROBLEM_TYPES) as ProblemSlug[];

describe('the business-already-exists entry (decision 8)', () => {
  it('exists, with 409 and its title', () => {
    expect(PROBLEM_TYPES['business-already-exists']).toEqual({
      status: 409,
      title: 'Business already exists',
    });
  });

  it('serialises to a distinct type URI, shaped like every other', () => {
    const body = problemBody('business-already-exists');

    expect(body).toEqual({
      type: '/problems/business-already-exists',
      title: 'Business already exists',
      status: 409,
    });

    // No `detail`, no `instance` — the rule `problemBody` holds for every entry
    // (a detail string is where an error response leaks). Asserted on the new
    // one specifically, because a conflict is the entry most tempting to
    // enrich with "you already own X".
    expect(Object.keys(body).sort()).toEqual(['status', 'title', 'type']);
  });

  it('shares 409 with the conflicts that came after it, and no others', () => {
    // ── THIS USED TO ASSERT "409 ALONE", AND THAT EXPIRED ON PURPOSE ────────
    //
    // The original wording was right when there was one conflict in the API.
    // The business-configuration feature added two more, and the property worth
    // keeping was never "only one entry may be a 409" — it is that **a client
    // branching on `type` can tell them apart**, which is ADR-014's whole
    // mechanism and is asserted by the distinct-URI test below.
    //
    // Kept as an exhaustive list rather than deleted: a new 409 has to be added
    // here deliberately, which is the moment to ask whether the client can act
    // on it differently from the three that already exist. A slug it cannot is
    // a slug that should not have been minted.
    const with409 = slugs.filter((s) => PROBLEM_TYPES[s].status === 409).sort();
    expect(with409).toEqual([
      'business-already-exists',
      'duplicate-name',
      'publish-requirements-not-met',
    ]);
  });
});

describe('the registry is well-formed', () => {
  it('gives every entry a distinct type URI', () => {
    const uris = slugs.map((s) => problemBody(s).type);
    expect(new Set(uris).size, 'no two slugs may share a URI').toBe(
      uris.length,
    );

    // Honest about what this guards: the URI is derived from the object key
    // today, so distinctness holds by construction and this cannot fail as
    // written. It is here for the change that would break it — someone giving
    // `problemBody` a source other than the key, at which point two entries
    // colliding becomes possible and the client's branch on `type` becomes
    // ambiguous.
  });

  it('gives every entry a client or server status and a non-empty title', () => {
    for (const slug of slugs) {
      const spec = PROBLEM_TYPES[slug];
      expect(spec.status, `${slug} status`).toBeGreaterThanOrEqual(400);
      expect(spec.status, `${slug} status`).toBeLessThan(600);
      expect(spec.title.trim(), `${slug} title`).not.toBe('');
    }
  });

  it('keeps every slug lowercase and hyphenated, as the URIs are public', () => {
    for (const slug of slugs) {
      expect(slug, `${slug} is not URI-shaped`).toMatch(/^[a-z]+(-[a-z]+)*$/);
    }
  });
});
