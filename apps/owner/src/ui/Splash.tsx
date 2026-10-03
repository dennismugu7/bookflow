import { Image, StyleSheet } from "react-native";

import { BrandBackdrop } from "./BrandBackdrop";
import { logoMark } from "./illustrations";

/** The B mark on the brand gradient (01), shown while the session and fonts load. */
export function Splash() {
  return (
    <BrandBackdrop style={styles.fill}>
      <Image source={logoMark} style={styles.logo} accessibilityLabel="Bookflow" />
    </BrandBackdrop>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: "#2A1D84" },
  logo: { width: 107, height: 146, marginTop: 34 },
});
