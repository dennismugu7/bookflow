import { PRIVACY_URL, TERMS_URL } from "@bookflow/shared";
import * as WebBrowser from "expo-web-browser";

import { colors } from "../theme";

/** The privacy policy or terms in the in-app browser (Settings and the Create account sheet). */
export function openLegal(page: "privacy" | "terms"): void {
  void WebBrowser.openBrowserAsync(page === "privacy" ? PRIVACY_URL : TERMS_URL, {
    toolbarColor: colors.white,
    controlsColor: colors.action,
  }).catch(() => undefined);
}
