// AdMob native modulunu guvenli yukler, baslatir ve unit ID secimini merkezilestirir.
import { NativeModules, Platform } from "react-native";
import { env } from "@/infrastructure/config/env";
import { isExpoGo } from "@/shared/utils/expoRuntime";

type GoogleMobileAdsModule = typeof import("react-native-google-mobile-ads");
export type AdMobPlacement =
  | "appOpen"
  | "banner"
  | "interstitial"
  | "native"
  | "rewarded";

type MobileAdsController = {
  initialize?: () => Promise<unknown>;
  setRequestConfiguration?: (configuration: unknown) => Promise<unknown>;
};

let modulePromise: Promise<GoogleMobileAdsModule | null> | null = null;
let initializePromise: Promise<boolean> | null = null;

export const isAdMobPlatform = Platform.OS === "ios" || Platform.OS === "android";
export const isAdMobNativeModuleAvailable =
  env.enableAds &&
  isAdMobPlatform &&
  !isExpoGo &&
  [
    "RNGoogleMobileAdsModule",
    "RNGoogleMobileAdsInterstitialModule",
    "RNGoogleMobileAdsBannerView",
  ].some((moduleName) => Boolean(NativeModules[moduleName]));

const getMobileAdsController = (
  adsModule: GoogleMobileAdsModule,
): MobileAdsController | null => {
  const defaultExport = adsModule.default as unknown;
  const mobileAdsExport = (adsModule as { MobileAds?: unknown }).MobileAds;
  const candidates = [defaultExport, mobileAdsExport];

  for (const candidate of candidates) {
    try {
      const controller =
        typeof candidate === "function" ? candidate() : candidate;

      if (
        controller &&
        typeof controller === "object" &&
        typeof (controller as MobileAdsController).initialize === "function"
      ) {
        return controller as MobileAdsController;
      }
    } catch {
      // Try the next export shape.
    }
  }

  return null;
};

export const loadGoogleMobileAds = async () => {
  if (!env.enableAds) {
    return null;
  }

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
    appOpen: env.adMobAppOpenUnitId,
    banner: env.adMobBannerUnitId,
    interstitial: env.adMobInterstitialUnitId,
    native: env.adMobNativeUnitId,
    rewarded: env.adMobRewardedUnitId,
  };

  const configuredUnitId = configuredUnitIds[placement];

  if (configuredUnitId) {
    return configuredUnitId;
  }

  if (env.isProduction) {
    return "";
  }

  const testUnitIds: Record<AdMobPlacement, string> = {
    appOpen: adsModule.TestIds.APP_OPEN,
    banner: adsModule.TestIds.BANNER,
    interstitial: adsModule.TestIds.INTERSTITIAL,
    native: adsModule.TestIds.NATIVE,
    rewarded: adsModule.TestIds.REWARDED,
  };

  return testUnitIds[placement];
};

export const initializeAdMob = async () => {
  if (!env.enableAds) {
    return false;
  }

  if (initializePromise) {
    return initializePromise;
  }

  initializePromise = (async () => {
    const adsModule = await loadGoogleMobileAds();

    if (!adsModule) {
      return false;
    }

    const mobileAds = getMobileAdsController(adsModule);

    if (!mobileAds?.initialize || !mobileAds.setRequestConfiguration) {
      return false;
    }

    await mobileAds.setRequestConfiguration({
      maxAdContentRating: adsModule.MaxAdContentRating.T,
      testDeviceIdentifiers: ["EMULATOR"],
    });

    await mobileAds.initialize();

    return true;
  })().catch((error) => {
    if (__DEV__) {
      console.warn("AdMob could not be initialized.", error);
    }

    return false;
  });

  return initializePromise;
};
