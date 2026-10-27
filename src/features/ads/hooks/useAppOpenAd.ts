import { useFullscreenAd } from "./useFullscreenAd";
// Explicit presentation only. Returning from a call/settings does not trigger an ad.
export const useAppOpenAd = (options: { enabled?: boolean } = {}) => useFullscreenAd("appOpen", options);
