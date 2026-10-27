import { useEffect, useState } from "react";
import { Image, StyleSheet, Text, View, type StyleProp, type ViewStyle } from "react-native";
import { useAds } from "../providers/AdsProvider";
import { adUnitId, loadGoogleAds, type GoogleAdsModule } from "../services/googleAdsAdapter";

type NativeInstance = Awaited<ReturnType<GoogleAdsModule["NativeAd"]["createForAdRequest"]>>;
export interface AdMobNativeAdProps { style?: StyleProp<ViewStyle>; isAdFree?: boolean; onAdFailedToLoad?: () => void; }
export const AdMobNativeAd = ({ style, isAdFree = false, onAdFailedToLoad }: AdMobNativeAdProps) => {
  const { phase, revision } = useAds();
  const [loaded, setLoaded] = useState<{ module: GoogleAdsModule; ad: NativeInstance } | null>(null);
  useEffect(() => {
    let disposed = false;
    let ad: NativeInstance | null = null;
    setLoaded(null);
    if (phase !== "ready" || isAdFree) return;
    void (async () => {
      const module = await loadGoogleAds();
      if (disposed) return;
      const unit = module ? adUnitId(module, "native") : "";
      if (!module || !unit) { onAdFailedToLoad?.(); return; }
      const next = await module.NativeAd.createForAdRequest(unit, { requestNonPersonalizedAdsOnly: true });
      if (disposed) { next.destroy(); return; }
      ad = next;
      setLoaded({ module, ad: next });
    })().catch(() => { if (!disposed) onAdFailedToLoad?.(); });
    return () => { disposed = true; ad?.destroy(); };
  }, [phase, revision, isAdFree]);
  if (phase !== "ready" || isAdFree || !loaded) return null;
  const { NativeAdView, NativeAsset, NativeAssetType, NativeMediaView } = loaded.module;
  const ad = loaded.ad;
  return <NativeAdView nativeAd={ad} style={[styles.surface, style]}>
    <View style={styles.header}><Text style={styles.label}>Reklam</Text>{ad.advertiser && <Text style={styles.advertiser}>{ad.advertiser}</Text>}</View>
    <View style={styles.header}>
      {ad.icon?.url && <NativeAsset assetType={NativeAssetType.ICON}><Image source={{ uri: ad.icon.url }} style={styles.icon} /></NativeAsset>}
      <NativeAsset assetType={NativeAssetType.HEADLINE}><Text numberOfLines={2} style={styles.title}>{ad.headline}</Text></NativeAsset>
    </View>
    {ad.mediaContent && <NativeMediaView resizeMode="cover" style={styles.media} />}
    {ad.body && <NativeAsset assetType={NativeAssetType.BODY}><Text numberOfLines={3} style={styles.body}>{ad.body}</Text></NativeAsset>}
    {ad.callToAction && <NativeAsset assetType={NativeAssetType.CALL_TO_ACTION}><Text style={styles.cta}>{ad.callToAction}</Text></NativeAsset>}
  </NativeAdView>;
};
const styles = StyleSheet.create({
  surface: { padding: 16, gap: 12, borderWidth: StyleSheet.hairlineWidth, borderColor: "#DED9D0", borderRadius: 8, marginVertical: 16, backgroundColor: "#FFFDF8" },
  header: { flexDirection: "row", gap: 10, alignItems: "center" }, label: { fontSize: 11, color: "#686662" }, advertiser: { fontSize: 11, color: "#686662", flexShrink: 1 },
  icon: { width: 42, height: 42, borderRadius: 7 }, title: { flex: 1, fontSize: 16, lineHeight: 23, color: "#17181A", fontWeight: "600" },
  media: { width: "100%", height: 180 }, body: { fontSize: 14, lineHeight: 22, color: "#686662" }, cta: { color: "#771F30", fontSize: 14, fontWeight: "600", minHeight: 44, paddingVertical: 12 },
});
