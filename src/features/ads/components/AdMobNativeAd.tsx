// Premium olmayan kullanicilar icin feed icinde ozellestirilebilir AdMob native reklami.
import { useEffect, useState } from "react";
import {
  Image,
  StyleSheet,
  View,
  type StyleProp,
  type ViewStyle,
} from "react-native";
import { useAuthStore } from "@/features/auth/stores/authStore";
import {
  getAdUnitId,
  initializeAdMob,
  loadGoogleMobileAds,
} from "@/features/ads/services/adMob";
import { env } from "@/infrastructure/config/env";
import { Text } from "@/shared/components/Text";
import { useTheme } from "@/shared/theme";

type GoogleMobileAdsModule = typeof import("react-native-google-mobile-ads");
type NativeAdInstance = Awaited<
  ReturnType<GoogleMobileAdsModule["NativeAd"]["createForAdRequest"]>
>;

interface AdMobNativeAdProps {
  style?: StyleProp<ViewStyle>;
  onAdFailedToLoad?: () => void;
}

export const AdMobNativeAd = ({
  style,
  onAdFailedToLoad,
}: AdMobNativeAdProps) => {
  const theme = useTheme();
  const styles = createStyles(theme);
  const isPremium = useAuthStore((state) => Boolean(state.currentUser?.isPremium));
  const [adsModule, setAdsModule] = useState<GoogleMobileAdsModule | null>(null);
  const [nativeAd, setNativeAd] = useState<NativeAdInstance | null>(null);

  useEffect(() => {
    let loadedAd: NativeAdInstance | null = null;
    let isMounted = true;

    if (isPremium || !env.enableAds || !env.adMobNativeUnitId) {
      onAdFailedToLoad?.();
      return;
    }

    void initializeAdMob()
      .then(async (initialized) => {
        if (!initialized) {
          return null;
        }

        return loadGoogleMobileAds();
      })
      .then(async (module) => {
        if (!module?.NativeAd) {
          onAdFailedToLoad?.();
          return null;
        }

        const ad = await module.NativeAd.createForAdRequest(
          getAdUnitId(module, "native"),
          {
            requestNonPersonalizedAdsOnly: true,
          },
        );

        loadedAd = ad;

        if (isMounted) {
          setAdsModule(module);
          setNativeAd(ad);
        }

        return ad;
      })
      .catch((error) => {
        onAdFailedToLoad?.();

        if (__DEV__) {
          console.warn("AdMob native ad could not be loaded.", error);
        }
      });

    return () => {
      isMounted = false;
      loadedAd?.destroy();
    };
  }, [isPremium, onAdFailedToLoad]);

  if (
    isPremium ||
    !env.enableAds ||
    !adsModule ||
    !nativeAd ||
    !adsModule.NativeAdView ||
    !adsModule.NativeAsset ||
    !adsModule.NativeAssetType
  ) {
    return null;
  }

  const { NativeAdView, NativeAsset, NativeAssetType, NativeMediaView } =
    adsModule;

  return (
    <NativeAdView nativeAd={nativeAd} style={[styles.container, style]}>
      <View style={styles.header}>
        {nativeAd.icon?.url ? (
          <NativeAsset assetType={NativeAssetType.ICON}>
            <Image source={{ uri: nativeAd.icon.url }} style={styles.icon} />
          </NativeAsset>
        ) : null}
        <View style={styles.titleGroup}>
          <NativeAsset assetType={NativeAssetType.HEADLINE}>
            <Text numberOfLines={2} style={styles.headline}>
              {nativeAd.headline}
            </Text>
          </NativeAsset>
          <Text style={styles.label}>Reklam</Text>
        </View>
      </View>

      {NativeMediaView && nativeAd.mediaContent ? (
        <NativeMediaView resizeMode="cover" style={styles.media} />
      ) : null}

      {nativeAd.body ? (
        <NativeAsset assetType={NativeAssetType.BODY}>
          <Text numberOfLines={3} style={styles.body}>
            {nativeAd.body}
          </Text>
        </NativeAsset>
      ) : null}

      {nativeAd.callToAction ? (
        <NativeAsset assetType={NativeAssetType.CALL_TO_ACTION}>
          <Text numberOfLines={1} style={styles.cta}>
            {nativeAd.callToAction}
          </Text>
        </NativeAsset>
      ) : null}
    </NativeAdView>
  );
};

const createStyles = (theme: ReturnType<typeof useTheme>) =>
  StyleSheet.create({
    container: {
      gap: theme.spacing.sm,
      padding: theme.spacing.md,
      backgroundColor: theme.colors.surface,
      borderTopWidth: StyleSheet.hairlineWidth,
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderColor: theme.colors.border,
    },
    header: {
      flexDirection: "row",
      alignItems: "center",
      gap: theme.spacing.sm,
    },
    icon: {
      width: 44,
      height: 44,
      borderRadius: theme.radius.sm,
      backgroundColor: theme.colors.elevated,
    },
    titleGroup: {
      flex: 1,
      minWidth: 0,
      gap: 2,
    },
    headline: {
      color: theme.colors.text,
      fontSize: 15,
      lineHeight: 20,
      fontWeight: "700",
    },
    label: {
      alignSelf: "flex-start",
      color: theme.colors.muted,
      fontSize: 11,
      lineHeight: 14,
      fontWeight: "700",
    },
    media: {
      width: "100%",
      aspectRatio: 1.91,
      borderRadius: theme.radius.md,
      overflow: "hidden",
      backgroundColor: theme.colors.elevated,
    },
    body: {
      color: theme.colors.secondary,
      fontSize: 14,
      lineHeight: 20,
    },
    cta: {
      alignSelf: "flex-start",
      maxWidth: "100%",
      minHeight: 40,
      paddingHorizontal: theme.spacing.md,
      paddingVertical: theme.spacing.xs,
      borderRadius: theme.radius.md,
      backgroundColor: theme.colors.primary,
      color: theme.colors.onPrimary,
      fontSize: 14,
      lineHeight: 18,
      fontWeight: "800",
    },
  });
