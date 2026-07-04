// Feed reklam slotunda AdMob native reklami birincil, banner aglarini yedek kullanir.
import { useCallback, useState } from "react";
import { type StyleProp, type ViewStyle } from "react-native";
import { env } from "@/infrastructure/config/env";
import { AdMobBanner } from "./AdMobBanner";
import { AdMobNativeAd } from "./AdMobNativeAd";
import { YandexBanner } from "./YandexBanner";

interface AdBannerProps {
  style?: StyleProp<ViewStyle>;
}

type AdProvider = "admob-native" | "admob-banner" | "yandex" | "none";

export const AdBanner = ({ style }: AdBannerProps) => {
  const [provider, setProvider] = useState<AdProvider>("admob-native");
  const showAdMobBanner = useCallback(() => setProvider("admob-banner"), []);
  const showYandex = useCallback(() => setProvider("yandex"), []);
  const hideBanner = useCallback(() => setProvider("none"), []);

  if (!env.enableAds) {
    return null;
  }

  if (provider === "none") {
    return null;
  }

  if (provider === "yandex") {
    return <YandexBanner style={style} onAdFailedToLoad={hideBanner} />;
  }

  if (provider === "admob-banner") {
    return <AdMobBanner style={style} onAdFailedToLoad={showYandex} />;
  }

  if (env.adMobNativeUnitId) {
    return <AdMobNativeAd style={style} onAdFailedToLoad={showAdMobBanner} />;
  }

  return <AdMobBanner style={style} onAdFailedToLoad={showYandex} />;
};
