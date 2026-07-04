// Uygulama acilista ve arka plandan one geldiginde AdMob app open reklami yonetir.
import { useCallback, useEffect, useRef, useState } from "react";
import { AppState, type AppStateStatus } from "react-native";
import {
  getAdUnitId,
  initializeAdMob,
  loadGoogleMobileAds,
} from "@/features/ads/services/adMob";
import { env } from "@/infrastructure/config/env";

type GoogleMobileAdsModule = typeof import("react-native-google-mobile-ads");
type AppOpenAdInstance = ReturnType<
  GoogleMobileAdsModule["AppOpenAd"]["createForAdRequest"]
>;

interface UseAppOpenAdOptions {
  enabled?: boolean;
}

const MIN_SHOW_INTERVAL_MS = 4 * 60 * 60 * 1000;

export const useAppOpenAd = ({ enabled = true }: UseAppOpenAdOptions = {}) => {
  const appOpenAdRef = useRef<AppOpenAdInstance | null>(null);
  const lastShowAtRef = useRef(0);
  const appStateRef = useRef<AppStateStatus>(AppState.currentState);
  const [isLoaded, setIsLoaded] = useState(false);

  const load = useCallback(async () => {
    if (!enabled || !env.enableAds) {
      return;
    }

    const adsModule = await loadGoogleMobileAds();

    if (!adsModule?.AppOpenAd) {
      return;
    }

    await initializeAdMob();

    const unitId = getAdUnitId(adsModule, "appOpen");

    if (!unitId) {
      return;
    }

    const appOpenAd = adsModule.AppOpenAd.createForAdRequest(unitId, {
      requestNonPersonalizedAdsOnly: true,
    });

    appOpenAdRef.current = appOpenAd;
    setIsLoaded(false);

    const unsubscribeLoaded = appOpenAd.addAdEventListener(
      adsModule.AdEventType.LOADED,
      () => setIsLoaded(true),
    );
    const unsubscribeClosed = appOpenAd.addAdEventListener(
      adsModule.AdEventType.CLOSED,
      () => {
        setIsLoaded(false);
        appOpenAd.load();
      },
    );
    const unsubscribeError = appOpenAd.addAdEventListener(
      adsModule.AdEventType.ERROR,
      () => {
        setIsLoaded(false);
      },
    );

    appOpenAd.load();

    return () => {
      unsubscribeLoaded();
      unsubscribeClosed();
      unsubscribeError();
    };
  }, [enabled]);

  const show = useCallback(async () => {
    if (!enabled || !env.enableAds || !isLoaded) {
      return false;
    }

    const now = Date.now();

    if (now - lastShowAtRef.current < MIN_SHOW_INTERVAL_MS) {
      return false;
    }

    lastShowAtRef.current = now;
    await appOpenAdRef.current?.show();
    return true;
  }, [enabled, isLoaded]);

  useEffect(() => {
    let cleanup: (() => void) | undefined;

    void load().then((unsubscribe) => {
      cleanup = unsubscribe;
    });

    return () => {
      cleanup?.();
    };
  }, [load]);

  useEffect(() => {
    if (!enabled) {
      return;
    }

    const subscription = AppState.addEventListener("change", (nextState) => {
      const wasInactive = /inactive|background/.test(appStateRef.current);
      appStateRef.current = nextState;

      if (wasInactive && nextState === "active") {
        void show();
      }
    });

    return () => {
      subscription.remove();
    };
  }, [enabled, show]);

  useEffect(() => {
    if (enabled && isLoaded) {
      void show();
    }
  }, [enabled, isLoaded, show]);

  return {
    isLoaded,
    load,
    show,
  };
};
