import { isIP } from "node:net";

/**
 * The visitor's address as Vercel reports it (`x-real-ip`, else the first `x-vercel-forwarded-for`
 * entry). `x-forwarded-for` is never read: visitors can set it themselves (ADR 0008).
 */
export function clientIpFrom(headers: Headers): string | null {
  const candidate =
    headers.get("x-real-ip")?.trim() ||
    headers.get("x-vercel-forwarded-for")?.split(",")[0]?.trim() ||
    "";
  return candidate && isIP(candidate) !== 0 ? candidate : null;
}

/** 32 random bytes as base64url: unguessable, and within the database's token format. */
export function newHoldToken(): string {
  const bytes = new Uint8Array(32);
  crypto.getRandomValues(bytes);
  return Buffer.from(bytes).toString("base64url");
}

/** The httpOnly cookie that carries the hold token; page scripts never see it. */
export const HOLD_COOKIE = "bf_hold";
export const HOLD_COOKIE_MAX_AGE = 600;
