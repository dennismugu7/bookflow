# Bookflow

Salon booking SaaS. Salon owners and staff run the salon from an Android app; clients book through a web link the salon shares on social media.

## Layout

```
apps/web         Client booking site: Next.js (App Router), Tailwind
apps/owner       Owner/staff app: Expo + expo-router, Android only
packages/shared  Shared TypeScript: schemas, domain logic, formatting
packages/config  Shared tsconfig, ESLint and Prettier config
supabase/        Supabase config (migrations, tests, functions later)
docs/specs/      Task specs
```

## Commands

Requires Node 24 (`.nvmrc`) and pnpm (`corepack enable`).

```sh
pnpm install
pnpm dev:web      # web app on http://localhost:3000
pnpm dev:owner    # Expo / Metro for the owner app
pnpm check        # lint + typecheck + tests (must pass before a PR)
pnpm build        # production builds
pnpm --filter web test:e2e   # Playwright smoke tests (run `pnpm --filter web exec playwright install chromium` once)
```

Database (needs Docker):

```sh
npx supabase db start                                   # local Postgres
npx supabase db reset --no-seed && npx supabase test db # pgTAP tests expect an empty database
npx supabase db reset                                   # migrations + demo seed for local dev
npx supabase gen types typescript --local > packages/shared/src/database.types.ts
```

Env: copy each app's `.env.example` to `.env.local` and fill in values. Never commit `.env*` files.

## License

© 2026 mugu-labs. All rights reserved. The source is public for portfolio review only; no license is granted to use, copy, modify or distribute it.
