import { DELETION_DETAILS_MAX, DELETION_REASON_VALUES } from "@bookflow/shared";
import { z } from "zod";

/** The body of POST /api/account/delete. */
export const deleteAccountBody = z.object({
  reason: z.enum(DELETION_REASON_VALUES),
  details: z.string().trim().max(DELETION_DETAILS_MAX).optional(),
});

export type DeleteAccountInput = z.infer<typeof deleteAccountBody>;

export const MEDIA_BUCKET = "salon-media";
export const REMOVE_BATCH = 100;

/** The Supabase calls the deletion makes, so the order can be tested without a server. */
export type DeletionSteps = {
  /** As the user: get_account_deletion_summary's salon IDs. */
  salonIds: () => Promise<string[]>;
  /** With the service role: every object path under `<prefix>/`, recursively. */
  listMedia: (prefix: string) => Promise<string[]>;
  removeMedia: (paths: string[]) => Promise<void>;
  deleteData: (userId: string, input: DeleteAccountInput) => Promise<void>;
  deleteAuthUser: (userId: string) => Promise<void>;
};

export type DeletionResult =
  { ok: true } | { ok: false; step: "summary" | "media" | "data" | "user" };

/**
 * The spec's order: photos first (a failure there changes nothing else), then the rows, then the
 * auth user. Never logs the token or the details text.
 */
export async function deleteAccount(
  userId: string,
  input: DeleteAccountInput,
  steps: DeletionSteps,
): Promise<DeletionResult> {
  let salonIds: string[];
  try {
    salonIds = await steps.salonIds();
  } catch {
    return { ok: false, step: "summary" };
  }

  try {
    const paths = (await Promise.all(salonIds.map((id) => steps.listMedia(id)))).flat();
    for (let i = 0; i < paths.length; i += REMOVE_BATCH) {
      await steps.removeMedia(paths.slice(i, i + REMOVE_BATCH));
    }
  } catch {
    return { ok: false, step: "media" };
  }

  try {
    await steps.deleteData(userId, input);
  } catch {
    return { ok: false, step: "data" };
  }

  try {
    await steps.deleteAuthUser(userId);
  } catch {
    return { ok: false, step: "user" };
  }
  return { ok: true };
}

type ListEntry = { name: string; id: string | null };
type ListPage = (
  prefix: string,
  offset: number,
) => Promise<{ data: ListEntry[] | null; error: unknown }>;

const PAGE = 1000;

/** Lists a storage folder recursively: entries without an id are folders. */
export async function listRecursive(prefix: string, list: ListPage): Promise<string[]> {
  const paths: string[] = [];
  for (let offset = 0; ; offset += PAGE) {
    const { data, error } = await list(prefix, offset);
    if (error || !data) throw new Error("list failed");
    for (const entry of data) {
      const path = `${prefix}/${entry.name}`;
      if (entry.id === null) paths.push(...(await listRecursive(path, list)));
      else paths.push(path);
    }
    if (data.length < PAGE) return paths;
  }
}

/** At most `limit` attempts per key in a sliding window (per server instance). */
export function createRateLimit(limit: number, windowMs: number) {
  const attempts = new Map<string, number[]>();
  return (key: string, now = Date.now()): boolean => {
    const recent = (attempts.get(key) ?? []).filter((t) => now - t < windowMs);
    if (recent.length >= limit) {
      attempts.set(key, recent);
      return false;
    }
    recent.push(now);
    attempts.set(key, recent);
    return true;
  };
}

/** The token of an `Authorization: Bearer …` header, or null. */
export function bearerToken(headers: Headers): string | null {
  const match = /^Bearer\s+(\S+)$/i.exec(headers.get("authorization")?.trim() ?? "");
  return match?.[1] ?? null;
}

/**
 * The web page's cookie session is only accepted from Bookflow's own pages, sending JSON: a form
 * or script on another site can't trigger a deletion with the visitor's cookies.
 */
export function isSameOriginJson(headers: Headers, requestUrl: string): boolean {
  const origin = headers.get("origin");
  const mediaType = headers.get("content-type")?.split(";")[0]?.trim().toLowerCase();
  return !!origin && origin === new URL(requestUrl).origin && mediaType === "application/json";
}
