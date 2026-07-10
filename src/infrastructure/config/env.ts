// Runtime konfig degerleri tek noktadan okunur.
type AppEnvironment = "development" | "preview" | "production";

const readEnv = (value: string | undefined) => value?.trim() ?? "";
const rawAppEnv = readEnv(process.env.EXPO_PUBLIC_APP_ENV);
const appEnv: AppEnvironment =
  rawAppEnv === "production" || rawAppEnv === "preview"
    ? rawAppEnv
    : __DEV__
      ? "development"
      : "production";

const supabaseUrl = readEnv(process.env.EXPO_PUBLIC_SUPABASE_URL);
const supabasePublishableKey =
  readEnv(process.env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY) ||
  readEnv(process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY) ||
  readEnv(process.env.EXPO_PUBLIC_SUPABASE_KEY);

const tenorApiKey = readEnv(process.env.EXPO_PUBLIC_TENOR_API_KEY);
const giphyApiKey = readEnv(process.env.EXPO_PUBLIC_GIPHY_API_KEY);
const spotifyClientId =
  readEnv(process.env.EXPO_PUBLIC_SPOTIFY_CLIENT_ID) ||
  readEnv(process.env.SPOTIFY_CLIENT_ID);
const spotifyRedirectUri =
  readEnv(process.env.EXPO_PUBLIC_SPOTIFY_REDIRECT_URI) ||
  "ehlibyte://spotify/callback";
const enableAiStarterProfiles =
  readEnv(process.env.EXPO_PUBLIC_ENABLE_AI_STARTER_PROFILES) === "true";
const enableAds = readEnv(process.env.EXPO_PUBLIC_ENABLE_ADS) === "true";

const isPlaceholder = (value: string, fragments: string[]) =>
  !value || fragments.some((fragment) => value.includes(fragment));
const hasSafeIdentifierFormat = (value: string) => /^[A-Za-z0-9_.-]+$/.test(value);
const hasSupabaseCredentials =
  !isPlaceholder(supabaseUrl, ["your-project", "example", "localhost"]) &&
  !isPlaceholder(supabasePublishableKey, ["your_key", "your-key", "placeholder"]);
const explicitUseSupabase = readEnv(process.env.EXPO_PUBLIC_USE_SUPABASE);
const useSupabase =
  explicitUseSupabase === ""
    ? appEnv === "production" || hasSupabaseCredentials
    : explicitUseSupabase === "true";
const explicitUseRevenueCat = readEnv(process.env.EXPO_PUBLIC_USE_REVENUECAT);
const useRevenueCatPayments =
  explicitUseRevenueCat === ""
    ? appEnv === "production"
    : explicitUseRevenueCat === "true";
const requestedUseRevenueCatTestStore =
  readEnv(process.env.EXPO_PUBLIC_REVENUECAT_USE_TEST_STORE) === "true";
const useRevenueCatTestStore =
  __DEV__ && appEnv !== "production" && requestedUseRevenueCatTestStore;

export const env = {
  appEnv,
  isProduction: appEnv === "production",
  apiBaseUrl: readEnv(process.env.EXPO_PUBLIC_API_BASE_URL) || "https://api.ehlibyte.local",
  supabaseUrl,
  supabaseAnonKey: supabasePublishableKey,
  useMockServices: !useSupabase,
  useLiveApi: process.env.EXPO_PUBLIC_USE_LIVE_API === "true",
  secureTokenKey: "ehlibyte-access-token",
  secureRefreshTokenKey: "ehlibyte-refresh-token",
  permanentBanKey: "ehlibyte-permanent-ban",
  knowledgeTestAttemptKey: "ehlibyte-knowledge-test-attempt",
  introSeenKey: "ehlibyte-intro-seen-v1",
  revenueCatIosApiKey: readEnv(process.env.EXPO_PUBLIC_REVENUECAT_IOS_API_KEY),
  revenueCatAndroidApiKey:
    readEnv(process.env.EXPO_PUBLIC_REVENUECAT_ANDROID_API_KEY),
  revenueCatTestApiKey: readEnv(process.env.EXPO_PUBLIC_REVENUECAT_TEST_API_KEY),
  revenueCatEntitlementId:
    readEnv(process.env.EXPO_PUBLIC_REVENUECAT_ENTITLEMENT_ID) || "premium",
  useRevenueCatPayments,
  useRevenueCatTestStore,
  adMobIosAppId: readEnv(process.env.EXPO_PUBLIC_ADMOB_IOS_APP_ID),
  adMobAndroidAppId: readEnv(process.env.EXPO_PUBLIC_ADMOB_ANDROID_APP_ID),
  adMobBannerUnitId: readEnv(process.env.EXPO_PUBLIC_ADMOB_BANNER_UNIT_ID),
  adMobNativeUnitId: readEnv(process.env.EXPO_PUBLIC_ADMOB_NATIVE_UNIT_ID),
  adMobAppOpenUnitId: readEnv(process.env.EXPO_PUBLIC_ADMOB_APP_OPEN_UNIT_ID),
  adMobInterstitialUnitId:
    readEnv(process.env.EXPO_PUBLIC_ADMOB_INTERSTITIAL_UNIT_ID),
  adMobRewardedUnitId: readEnv(process.env.EXPO_PUBLIC_ADMOB_REWARDED_UNIT_ID),
  enableAds,
  spotifyClientId,
  spotifyRedirectUri,
  enableAiStarterProfiles,
} as const;

export const getRuntimeConfigIssues = () => {
  const errors: string[] = [];
  const warnings: string[] = [];

  if (!env.useMockServices) {
    if (
      isPlaceholder(env.supabaseUrl, ["your-project", "example", "localhost"]) ||
      !/^https:\/\/[a-z0-9-]+\.supabase\.co$/i.test(env.supabaseUrl)
    ) {
      errors.push("EXPO_PUBLIC_SUPABASE_URL production Supabase proje URL'i olmalı.");
    }

    if (
      isPlaceholder(env.supabaseAnonKey, ["your_key", "your-key", "placeholder"]) ||
      !/^(sb_publishable_|eyJ)/.test(env.supabaseAnonKey)
    ) {
      errors.push(
        "EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY veya EXPO_PUBLIC_SUPABASE_ANON_KEY geçerli public key olmalı.",
      );
    }
  }

  if (env.isProduction && env.useMockServices) {
    errors.push("Production build mock servislerle çalışamaz. EXPO_PUBLIC_USE_SUPABASE=true verin.");
  }

  if (env.isProduction && !env.useRevenueCatPayments) {
    errors.push("Production build mock odeme ile calisamaz. EXPO_PUBLIC_USE_REVENUECAT=true verin.");
  }

  if (env.isProduction) {
    if (requestedUseRevenueCatTestStore) {
      errors.push("Production build RevenueCat Test Store key ile gönderilemez. EXPO_PUBLIC_REVENUECAT_USE_TEST_STORE=false olmalı.");
    }

    if (
      isPlaceholder(env.revenueCatIosApiKey, ["your_key", "your-key", "placeholder"]) ||
      !env.revenueCatIosApiKey.startsWith("appl_")
    ) {
      errors.push("EXPO_PUBLIC_REVENUECAT_IOS_API_KEY appl_ ile başlayan public key olmalı.");
    }

    if (
      isPlaceholder(env.revenueCatAndroidApiKey, ["your_key", "your-key", "placeholder"]) ||
      !env.revenueCatAndroidApiKey.startsWith("goog_")
    ) {
      warnings.push("Android yayını için EXPO_PUBLIC_REVENUECAT_ANDROID_API_KEY goog_ public key olmalı.");
    }

    if (!hasSafeIdentifierFormat(env.revenueCatEntitlementId)) {
      errors.push("EXPO_PUBLIC_REVENUECAT_ENTITLEMENT_ID boşluksuz lookup key olmalı. Örn: premium");
    }

    if (env.enableAds) {
      if (!env.adMobIosAppId || !env.adMobAndroidAppId) {
        warnings.push("Production reklam yayını için AdMob iOS/Android app ID değerlerini EAS env'e ekleyin. Eksikse build test AdMob kimlikleriyle devam eder.");
      }

      if (!env.adMobBannerUnitId && !env.adMobNativeUnitId) {
        warnings.push("Feed reklamları için EXPO_PUBLIC_ADMOB_BANNER_UNIT_ID veya EXPO_PUBLIC_ADMOB_NATIVE_UNIT_ID ayarlanmalı.");
      }

      if (!env.adMobAppOpenUnitId) {
        warnings.push("Uygulama açıkken reklam biçimi için EXPO_PUBLIC_ADMOB_APP_OPEN_UNIT_ID ayarlanmalı.");
      }
    }

    if (!env.spotifyClientId) {
      errors.push("Spotify anlık şarkı eşleşmesi için EXPO_PUBLIC_SPOTIFY_CLIENT_ID EAS production env'e eklenmeli.");
    }
  }

  return { errors, warnings };
};

export const validateRuntimeConfig = () => {
  const { errors, warnings } = getRuntimeConfigIssues();

  if (errors.length > 0) {
    throw new Error(`Runtime konfigürasyon hatası:\n- ${errors.join("\n- ")}`);
  }

  if (__DEV__ && warnings.length > 0) {
    console.warn(`Runtime konfigürasyon uyarısı:\n- ${warnings.join("\n- ")}`);
  }
};
