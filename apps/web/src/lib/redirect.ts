/**
 * The path to send someone to after sign-in. Only same-origin paths are allowed: "/s/x/confirm"
 * passes; "https://evil.example", "//evil.example" and "/\\evil.example" fall back to "/".
 */
export function safeNext(next: string | null | undefined, fallback = "/"): string {
  if (!next || !next.startsWith("/") || next.startsWith("//") || next.startsWith("/\\"))
    return fallback;
  try {
    const url = new URL(next, "https://bookflow.invalid");
    if (url.origin !== "https://bookflow.invalid") return fallback;
    return `${url.pathname}${url.search}${url.hash}`;
  } catch {
    return fallback;
  }
}
