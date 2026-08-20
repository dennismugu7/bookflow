import { z } from 'zod';

/**
 * The services contract. One declaration, validated at runtime and emitted into
 * the OpenAPI document the Dart client is generated from (ADR-014, ADR-025).
 */

/** Mirrors `ck_services_name_present`. */
const SERVICE_NAME_MAX_LENGTH = 200;

/** Mirrors `ck_services_duration_positive`. A day, in minutes. */
const DURATION_MAX_MINUTES = 1440;

/**
 * `.trim()` first, for the reason `businesses.schema.ts` sets out at length:
 * the check constraint measures `length(btrim(name))` while the column stores
 * what it is given, so trimming at the boundary is what stops the two
 * disagreeing — and it is the ordering, not the presence, that makes
 * whitespace-only fail rather than pass.
 */
const serviceName = z
  .string()
  .trim()
  .min(1)
  .max(SERVICE_NAME_MAX_LENGTH)
  .describe('Required. Trimmed. 1–200 characters after trimming.');

const durationMinutes = z
  .int()
  .positive()
  .max(DURATION_MAX_MINUTES)
  .describe('Whole minutes. 1–1440.');

/**
 * ── WHOLE SHILLINGS, NOT MINOR UNITS ────────────────────────────────────────
 *
 * The design prices services as "KES 400" and Kenyan salon pricing has no cent
 * component, so this is an integer of whole shillings. That departs from
 * `CLAUDE.md` §5's "bigint minor units" and the migration's column comment
 * records the cost: when deposits arrive (ADR-009, B1) they are minor units,
 * and arithmetic across the two needs a conversion someone has to remember.
 *
 * `z.int()` and a non-negative bound, never a float and never a decimal string
 * — that half of §5 is not negotiable and is not being negotiated.
 */
const priceKes = z
  .int()
  .min(0)
  .describe('Whole Kenyan shillings. Not minor units — see the schema note.');

const position = z
  .int()
  .min(0)
  .describe('Display order. Ties break on creation time.');

export const serviceSchema = z
  .object({
    id: z.uuid(),
    name: z.string(),
    durationMinutes: z.int(),
    priceKes: z.int(),
    position: z.int(),
  })
  .describe('A bookable service.')
  .meta({ id: 'Service' });

export const servicesSchema = z
  .array(serviceSchema)
  .describe('The salon’s services, in display order.');

export const createServiceRequestSchema = z
  .object({
    name: serviceName,
    durationMinutes,
    priceKes,
    position: position.optional(),
  })
  .describe('A service to add.')
  .meta({ id: 'CreateServiceRequest' });

/**
 * Every field optional, and at least one required.
 *
 * A PATCH body of `{}` is a request that asks for nothing; answering 200 to it
 * would report a change that did not happen. `.refine` makes it a 400, which
 * the problem handler turns into `validation-failed` like any other schema
 * failure — one place decides what a malformed request looks like.
 */
export const updateServiceRequestSchema = z
  .object({
    name: serviceName.optional(),
    durationMinutes: durationMinutes.optional(),
    priceKes: priceKes.optional(),
    position: position.optional(),
  })
  .refine((body) => Object.keys(body).length > 0, {
    message: 'at least one field must be present',
  })
  .describe('The fields to change. At least one.')
  .meta({ id: 'UpdateServiceRequest' });
