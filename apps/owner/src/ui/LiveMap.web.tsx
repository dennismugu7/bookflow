import { mapsEmbedUrl } from "@bookflow/shared";
import { StyleSheet, View } from "react-native";

import { DrawnMap } from "./DrawnMap";

// The web target exists only for design captures (app.config.js), where react-native-webview has
// no implementation: the same embed in an iframe, over the drawn map.
export function LiveMap({ query }: { query: string }) {
  return (
    <View style={styles.fill} pointerEvents="none" accessible={false}>
      <DrawnMap fill />
      <iframe
        title="Map"
        src={mapsEmbedUrl(query)}
        referrerPolicy="no-referrer"
        style={{ position: "absolute", inset: 0, width: "100%", height: "100%", border: 0 }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  fill: { position: "absolute", top: 0, right: 0, bottom: 0, left: 0 },
});
