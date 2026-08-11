#!/usr/bin/env node
//
// Generates the Dart API client from packages/contracts/openapi.json into
// packages/bookflow_api/ (ADR-014, ADR-025).
//
// ── Why Docker, not a local JDK ──────────────────────────────────────────────
// openapi-generator is a Java program. ADR-022 already requires Docker Desktop
// for the Supabase stack, so running the generator as a container adds nothing
// to the toolchain; installing a JDK to run one code generator would add a
// whole language runtime that nothing else needs, and a second version to keep
// aligned between local and CI.
//
// ── Why a package, not a directory inside the app ────────────────────────────
// `dart-dio` emits a standalone Dart PACKAGE — its own pubspec, its own lib/,
// its own dev_dependencies. It is generated here as exactly that, and
// apps/mobile depends on it by path.
//
// Nothing is post-processed. An earlier version of this script put the output
// inside apps/mobile/lib/ and had to rewrite every `package:` import to make it
// resolve, plus mirror the generator's runtime dependencies into the app's
// pubspec by hand. Both were consequences of a layout that fought the
// toolchain, and both are gone: the generated pubspec declares its own
// dependencies, and the drift check covers it.

import { execFileSync } from 'node:child_process';
import { mkdirSync, rmSync } from 'node:fs';
import { resolve } from 'node:path';

const GENERATOR_IMAGE = 'openapitools/openapi-generator-cli:v7.16.0';
const PUB_NAME = 'bookflow_api';
const PACKAGE_DIR = resolve('packages', PUB_NAME);

const isWindows = process.platform === 'win32';
// The Dart SDK ships `dart.bat` on Windows, which Node refuses to spawn
// without a shell. Every argument below is a literal, so there is nothing for
// cmd.exe to mangle.
const DART = isWindows ? 'dart.bat' : 'dart';

function run(command, args, options = {}) {
  execFileSync(command, args, { stdio: 'inherit', ...options });
}

function dart(args) {
  run(DART, args, { cwd: PACKAGE_DIR, shell: isWindows });
}

// On Linux the container's root would own everything it writes into the bind
// mount. Docker Desktop on Windows maps ownership and hides this, which is why
// it was CI that found it rather than the development machine.
const dockerUser = isWindows
  ? []
  : ['--user', `${process.getuid()}:${process.getgid()}`];

// Replaced wholesale rather than merged: a model dropped from the spec must
// disappear from the client, and a merge would leave it behind forever.
rmSync(PACKAGE_DIR, { recursive: true, force: true });
mkdirSync(PACKAGE_DIR, { recursive: true });

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
  `/local/packages/${PUB_NAME}`,
  `--additional-properties=pubName=${PUB_NAME},pubLibrary=${PUB_NAME}`,
]);

console.log('dart-client: resolving generated package dependencies');
dart(['pub', 'get']);

// built_value models are half-written until build_runner emits the .g.dart
// half, so this is part of generation rather than a step someone can forget.
console.log('dart-client: running build_runner');
dart(['run', 'build_runner', 'build']);

// Deterministic, and keeps the committed tree readable.
console.log('dart-client: formatting generated output');
dart(['format', '.']);

console.log(`dart-client: wrote ${PACKAGE_DIR}`);
