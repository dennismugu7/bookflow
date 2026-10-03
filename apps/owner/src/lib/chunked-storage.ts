/** The subset of expo-secure-store that the chunked storage needs, so it can be tested in Node. */
export type KeyValueStore = {
  getItemAsync(key: string): Promise<string | null>;
  setItemAsync(key: string, value: string): Promise<void>;
  deleteItemAsync(key: string): Promise<void>;
};

/**
 * SecureStore holds at most 2048 bytes per item. Session JSON is larger, so values over the limit
 * are split into numbered chunks with a count item. Kept well under 2048 so multibyte text still fits.
 */
export const CHUNK_SIZE = 1800;

const countKey = (key: string) => `${key}.chunks`;
const chunkKey = (key: string, index: number) => `${key}.${index}`;

async function readCount(store: KeyValueStore, key: string): Promise<number> {
  const raw = await store.getItemAsync(countKey(key));
  const count = raw === null ? 0 : Number.parseInt(raw, 10);
  return Number.isInteger(count) && count > 0 ? count : 0;
}

async function removeChunks(store: KeyValueStore, key: string, from = 0): Promise<void> {
  const count = await readCount(store, key);
  for (let index = from; index < count; index++) {
    await store.deleteItemAsync(chunkKey(key, index));
  }
}

/** A storage adapter for supabase-js (getItem/setItem/removeItem) on top of SecureStore. */
export function createChunkedStorage(store: KeyValueStore, chunkSize = CHUNK_SIZE) {
  return {
    async getItem(key: string): Promise<string | null> {
      const count = await readCount(store, key);
      if (count === 0) return store.getItemAsync(key);
      const parts: string[] = [];
      for (let index = 0; index < count; index++) {
        const part = await store.getItemAsync(chunkKey(key, index));
        // A missing chunk means a half-written value: treat it as no session rather than corrupt JSON.
        if (part === null) return null;
        parts.push(part);
      }
      return parts.join("");
    },

    async setItem(key: string, value: string): Promise<void> {
      if (value.length <= chunkSize) {
        await removeChunks(store, key);
        await store.deleteItemAsync(countKey(key));
        await store.setItemAsync(key, value);
        return;
      }
      const parts: string[] = [];
      for (let start = 0; start < value.length; start += chunkSize) {
        parts.push(value.slice(start, start + chunkSize));
      }
      await removeChunks(store, key, parts.length);
      await store.deleteItemAsync(key);
      for (const [index, part] of parts.entries()) {
        await store.setItemAsync(chunkKey(key, index), part);
      }
      await store.setItemAsync(countKey(key), String(parts.length));
    },

    async removeItem(key: string): Promise<void> {
      await removeChunks(store, key);
      await store.deleteItemAsync(countKey(key));
      await store.deleteItemAsync(key);
    },
  };
}
