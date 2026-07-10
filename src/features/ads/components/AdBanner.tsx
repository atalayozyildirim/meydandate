// Feed reklam slotunda AdMob native reklami birincil, AdMob banner yedek kullanilir.
import { useCallback, useState } from "react";
import { type StyleProp, type ViewStyle } from "react-native";
import { env } from "@/infrastructure/config/env";
import { AdMobBanner } from "./AdMobBanner";
import { AdMobNativeAd } from "./AdMobNativeAd";

interface AdBannerProps {
  style?: StyleProp<ViewStyle>;
}

type AdProvider = "admob-native" | "admob-banner" | "none";

export const AdBanner = ({ style }: AdBannerProps) => {
  const [provider, setProvider] = useState<AdProvider>("admob-native");
  const showAdMobBanner = useCallback(() => setProvider("admob-banner"), []);
  const hideBanner = useCallback(() => setProvider("none"), []);

  if (!env.enableAds) {
    return null;
  }

  if (provider === "none") {
    return null;
  }

  if (provider === "admob-banner") {
    return <AdMobBanner style={style} onAdFailedToLoad={hideBanner} />;
  }

  if (env.adMobNativeUnitId) {
    return <AdMobNativeAd style={style} onAdFailedToLoad={showAdMobBanner} />;
  }

  return <AdMobBanner style={style} onAdFailedToLoad={hideBanner} />;
};
