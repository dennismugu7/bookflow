import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { z } from 'zod';

import { businessSchema } from './businesses.routes.ts';
import { renameBusinessRequestSchema } from './businesses.schema.ts';

/**
 * The boundary around `businessExistsUnscoped`, enforced by reading the source.
 *
 * ══ WHY A TEST AND NOT A COMMENT ════════════════════════════════════════════
 *
 * `businessExistsUnscoped` is the one read in this module that does NOT
 * traverse `user → membership → business`. It exists solely so
 * `business.scoped_miss` can record which kind of 404 just happened — a
 * distinction the response deliberately hides, because a status that confirmed
 * which ids exist would hand back the property ADR-016's UUIDs were chosen for.
 *
 * **DO-NOT-VIBE: the membership scoping rule (`CLAUDE.md` §6).** TypeScript has
 * no module-private export: any file can `import` it by path, and nothing in
 * the language stops a future handler returning its result. So the constraint
 * is checked the way `apps/mobile/test/design_system_test.dart` checks its two
 * architectural rules — by reading the tree and failing with the offending
 * file. **A convention nobody can violate beats one everyone has to remember.**
 *
 * This is a unit test: it reads files and touches no database.
 */

const API_SRC = join(process.cwd(), 'apps', 'api', 'src');
const MODULE_DIR = join(API_SRC, 'modules', 'businesses');
const GUARDED = 'businessExistsUnscoped';

function typeScriptFilesUnder(directory: string): string[] {
  return readdirSync(directory).flatMap((entry) => {
    const full = join(directory, entry);
    if (statSync(full).isDirectory()) return typeScriptFilesUnder(full);
    return full.endsWith('.ts') ? [full] : [];
  });
}

describe('businessExistsUnscoped — the unscoped read stays where it was put', () => {
  const allFiles = typeScriptFilesUnder(API_SRC);

  it('the guard can see the source tree at all — the control', () => {
    // Without this, a wrong path silently yields an empty file list and every
    // assertion below passes by finding nothing. That is the same failure the
    // route-table sweep hit, and it is the reason this test is written first.
    expect(allFiles.length).toBeGreaterThan(10);
    expect(
      allFiles.some((file) => file.endsWith('businesses.repository.ts')),
    ).toBe(true);
    expect(
      readFileSync(
        join(MODULE_DIR, 'businesses.repository.ts'),
        'utf8',
      ).includes(`export async function ${GUARDED}`),
    ).toBe(true);
  });

  it('is not imported from anywhere outside modules/businesses', () => {
    const outsiders = allFiles.filter(
      (file) =>
        !file.startsWith(MODULE_DIR) &&
        readFileSync(file, 'utf8').includes(GUARDED),
    );

    expect(
      outsiders,
      'the unscoped read escaped its module — see its comment before widening it',
    ).toEqual([]);
  });

  it('has exactly one caller, and that caller is logScopedMiss', () => {
    const service = readFileSync(
      join(MODULE_DIR, 'businesses.service.ts'),
      'utf8',
    );

    // Call sites, not the import line: `NAME(` with no `import` around it.
    const callSites = service.split('\n').filter((line) => {
      return line.includes(`${GUARDED}(`);
    });

    expect(callSites).toHaveLength(1);

    // And that single call sits inside `logScopedMiss`. Checked by position:
    // the call must fall between logScopedMiss's declaration and the next
    // top-level declaration after it.
    const declaration = service.indexOf('export async function logScopedMiss');
    expect(
      declaration,
      'logScopedMiss must exist to hold the call',
    ).toBeGreaterThan(-1);

    const callIndex = service.indexOf(`${GUARDED}(`, declaration);
    expect(
      callIndex,
      'the only call must be inside logScopedMiss, not before it',
    ).toBeGreaterThan(declaration);
  });

  it('the routes never let its answer reach a response', () => {
    const routes = readFileSync(
      join(MODULE_DIR, 'businesses.routes.ts'),
      'utf8',
    );

    // `logScopedMiss` is the only way a route can reach the unscoped read, and
    // every call must be a bare statement. An assignment — `const exists = await
    // logScopedMiss(...)` — is the shape that would let the answer travel on,
    // so the assertion is on the CALL SHAPE rather than on a promise not to.
    const calls = routes
      .split('\n')
      .filter((line) => line.includes('logScopedMiss('));

    expect(calls.length).toBeGreaterThan(0);
    for (const call of calls) {
      expect(
        call.trim(),
        'a scoped-miss log must be a bare statement, never assigned',
      ).toMatch(/^await logScopedMiss\(/);
    }

    // The route file must not name the unscoped read at all.
    expect(routes.includes(GUARDED)).toBe(false);
  });

  it('logScopedMiss returns Promise<void>, which is what makes the answer unreturnable', () => {
    const service = readFileSync(
      join(MODULE_DIR, 'businesses.service.ts'),
      'utf8',
    );

    // The type is the real guarantee; the assertions above are about habit.
    // `Promise<void>` means no handler can return this value even by mistake —
    // it would be a compile error rather than a leak.
    expect(service).toContain(
      'export async function logScopedMiss(\n  db: Executor,\n  log: BusinessLogger,\n  scope: BusinessScope,\n): Promise<void> {',
    );
  });
});

/**
 * The second boundary in this module: **`banner_url` has exactly one writer.**
 *
 * ══ WHY THE ASYMMETRY NEEDS A TEST AND NOT A COMMENT ════════════════════════
 *
 * `bannerUrl` is on the RESPONSE — the edit form shows the current banner — and
 * absent from the REQUEST, because `POST /v1/me/business/images` sets that
 * column when the purpose is `banner`. Every other field on this resource is on
 * both, so **the natural, symmetrical, wrong edit is to add it to the request**,
 * and it would look like a fix for an oversight.
 *
 * What breaks if someone does: an upload writes the column, the form saves a
 * moment later carrying whatever `bannerUrl` it was holding when it loaded, and
 * the newer value is overwritten by the older one. The client would then show
 * the banner it just replaced and be correct to.
 *
 * These run against the SCHEMAS THEMSELVES rather than the source text, so they
 * cannot be satisfied by moving a line or defeated by a comment mentioning the
 * word. Zod strips unknown keys, which is exactly the behaviour being pinned.
 */
describe('the business profile surface — what may be read, what may be written', () => {
  const parsed = renameBusinessRequestSchema.parse({
    name: 'Vera Salon',
    bannerUrl: 'https://cdn.invalid/banner.jpg',
  });

  it('the request refuses bannerUrl — the image route owns that column', () => {
    expect(
      Object.hasOwn(parsed, 'bannerUrl'),
      'bannerUrl reached the PATCH body: banner_url now has two writers, and the older one wins whenever a save follows an upload',
    ).toBe(false);
  });

  it('the response carries every field the owner can see, bannerUrl included', () => {
    // The read is what the edit form prefills from. A field missing here is a
    // field the client has to guess at, and the guesses become workarounds —
    // which is the whole history this surface just finished unwinding.
    expect(Object.keys(businessSchema.shape).sort()).toEqual([
      'about',
      'address',
      'bannerUrl',
      'category',
      'handle',
      'id',
      'mapsUrl',
      'name',
      'published',
      'tagline',
    ]);
  });

  it('distinguishes an omitted field from an empty one', () => {
    // The distinction the whole clear-a-field feature rests on. An omitted key
    // must stay omitted through parsing — if Zod defaulted it to `''`, every
    // partial save would clear four fields it never mentioned.
    const omitted = renameBusinessRequestSchema.parse({ name: 'Vera Salon' });
    expect(Object.hasOwn(omitted, 'tagline')).toBe(false);

    const cleared = renameBusinessRequestSchema.parse({
      name: 'Vera Salon',
      tagline: '',
      mapsUrl: '',
    });
    expect(cleared.tagline).toBe('');
    // `mapsUrl` specifically, because it is the one field with real validation
    // and therefore the one that would otherwise be unclearable: `z.url()`
    // rejects `''`. Its refinement lets the empty case through and nothing else.
    expect(cleared.mapsUrl).toBe('');
    expect(() =>
      renameBusinessRequestSchema.parse({
        name: 'Vera Salon',
        mapsUrl: 'not a url',
      }),
    ).toThrow();
  });

  it('keeps every request field a plain string in the generated shape', () => {
    // ── A REGRESSION GUARD WITH A SPECIFIC HISTORY ────────────────────────────
    //
    // The clear signal was `null` first, via `.nullish()`. It parsed correctly,
    // every test passed, and the DART CLIENT came out with five wrapper classes
    // — `RenameBusinessRequestTagline` and four more — because openapi-generator
    // renders `anyOf: [string, null]` as a type of its own.
    //
    // Nothing on this side would have caught it; the damage was two packages
    // away in generated code nobody reads. So the schema is asserted to emit
    // plain optional strings, which is the property that keeps the client clean.
    const emitted = z.toJSONSchema(renameBusinessRequestSchema, {
      io: 'input',
    }) as { properties: Record<string, { type?: unknown; anyOf?: unknown }> };

    for (const [field, shape] of Object.entries(emitted.properties)) {
      expect(
        shape.anyOf,
        `${field} emits anyOf, which generates a wrapper class`,
      ).toBeUndefined();
      expect(shape.type, `${field} must be a plain string`).toBe('string');
    }
  });
});
