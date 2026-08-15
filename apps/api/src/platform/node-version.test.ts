import { readFileSync } from 'node:fs';

import { describe, expect, it } from 'vitest';

/**
 * The Node version is declared in four places. This is the thing that stops
 * them drifting.
 *
 * ── WHY FOUR COPIES EXIST ───────────────────────────────────────────────────
 *
 *   `.nvmrc`                        what a developer's shell picks up
 *   `package.json` engines (root)   what npm refuses to install under
 *   `apps/api/package.json` engines the same, for the workspace member
 *   `apps/api/Dockerfile` ARG       what the deployed image actually runs
 *
 * The fourth cannot be derived from the first: a Dockerfile's `FROM` is
 * resolved before any build step could read a file, and the image is built by
 * Render from the repository rather than by CI, so a `--build-arg` is not
 * available either. The Dockerfile says as much where the ARG is declared.
 *
 * ── WHY THIS TEST IS THE ANSWER ─────────────────────────────────────────────
 *
 * A copy that cannot drift silently is as good as a derived value, and this is
 * cheap: it reads the four files and compares. The failure it prevents is a
 * specific and nasty one — the image running a different major than every test
 * ran against, which produces a staging-only bug in code that passed CI, and
 * which nobody thinks to blame on a base image tag.
 */

const repoRoot = new URL('../../../../', import.meta.url);

function read(relativePath: string): string {
  return readFileSync(new URL(relativePath, repoRoot), 'utf8');
}

/** The single source of truth, by convention: `.nvmrc`. */
const declaredMajor = read('.nvmrc').trim();

describe('the Node version is the same in every place that names it', () => {
  it('.nvmrc names a bare major version', () => {
    // If this ever becomes `24.19.0`, the comparisons below need to change
    // rather than silently stop matching.
    expect(declaredMajor).toMatch(/^\d+$/);
  });

  it.each([
    ['package.json', 'package.json'],
    ['apps/api/package.json', 'apps/api/package.json'],
  ])('%s engines.node accepts exactly that major', (_label, path) => {
    const manifest = JSON.parse(read(path)) as {
      engines?: { node?: string };
    };
    const range = manifest.engines?.node;

    expect(range).toBeDefined();
    expect(range).toBe(
      `>=${declaredMajor}.0.0 <${String(Number(declaredMajor) + 1)}.0.0`,
    );
  });

  it('the Dockerfile builds on that major', () => {
    const dockerfile = read('apps/api/Dockerfile');
    const match = /^ARG NODE_VERSION=(\d+)$/m.exec(dockerfile);

    expect(
      match,
      'apps/api/Dockerfile must declare `ARG NODE_VERSION=<major>`',
    ).not.toBeNull();
    expect(match?.[1]).toBe(declaredMajor);
  });

  it('the Dockerfile uses the ARG rather than a literal tag', () => {
    // Catches the specific regression this whole test exists for: someone
    // "simplifying" `FROM node:${NODE_VERSION}-alpine` to `FROM node:22-alpine`,
    // which would leave the ARG correct, this file passing, and the image on
    // the wrong runtime.
    const dockerfile = read('apps/api/Dockerfile');

    const fromLines = dockerfile
      .split('\n')
      .filter((line) => line.startsWith('FROM '));

    expect(fromLines.length).toBeGreaterThan(0);
    for (const line of fromLines) {
      expect(line).toContain('${NODE_VERSION}');
    }
  });
});
