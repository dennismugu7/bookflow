import { Image, type ImageStyle, type StyleProp } from "react-native";

import map from "./map.png";
import planets from "./planets.png";
import screens from "./screens.png";

// Our own art, drawn after designs 12, 44, 47, 50 and 59. Sources are the SVGs next to these
// PNGs; re-render with `node apps/owner/scripts/render-art.mjs`.
const ART = {
  planets: { source: planets, width: 156, height: 138 },
  screens: { source: screens, width: 172, height: 144 },
  map: { source: map, width: 280, height: 156 },
} as const;

type Props = { name: keyof typeof ART; scale?: number; style?: StyleProp<ImageStyle> };

/** Decorative only, so screen readers skip it. */
export function Illustration({ name, scale = 1, style }: Props) {
  const art = ART[name];
  return (
    <Image
      source={art.source}
      accessible={false}
      style={[{ width: art.width * scale, height: art.height * scale, alignSelf: "center" }, style]}
    />
  );
}

export { default as brandBackground } from "./brand-background.png";
export { default as logoMark } from "./logo-mark.png";
