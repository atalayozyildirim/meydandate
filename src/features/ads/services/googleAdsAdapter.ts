import { Platform } from "react-native";
import { getTrackingPermissionsAsync, requestTrackingPermissionsAsync } from "expo-tracking-transparency";
import { env } from "@/infrastructure/config/env";
import { isExpoGo } from "@/shared/utils/expoRuntime";
import type { AdsAdapter, ConsentInfo, TrackingStatus } from "../domain/AdsController";
import { selectAdUnit, type AdPlacement } from "../domain/placements";

export type GoogleAdsModule = typeof import("react-native-google-mobile-ads");
let modulePromise: Promise<GoogleAdsModule | null> | undefined;
export const nativeAdsAvailable = (Platform.OS === "ios" || Platform.OS === "android") && !isExpoGo;

/** Loading UMP does not call MobileAds.initialize. Native measurement is delayed in the config plugin. */
export async function loadGoogleAds(): Promise<GoogleAdsModule | null> {
  if (!env.enableAds || !nativeAdsAvailable) return null;
  modulePromise ??= import("react-native-google-mobile-ads").catch(() => null);
  return modulePromise;
}
async function requireModule() {
  const module = await loadGoogleAds();
  if (!module) throw new Error("Reklam hizmeti kullanılamıyor.");
  return module;
}
async function consentInfo(module: GoogleAdsModule, info: Awaited<ReturnType<GoogleAdsModule["AdsConsent"]["getConsentInfo"]>>): Promise<ConsentInfo> {
  const gdprApplies = await module.AdsConsent.getGdprApplies();
  const purposes = gdprApplies ? await module.AdsConsent.getPurposeConsents() : "";
  return {
    canRequestAds: info.canRequestAds,
    requiresConsent: info.status === module.AdsConsentStatus.REQUIRED || info.status === module.AdsConsentStatus.UNKNOWN,
    requiresPrivacyOptions: info.privacyOptionsRequirementStatus === module.AdsConsentPrivacyOptionsRequirementStatus.REQUIRED,
    permitsTrackingRequest: !gdprApplies || purposes.startsWith("1"),
  };
}
export const googleAdsAdapter: AdsAdapter = {
  available: nativeAdsAvailable,
  async updateConsent() { const module = await requireModule(); return consentInfo(module, await module.AdsConsent.requestInfoUpdate()); },
  async collectConsent() { const module = await requireModule(); return consentInfo(module, await module.AdsConsent.loadAndShowConsentFormIfRequired()); },
  async privacyOptions() { const module = await requireModule(); return consentInfo(module, await module.AdsConsent.showPrivacyOptionsForm()); },
  async trackingPermission(request) {
    if (Platform.OS !== "ios") return "unavailable";
    const result = request ? await requestTrackingPermissionsAsync() : await getTrackingPermissionsAsync();
    return result.status as TrackingStatus;
  },
  async initialize() {
    const module = await requireModule();
    await module.default().setRequestConfiguration({ maxAdContentRating: module.MaxAdContentRating.PG, ...(!env.isProduction ? { testDeviceIdentifiers: ["EMULATOR"] } : {}) });
    await module.default().initialize();
  },
};
export function adUnitId(module: GoogleAdsModule, placement: AdPlacement) {
  const ios = Platform.OS === "ios";
  const ids = { banner: (ios ? env.adMobIosBannerUnitId : env.adMobAndroidBannerUnitId) || env.adMobBannerUnitId, native: (ios ? env.adMobIosNativeUnitId : env.adMobAndroidNativeUnitId) || env.adMobNativeUnitId, appOpen: env.adMobAppOpenUnitId, interstitial: env.adMobInterstitialUnitId, rewarded: env.adMobRewardedUnitId };
  const tests = { banner: module.TestIds.BANNER, native: module.TestIds.NATIVE, appOpen: module.TestIds.APP_OPEN, interstitial: module.TestIds.INTERSTITIAL, rewarded: module.TestIds.REWARDED };
  return selectAdUnit({ production: env.isProduction, configured: ids[placement], testId: tests[placement] });
}
