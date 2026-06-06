// Premium ozellikleri ve mock odeme planlarini sunar.
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
  const { subscription, isLoading, purchase, isPurchasing } = usePremium();

  const buyPlan = async (plan: SubscriptionPlan) => {
    const result = await purchase(plan);
    Alert.alert("Premium aktif", `Mock odeme tamamlandi. Receipt: ${result.receiptId}`);
  };

  if (isLoading) {
    return <Loading label="Premium yukleniyor" />;
  }

  return (
    <Screen>
      <View style={styles.header}>
        <Text style={styles.kicker}>Premium</Text>
        <Text style={styles.title}>Daha guclu eslesme deneyimi</Text>
        <Text style={styles.description}>Odeme mimarisi mock servisle hazir; gercek entegrasyon ayni kontrata baglanabilir.</Text>
      </View>

      <Card style={styles.statusCard}>
        <Text style={styles.statusLabel}>Abonelik durumu</Text>
        <Text style={styles.statusValue}>{subscription?.status === "active" ? "Aktif" : "Pasif"}</Text>
      </Card>

      <Card style={styles.section}>
        <Text style={styles.sectionTitle}>Ozellikler</Text>
        {premiumFeatures.map((feature) => (
          <View key={feature} style={styles.featureRow}>
            <Ionicons name="checkmark-circle" size={20} color={theme.colors.success} />
            <Text style={styles.featureText}>{feature}</Text>
          </View>
        ))}
      </Card>

      <View style={styles.planGrid}>
        <Card style={styles.planCard}>
          <Text style={styles.planTitle}>Aylik</Text>
          <Text style={styles.price}>₺149</Text>
          <Button label="Aylik baslat" loading={isPurchasing} onPress={() => void buyPlan("monthly")} />
        </Card>
        <Card style={styles.planCard}>
          <Text style={styles.planTitle}>Yillik</Text>
          <Text style={styles.price}>₺999</Text>
          <Button label="Yillik baslat" variant="secondary" loading={isPurchasing} onPress={() => void buyPlan("yearly")} />
        </Card>
      </View>
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
