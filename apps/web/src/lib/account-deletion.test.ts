import { describe, expect, it } from "vitest";

import {
  bearerToken,
  createRateLimit,
  deleteAccount,
  deleteAccountBody,
  listRecursive,
  type DeletionSteps,
} from "./account-deletion";

describe("deleteAccountBody", () => {
  it("accepts the four reasons, with optional details", () => {
    expect(deleteAccountBody.safeParse({ reason: "accident" }).success).toBe(true);
    expect(deleteAccountBody.parse({ reason: "other", details: "  Moving  " })).toEqual({
      reason: "other",
      details: "Moving",
    });
  });

  it("refuses an unknown reason, a missing body or long details", () => {
    expect(deleteAccountBody.safeParse({ reason: "bored" }).success).toBe(false);
    expect(deleteAccountBody.safeParse(null).success).toBe(false);
    expect(deleteAccountBody.safeParse({}).success).toBe(false);
    expect(deleteAccountBody.safeParse({ reason: "other", details: "a".repeat(301) }).success).toBe(
      false,
    );
    expect(deleteAccountBody.safeParse({ reason: "other", details: 5 }).success).toBe(false);
  });
});

function fakeSteps(fail?: keyof DeletionSteps, files: Record<string, string[]> = {}) {
  const calls: string[] = [];
  const step =
    <A extends unknown[], R>(name: keyof DeletionSteps, value: (...args: A) => R) =>
    async (...args: A) => {
      calls.push(`${name}:${JSON.stringify(args)}`);
      if (fail === name) throw new Error(name);
      return value(...args);
    };
  const steps: DeletionSteps = {
    salonIds: step("salonIds", () => Object.keys(files)),
    listMedia: step("listMedia", (prefix: string) => files[prefix] ?? []),
    removeMedia: step("removeMedia", () => undefined),
    deleteData: step("deleteData", () => undefined),
    deleteAuthUser: step("deleteAuthUser", () => undefined),
  };
  return { steps, calls, names: () => calls.map((c) => c.split(":")[0]) };
}

describe("deleteAccount", () => {
  it("removes photos, then the data, then the auth user", async () => {
    const { steps, names, calls } = fakeSteps(undefined, { s1: ["s1/banner/a.jpg"] });
    await expect(deleteAccount("u1", { reason: "accident" }, steps)).resolves.toEqual({ ok: true });
    expect(names()).toEqual([
      "salonIds",
      "listMedia",
      "removeMedia",
      "deleteData",
      "deleteAuthUser",
    ]);
    expect(calls[3]).toBe('deleteData:["u1",{"reason":"accident"}]');
  });

  it("removes in batches of 100", async () => {
    const paths = Array.from({ length: 250 }, (_, i) => `s1/banner/${i}.jpg`);
    const { steps, calls } = fakeSteps(undefined, { s1: paths });
    await deleteAccount("u1", { reason: "accident" }, steps);
    const batches = calls
      .filter((c) => c.startsWith("removeMedia"))
      .map((c) => (JSON.parse(c.slice("removeMedia:".length)) as string[][])[0]?.length);
    expect(batches).toEqual([100, 100, 50]);
  });

  it("skips storage for a person without a salon", async () => {
    const { steps, names } = fakeSteps();
    await deleteAccount("u1", { reason: "accident" }, steps);
    expect(names()).toEqual(["salonIds", "deleteData", "deleteAuthUser"]);
  });

  it("changes nothing else when the photos can't be removed", async () => {
    const { steps, names } = fakeSteps("removeMedia", { s1: ["s1/banner/a.jpg"] });
    await expect(deleteAccount("u1", { reason: "accident" }, steps)).resolves.toEqual({
      ok: false,
      step: "media",
    });
    expect(names()).not.toContain("deleteData");
    expect(names()).not.toContain("deleteAuthUser");
  });

  it("stops before the photos when the summary fails", async () => {
    const { steps, names } = fakeSteps("salonIds");
    await expect(deleteAccount("u1", { reason: "accident" }, steps)).resolves.toEqual({
      ok: false,
      step: "summary",
    });
    expect(names()).toEqual(["salonIds"]);
  });

  it("keeps the auth user when the data step fails", async () => {
    const { steps, names } = fakeSteps("deleteData");
    await expect(deleteAccount("u1", { reason: "accident" }, steps)).resolves.toEqual({
      ok: false,
      step: "data",
    });
    expect(names()).not.toContain("deleteAuthUser");
  });

  it("reports a failed auth deletion", async () => {
    const { steps } = fakeSteps("deleteAuthUser");
    await expect(deleteAccount("u1", { reason: "accident" }, steps)).resolves.toEqual({
      ok: false,
      step: "user",
    });
  });
});

describe("listRecursive", () => {
  it("walks folders and pages", async () => {
    const tree: Record<string, { name: string; id: string | null }[]> = {
      s1: [
        { name: "banner", id: null },
        { name: "logo.jpg", id: "1" },
      ],
      "s1/banner": Array.from({ length: 1001 }, (_, i) => ({ name: `${i}.jpg`, id: String(i) })),
    };
    const paths = await listRecursive("s1", async (prefix, offset) => ({
      data: (tree[prefix] ?? []).slice(offset, offset + 1000),
      error: null,
    }));
    expect(paths).toHaveLength(1002);
    expect(paths).toContain("s1/logo.jpg");
    expect(paths).toContain("s1/banner/1000.jpg");
  });

  it("throws when listing fails", async () => {
    await expect(
      listRecursive("s1", async () => ({ data: null, error: new Error("x") })),
    ).rejects.toThrow();
  });
});

describe("createRateLimit", () => {
  it("allows 5 attempts per user per hour", () => {
    const allow = createRateLimit(5, 3_600_000);
    for (let i = 0; i < 5; i++) expect(allow("u1", i)).toBe(true);
    expect(allow("u1", 10)).toBe(false);
    expect(allow("u2", 10)).toBe(true);
    expect(allow("u1", 3_600_001)).toBe(true);
  });
});

describe("bearerToken", () => {
  it("reads the Authorization header", () => {
    expect(bearerToken(new Headers({ authorization: "Bearer abc.def" }))).toBe("abc.def");
    expect(bearerToken(new Headers({ authorization: "Basic abc" }))).toBeNull();
    expect(bearerToken(new Headers())).toBeNull();
  });
});
