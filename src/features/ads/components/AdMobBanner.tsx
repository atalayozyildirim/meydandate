// Premium olmayan kullanicilar icin guvenli AdMob banner alani.
import { useEffect, useState } from "react";
import { StyleSheet, View, type StyleProp, type ViewStyle } from "react-native";
import { useAuthStore } from "@/features/auth/stores/authStore";
import { getAdUnitId, initializeAdMob, loadGoogleMobileAds } from "@/features/ads/services/adMob";
import { env } from "@/infrastructure/config/env";
import { useTheme } from "@/shared/theme";

type GoogleMobileAdsModule = typeof import("react-native-google-mobile-ads");

interface AdMobBannerProps {
  style?: StyleProp<ViewStyle>;
  onAdLoaded?: () => void;
  onAdFailedToLoad?: () => void;
}

export const AdMobBanner = ({
  style,
  onAdLoaded,
  onAdFailedToLoad,
}: AdMobBannerProps) => {
  const theme = useTheme();
  const styles = createStyles(theme);
  const isPremium = useAuthStore((state) => Boolean(state.currentUser?.isPremium));
  const [adsModule, setAdsModule] = useState<GoogleMobileAdsModule | null>(null);

  useEffect(() => {
    let isMounted = true;

    if (isPremium || !env.enableAds) {
      return;
    }

    void initializeAdMob()
      .then(async (initialized) => {
        if (!initialized) {
          return null;
        }

        return loadGoogleMobileAds();
      })
      .then((module) => {
        if (isMounted && module && getAdUnitId(module, "banner")) {
          setAdsModule(module);
        } else if (isMounted) {
          onAdFailedToLoad?.();
        }
      });

    return () => {
      isMounted = false;
    };
  }, [isPremium, onAdFailedToLoad]);

  const unitId = adsModule ? getAdUnitId(adsModule, "banner") : "";

  if (
    isPremium ||
    !env.enableAds ||
    !adsModule ||
    !unitId ||
    !adsModule.BannerAd ||
    !adsModule.BannerAdSize?.ANCHORED_ADAPTIVE_BANNER
  ) {
    return null;
  }

  const BannerAd = adsModule.BannerAd;

  return (
    <View style={[styles.container, style]}>
      <BannerAd
        unitId={unitId}
        size={adsModule.BannerAdSize.ANCHORED_ADAPTIVE_BANNER}
        requestOptions={{
          requestNonPersonalizedAdsOnly: true,
        }}
        onAdLoaded={onAdLoaded}
        onAdFailedToLoad={onAdFailedToLoad}
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
