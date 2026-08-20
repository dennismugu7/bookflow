import type { Executor } from '../../platform/db.ts';
import { ProblemError } from '../../platform/problem.ts';
import type { OwnerScope } from '../scope.ts';
import {
  deleteService,
  insertService,
  listServices,
  updateService,
  type ServiceRow,
} from './services.repository.ts';

/** Business logic. All of it. Routes hold none and repositories hold no rules. */

/**
 * Does this error mean a service of that name already exists here?
 *
 * Matching on the constraint NAME rather than on 23505 alone, for the reason
 * `isSecondBusinessConflict` gives: 23505 is every unique violation on the
 * table, and a future index on this table would mean something else entirely.
 *
 * Exported and pure so the mapping can be asserted without provoking a real
 * concurrent write.
 */
export function isDuplicateServiceName(error: unknown): boolean {
  if (typeof error !== 'object' || error === null) return false;
  const candidate = error as { code?: unknown; constraint?: unknown };
  return (
    candidate.code === '23505' &&
    candidate.constraint === 'uq_services_business_name'
  );
}

export async function getServices(
  db: Executor,
  scope: OwnerScope,
): Promise<ServiceRow[]> {
  return await listServices(db, scope);
}

/**
 * Adds a service.
 *
 * ── THE DUPLICATE IS CAUGHT AT THE INDEX, NOT PRE-CHECKED ───────────────────
 *
 * A `select` before the `insert` would be a race with a window between them,
 * and would answer differently under two concurrent requests than under one.
 * The unique index is the authority; this translates what it says.
 *
 * `undefined` from the repository means the traversal produced no business —
 * the caller has none — which is a 404 rather than a conflict.
 */
export async function addService(
  db: Executor,
  scope: OwnerScope,
  input: {
    readonly name: string;
    readonly durationMinutes: number;
    readonly priceKes: number;
    readonly position: number | undefined;
  },
): Promise<ServiceRow> {
  let row: ServiceRow | undefined;
  try {
    row = await insertService(db, scope, input);
  } catch (error) {
    if (isDuplicateServiceName(error)) {
      throw new ProblemError('duplicate-name', 'service name already used');
    }
    throw error;
  }

  if (row === undefined) {
    throw new ProblemError('not-found', 'no business for this principal');
  }
  return row;
}

export async function editService(
  db: Executor,
  scope: OwnerScope,
  serviceId: string,
  input: {
    readonly name: string | undefined;
    readonly durationMinutes: number | undefined;
    readonly priceKes: number | undefined;
    readonly position: number | undefined;
  },
): Promise<ServiceRow> {
  let row: ServiceRow | undefined;
  try {
    row = await updateService(db, scope, serviceId, input);
  } catch (error) {
    if (isDuplicateServiceName(error)) {
      throw new ProblemError('duplicate-name', 'service name already used');
    }
    throw error;
  }

  if (row === undefined) {
    // "Not yours" and "does not exist" are the same answer, for the reason
    // `businesses.routes.ts` sets out: a distinct 403 would confirm which ids
    // exist, which is the property UUID keys were chosen to withhold.
    throw new ProblemError('not-found', 'no such service for this user');
  }
  return row;
}

export async function removeService(
  db: Executor,
  scope: OwnerScope,
  serviceId: string,
): Promise<void> {
  const removed = await deleteService(db, scope, serviceId);
  if (!removed) {
    throw new ProblemError('not-found', 'no such service for this user');
  }
}
