// Yandex Ads native modulunu Expo Go ve eksik native build durumlarinda guvenli yukler.
import { NativeModules, Platform } from "react-native";
import { env } from "@/infrastructure/config/env";
import { isExpoGo } from "@/shared/utils/expoRuntime";

export type YandexAdsModule = typeof import("yandex-mobile-ads");
export type YandexAdPlacement = "banner" | "interstitial";

let modulePromise: Promise<YandexAdsModule | null> | null = null;
let initializePromise: Promise<boolean> | null = null;

const isSupportedPlatform = Platform.OS === "ios" || Platform.OS === "android";

export const isYandexAdsNativeModuleAvailable =
  env.enableAds &&
  isSupportedPlatform &&
  !isExpoGo &&
  Boolean(NativeModules.YandexMobileAds);

export const loadYandexMobileAds = async () => {
  if (!env.enableAds) {
    return null;
  }

  if (!isYandexAdsNativeModuleAvailable) {
    return null;
  }

  if (!modulePromise) {
    modulePromise = import("yandex-mobile-ads").catch((error) => {
      if (__DEV__) {
        console.warn("Yandex Ads native module could not be loaded.", error);
      }

      return null;
    });
  }

  return modulePromise;
};

export const getYandexAdUnitId = (placement: YandexAdPlacement) => {
  if (!env.enableAds) {
    return "";
  }

  const configuredUnitId =
    placement === "banner"
      ? env.yandexAdsBannerUnitId
      : env.yandexAdsInterstitialUnitId;

  if (/^R-M-\d+-\d+$/.test(configuredUnitId)) {
    return configuredUnitId;
  }

  if (__DEV__) {
    return placement === "banner"
      ? "demo-banner-yandex"
      : "demo-interstitial-yandex";
  }

  return "";
};

export const initializeYandexAds = async () => {
  if (!env.enableAds) {
    return false;
  }

  if (initializePromise) {
    return initializePromise;
  }

  initializePromise = (async () => {
    const adsModule = await loadYandexMobileAds();

    if (!adsModule) {
      return false;
    }

    adsModule.MobileAds.setUserConsent(false);
    adsModule.MobileAds.setLocationConsent(false);
    adsModule.MobileAds.enableLogging(__DEV__);
    await adsModule.MobileAds.initialize();

    return true;
  })().catch((error) => {
    if (__DEV__) {
      console.warn("Yandex Ads could not be initialized.", error);
    }

    return false;
  });

  return initializePromise;
};
