import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

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
