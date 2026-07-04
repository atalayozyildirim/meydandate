// Premium olmayan kullanicilar icin adaptif Yandex banner reklami.
import { useEffect, useState } from "react";
import {
  StyleSheet,
  View,
  useWindowDimensions,
  type StyleProp,
  type ViewStyle,
} from "react-native";
import { useAuthStore } from "@/features/auth/stores/authStore";
import {
  getYandexAdUnitId,
  initializeYandexAds,
  loadYandexMobileAds,
  type YandexAdsModule,
} from "@/features/ads/services/yandexAds";
import { env } from "@/infrastructure/config/env";
import { useTheme } from "@/shared/theme";

interface YandexBannerProps {
  style?: StyleProp<ViewStyle>;
  onAdFailedToLoad?: () => void;
}

type BannerSize = Awaited<ReturnType<YandexAdsModule["BannerAdSize"]["stickySize"]>>;

export const YandexBanner = ({ style, onAdFailedToLoad }: YandexBannerProps) => {
  const theme = useTheme();
  const styles = createStyles(theme);
  const { width } = useWindowDimensions();
  const isPremium = useAuthStore((state) => Boolean(state.currentUser?.isPremium));
  const [adsModule, setAdsModule] = useState<YandexAdsModule | null>(null);
  const [bannerSize, setBannerSize] = useState<BannerSize | null>(null);
  const adUnitId = getYandexAdUnitId("banner");

  useEffect(() => {
    let isMounted = true;

    if (isPremium || !env.enableAds || !adUnitId) {
      return;
    }

    void initializeYandexAds()
      .then(() => loadYandexMobileAds())
      .then(async (module) => {
        if (!module) {
          return;
        }

        const size = await module.BannerAdSize.stickySize(
          Math.max(1, Math.floor(width - theme.spacing.lg * 2)),
        );

        if (isMounted) {
          setAdsModule(module);
          setBannerSize(size);
        }
      })
      .catch((error) => {
        onAdFailedToLoad?.();

        if (__DEV__) {
          console.warn("Yandex banner could not be prepared.", error);
        }
      });

    return () => {
      isMounted = false;
    };
  }, [adUnitId, isPremium, onAdFailedToLoad, theme.spacing.lg, width]);

  if (isPremium || !env.enableAds || !adUnitId || !adsModule || !bannerSize) {
    return null;
  }

  const BannerView = adsModule.BannerView;

  return (
    <View style={[styles.container, style]}>
      <BannerView
        size={bannerSize}
        adRequest={{ adUnitId }}
        style={{ width: bannerSize.width, height: bannerSize.height }}
        onAdFailedToLoad={(event) => {
          onAdFailedToLoad?.();

          if (__DEV__) {
            console.warn("Yandex banner failed to load.", event.nativeEvent);
          }
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
      minHeight: 52,
      paddingVertical: theme.spacing.xs,
      overflow: "hidden",
      backgroundColor: theme.colors.surface,
    },
  });
