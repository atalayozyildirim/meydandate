import { useFullscreenAd } from "./useFullscreenAd";
// The caller chooses a natural transition; loading never displays an ad.
export const useInterstitialAd = (options: { enabled?: boolean } = {}) => useFullscreenAd("interstitial", options);
