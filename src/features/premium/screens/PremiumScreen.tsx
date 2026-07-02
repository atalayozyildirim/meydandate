// Premium özellikleri ve mock ödeme planlarını sunar.
import { Alert, StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import type { SubscriptionPlan } from "@/domain/entities/Subscription";
import { Button } from "@/shared/components/Button";
import { Card } from "@/shared/components/Card";
import { Loading } from "@/shared/components/Loading";
import { Screen } from "@/shared/components/Screen";
import { premiumFeatures } from "@/shared/constants/options";
import { usePremium } from "@/features/premium/hooks/usePremium";
import { isPurchaseCancelledError } from "@/features/premium/services/RevenueCatPaymentService";
import { env } from "@/infrastructure/config/env";
import { isExpoGo } from "@/shared/utils/expoRuntime";
import { useTheme } from "@/shared/theme";
import { formatProfileBoostExpiry } from "@/shared/utils/profileBoost";

export default function PremiumScreen() {
  const theme = useTheme();
  const styles = createStyles(theme);
  const isMockPaymentMode = !env.useRevenueCatPayments || isExpoGo;
  const {
    subscription,
    planPrices,
    isLoading,
    purchase,
    isPurchasing,
    restorePurchases,
    isRestoring,
    isPremiumActive,
    isBoostActive,
    boostExpiresAt,
    activateBoost,
    isActivatingBoost,
  } = usePremium();

  const buyPlan = async (plan: SubscriptionPlan) => {
    try {
      await purchase(plan);
      Alert.alert(
        isMockPaymentMode ? "Demo Premium aktif" : "Premium aktif",
        isMockPaymentMode
          ? "Gerçek ödeme alınmadan demo Premium etkinleştirildi."
          : "Satın alım tamamlandı.",
      );
    } catch (error) {
      if (isPurchaseCancelledError(error)) {
        return;
      }

      Alert.alert(
        "Satın alım tamamlanamadı",
        error instanceof Error ? error.message : "Tekrar deneyin.",
      );
    }
  };

  const restore = async () => {
    try {
      const restoredSubscription = await restorePurchases();
      Alert.alert(
        restoredSubscription.status === "active" ? "Premium geri yüklendi" : "Satın alım bulunamadı",
        restoredSubscription.status === "active"
          ? "Aktif aboneliğin bu cihaza geri yüklendi."
          : "Bu mağaza hesabında aktif Premium aboneliği bulunamadı.",
      );
    } catch (error) {
      Alert.alert(
        "Geri yükleme tamamlanamadı",
        error instanceof Error ? error.message : "Tekrar deneyin.",
      );
    }
  };

  const startBoost = async () => {
    try {
      await activateBoost();
      Alert.alert("Boost aktif", "Profilin 24 saat boyunca keşifte öne çıkarılacak.");
    } catch (error) {
      Alert.alert(
        "Boost başlatılamadı",
        error instanceof Error ? error.message : "Tekrar deneyin.",
      );
    }
  };

  if (isLoading) {
    return <Loading label="Premium yükleniyor" />;
  }

  return (
    <Screen>
      <View style={styles.header}>
        <Text style={styles.kicker}>Premium</Text>
        <Text style={styles.title}>Daha güçlü eşleşme deneyimi</Text>
        <Text style={styles.description}>
          Premium ile daha fazla kişiye ulaş, reklamları kaldır ve özel eşleşme araçlarını aç.
        </Text>
      </View>

      <Card style={styles.statusCard}>
        <Text style={styles.statusLabel}>Abonelik durumu</Text>
        <Text style={styles.statusValue}>{subscription?.status === "active" ? "Aktif" : "Pasif"}</Text>
      </Card>

      {isMockPaymentMode ? (
        <Card style={styles.noticeCard}>
          <Ionicons name="information-circle-outline" size={20} color={theme.colors.warning} />
          <Text style={styles.noticeText}>
            Geliştirme modunda gerçek ödeme alınmaz. Satın alma butonları demo olarak Premium'u aktif eder.
          </Text>
        </Card>
      ) : null}

      <Card style={styles.boostCard}>
        <View style={styles.boostHeader}>
          <View style={styles.boostIcon}>
            <Ionicons name="rocket" size={20} color={theme.colors.onPrimary} />
          </View>
          <View style={styles.boostCopy}>
            <Text style={styles.sectionTitle}>Profil boost</Text>
            <Text style={styles.boostDescription}>
              {isBoostActive
                ? "Boost aktif. Keşifte aktif boost'lu profiller öne alınır."
                : "Premium ile profilini 24 saat boyunca Discover akışında öne çıkar."}
            </Text>
          </View>
        </View>
        {isBoostActive && boostExpiresAt ? (
          <Text style={styles.boostMeta}>
            Bitiş: {formatProfileBoostExpiry(boostExpiresAt)}
          </Text>
        ) : null}
        {!isPremiumActive ? (
          <Text style={styles.boostMeta}>
            Boost için önce Premium aboneliği aktif olmalı.
          </Text>
        ) : null}
        <Button
          label={isBoostActive ? "Boost aktif" : "Boost'u başlat"}
          variant="secondary"
          disabled={!isPremiumActive || isBoostActive}
          loading={isActivatingBoost}
          icon={
            <Ionicons
              name="flash"
              size={18}
              color={theme.colors.onSecondary}
            />
          }
          onPress={() => void startBoost()}
        />
      </Card>

      <Card style={styles.section}>
        <Text style={styles.sectionTitle}>Özellikler</Text>
        {premiumFeatures.map((feature) => (
          <View key={feature} style={styles.featureRow}>
            <Ionicons name="checkmark-circle" size={20} color={theme.colors.success} />
            <Text style={styles.featureText}>{feature}</Text>
          </View>
        ))}
      </Card>

      <View style={styles.planGrid}>
        <Card style={styles.planCard}>
          <Text style={styles.planTitle}>Aylık</Text>
          <Text style={styles.price}>{planPrices?.monthly ?? "Yükleniyor..."}</Text>
          <Button label="Aylık başlat" loading={isPurchasing} onPress={() => void buyPlan("monthly")} />
        </Card>
        <Card style={styles.planCard}>
          <Text style={styles.planTitle}>Yıllık</Text>
          <Text style={styles.price}>{planPrices?.yearly ?? "Yükleniyor..."}</Text>
          <Button label="Yıllık başlat" variant="secondary" loading={isPurchasing} onPress={() => void buyPlan("yearly")} />
        </Card>
      </View>
      <Button
        label="Satın alımları geri yükle"
        variant="ghost"
        loading={isRestoring}
        onPress={() => void restore()}
      />
    </Screen>
  );
}

const createStyles = (theme: ReturnType<typeof useTheme>) =>
  StyleSheet.create({
    header: {
      gap: theme.spacing.xs,
      marginBottom: theme.spacing.lg
    },
    kicker: {
      ...theme.typography.caption,
      color: theme.colors.primary,
      textTransform: "uppercase"
    },
    title: {
      ...theme.typography.title,
      color: theme.colors.text
    },
    description: {
      ...theme.typography.body,
      color: theme.colors.muted
    },
    statusCard: {
      gap: theme.spacing.xs,
      marginBottom: theme.spacing.md
    },
    noticeCard: {
      flexDirection: "row",
      alignItems: "flex-start",
      gap: theme.spacing.sm,
      marginBottom: theme.spacing.md,
      backgroundColor: "#FFF8E6"
    },
    noticeText: {
      ...theme.typography.caption,
      flex: 1,
      color: theme.colors.text
    },
    statusLabel: {
      ...theme.typography.caption,
      color: theme.colors.muted
    },
    statusValue: {
      ...theme.typography.heading,
      color: theme.colors.primary
    },
    section: {
      gap: theme.spacing.sm,
      marginBottom: theme.spacing.md
    },
    boostCard: {
      gap: theme.spacing.md,
      marginBottom: theme.spacing.md
    },
    boostHeader: {
      flexDirection: "row",
      alignItems: "center",
      gap: theme.spacing.sm
    },
    boostIcon: {
      width: 42,
      height: 42,
      borderRadius: theme.radius.pill,
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: theme.colors.secondary
    },
    boostCopy: {
      flex: 1,
      gap: theme.spacing.xxs
    },
    boostDescription: {
      ...theme.typography.body,
      color: theme.colors.muted
    },
    boostMeta: {
      ...theme.typography.caption,
      color: theme.colors.muted
    },
    sectionTitle: {
      ...theme.typography.subheading,
      color: theme.colors.text
    },
    featureRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: theme.spacing.sm
    },
    featureText: {
      ...theme.typography.body,
      color: theme.colors.text
    },
    planGrid: {
      gap: theme.spacing.md
    },
    planCard: {
      gap: theme.spacing.md
    },
    planTitle: {
      ...theme.typography.subheading,
      color: theme.colors.text
    },
    price: {
      ...theme.typography.title,
      color: theme.colors.primary
    }
  });
