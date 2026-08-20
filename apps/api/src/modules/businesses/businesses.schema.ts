import { z } from 'zod';

/**
 * The business contract. One declaration, validated at runtime and emitted into
 * the OpenAPI document the Dart client is generated from (ADR-014, ADR-025).
 */

/**
 * Mirrors `ck_businesses_name_present` in the foundation migration.
 *
 * NOT exported. It has one consumer — `businessName` below — and widening a
 * module's public surface for a value nothing outside it reads invites exactly
 * the coupling the tests deliberately avoid: a boundary test that imports this
 * constant still passes when the constant is changed wrongly, which is why
 * those tests spell `200` out.
 */
const BUSINESS_NAME_MAX_LENGTH = 200;

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

const TAGLINE_MAX_LENGTH = 200;
const ABOUT_MAX_LENGTH = 2000;
const CATEGORY_MAX_LENGTH = 100;
const ADDRESS_MAX_LENGTH = 500;

/**
 * ── THE PROFILE FIELDS THE ONBOARDING SCREEN COLLECTS ───────────────────────
 *
 * Every one is optional, on the wire and in the column. The design marks
 * Tagline, About and the banner "(optional)" on screen #5 itself, and the
 * migration explains why they could not have been NOT NULL even if we wanted
 * them to be: businesses already exist, created by a route that takes a name.
 *
 * `category` is FREE TEXT and not an enum. K16 — what the category vocabulary
 * is — is undecided, and an enum here would decide it silently, in a schema,
 * for every client at once.
 */
const tagline = z.string().trim().max(TAGLINE_MAX_LENGTH);
const about = z.string().trim().max(ABOUT_MAX_LENGTH);
const category = z.string().trim().max(CATEGORY_MAX_LENGTH);
const address = z.string().trim().max(ADDRESS_MAX_LENGTH);
/**
 * A map link. `z.url()` and nothing more — it is rendered as a link by the
 * client web app and never parsed, so validating it against a provider's URL
 * shape would reject a perfectly good link to a different provider.
 */
const mapsUrl = z.url().max(2000);

/**
 * `PATCH` — the editable fields.
 *
 * ── THIS GREW, AND THE SCHEMA ID DID NOT ────────────────────────────────────
 *
 * It used to carry `name` alone, and its comment said the name was "the only
 * editable field (decision 4)". That was true of the business-setup slice and
 * is no longer: the salon profile is what this feature exists to configure.
 * **`name` stays required** — a PATCH that could omit it would need every field
 * optional and a "at least one" refinement, and the one field that must never
 * be absent from a salon is the one clients see first.
 *
 * The `id` is unchanged deliberately. It is the same operation on the same
 * resource, so the generated Dart type keeps its name and existing call sites
 * keep compiling; a new id would be a second model describing the same PATCH.
 */
export const renameBusinessRequestSchema = z
  .object({
    name: businessName,
    tagline: tagline.optional(),
    about: about.optional(),
    category: category.optional(),
    address: address.optional(),
    mapsUrl: mapsUrl.optional(),
  })
  .describe('The business’s editable profile. The name is required.')
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
