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

const readEnv = (name) => process.env[name]?.trim() ?? "";
const isProduction =
  readEnv("EXPO_PUBLIC_APP_ENV") === "production" ||
  readEnv("EAS_BUILD_PROFILE") === "production";
const isPlaceholder = (value) =>
  !value ||
  /your-|your_|placeholder|example|your-project/i.test(value) ||
  value.includes("3940256099942544");

const requireProductionAdMobAppId = (name, fallback) => {
  const value = readEnv(name) || fallback;

  if (
    isProduction &&
    (isPlaceholder(readEnv(name)) || !/^ca-app-pub-\d+~\d+$/.test(value))
  ) {
    throw new Error(`${name} must be a production AdMob app id for Expo config.`);
  }

  return value;
};

const iosAdMobAppId = requireProductionAdMobAppId(
  "EXPO_PUBLIC_ADMOB_IOS_APP_ID",
  "ca-app-pub-3940256099942544~1458002511",
);
const androidAdMobAppId = requireProductionAdMobAppId(
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
