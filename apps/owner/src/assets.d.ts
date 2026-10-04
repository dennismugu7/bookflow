// Bundled images resolve to an asset reference React Native's <Image> accepts.
declare module "*.png" {
  import type { ImageSourcePropType } from "react-native";

  const source: ImageSourcePropType;
  export default source;
}
