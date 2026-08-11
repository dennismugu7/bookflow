#!/usr/bin/env node
//
// Generates the Dart client from packages/contracts/openapi.json into
// apps/mobile/lib/api/generated/ (ADR-014, ADR-025).
//
// ── Why Docker, not a local JDK ──────────────────────────────────────────────
// openapi-generator is a Java program. ADR-022 already requires Docker Desktop
// for the Supabase stack, so running the generator as a container adds nothing
// to the toolchain; installing a JDK to run one code generator would add a
// whole language runtime that nothing else needs, and a second version to keep
// aligned between local and CI. ADR-025 names the generator, not how it is
// invoked, so this is an implementation choice rather than a divergence — see
// the amendment on ADR-025.
//
// ── Why the output is post-processed ─────────────────────────────────────────
// The generator emits a standalone Dart PACKAGE: its own pubspec, its own
// lib/, and imports of the form `package:bookflow_api/src/...`. ADR-025 puts
// the client inside the app at apps/mobile/lib/api/generated/, where those
// imports do not resolve — the files are part of `package:bookflow`, several
// directories down.
//
// So this script copies the generated lib/ into place and rewrites exactly one
// thing: the package prefix. That rewrite is mechanical, total and re-run on
// every generation, and the CI drift check covers its output. It is NOT a hand
// edit of a model, which ADR-014 prohibits — no human writes or fixes a line of
// this code, and any attempt to would be reverted by the next generation.
//
// Everything else the generator produces — its pubspec, its README, its own
// test scaffolding — is discarded. The runtime dependencies it declares are
// mirrored in apps/mobile/pubspec.yaml instead.

import { execFileSync } from 'node:child_process';
import {
  cpSync,
  mkdirSync,
  readdirSync,
  readFileSync,
  rmSync,
  statSync,
  writeFileSync,
} from 'node:fs';
import { join, resolve } from 'node:path';

const GENERATOR_IMAGE = 'openapitools/openapi-generator-cli:v7.16.0';
const PUB_NAME = 'bookflow_api';
const STAGING = resolve('.tmp/dart-client');
const DESTINATION = resolve('apps/mobile/lib/api/generated');

// What the generator writes, and what it has to become once the code lives
// inside the app's own package.
const FROM_IMPORT = `package:${PUB_NAME}/`;
const TO_IMPORT = 'package:bookflow/api/generated/';

function run(command, args, options = {}) {
  execFileSync(command, args, { stdio: 'inherit', ...options });
}

rmSync(STAGING, { recursive: true, force: true });
mkdirSync(STAGING, { recursive: true });

// On Linux the container's root would own everything it writes into the bind
// mount, and the subsequent cleanup fails with EACCES — which is how this was
// found, in CI rather than here, because Docker Desktop on Windows maps
// ownership for you and hides the problem entirely. Run as the invoking user
// where that concept exists.
const dockerUser =
  process.platform === 'win32'
    ? []
    : ['--user', `${process.getuid()}:${process.getgid()}`];

console.log(`dart-client: generating with ${GENERATOR_IMAGE}`);
run('docker', [
  'run',
  '--rm',
  ...dockerUser,
  '-v',
  `${process.cwd()}:/local`,
  GENERATOR_IMAGE,
  'generate',
  '-i',
  '/local/packages/contracts/openapi.json',
  '-g',
  'dart-dio',
  '-o',
  '/local/.tmp/dart-client',
  `--additional-properties=pubName=${PUB_NAME},pubLibrary=${PUB_NAME}`,
]);

// Replace wholesale rather than merging: a model deleted from the spec must
// disappear from the client, and a merge would leave it behind forever.
rmSync(DESTINATION, { recursive: true, force: true });
mkdirSync(DESTINATION, { recursive: true });
cpSync(join(STAGING, 'lib'), DESTINATION, { recursive: true });

function* dartFiles(directory) {
  for (const entry of readdirSync(directory)) {
    const path = join(directory, entry);
    if (statSync(path).isDirectory()) {
      yield* dartFiles(path);
    } else if (path.endsWith('.dart')) {
      yield path;
    }
  }
}

let rewritten = 0;
for (const file of dartFiles(DESTINATION)) {
  const original = readFileSync(file, 'utf8');
  const updated = original.split(FROM_IMPORT).join(TO_IMPORT);
  if (updated !== original) {
    writeFileSync(file, updated, 'utf8');
    rewritten += 1;
  }
}
console.log(`dart-client: rewrote package imports in ${rewritten} file(s)`);

// built_value models are half-written until build_runner emits the .g.dart
// half. Without this the client does not compile, so it is part of generation
// rather than a separate step someone can forget.
console.log('dart-client: running build_runner');
// On Windows the Dart SDK ships `dart.bat`. Node refuses to spawn a .bat
// without a shell, so this is one of the rare cases where `shell: true` is
// required rather than sloppy. The arguments are all literals with no spaces
// or metacharacters, so there is nothing for cmd.exe to mangle.
const isWindows = process.platform === 'win32';
run(
  isWindows ? 'dart.bat' : 'dart',
  ['run', 'build_runner', 'build', '--delete-conflicting-outputs'],
  {
    cwd: resolve('apps/mobile'),
    shell: isWindows,
  },
);

// The generator's output is not dart-formatted, and neither is build_runner's.
// Formatting it here rather than exempting it from the format gate keeps
// `dart format --set-exit-if-changed lib test` able to mean "all of lib",
// which is one fewer exception for a future reader to know about. Deterministic,
// so it does not disturb the drift check.
console.log('dart-client: formatting generated output');
run(isWindows ? 'dart.bat' : 'dart', ['format', 'lib/api/generated'], {
  cwd: resolve('apps/mobile'),
  shell: isWindows,
});

rmSync(STAGING, { recursive: true, force: true });
console.log(`dart-client: wrote ${DESTINATION}`);
