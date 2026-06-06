// AdMob native modulunu guvenli yukler, baslatir ve unit ID secimini merkezilestirir.
import { NativeModules, Platform } from "react-native";
import { env } from "@/infrastructure/config/env";

type GoogleMobileAdsModule = typeof import("react-native-google-mobile-ads");
export type AdMobPlacement = "banner" | "interstitial" | "rewarded";

let modulePromise: Promise<GoogleMobileAdsModule | null> | null = null;
let initializePromise: Promise<boolean> | null = null;

export const isAdMobPlatform = Platform.OS === "ios" || Platform.OS === "android";
export const isAdMobNativeModuleAvailable =
  isAdMobPlatform && Boolean(NativeModules.RNGoogleMobileAdsModule);

export const loadGoogleMobileAds = async () => {
  if (!isAdMobNativeModuleAvailable) {
    return null;
  }

  if (!modulePromise) {
    modulePromise = import("react-native-google-mobile-ads").catch((error) => {
      if (__DEV__) {
        console.warn("AdMob native module could not be loaded.", error);
      }

      return null;
    });
  }

  return modulePromise;
};

export const getAdUnitId = (
  adsModule: GoogleMobileAdsModule,
  placement: AdMobPlacement,
) => {
  const configuredUnitIds: Record<AdMobPlacement, string> = {
    banner: env.adMobBannerUnitId,
    interstitial: env.adMobInterstitialUnitId,
    rewarded: env.adMobRewardedUnitId,
  };

  const configuredUnitId = configuredUnitIds[placement];

  if (configuredUnitId) {
    return configuredUnitId;
  }

  const testUnitIds: Record<AdMobPlacement, string> = {
    banner: adsModule.TestIds.BANNER,
    interstitial: adsModule.TestIds.INTERSTITIAL,
    rewarded: adsModule.TestIds.REWARDED,
  };

  return testUnitIds[placement];
};

export const initializeAdMob = async () => {
  if (initializePromise) {
    return initializePromise;
  }

  initializePromise = (async () => {
    const adsModule = await loadGoogleMobileAds();

    if (!adsModule) {
      return false;
    }

    if (typeof adsModule.default !== "function") {
      return false;
    }

    await adsModule.default().setRequestConfiguration({
      maxAdContentRating: adsModule.MaxAdContentRating.T,
      testDeviceIdentifiers: ["EMULATOR"],
    });

    await adsModule.default().initialize();

    return true;
  })().catch((error) => {
    if (__DEV__) {
      console.warn("AdMob could not be initialized.", error);
    }

    return false;
  });

  return initializePromise;
};
