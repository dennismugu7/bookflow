import { z } from 'zod';

/**
 * The business contract. One declaration, validated at runtime and emitted into
 * the OpenAPI document the Dart client is generated from (ADR-014, ADR-025).
 */

/** Mirrors `ck_businesses_name_present` in the foundation migration. */
export const BUSINESS_NAME_MAX_LENGTH = 200;

/**
 * ── `.trim()` COMES FIRST, AND THE ORDER IS THE WHOLE MECHANISM ─────────────
 *
 * Decision 9: a submitted name is stored trimmed. `ck_businesses_name_present`
 * measures `length(btrim(name))` while the column stores what it is given, so
 * without this a padded 200-character name would satisfy the constraint and be
 * stored longer than 200, and two names a person would call identical could
 * differ in the database by invisible characters.
 *
 * Trimming here — at the route boundary, before the handler is entered — means
 * the service and the repository never see an untrimmed value, and the check
 * constraint can never disagree with what is stored.
 *
 * The ordering is what makes each case fall out:
 *
 *   "  Vera's Salon  "  → trimmed → passes → stored trimmed
 *   "   "               → trimmed to "" → fails `.min(1)`
 *   200 chars + padding → trimmed to exactly 200 → passes `.max(200)`
 *   201 chars           → fails `.max(200)`
 *
 * Reverse `.trim()` and `.min(1)` and the whitespace-only case passes.
 *
 * Same shape as `personName` in `auth.schema.ts`, deliberately: this is the
 * precedent that file already set for `user_profiles`.
 */
export const businessName = z
  .string()
  .trim()
  .min(1)
  .max(BUSINESS_NAME_MAX_LENGTH)
  .describe('Required. Trimmed. 1–200 characters after trimming.');

/**
 * `PATCH` takes the same body shape as creation will: the name is the only
 * editable field (decision 4), so a partial update and a full one are the same
 * object. It carries its own schema id rather than sharing one, because the two
 * are separate operations in the generated Dart client and a shared id would
 * couple them the first time they diverge.
 */
export const renameBusinessRequestSchema = z
  .object({ name: businessName })
  .describe('A new name for the business. The only editable field.')
  .meta({ id: 'RenameBusinessRequest' });

/**
 * Creation takes the name and nothing else (decision 1). Tagline, About and the
 * banner are non-goals and have no columns; a salon category is not collected
 * here (decision 5, K16).
 *
 * Its own schema id rather than sharing `RenameBusinessRequest`: they are
 * separate operations in the generated Dart client, and a shared id couples them
 * the first time they diverge — which they will, the moment creation gains a
 * field rename does not have.
 */
export const createBusinessRequestSchema = z
  .object({ name: businessName })
  .describe('The business to create. Name only.')
  .meta({ id: 'CreateBusinessRequest' });
