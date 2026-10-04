// The live map on Location loads Google's keyless embed (`mapsEmbedUrl` in @bookflow/shared) in a
// locked-down WebView. These are the only pages it may load: the embed itself and the page it
// redirects to.
import { mapsEmbedUrl } from "@bookflow/shared";

/** Origins the WebView may load at all (its `originWhitelist`). */
export const MAP_ORIGINS = ["https://maps.google.com", "https://www.google.com"] as const;

/** True only for `https://maps.google.com/maps?…output=embed` and `https://www.google.com/maps/embed?…`. */
export function isMapEmbedUrl(url: string): boolean {
  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    return false;
  }
  // `origin` rejects other schemes, ports, credentials tricks and look-alike hosts.
  if (parsed.username || parsed.password) return false;
  if (parsed.origin === "https://maps.google.com") {
    return parsed.pathname === "/maps" && parsed.searchParams.get("output") === "embed";
  }
  if (parsed.origin === "https://www.google.com") {
    return parsed.pathname === "/maps/embed";
  }
  return false;
}

/** What the map shows: the saved pin, else the place name from the link, else the address. */
export function mapQuery({
  lat,
  lng,
  placeName,
  address,
}: {
  lat: number | null;
  lng: number | null;
  placeName: string | null;
  address: string;
}): string | null {
  if (lat !== null && lng !== null) return `${lat},${lng}`;
  return placeName?.trim() || address.trim() || null;
}

/** What the map page tells the app: the map is showing, or it can't load (e.g. offline). */
export type MapPageMessage = "loaded" | "failed";

/** How long the map may take before we keep the drawn map instead. */
export const MAP_TIMEOUT_MS = 15_000;

/**
 * The page the WebView loads. Google only renders the embed inside an iframe ("The Google Maps
 * Embed API must be used in an iframe"), so this holds it in one. A tiny image from Google is
 * fetched first, because Android doesn't report an iframe that fails to load: if it fails, the
 * page says "failed" and the app keeps the drawn map.
 */
export function mapEmbedHtml(query: string): string {
  // JSON plus escaped "<" keeps any query inside the script string.
  const src = JSON.stringify(mapsEmbedUrl(query)).replace(/</g, "\\u003c");
  return `<!doctype html><html><head><meta name="viewport" content="width=device-width,initial-scale=1">
<style>html,body{margin:0;height:100%;overflow:hidden;background:transparent}iframe{border:0;width:100%;height:100%;display:block}</style>
</head><body><script>
(function () {
  var done = false;
  function send(message) {
    if (done) return;
    done = true;
    if (window.ReactNativeWebView) window.ReactNativeWebView.postMessage(message);
  }
  setTimeout(function () { send("failed"); }, ${MAP_TIMEOUT_MS});
  var probe = new Image();
  probe.onerror = function () { send("failed"); };
  probe.onload = function () {
    var frame = document.createElement("iframe");
    frame.title = "Map";
    frame.referrerPolicy = "no-referrer";
    frame.onload = function () { send("loaded"); };
    frame.src = ${src};
    document.body.appendChild(frame);
  };
  probe.src = "https://www.google.com/favicon.ico?" + Date.now();
})();
</script></body></html>`;
}
