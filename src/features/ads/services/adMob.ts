// Compatibility API for retained callers. All initialization is consent-gated.
import { env } from "@/infrastructure/config/env";
import { adsRuntime } from "./adsRuntime";
export { loadGoogleAds as loadGoogleMobileAds, adUnitId as getAdUnitId, nativeAdsAvailable as isAdMobPlatform } from "./googleAdsAdapter";
export type { AdPlacement as AdMobPlacement } from "../domain/placements";
import { nativeAdsAvailable } from "./googleAdsAdapter";
export const isAdMobNativeModuleAvailable = env.enableAds && nativeAdsAvailable;
export const initializeAdMob = () => adsRuntime.prepare(false);
