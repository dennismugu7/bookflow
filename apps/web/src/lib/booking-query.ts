/**
 * The client's choices travel in the URL so a refresh or the Google sign-in round-trip keeps them:
 * `?services=<id,id>&staff=<id|any>&start=<iso>&expires=<iso>&held=<staff id>`.
 */
export type BookingChoice = {
  serviceIds: string[];
  staffId: string | null;
  startsAt?: string;
  expiresAt?: string;
  heldStaffId?: string;
};

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const isIso = (value: string | null): value is string =>
  !!value && !Number.isNaN(Date.parse(value));

type Params = URLSearchParams | Record<string, string | string[] | undefined>;

function get(params: Params, key: string): string | null {
  if (params instanceof URLSearchParams) return params.get(key);
  const value = params[key];
  return Array.isArray(value) ? (value[0] ?? null) : (value ?? null);
}

export function readChoice(params: Params): BookingChoice {
  const serviceIds = [
    ...new Set((get(params, "services") ?? "").split(",").filter((id) => UUID.test(id))),
  ].slice(0, 10);
  const staff = get(params, "staff");
  const start = get(params, "start");
  const expires = get(params, "expires");
  const held = get(params, "held");
  return {
    serviceIds,
    staffId: staff && UUID.test(staff) ? staff : null,
    startsAt: isIso(start) ? start : undefined,
    expiresAt: isIso(expires) ? expires : undefined,
    heldStaffId: held && UUID.test(held) ? held : undefined,
  };
}

export function choiceQuery(choice: BookingChoice): string {
  const params = new URLSearchParams();
  params.set("services", choice.serviceIds.join(","));
  params.set("staff", choice.staffId ?? "any");
  if (choice.startsAt) params.set("start", choice.startsAt);
  if (choice.expiresAt) params.set("expires", choice.expiresAt);
  if (choice.heldStaffId) params.set("held", choice.heldStaffId);
  return params.toString();
}
