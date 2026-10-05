/**
 * The slider's photos: the salon_photos rows, or just the banner when there are none (or the
 * table can't be read yet, e.g. while a deploy waits for its migration).
 */
export function slidePaths(paths: string[], bannerPath: string | null): string[] {
  if (paths.length > 0) return paths;
  return bannerPath ? [bannerPath] : [];
}

/** The slide in view for a scroll position, kept within the slides. */
export function slideIndex(scrollLeft: number, slideWidth: number, count: number): number {
  if (count === 0 || slideWidth <= 0) return 0;
  return Math.min(count - 1, Math.max(0, Math.round(scrollLeft / slideWidth)));
}

/** "Salome Saloon, photo 2 of 3". */
export function slideAlt(name: string, index: number, count: number): string {
  return `${name}, photo ${index + 1} of ${count}`;
}
