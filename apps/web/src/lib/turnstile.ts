import "server-only";

const SITEVERIFY = "https://challenges.cloudflare.com/turnstile/v0/siteverify";

/** True when Cloudflare confirms the widget token for this visitor. Network errors count as failure. */
export async function verifyTurnstile(
  token: string,
  secretKey: string,
  remoteIp: string,
): Promise<boolean> {
  try {
    const body = new URLSearchParams({ secret: secretKey, response: token, remoteip: remoteIp });
    const response = await fetch(SITEVERIFY, { method: "POST", body, cache: "no-store" });
    if (!response.ok) return false;
    const result = (await response.json()) as { success?: boolean };
    return result.success === true;
  } catch {
    return false;
  }
}
