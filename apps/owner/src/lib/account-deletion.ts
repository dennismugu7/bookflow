import { WEB_BASE_URL, type DeletionReason } from "@bookflow/shared";

export const DELETE_ERROR = "Couldn't delete your account. Check your connection and try again.";

export type DeleteResult = { ok: true } | { ok: false; message: string };

/** The web app's address: production, or EXPO_PUBLIC_WEB_URL for a local run. */
export function webUrl(override?: string): string {
  return (override || WEB_BASE_URL).replace(/\/$/, "");
}

/**
 * POST /api/account/delete with the access token (owner-v7 04). The server removes the salon's
 * photos, its rows and the auth user.
 */
export async function requestAccountDeletion(
  input: { reason: DeletionReason; details: string },
  accessToken: string,
  baseUrl: string,
  fetchImpl: (url: string, init: RequestInit) => Promise<Response> = fetch,
): Promise<DeleteResult> {
  try {
    const response = await fetchImpl(`${baseUrl}/api/account/delete`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${accessToken}` },
      body: JSON.stringify({
        reason: input.reason,
        ...(input.details.trim() ? { details: input.details.trim() } : {}),
      }),
    });
    if (response.ok) return { ok: true };
    const body = (await response.json().catch(() => null)) as { message?: unknown } | null;
    return {
      ok: false,
      message: typeof body?.message === "string" ? body.message : DELETE_ERROR,
    };
  } catch {
    return { ok: false, message: DELETE_ERROR };
  }
}
