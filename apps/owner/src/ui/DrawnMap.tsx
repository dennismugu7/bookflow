import MaterialCommunityIcons from "@expo/vector-icons/MaterialCommunityIcons";
import { StyleSheet, View, type DimensionValue } from "react-native";

import { colors } from "../theme";

// Our own street pattern with a pin, drawn after owner-v2 07 on a 350 × 180 grid. Not a live
// map (approved deviation until the next APK); tapping it opens the real pin in Google Maps.
const W = 350;
const H = 180;
const COLUMNS = [
  [0, 67],
  [73, 147],
  [153, 227],
  [233, 297],
  [303, 350],
] as const;
const ROWS = [
  [0, 57],
  [63, 117],
  [123, 180],
] as const;
const PARKS = [
  [20, 15, 40, 30],
  [250, 130, 60, 35],
] as const;

const pct = (value: number, of: number): DimensionValue => `${(value / of) * 100}%`;

export function DrawnMap() {
  return (
    <View style={styles.map} accessible={false}>
      {ROWS.flatMap(([top, bottom]) =>
        COLUMNS.map(([left, right]) => (
          <View
            key={`${left}-${top}`}
            style={[
              styles.block,
              {
                left: pct(left, W),
                top: pct(top, H),
                width: pct(right - left, W),
                height: pct(bottom - top, H),
              },
            ]}
          />
        )),
      )}
      {PARKS.map(([left, top, width, height]) => (
        <View
          key={`park-${left}`}
          style={[
            styles.park,
            { left: pct(left, W), top: pct(top, H), width: pct(width, W), height: pct(height, H) },
          ]}
        />
      ))}
      {/* The main road, from the lower left up to the right edge. */}
      <View style={styles.road} />
      <View style={styles.pin}>
        <MaterialCommunityIcons name="map-marker" size={60} color={colors.ink} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  map: { width: "100%", aspectRatio: W / H, backgroundColor: colors.white, overflow: "hidden" },
  block: { position: "absolute", backgroundColor: "#EEF0F5" },
  park: { position: "absolute", backgroundColor: "#D8EFD8", borderRadius: 4 },
  road: {
    position: "absolute",
    left: "-5%",
    width: "110%",
    top: "50%",
    height: 9,
    marginTop: 6,
    backgroundColor: "#C3CEDF",
    transform: [{ rotate: "-20deg" }],
  },
  // The pin's tip sits on the road, as in the mockup.
  pin: { position: "absolute", left: "50%", top: "32%", marginLeft: -30, marginTop: -6 },
});
