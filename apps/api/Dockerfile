# syntax=docker/dockerfile:1

# Bookflow API — the image Render builds and runs (ADR-024, as amended).
#
# ══ THE NODE VERSION IS DECLARED HERE AND CHECKED ELSEWHERE ═════════════════
#
# `.nvmrc` says 24 and both `package.json` files say `>=24.0.0 <25.0.0`. This is
# a third copy, and **it cannot be derived**: a `FROM` line is resolved before
# any build step runs, so nothing in this file can read `.nvmrc`. A build ARG
# passed by the caller would work for a build we control — but Render builds
# this image from the repository, and it will not run `--build-arg` for us.
#
# So the version is written once more, and the drift is caught rather than
# prevented: `apps/api/src/platform/node-version.test.ts` reads `.nvmrc`, both
# `package.json` engines fields and the ARG below, and fails if they disagree.
# It runs in `npm run verify`. A copy that cannot drift silently is the best
# available answer here, and saying so is better than pretending it was derived.
ARG NODE_VERSION=24

# ── Stage 1: dependencies and the type gate ─────────────────────────────────
#
# There is no TypeScript *compile* step in this project, and that is deliberate
# rather than missing: Node 24 strips types natively, `apps/api` runs
# `node src/server.ts` directly, and `tsc` is only ever invoked as `--noEmit`
# (ADR-022). So "build" here means **install and prove the types**, and the
# artefact carried forward is source plus production dependencies.
#
# The gate is repeated here on purpose even though CI already runs it. This
# image is built by Render, not by CI, and an image that compiles a type error
# into staging because the build host skipped the check would be a gap between
# two systems that both assumed the other was looking.
FROM node:${NODE_VERSION}-alpine AS build
WORKDIR /repo

# The workspace root is the install unit (ADR-022: npm workspaces over
# `apps/api` and `packages/contracts`), so the lockfile and every member's
# manifest have to be present before `npm ci` will resolve.
COPY package.json package-lock.json ./
COPY apps/api/package.json apps/api/
COPY packages/contracts/package.json packages/contracts/

# `npm ci` and not `npm install`: the lockfile is the input, and a build that
# quietly resolves a different tree than the one committed is not reproducible.
#
# `--ignore-scripts` for two reasons. The immediate one: the root `prepare`
# script installs the git pre-push hook, which is a developer-machine concern
# and fails outright in an image that has no `.git` — the build failed on
# exactly this before the flag was added. The standing one: it stops every
# dependency's install scripts running arbitrary code during the build, which
# is the cheapest supply-chain control available here. Nothing this image runs
# needs a build step; the production dependencies are pure JavaScript.
RUN npm ci --ignore-scripts

COPY tsconfig.base.json* tsconfig.json* ./
COPY apps/api ./apps/api

RUN npm run typecheck

# ── Stage 2: production dependencies only ───────────────────────────────────
#
# A separate install rather than pruning the first one, because `npm ci
# --omit=dev` from the lockfile is deterministic in a way `npm prune` is not.
FROM node:${NODE_VERSION}-alpine AS deps
WORKDIR /repo

COPY package.json package-lock.json ./
COPY apps/api/package.json apps/api/
COPY packages/contracts/package.json packages/contracts/

RUN npm ci --omit=dev --ignore-scripts

# ── Stage 3: runtime ────────────────────────────────────────────────────────
FROM node:${NODE_VERSION}-alpine AS runtime
WORKDIR /repo

# NODE_ENV is not APP_ENV. The application's own environment is APP_ENV
# (`platform/config.ts` explains why at length: NODE_ENV is written by tooling
# without asking). This sets NODE_ENV only because npm and some libraries read
# it to decide production behaviour, and it deliberately does not imply
# anything about which Bookflow environment this is.
ENV NODE_ENV=production

# The image carries no shell tooling it does not need, no dev dependencies, and
# no test files. `src` only — the tests live beside the source in this project,
# so they are excluded by `.dockerignore` rather than by living elsewhere.
COPY --from=deps /repo/node_modules ./node_modules
COPY package.json ./
COPY apps/api/package.json ./apps/api/
COPY apps/api/src ./apps/api/src

# ── Non-root ────────────────────────────────────────────────────────────────
#
# `node:alpine` ships an unprivileged `node` user (uid 1000). Nothing this
# process does needs root: it binds a port above 1024, writes no files, and
# reads its configuration from the environment. Running as root would be a
# privilege held for no reason, and the reason to avoid that is not theoretical
# — a container escape and a compromised dependency both cost more as uid 0.
#
# Ownership is set before the switch so that npm's own cache lookups do not hit
# an unreadable path.
RUN chown -R node:node /repo
USER node

# Documentation only — Render supplies the real port through PORT, which
# `platform/config.ts` reads (defaulting to 3000). HOST defaults to 0.0.0.0,
# which is required: a container binding 127.0.0.1 is unreachable from outside
# itself, and that failure looks exactly like a crashed service.
EXPOSE 3000

# Exec form, so the process is PID 1 and receives SIGTERM directly. With the
# shell form, a shell would be PID 1, signals would not reach Node, and the
# platform's graceful shutdown would become a ten-second kill on every deploy.
CMD ["node", "apps/api/src/server.ts"]
