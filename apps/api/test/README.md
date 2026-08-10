# Tests

Two layers, run separately, with different requirements.

| Layer | Filename | Needs a database | Run by |
|---|---|---|---|
| Unit | `*.test.ts` | no — and no network either | `npm run test:unit`, and `npm run check` |
| Integration | `*.integration.test.ts` | yes, the local Supabase Postgres | `npm run test:integration`, and `npm run verify` |

`npm run check` runs only the unit layer, so it passes on a laptop with nothing
running. `npm run verify` is `check` plus integration, and is the full gate —
`DEFINITION_OF_DONE.md` names it, and CI runs it.

Tests live **beside the code they cover**, inside the module that owns them
(`CLAUDE.md` §4). A slice adds its tests to its own folder under `src/modules/`;
it does not add them to a top-level `tests/` directory. Only the shared harness
lives here.

## Writing an integration test

```ts
import { sql } from 'kysely';
import { describe, expect, it } from 'vitest';

import { useTransaction } from '../../test/integration/harness.ts';

const ctx = useTransaction();

describe('bookings repository', () => {
  it('does the thing', async () => {
    const result = await sql`select 1 as n`.execute(ctx.db);
    expect(result.rows).toHaveLength(1);
  });
});
```

`useTransaction()` goes at the **top level** of the file, once. `ctx.db` is used
**inside test bodies**.

## What the transaction wrapper does

Every test is wrapped in a transaction that is **rolled back** when it finishes:

- `beforeEach` opens a transaction; `afterEach` rolls it back.
- Everything the test writes is invisible to every other test, and is gone
  afterwards.
- The database therefore needs **no reset between tests** — every test starts
  from exactly what the migrations produced.
- Tests may run in **any order**. If yours only passes in a particular order, it
  is reading something another test wrote, which the rollback is supposed to
  make impossible; that is a bug in your test, not in the harness.

## What not to do

- **Do not skip when the database is down.** The suite fails instead, on
  purpose. A skipped integration suite reports green while checking nothing,
  which looks identical in CI to a passing one. `harness.ts` explains this at
  length. If you are tempted to add `skipIf` to get a build green, the build is
  telling you the truth.
- **Do not open your own connection.** Pass `ctx.db` into the code under test.
  Anything that calls `createDb()` for itself is outside the transaction: its
  writes commit for real and survive the test. Stray rows after a run mean
  something did this.
- **Do not destructure the context.** `const { db } = useTransaction()` captures
  the first transaction and pins it; every test after the first gets a closed
  one. Keep `ctx` and use `ctx.db`.
- **Do not commit.** Calling `ctx.db.commit()` defeats the isolation and leaves
  data behind for every later test to trip over.
- **Do not add a `db reset` to make a test pass.** If a test needs a clean
  database, the rollback already gave it one. Needing more than that means the
  test is writing outside the transaction — see above.
- **Do not put a unit test's logic behind a database.** If it can be tested
  without one, it belongs in `*.test.ts`, where it runs in milliseconds and
  keeps `check` honest.
