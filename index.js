import "react-native-url-polyfill/auto";
import { isExpoGo } from "./src/shared/utils/expoRuntime";

if (!isExpoGo) {
  try {
    const { registerGlobals } = require("@livekit/react-native");
    registerGlobals();
  } catch {
    // LiveKit native module is only available in development/EAS builds.
  }
}

import "expo-router/entry";
