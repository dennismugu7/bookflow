import { normalizeKenyanPhone } from "@bookflow/shared";

/**
 * Reads the phone field, which shows a "+254" prefix: "700 000 021" (no leading 0) is accepted
 * as well as "0700 000 021" and "+254700000021". Returns E.164 or null.
 */
export function phoneFromField(input: string): string | null {
  const compact = input.replace(/[\s()-]/g, "");
  return normalizeKenyanPhone(/^[17]\d{8}$/.test(compact) ? `0${compact}` : input);
}
