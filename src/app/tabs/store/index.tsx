// Premium, boost ve rozet alımlarını sade bir mağaza ekranında toplar.
import { Alert, StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import type { Badge } from "@/domain/entities/User";
import type { SubscriptionPlan } from "@/domain/entities/Subscription";
import { Button } from "@/shared/components/Button";
import { Card } from "@/shared/components/Card";
import { Loading } from "@/shared/components/Loading";
import { Screen } from "@/shared/components/Screen";
import { ZulfiqarBadgeIcon } from "@/shared/components/ZulfiqarBadgeIcon";
import { paidBadgeProducts } from "@/shared/constants/badges";
import { badgeLabels, premiumFeatures } from "@/shared/constants/options";
import { usePremium } from "@/features/premium/hooks/usePremium";
import { useProfile } from "@/features/profile/hooks/useProfile";
import { env } from "@/infrastructure/config/env";
import { useTheme } from "@/shared/theme";
import { formatProfileBoostExpiry } from "@/shared/utils/profileBoost";

const premiumPlans = [
  { plan: "monthly", title: "Aylık", caption: "Esnek başlangıç" },
  { plan: "yearly", title: "Yıllık", caption: "En avantajlı", featured: true },
  { plan: "lifetime", title: "Ömür boyu", caption: "Tek seferlik" },
] satisfies Array<{
  plan: SubscriptionPlan;
  title: string;
  caption: string;
  featured?: boolean;
}>;

export default function StoreScreen() {
  const theme = useTheme();
  const styles = createStyles(theme);
  const { profile, isLoading: isProfileLoading } = useProfile();
  const isMockPaymentMode = !env.useRevenueCatPayments;
  const {
    subscription,
    planPrices,
    isLoading: isSubscriptionLoading,
    purchase,
    isPurchasing,
    restorePurchases,
    isRestoring,
    purchaseBadge,
    isPurchasingBadge,
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
          ? "Gerçek ödeme alınmadan demo Premium açıldı."
          : "Mağaza satın alımı tamamlandı.",
      );
    } catch (error) {
      Alert.alert(
        "Satın alım tamamlanamadı",
        error instanceof Error ? error.message : "Tekrar deneyin.",
      );
    }
  };

  const buyBadge = async (badge: Badge) => {
    try {
      const result = await purchaseBadge(badge);
      Alert.alert(
        isMockPaymentMode ? "Demo rozet eklendi" : "Rozet eklendi",
        `${badgeLabels[result.badge]} profiline eklendi.`,
      );
    } catch (error) {
      Alert.alert(
        "Rozet alınamadı",
        error instanceof Error ? error.message : "Tekrar deneyin.",
      );
    }
  };

  const restore = async () => {
    try {
      const restoredSubscription = await restorePurchases();
      Alert.alert(
        restoredSubscription.status === "active"
          ? "Premium geri yüklendi"
          : "Satın alım bulunamadı",
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
      Alert.alert(
        "Boost aktif",
        "Profilin 24 saat boyunca keşifte öne çıkarılacak.",
      );
    } catch (error) {
      Alert.alert(
        "Boost başlatılamadı",
        error instanceof Error ? error.message : "Tekrar deneyin.",
      );
    }
  };

  if (isProfileLoading || isSubscriptionLoading || !profile) {
    return <Loading label="Mağaza yükleniyor" />;
  }

  return (
    <Screen style={styles.screen}>
      <View style={styles.header}>
        <Text style={styles.kicker}>Mağaza</Text>
        <Text style={styles.title}>Premium al, profilini öne çıkar</Text>
        <Text style={styles.description}>Premium, boost ve rozet alımları</Text>
      </View>

      <Card style={styles.hero}>
        <View style={styles.heroTop}>
          <View style={styles.heroIcon}>
            <Ionicons name="heart" size={22} color="#FFFFFF" />
          </View>
          <View style={styles.heroCopy}>
            <Text style={styles.heroTitle}>
              {isPremiumActive ? "Premium aktif" : "Ehlibyte Premium"}
            </Text>
            <Text style={styles.heroText}>
              {isPremiumActive
                ? "Reklamsız deneyim ve öncelikli görünürlük açık."
                : "Reklamları kaldır, Super Like kullan ve keşifte öne çık."}
            </Text>
          </View>
        </View>
        {isMockPaymentMode ? (
          <Text style={styles.notice}>Demo mod: gerçek ödeme alınmaz.</Text>
        ) : null}
      </Card>

      <View style={styles.planList}>
        {premiumPlans.map((item) => {
          const activePlan =
            isPremiumActive &&
            subscription?.status === "active" &&
            subscription.plan === item.plan;

          return (
            <Card
              key={item.plan}
              style={[styles.planCard, item.featured && styles.featuredPlan]}
            >
              <View style={styles.planCopy}>
                <View style={styles.planTitleRow}>
                  <Text style={styles.planTitle}>{item.title}</Text>
                  {item.featured ? (
                    <Text style={styles.pill}>Popüler</Text>
                  ) : null}
                </View>
                <Text style={styles.planCaption}>{item.caption}</Text>
              </View>
              <View style={styles.planAction}>
                <Text style={styles.price}>
                  {planPrices?.[item.plan] ?? "Mağaza fiyatı"}
                </Text>
                <Button
                  label={activePlan ? "Aktif" : "Al"}
                  variant={item.featured ? "secondary" : "primary"}
                  disabled={activePlan}
                  loading={isPurchasing}
                  style={styles.smallButton}
                  onPress={() => void buyPlan(item.plan)}
                />
              </View>
            </Card>
          );
        })}
      </View>

      <View style={styles.featureWrap}>
        {premiumFeatures.map((feature) => (
          <View key={feature} style={styles.featureChip}>
            <Ionicons name="checkmark" size={14} color={theme.colors.primary} />
            <Text style={styles.featureText}>{feature}</Text>
          </View>
        ))}
      </View>

      <Card style={styles.boostCard}>
        <View style={styles.boostCopy}>
          <Text style={styles.sectionTitle}>Profil boost</Text>
          <Text style={styles.mutedText}>
            {isBoostActive
              ? `Aktif${boostExpiresAt ? ` · ${formatProfileBoostExpiry(boostExpiresAt)}` : ""}`
              : "Premium ile 24 saat öne çık."}
          </Text>
        </View>
        <Button
          label={isBoostActive ? "Aktif" : "Başlat"}
          variant="secondary"
          disabled={!isPremiumActive || isBoostActive}
          loading={isActivatingBoost}
          style={styles.smallButton}
          onPress={() => void startBoost()}
        />
      </Card>

      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>Rozetler</Text>
        <Text style={styles.mutedText}>Profilinde görünür.</Text>
      </View>

      <View style={styles.badgeList}>
        {paidBadgeProducts.map((product) => {
          const owned = profile.badges.includes(product.badge);
          const isZulfiqarBadge = product.badge === "zulfiqar_sword";

          return (
            <Card key={product.badge} style={styles.badgeCard}>
              <View
                style={[
                  styles.badgeIcon,
                  isZulfiqarBadge && styles.featuredBadgeIcon,
                ]}
              >
                {isZulfiqarBadge ? (
                  <ZulfiqarBadgeIcon size={52} />
                ) : (
                  <Ionicons
                    name="ribbon-outline"
                    size={22}
                    color={theme.colors.primary}
                  />
                )}
              </View>
              <View style={styles.badgeCopy}>
                <Text style={styles.badgeTitle}>{product.title}</Text>
                <Text numberOfLines={2} style={styles.badgeDescription}>
                  {product.description}
                </Text>
                <Text style={styles.badgePrice}>
                  {owned ? "Sende var" : product.priceLabel}
                </Text>
              </View>
              <Button
                label={owned ? "Alındı" : "Al"}
                variant={owned ? "ghost" : "primary"}
                disabled={owned}
                loading={isPurchasingBadge}
                style={styles.badgeButton}
                onPress={() => void buyBadge(product.badge)}
              />
            </Card>
          );
        })}
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
    screen: {
      gap: theme.spacing.md,
    },
    header: {
      gap: theme.spacing.xs,
    },
    kicker: {
      ...theme.typography.caption,
      color: theme.colors.primary,
      textTransform: "uppercase",
    },
    title: {
      ...theme.typography.title,
      color: theme.colors.text,
    },
    description: {
      ...theme.typography.body,
      color: theme.colors.muted,
    },
    hero: {
      gap: theme.spacing.md,
      backgroundColor: theme.isDark ? "#171A24" : "#FFF7F8",
    },
    heroTop: {
      flexDirection: "row",
      alignItems: "center",
      gap: theme.spacing.sm,
    },
    heroIcon: {
      width: 46,
      height: 46,
      borderRadius: theme.radius.pill,
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: theme.colors.primary,
    },
    heroCopy: {
      flex: 1,
      gap: theme.spacing.xxs,
    },
    heroTitle: {
      ...theme.typography.subheading,
      color: theme.colors.text,
    },
    heroText: {
      ...theme.typography.caption,
      color: theme.colors.muted,
    },
    notice: {
      ...theme.typography.caption,
      color: theme.colors.warning,
    },
    planList: {
      gap: theme.spacing.sm,
    },
    planCard: {
      minHeight: 96,
      flexDirection: "row",
      alignItems: "center",
      gap: theme.spacing.sm,
    },
    featuredPlan: {
      borderColor: theme.colors.secondary,
    },
    planCopy: {
      flex: 1,
      gap: theme.spacing.xxs,
    },
    planTitleRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: theme.spacing.xs,
    },
    planTitle: {
      ...theme.typography.subheading,
      color: theme.colors.text,
    },
    pill: {
      ...theme.typography.caption,
      color: theme.isDark ? "#F8D878" : "#8A5A00",
      borderRadius: theme.radius.pill,
      paddingHorizontal: theme.spacing.xs,
      paddingVertical: 2,
      backgroundColor: theme.isDark
        ? "rgba(248, 216, 120, 0.12)"
        : "rgba(248, 216, 120, 0.28)",
      overflow: "hidden",
    },
    planCaption: {
      ...theme.typography.caption,
      color: theme.colors.muted,
    },
    planAction: {
      minWidth: 112,
      alignItems: "flex-end",
      gap: theme.spacing.xs,
    },
    price: {
      ...theme.typography.subheading,
      color: theme.colors.primary,
    },
    smallButton: {
      minHeight: 40,
      paddingHorizontal: theme.spacing.md,
    },
    featureWrap: {
      flexDirection: "row",
      flexWrap: "wrap",
      gap: theme.spacing.xs,
    },
    featureChip: {
      flexDirection: "row",
      alignItems: "center",
      gap: theme.spacing.xxs,
      borderRadius: theme.radius.pill,
      paddingHorizontal: theme.spacing.sm,
      paddingVertical: theme.spacing.xs,
      backgroundColor: theme.colors.surface,
      borderWidth: 1,
      borderColor: theme.colors.border,
    },
    featureText: {
      ...theme.typography.caption,
      color: theme.colors.text,
    },
    boostCard: {
      flexDirection: "row",
      alignItems: "center",
      gap: theme.spacing.sm,
    },
    boostCopy: {
      flex: 1,
      gap: theme.spacing.xxs,
    },
    sectionHeader: {
      gap: theme.spacing.xxs,
    },
    sectionTitle: {
      ...theme.typography.subheading,
      color: theme.colors.text,
    },
    mutedText: {
      ...theme.typography.caption,
      color: theme.colors.muted,
    },
    badgeList: {
      gap: theme.spacing.sm,
    },
    badgeCard: {
      minHeight: 98,
      flexDirection: "row",
      alignItems: "center",
      gap: theme.spacing.sm,
    },
    badgeIcon: {
      width: 44,
      height: 44,
      borderRadius: theme.radius.pill,
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: theme.colors.elevated,
    },
    featuredBadgeIcon: {
      width: 58,
      height: 58,
      backgroundColor: "transparent",
    },
    badgeCopy: {
      flex: 1,
      gap: theme.spacing.xxs,
    },
    badgeTitle: {
      ...theme.typography.subheading,
      color: theme.colors.text,
    },
    badgeDescription: {
      ...theme.typography.caption,
      color: theme.colors.muted,
    },
    badgePrice: {
      ...theme.typography.caption,
      color: theme.colors.primary,
    },
    badgeButton: {
      minHeight: 38,
      paddingHorizontal: theme.spacing.sm,
    },
  });
