const baseExpoConfig = require("./app.json").expo;
const fs = require("fs");
const path = require("path");

for (const envFile of [".env", ".env.local"]) {
  const envPath = path.join(__dirname, envFile);

  if (!fs.existsSync(envPath)) {
    continue;
  }

  for (const line of fs.readFileSync(envPath, "utf8").split(/\r?\n/)) {
    const match = line.match(/^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)\s*$/);

    if (!match || process.env[match[1]]) {
      continue;
    }

    process.env[match[1]] = match[2].replace(/^['"]|['"]$/g, "");
  }
}

if (!process.env.EXPO_PUBLIC_SPOTIFY_CLIENT_ID && process.env.SPOTIFY_CLIENT_ID) {
  process.env.EXPO_PUBLIC_SPOTIFY_CLIENT_ID = process.env.SPOTIFY_CLIENT_ID;
}

const readEnv = (name) => process.env[name]?.trim() ?? "";
const isProduction =
  readEnv("EXPO_PUBLIC_APP_ENV") === "production" ||
  readEnv("EAS_BUILD_PROFILE") === "production";
const { resolveAdsConfig } = require("./config/ads.cjs");
const ads = resolveAdsConfig(process.env);
if (ads.errors.length) throw new Error(ads.errors.join("\n"));

const easProjectId =
  readEnv("EXPO_PUBLIC_EAS_PROJECT_ID") ||
  "6082c389-429e-456e-9e04-6889b12cc23c";

const plugins = baseExpoConfig.plugins.filter((plugin) => (Array.isArray(plugin) ? plugin[0] : plugin) !== "expo-tracking-transparency").map((plugin) => {
  if (Array.isArray(plugin) && plugin[0] === "react-native-google-mobile-ads") {
    return [
      plugin[0],
      {
        ...plugin[1],
        androidAppId: ads.appIds.android,
        iosAppId: ads.appIds.ios,
        delayAppMeasurementInit: true,
        userTrackingUsageDescription: ads.trackingDescription,
      },
    ];
  }

  return plugin;
});

plugins.push(["expo-tracking-transparency", { userTrackingPermission: ads.trackingDescription }]);

module.exports = {
  ...baseExpoConfig,
  extra: {
    ...(baseExpoConfig.extra ?? {}),
    ...(easProjectId
      ? {
          eas: {
            ...(baseExpoConfig.extra?.eas ?? {}),
            projectId: easProjectId,
          },
        }
      : {}),
  },
  plugins,
};
