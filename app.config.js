const baseExpoConfig = require("./app.json").expo;

const readEnv = (name) => process.env[name]?.trim() ?? "";
const isProduction = readEnv("EXPO_PUBLIC_APP_ENV") === "production";

const requireProductionValue = (name, fallback) => {
  const value = readEnv(name) || fallback;

  if (isProduction && !readEnv(name)) {
    throw new Error(`${name} is required for production Expo config.`);
  }

  return value;
};

const iosAdMobAppId = requireProductionValue(
  "EXPO_PUBLIC_ADMOB_IOS_APP_ID",
  "ca-app-pub-3940256099942544~1458002511",
);
const androidAdMobAppId = requireProductionValue(
  "EXPO_PUBLIC_ADMOB_ANDROID_APP_ID",
  "ca-app-pub-3940256099942544~3347511713",
);
const easProjectId = readEnv("EXPO_PUBLIC_EAS_PROJECT_ID");

const plugins = baseExpoConfig.plugins.map((plugin) => {
  if (Array.isArray(plugin) && plugin[0] === "react-native-google-mobile-ads") {
    return [
      plugin[0],
      {
        ...plugin[1],
        androidAppId: androidAdMobAppId,
        iosAppId: iosAdMobAppId,
      },
    ];
  }

  return plugin;
});

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
