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
import { useTheme } from "@/shared/theme";

export default function PremiumScreen() {
  const theme = useTheme();
  const styles = createStyles(theme);
  const {
    subscription,
    planPrices,
    isLoading,
    purchase,
    isPurchasing,
    restorePurchases,
    isRestoring,
  } = usePremium();

  const buyPlan = async (plan: SubscriptionPlan) => {
    try {
      await purchase(plan);
      Alert.alert("Premium aktif", "Satın alım tamamlandı.");
    } catch (error) {
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

  if (isLoading) {
    return <Loading label="Premium yükleniyor" />;
  }

  return (
    <Screen>
      <View style={styles.header}>
        <Text style={styles.kicker}>Premium</Text>
        <Text style={styles.title}>Daha güçlü eşleşme deneyimi</Text>
        <Text style={styles.description}>
          Premium ile daha fazla kişiye ulaş, reklamları kaldır ve eşleşme araçlarını aç.
        </Text>
      </View>

      <Card style={styles.statusCard}>
        <Text style={styles.statusLabel}>Abonelik durumu</Text>
        <Text style={styles.statusValue}>{subscription?.status === "active" ? "Aktif" : "Pasif"}</Text>
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
