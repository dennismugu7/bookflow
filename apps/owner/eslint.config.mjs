import base, { ignores } from "@bookflow/config/eslint";

export default [...base, { ignores: [...ignores, "expo-env.d.ts", "android/**", "ios/**"] }];
