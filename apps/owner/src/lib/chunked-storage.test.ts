import { describe, expect, it } from "vitest";

import { createChunkedStorage, type KeyValueStore } from "./chunked-storage";

function memoryStore(limit = 2048) {
  const items = new Map<string, string>();
  const store: KeyValueStore = {
    getItemAsync: async (key) => items.get(key) ?? null,
    setItemAsync: async (key, value) => {
      if (value.length > limit) throw new Error(`value over ${limit} bytes`);
      items.set(key, value);
    },
    deleteItemAsync: async (key) => {
      items.delete(key);
    },
  };
  return { store, items };
}

describe("createChunkedStorage", () => {
  it("stores a small value in one item", async () => {
    const { store, items } = memoryStore();
    const storage = createChunkedStorage(store);
    await storage.setItem("sb-auth", "short");
    expect(await storage.getItem("sb-auth")).toBe("short");
    expect([...items.keys()]).toEqual(["sb-auth"]);
  });

  it("splits a large value into chunks under the SecureStore limit and joins it back", async () => {
    const { store, items } = memoryStore();
    const storage = createChunkedStorage(store);
    const session = JSON.stringify({
      access_token: "x".repeat(5000),
      user: { email: "owner@example.test" },
    });
    await storage.setItem("sb-auth", session);
    expect(await storage.getItem("sb-auth")).toBe(session);
    expect(items.get("sb-auth.chunks")).toBe("3");
    expect(items.has("sb-auth")).toBe(false);
  });

  it("removes leftover chunks when a value shrinks", async () => {
    const { store, items } = memoryStore();
    const storage = createChunkedStorage(store, 10);
    await storage.setItem("k", "a".repeat(35));
    await storage.setItem("k", "b".repeat(15));
    expect(await storage.getItem("k")).toBe("b".repeat(15));
    expect([...items.keys()].sort()).toEqual(["k.0", "k.1", "k.chunks"]);
    await storage.setItem("k", "tiny");
    expect([...items.keys()]).toEqual(["k"]);
  });

  it("removes every item on removeItem", async () => {
    const { store, items } = memoryStore();
    const storage = createChunkedStorage(store, 10);
    await storage.setItem("k", "a".repeat(25));
    await storage.removeItem("k");
    expect(items.size).toBe(0);
    expect(await storage.getItem("k")).toBeNull();
  });

  it("returns null instead of corrupt data when a chunk is missing", async () => {
    const { store, items } = memoryStore();
    const storage = createChunkedStorage(store, 10);
    await storage.setItem("k", "a".repeat(25));
    items.delete("k.1");
    expect(await storage.getItem("k")).toBeNull();
  });

  it("returns null for a key that was never set", async () => {
    const { store } = memoryStore();
    expect(await createChunkedStorage(store).getItem("missing")).toBeNull();
  });
});
