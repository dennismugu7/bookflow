#!/usr/bin/env node
//
// Points git at the committed hooks in .githooks/.
//
// Run automatically by npm's `prepare` lifecycle on `npm install` and
// `npm ci`, so a fresh clone gets the pre-push hook from its first install
// with no separate step to remember or document.
//
// Sets core.hooksPath rather than copying files into .git/hooks: a copy goes
// stale the moment the committed hook changes, and nothing would tell you.
//
// Never fails the install. A missing git binary, a tarball checkout with no
// .git, or a CI runner that does not want hooks are all normal — this prints
// what happened and exits zero, because a hook that cannot be installed is not
// a reason to fail `npm ci`.

import { execFileSync } from 'node:child_process';

const HOOKS_PATH = '.githooks';

function run(args) {
  return execFileSync('git', args, { encoding: 'utf8', stdio: 'pipe' }).trim();
}

try {
  run(['rev-parse', '--git-dir']);
} catch {
  console.log('git-hooks: not a git repository — skipping hook installation.');
  process.exit(0);
}

try {
  const current = (() => {
    try {
      return run(['config', '--local', '--get', 'core.hooksPath']);
    } catch {
      return '';
    }
  })();

  if (current === HOOKS_PATH) {
    process.exit(0);
  }

  if (current !== '') {
    console.log(
      `git-hooks: core.hooksPath is "${current}", not "${HOOKS_PATH}". ` +
        'Leaving it alone — someone set it deliberately.',
    );
    process.exit(0);
  }

  run(['config', '--local', 'core.hooksPath', HOOKS_PATH]);
  console.log(`git-hooks: core.hooksPath set to ${HOOKS_PATH} (pre-push).`);
} catch (error) {
  console.log(
    `git-hooks: could not configure hooks (${error instanceof Error ? error.message : String(error)}). Skipping.`,
  );
}
