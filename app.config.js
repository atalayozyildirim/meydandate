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

const isValidAdMobAppId = (value) => /^ca-app-pub-\d+~\d+$/.test(value);

const resolveAdMobAppId = (name, fallback) => {
  const configuredValue = readEnv(name);
  const value =
    configuredValue &&
    !isPlaceholder(configuredValue) &&
    isValidAdMobAppId(configuredValue)
      ? configuredValue
      : fallback;

  if (
    isProduction &&
    (!configuredValue ||
      isPlaceholder(configuredValue) ||
      !isValidAdMobAppId(configuredValue))
  ) {
    console.warn(
      `${name} is not configured with a production AdMob app id. Falling back to Google test app id for this build.`,
    );
  }

  return value;
};

const iosAdMobAppId = resolveAdMobAppId(
  "EXPO_PUBLIC_ADMOB_IOS_APP_ID",
  "ca-app-pub-3940256099942544~1458002511",
);
const androidAdMobAppId = resolveAdMobAppId(
  "EXPO_PUBLIC_ADMOB_ANDROID_APP_ID",
  "ca-app-pub-3940256099942544~3347511713",
);
const easProjectId =
  readEnv("EXPO_PUBLIC_EAS_PROJECT_ID") ||
  "6082c389-429e-456e-9e04-6889b12cc23c";

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
