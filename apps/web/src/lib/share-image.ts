/** The share image's URL path, versioned by the salon's updated_at so edits show a new image. */
export function shareImagePath(slug: string, updatedAt: string): string {
  return `/s/${slug}/share-image?v=${encodeURIComponent(updatedAt)}`;
}

/** "Kilimani, Nairobi · Book online", or just "Book online" without an area. */
export function shareImageSubtitle(area: string | null): string {
  return area ? `${area} · Book online` : "Book online";
}

/** The salon's first letter for the logo circle when there is no logo. */
export function shareImageInitial(name: string): string {
  return Array.from(name.trim())[0]?.toUpperCase() ?? "B";
}
