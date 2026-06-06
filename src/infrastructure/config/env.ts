// Runtime konfig degerleri tek noktadan okunur.
export const env = {
  apiBaseUrl: "https://api.ehlibyte.local",
  supabaseUrl: process.env.EXPO_PUBLIC_SUPABASE_URL || "",
  supabaseAnonKey:
    process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ||
    process.env.EXPO_PUBLIC_SUPABASE_KEY ||
    "",
  useMockServices: process.env.EXPO_PUBLIC_USE_SUPABASE !== "true",
  useLiveApi: process.env.EXPO_PUBLIC_USE_LIVE_API === "true",
  secureTokenKey: "ehlibyte-access-token",
  permanentBanKey: "ehlibyte-permanent-ban",
  revenueCatApiKey: process.env.EXPO_PUBLIC_REVENUECAT_API_KEY || "",
  revenueCatEntitlementId:
    process.env.EXPO_PUBLIC_REVENUECAT_ENTITLEMENT_ID || "premium",
  adMobBannerUnitId: process.env.EXPO_PUBLIC_ADMOB_BANNER_UNIT_ID || "",
  adMobInterstitialUnitId:
    process.env.EXPO_PUBLIC_ADMOB_INTERSTITIAL_UNIT_ID || "",
  adMobRewardedUnitId: process.env.EXPO_PUBLIC_ADMOB_REWARDED_UNIT_ID || "",
} as const;
