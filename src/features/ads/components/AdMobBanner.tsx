import { useEffect, useState } from "react";
import { StyleSheet, Text, View, type StyleProp, type ViewStyle } from "react-native";
import { useAds } from "../providers/AdsProvider";
import { adUnitId, loadGoogleAds, type GoogleAdsModule } from "../services/googleAdsAdapter";

export interface AdMobBannerProps {
  style?: StyleProp<ViewStyle>;
  isAdFree?: boolean;
  onAdLoaded?: () => void;
  onAdFailedToLoad?: () => void;
}
export const AdMobBanner = ({ style, isAdFree = false, onAdLoaded, onAdFailedToLoad }: AdMobBannerProps) => {
  const { phase, revision } = useAds();
  const [module, setModule] = useState<GoogleAdsModule | null>(null);
  const [failed, setFailed] = useState(false);
  useEffect(() => {
    let disposed = false;
    setModule(null);
    setFailed(false);
    if (phase !== "ready" || isAdFree) return;
    void loadGoogleAds().then((loaded) => {
      if (disposed) return;
      if (!loaded || !adUnitId(loaded, "banner")) { setFailed(true); onAdFailedToLoad?.(); return; }
      setModule(loaded);
    });
    return () => { disposed = true; };
  }, [phase, revision, isAdFree]);
  if (phase !== "ready" || isAdFree || failed || !module) return null;
  const Banner = module.BannerAd;
  return <View style={[styles.surface, style]} accessibilityLabel="Reklam alanı">
    <Text style={styles.label}>Reklam</Text>
    <Banner key={revision} unitId={adUnitId(module, "banner")} size={module.BannerAdSize.BANNER} requestOptions={{ requestNonPersonalizedAdsOnly: true }} onAdLoaded={onAdLoaded} onAdFailedToLoad={() => { setFailed(true); onAdFailedToLoad?.(); }} />
  </View>;
};
const styles = StyleSheet.create({ surface: { alignItems: "center", paddingVertical: 12, gap: 8 }, label: { fontSize: 11, color: "#686662" } });
