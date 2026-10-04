const E164 = /^\+[1-9][0-9]{7,14}$/;

/**
 * Normalises a phone number typed by a client to E.164, defaulting to Kenya (+254):
 * "0700 000 021" → "+254700000021". Returns null if the result isn't valid E.164.
 * Mirrors `private.normalize_kenyan_phone` in the database, which stays the authority.
 */
export function normalizeKenyanPhone(input: string): string | null {
  const stripped = input.replace(/[\s()-]/g, "");
  let phone = stripped;
  if (/^0[0-9]{9}$/.test(stripped)) {
    phone = `+254${stripped.slice(1)}`;
  } else if (/^254[0-9]{9}$/.test(stripped)) {
    phone = `+${stripped}`;
  }
  return E164.test(phone) ? phone : null;
}

/** "+254712345678" → "0712 345 678"; other numbers are returned as they are. */
export function formatKenyanPhone(e164: string): string {
  const match = /^\+254(\d{3})(\d{3})(\d{3})$/.exec(e164);
  return match ? `0${match[1]} ${match[2]} ${match[3]}` : e164;
}
