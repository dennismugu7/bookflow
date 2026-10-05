/** Salon photos on My brand (owner-v6 01): up to six, the first is the banner. */

export const MAX_PHOTOS = 6;

/** One tile in the grid: an uploaded photo, or one still uploading from this phone. */
export type PhotoItem = {
  key: string;
  /** Storage path once uploaded. */
  path?: string;
  /** The picked file, shown until the remote copy has loaded. */
  localUri?: string;
};

export const canAddPhoto = (photos: readonly PhotoItem[]) => photos.length < MAX_PHOTOS;

/** "3 of 6". */
export const photoCount = (photos: readonly PhotoItem[]) => `${photos.length} of ${MAX_PHOTOS}`;

/** Moves the photo to the front, where it becomes the banner. */
export function makeBanner(photos: readonly PhotoItem[], key: string): PhotoItem[] {
  const photo = photos.find((p) => p.key === key);
  if (!photo) return [...photos];
  return [photo, ...photos.filter((p) => p.key !== key)];
}

export function removePhoto(photos: readonly PhotoItem[], key: string): PhotoItem[] {
  return photos.filter((p) => p.key !== key);
}

/** The paths to save, in order; undefined while any photo is still uploading. */
export function photoPaths(photos: readonly PhotoItem[]): string[] | undefined {
  const paths = photos.map((p) => p.path);
  return paths.every((p): p is string => !!p) ? paths : undefined;
}

export function samePaths(a: readonly string[], b: readonly string[]): boolean {
  return a.length === b.length && a.every((p, i) => p === b[i]);
}

/**
 * Files to delete from storage: saved or freshly uploaded paths that the kept list no longer
 * uses. A leftover file is harmless, so callers delete these best-effort.
 */
export function unusedPaths(candidates: Iterable<string>, kept: readonly string[]): string[] {
  const keep = new Set(kept);
  return [...new Set(candidates)].filter((p) => !keep.has(p));
}
