import { useCallback, useState } from "react";
import type { StyleProp, ViewStyle } from "react-native";
import { AdMobBanner } from "./AdMobBanner";
import { AdMobNativeAd } from "./AdMobNativeAd";
import { useAds } from "../providers/AdsProvider";

interface AdBannerProps { style?: StyleProp<ViewStyle>; isAdFree?: boolean; }
function Placement({ style, isAdFree }: AdBannerProps) {
  const [provider, setProvider] = useState<"native" | "banner" | "none">("native");
  const fallback = useCallback(() => setProvider("banner"), []);
  const hide = useCallback(() => setProvider("none"), []);
  if (provider === "none" || isAdFree) return null;
  return provider === "native" ? <AdMobNativeAd style={style} onAdFailedToLoad={fallback} /> : <AdMobBanner style={style} onAdFailedToLoad={hide} />;
}
export function AdBanner(props: AdBannerProps) {
  const { phase, revision } = useAds();
  // No fake ad, blank card, spinner or infinite retry on blocked/no-fill paths.
  return phase === "ready" ? <Placement key={revision} {...props} /> : null;
}
