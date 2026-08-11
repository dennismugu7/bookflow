#!/usr/bin/env node
//
// The drift check. Regenerates both artifacts and fails if either differs from
// what is committed.
//
// This is the mechanism ADR-014 depends on. Without it, "the spec is generated
// from code" and "hand-written Dart models are prohibited" are conventions —
// true until someone is in a hurry. With it, they are build failures.
//
// Uses `git status --porcelain` rather than `git diff`, so a NEW generated file
// that nobody committed counts as drift too. `git diff` alone ignores untracked
// files, which is exactly how a whole missing model would slip through.

import { execFileSync } from 'node:child_process';

// The whole generated package, not just its lib/. Its pubspec is generated
// too, and it is the file that carries the client's runtime dependencies — a
// generator upgrade that changes them has to show up as drift rather than be
// absorbed silently. `.openapi-generator/VERSION` is in here as well, so the
// generator version itself is under the same check.
const WATCHED = ['packages/contracts', 'packages/bookflow_api'];

function git(args) {
  return execFileSync('git', args, { encoding: 'utf8' });
}

console.log('contracts: regenerating to compare against what is committed');
execFileSync(process.execPath, ['scripts/generate-openapi.mjs'], {
  stdio: 'inherit',
});
execFileSync(process.execPath, ['scripts/generate-dart-client.mjs'], {
  stdio: 'inherit',
});

const dirty = git(['status', '--porcelain', '--', ...WATCHED]).trim();

if (dirty === '') {
  console.log('contracts: no drift — committed artifacts match the code.');
  process.exit(0);
}

console.error(
  [
    '',
    '────────────────────────────────────────────────────────────────────────',
    '  CONTRACT DRIFT',
    '',
    '  Regenerating produced something different from what is committed:',
    '',
    ...dirty.split('\n').map((line) => `    ${line}`),
    '',
    '  This means one of two things.',
    '',
    '    1. A route schema changed and the artifacts were not regenerated.',
    '       Run `npm run contracts:generate` and commit the result.',
    '',
    '    2. A generated file was edited by hand. ADR-014 prohibits that —',
    '       a hand-written Dart model is a second source of truth, and second',
    '       sources of truth diverge silently across a boundary no compiler',
    '       spans. Revert the edit and change the Zod schema instead.',
    '',
    '  The diff follows.',
    '────────────────────────────────────────────────────────────────────────',
    '',
  ].join('\n'),
);

// Shown for the tracked files; untracked ones are already named above.
try {
  execFileSync('git', ['--no-pager', 'diff', '--', ...WATCHED], {
    stdio: 'inherit',
  });
} catch {
  // A diff that cannot be printed does not change the verdict.
}

process.exit(1);
