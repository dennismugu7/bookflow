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
