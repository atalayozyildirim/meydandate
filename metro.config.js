const { getDefaultConfig } = require("expo/metro-config");
const path = require("path");

const config = getDefaultConfig(__dirname);
const existing = config.resolver.blockList;
config.resolver.blockList = [
  ...(Array.isArray(existing) ? existing : existing ? [existing] : []),
  // Environment files are configuration, never JavaScript modules or assets.
  /[/\\]\.env(?:\.[^/\\]+)?$/,
];

config.resolver.extraNodeModules = {
  ...config.resolver.extraNodeModules,
  "expo-router/native-tabs": path.resolve(
    __dirname,
    "node_modules/expo-router/unstable-native-tabs.js"
  ),
};

module.exports = config;
