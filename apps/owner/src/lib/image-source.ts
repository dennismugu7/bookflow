/** State of one image slot (logo, banner, staff photo). */
export type ImageSlotState = {
  /** The saved storage path, or null when nothing is saved. */
  path: string | null;
  /** The picked, resized file on this phone, shown until the remote copy has loaded. */
  localUri?: string;
  /** True once the remote copy of `path` has been downloaded at least once. */
  remoteReady: boolean;
  /** Cache-buster for the remote URL, e.g. the upload time. */
  version?: string | number;
};

/** Adds `v=<version>` so a replaced image never shows a stale cached copy. */
export function withVersion(url: string, version: string | number | undefined): string {
  if (version === undefined || version === "") return url;
  return `${url}${url.includes("?") ? "&" : "?"}v=${encodeURIComponent(String(version))}`;
}

/**
 * Which source the slot shows: the local file while it uploads or until the remote copy is
 * ready, then the versioned remote URL, else nothing (empty placeholder).
 */
export function imageSource(
  state: ImageSlotState,
  toUrl: (path: string) => string,
): string | undefined {
  if (state.localUri && !(state.path && state.remoteReady)) return state.localUri;
  if (state.path) return withVersion(toUrl(state.path), state.version);
  return undefined;
}
