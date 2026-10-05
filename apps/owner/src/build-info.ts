type UpdatesInfo = {
  channel: string | null;
  updateId: string | null;
  isEmbeddedLaunch: boolean;
};

/** One-line label so Dennis can tell which channel and EAS update the phone is running. */
export function formatBuildInfo({ channel, updateId, isEmbeddedLaunch }: UpdatesInfo): string {
  const update = isEmbeddedLaunch || !updateId ? "embedded" : updateId.slice(0, 8);
  return `${channel ?? "dev"} · ${update}`;
}

/**
 * The testers' debug APK (ops 03) has no updates; Menu shows "0.5.0-debug · <sha>" from the
 * build's config instead. Null for every other build.
 */
export function debugApkLabel(extra: Record<string, unknown> | undefined | null): string | null {
  const debugApk = extra?.debugApk as { label?: unknown } | undefined;
  return typeof debugApk?.label === "string" ? debugApk.label : null;
}
