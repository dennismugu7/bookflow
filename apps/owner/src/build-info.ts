type VersionInfo = {
  version: string;
  isEmbeddedLaunch: boolean;
  createdAt: Date | null;
};

/**
 * Menu's version line: "1.0.0" when running the bundle shipped in the APK, "1.0.0 · update 7 Oct"
 * once an over-the-air update is running (the update's publish date).
 */
export function formatVersionLine(
  { version, isEmbeddedLaunch, createdAt }: VersionInfo,
  timeZone?: string,
): string {
  if (isEmbeddedLaunch || !createdAt) return version;
  const parts = new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "short", timeZone })
    .formatToParts(createdAt);
  const part = (type: Intl.DateTimeFormatPartTypes) => parts.find((p) => p.type === type)?.value;
  return `${version} · update ${part("day")} ${part("month")}`;
}

/**
 * The testers' debug APK (ops 03) has no updates; Menu shows "0.5.0-debug · <sha>" from the
 * build's config instead. Null for every other build.
 */
export function debugApkLabel(extra: Record<string, unknown> | undefined | null): string | null {
  const debugApk = extra?.debugApk as { label?: unknown } | undefined;
  return typeof debugApk?.label === "string" ? debugApk.label : null;
}
