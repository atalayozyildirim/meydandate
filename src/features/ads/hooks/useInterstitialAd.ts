// Tam ekran reklamlar icin yukle/goster yardimci hook'u.
import { useCallback, useEffect, useRef, useState } from "react";
import { getAdUnitId, initializeAdMob, loadGoogleMobileAds } from "@/features/ads/services/adMob";
import { env } from "@/infrastructure/config/env";

type InterstitialInstance = ReturnType<
  typeof import("react-native-google-mobile-ads").InterstitialAd.createForAdRequest
>;

interface UseInterstitialAdOptions {
  enabled?: boolean;
}

export const useInterstitialAd = ({ enabled = true }: UseInterstitialAdOptions = {}) => {
  const interstitialRef = useRef<InterstitialInstance | null>(null);
  const [isLoaded, setIsLoaded] = useState(false);

  const load = useCallback(async () => {
    if (!enabled || !env.enableAds) {
      return;
    }

    const adsModule = await loadGoogleMobileAds();

    if (!adsModule) {
      return;
    }

    await initializeAdMob();

    if (
      !adsModule.InterstitialAd ||
      typeof adsModule.InterstitialAd.createForAdRequest !== "function"
    ) {
      return;
    }

    const interstitial = adsModule.InterstitialAd.createForAdRequest(
      getAdUnitId(adsModule, "interstitial"),
      {
        requestNonPersonalizedAdsOnly: true,
      },
    );

    interstitialRef.current = interstitial;
    setIsLoaded(false);

    const unsubscribeLoaded = interstitial.addAdEventListener(
      adsModule.AdEventType.LOADED,
      () => setIsLoaded(true),
    );
    const unsubscribeClosed = interstitial.addAdEventListener(
      adsModule.AdEventType.CLOSED,
      () => {
        setIsLoaded(false);
        interstitial.load();
      },
    );

    interstitial.load();

    return () => {
      unsubscribeLoaded();
      unsubscribeClosed();
    };
  }, [enabled]);

  useEffect(() => {
    let cleanup: (() => void) | undefined;

    void load().then((unsubscribe) => {
      cleanup = unsubscribe;
    });

    return () => {
      cleanup?.();
    };
  }, [load]);

  const show = useCallback(async () => {
    if (!env.enableAds || !isLoaded) {
      return false;
    }

    await interstitialRef.current?.show();
    return true;
  }, [isLoaded]);

  return {
    isLoaded,
    load,
    show,
  };
};
