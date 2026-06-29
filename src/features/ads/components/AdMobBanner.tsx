// Premium olmayan kullanicilar icin guvenli AdMob banner alani.
import { useEffect, useState } from "react";
import { StyleSheet, View, type StyleProp, type ViewStyle } from "react-native";
import { useAuthStore } from "@/features/auth/stores/authStore";
import { getAdUnitId, initializeAdMob, loadGoogleMobileAds } from "@/features/ads/services/adMob";
import { useTheme } from "@/shared/theme";

type GoogleMobileAdsModule = typeof import("react-native-google-mobile-ads");

interface AdMobBannerProps {
  style?: StyleProp<ViewStyle>;
}

export const AdMobBanner = ({ style }: AdMobBannerProps) => {
  const theme = useTheme();
  const styles = createStyles(theme);
  const isPremium = useAuthStore((state) => Boolean(state.currentUser?.isPremium));
  const [adsModule, setAdsModule] = useState<GoogleMobileAdsModule | null>(null);

  useEffect(() => {
    let isMounted = true;

    void initializeAdMob()
      .then(() => loadGoogleMobileAds())
      .then((module) => {
        if (isMounted) {
          setAdsModule(module);
        }
      });

    return () => {
      isMounted = false;
    };
  }, []);

  if (
    isPremium ||
    !adsModule ||
    !adsModule.BannerAd ||
    !adsModule.BannerAdSize?.ANCHORED_ADAPTIVE_BANNER
  ) {
    return null;
  }

  const BannerAd = adsModule.BannerAd;

  return (
    <View style={[styles.container, style]}>
      <BannerAd
        unitId={getAdUnitId(adsModule, "banner")}
        size={adsModule.BannerAdSize.ANCHORED_ADAPTIVE_BANNER}
        requestOptions={{
          requestNonPersonalizedAdsOnly: true,
        }}
      />
    </View>
  );
};

const createStyles = (theme: ReturnType<typeof useTheme>) =>
  StyleSheet.create({
    container: {
      alignItems: "center",
      justifyContent: "center",
      minHeight: 58,
      borderRadius: theme.radius.md,
      overflow: "hidden",
      backgroundColor: "rgba(255, 255, 255, 0.74)",
    },
  });
