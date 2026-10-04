import { useState } from "react";
import { StyleSheet, View } from "react-native";
import { WebView, type WebViewMessageEvent } from "react-native-webview";

import { allowMapNavigation, mapEmbedHtml, type MapPageMessage } from "../lib/map-embed";
import { DrawnMap } from "./DrawnMap";

/**
 * A real map of `query` (Google's keyless embed) in a locked-down, non-interactive WebView. Our
 * drawn map shows while it loads and stays if it fails, e.g. offline. The caller keys it by `query`
 * and puts a tap layer on top.
 */
export function LiveMap({ query }: { query: string }) {
  const [state, setState] = useState<"loading" | MapPageMessage>("loading");

  function onMessage({ nativeEvent }: WebViewMessageEvent) {
    // Only our page's two messages count; the map keeps whatever state it reached first.
    const message = nativeEvent.data;
    if (state === "loading" && (message === "loaded" || message === "failed")) setState(message);
  }

  return (
    <View style={styles.fill} pointerEvents="none" accessible={false}>
      <DrawnMap fill />
      {state === "failed" ? null : (
        <WebView
          source={{ html: mapEmbedHtml(query) }}
          style={[styles.fill, styles.web, state === "loaded" ? null : styles.hidden]}
          // "*" hands every navigation to our guard; a narrower list would make the library open
          // the rest in the browser, and anything but the embed must be blocked silently.
          originWhitelist={["*"]}
          onShouldStartLoadWithRequest={({ url }) => allowMapNavigation(url)}
          onMessage={onMessage}
          javaScriptEnabled
          domStorageEnabled={false}
          allowFileAccess={false}
          allowFileAccessFromFileURLs={false}
          allowUniversalAccessFromFileURLs={false}
          setSupportMultipleWindows={false}
          javaScriptCanOpenWindowsAutomatically={false}
          mixedContentMode="never"
          thirdPartyCookiesEnabled={false}
          geolocationEnabled={false}
          saveFormDataDisabled
          scrollEnabled={false}
          overScrollMode="never"
          setBuiltInZoomControls={false}
          onError={() => setState("failed")}
          onHttpError={() => setState("failed")}
          onRenderProcessGone={() => setState("failed")}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  fill: { position: "absolute", top: 0, right: 0, bottom: 0, left: 0 },
  web: { backgroundColor: "transparent" },
  hidden: { opacity: 0 },
});
