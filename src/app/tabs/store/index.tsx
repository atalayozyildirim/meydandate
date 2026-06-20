// Premium, boost ve rozet alımlarını sade bir mağaza ekranında toplar.
import { useEffect, useState } from "react";
import { Alert, Pressable, StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming,
} from "react-native-reanimated";
import type { Badge } from "@/domain/entities/User";
import type {
  FirePackageAmount,
  SubscriptionPlan,
} from "@/domain/entities/Subscription";
import { Button } from "@/shared/components/Button";
import { Card } from "@/shared/components/Card";
import { Loading } from "@/shared/components/Loading";
import { Screen } from "@/shared/components/Screen";
import { BadgeIcon } from "@/shared/components/BadgeIcon";
import {
  earnedBadgeProducts,
  paidBadgeProducts,
} from "@/shared/constants/badges";
import { badgeLabels, premiumFeatures } from "@/shared/constants/options";
import { usePremium } from "@/features/premium/hooks/usePremium";
import { useBadges } from "@/features/profile/hooks/useBadges";
import { firePackageValues, useFire } from "@/features/fire/hooks/useFire";
import { useMatches } from "@/features/match/hooks/useMatches";
import { useProfile } from "@/features/profile/hooks/useProfile";
import { env } from "@/infrastructure/config/env";
import { isExpoGo } from "@/shared/utils/expoRuntime";
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

type StoreCategory = "premium" | "fire" | "badges" | "earned";

const storeCategories = [
  { key: "premium", label: "Premium", icon: "sparkles-outline" },
  { key: "fire", label: "Fire", icon: "flame-outline" },
  { key: "badges", label: "Rozetler", icon: "ribbon-outline" },
  { key: "earned", label: "Görev", icon: "trophy-outline" },
] satisfies Array<{
  key: StoreCategory;
  label: string;
  icon: keyof typeof Ionicons.glyphMap;
}>;

const getFirePackageCaption = (amount: FirePackageAmount) => {
  if (amount === 100) {
    return "Kartlara küçük dokunuşlar için";
  }

  if (amount === 500) {
    return "Dengeli paket, daha sık Fire gönder";
  }

  return "Yoğun görünürlük ve destek paketi";
};

export default function StoreScreen() {
  const theme = useTheme();
  const styles = createStyles(theme);
  const [selectedCategory, setSelectedCategory] =
    useState<StoreCategory>("premium");
  const { profile, isLoading: isProfileLoading } = useProfile();
  const isMockPaymentMode = !env.useRevenueCatPayments || isExpoGo;
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
  const { fireBalance, purchaseFirePackage, isPurchasingFirePackage } =
    useFire();
  const { matches, isLoading: isMatchesLoading } = useMatches();
  const { claimTaskBadge, isClaimingTaskBadge } = useBadges();
  const firePulse = useSharedValue(1);

  const fireIconStyle = useAnimatedStyle(() => ({
    transform: [{ scale: firePulse.value }],
  }));

  useEffect(() => {
    firePulse.value = withRepeat(
      withSequence(
        withTiming(1.08, { duration: 900 }),
        withTiming(1, { duration: 900 }),
      ),
      -1,
      true,
    );
  }, [firePulse]);

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

  const buyFirePackage = async (amount: FirePackageAmount) => {
    try {
      const result = await purchaseFirePackage(amount);
      Alert.alert(
        "Fire yüklendi",
        result.balance !== undefined
          ? `${amount} Fire hesabına eklendi. Yeni bakiye: ${result.balance}.`
          : `${amount} Fire satın alımı tamamlandı. Bakiye kısa süre içinde güncellenecek.`,
      );
    } catch (error) {
      Alert.alert(
        "Fire alınamadı",
        error instanceof Error ? error.message : "Tekrar deneyin.",
      );
    }
  };

  const canClaimEarnedBadge = (badge: Badge) => {
    if (profile?.badges.includes(badge)) {
      return false;
    }

    if (badge === "asure_lokmasi") {
      return profile?.badges.includes("muharrem_orucu_2026");
    }

    if (badge === "ilk_eslesme") {
      return matches.length > 0;
    }

    if (badge === "populer_profil") {
      return (profile?.fireScore ?? 0) >= 50;
    }

    return false;
  };

  const claimEarnedBadge = async (
    badge: Badge,
    canClaim: boolean,
    requirementLabel: string,
  ) => {
    if (!canClaim) {
      Alert.alert("Görev tamamlanmadı", requirementLabel);
      return;
    }

    try {
      const updatedUser = await claimTaskBadge(badge);
      Alert.alert(
        "Rozet kazanıldı",
        `${badgeLabels[badge]} profiline eklendi.`,
      );

      if (updatedUser.badges.includes(badge)) {
        return;
      }
    } catch (error) {
      Alert.alert(
        "Rozet henüz açılamadı",
        error instanceof Error ? error.message : "Görev şartını tamamla.",
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
        <Text style={styles.title}>Profilini öne çıkar</Text>
        <Text style={styles.description}>
          Premium, Fire ve rozetler tek ekranda.
        </Text>
      </View>

      {isMockPaymentMode ? (
        <View style={styles.noticeBanner}>
          <Ionicons
            name="information-circle"
            size={18}
            color={theme.colors.warning}
          />
          <Text style={styles.noticeText}>Demo mod: gerçek ödeme alınmaz.</Text>
        </View>
      ) : null}

      <View style={styles.categoryRail}>
        {storeCategories.map((category) => {
          const selected = selectedCategory === category.key;

          return (
            <Pressable
              key={category.key}
              accessibilityRole="button"
              accessibilityState={{ selected }}
              onPress={() => setSelectedCategory(category.key)}
              style={({ pressed }) => [
                styles.categoryChip,
                selected && styles.categoryChipActive,
                pressed && styles.categoryChipPressed,
              ]}
            >
              <Ionicons
                name={category.icon}
                size={16}
                color={selected ? "#FFFFFF" : theme.colors.muted}
              />
              <Text
                style={[
                  styles.categoryChipText,
                  selected && styles.categoryChipTextActive,
                ]}
              >
                {category.label}
              </Text>
            </Pressable>
          );
        })}
      </View>

      <View
        style={[
          styles.salesSection,
          selectedCategory !== "premium" && styles.hiddenSection,
        ]}
      >
        <View style={styles.sectionHeaderRow}>
          <View style={styles.sectionHeaderCopy}>
            <Text style={styles.sectionEyebrow}>En güçlü paket</Text>
            <Text style={styles.sectionTitle}>Premium</Text>
          </View>
          <View
            style={[
              styles.statusPill,
              isPremiumActive && styles.statusPillActive,
            ]}
          >
            <Ionicons
              name={isPremiumActive ? "checkmark-circle" : "flame-outline"}
              size={15}
              color={isPremiumActive ? "#FFFFFF" : theme.colors.primary}
            />
            <Text
              style={[
                styles.statusPillText,
                isPremiumActive && styles.statusPillTextActive,
              ]}
            >
              {isPremiumActive ? "Aktif" : "Öne çık"}
            </Text>
          </View>
        </View>

        <Card style={styles.featureCard}>
          <View style={styles.featureCardTop}>
            <View style={styles.featureIcon}>
              <Ionicons name="heart" size={22} color="#FFFFFF" />
            </View>
            <View style={styles.featureCopy}>
              <Text style={styles.featureTitle}>
                {isPremiumActive
                  ? "Premium ayrıcalıkların açık"
                  : "Ehlibyte Premium"}
              </Text>
              <Text style={styles.featureSubtitle}>
                Reklamsız deneyim, Super Like ve keşifte daha güçlü görünürlük.
              </Text>
            </View>
          </View>
          <View style={styles.featureRows}>
            {premiumFeatures.map((feature) => (
              <View key={feature} style={styles.featureRow}>
                <Ionicons
                  name="checkmark-circle"
                  size={17}
                  color={theme.colors.primary}
                />
                <Text style={styles.featureRowText}>{feature}</Text>
              </View>
            ))}
          </View>
        </Card>

        <View style={styles.productList}>
          {premiumPlans.map((item) => {
            const activePlan =
              isPremiumActive &&
              subscription?.status === "active" &&
              subscription.plan === item.plan;

            return (
              <Card
                key={item.plan}
                style={[
                  styles.productCard,
                  item.featured && styles.featuredCard,
                ]}
              >
                <View style={styles.productCopy}>
                  <View style={styles.productTitleRow}>
                    <Text style={styles.productTitle}>{item.title}</Text>
                    {item.featured ? (
                      <Text style={styles.popularPill}>Popüler</Text>
                    ) : null}
                  </View>
                  <Text style={styles.productCaption}>{item.caption}</Text>
                  <Text style={styles.productPrice}>
                    {planPrices?.[item.plan] ?? "Mağaza fiyatı"}
                  </Text>
                </View>
                <Button
                  label={activePlan ? "Aktif" : "Satın al"}
                  variant={item.featured ? "secondary" : "primary"}
                  disabled={activePlan}
                  loading={isPurchasing}
                  style={styles.actionButton}
                  onPress={() => void buyPlan(item.plan)}
                />
              </Card>
            );
          })}
        </View>

        <Card style={styles.productCard}>
          <View style={styles.productCopy}>
            <Text style={styles.productTitle}>Profil boost</Text>
            <Text style={styles.productCaption}>
              {isBoostActive
                ? `Aktif${boostExpiresAt ? ` · ${formatProfileBoostExpiry(boostExpiresAt)}` : ""}`
                : "Premium ile 24 saat keşifte öne çık."}
            </Text>
          </View>
          <Button
            label={isBoostActive ? "Aktif" : "Başlat"}
            variant="secondary"
            disabled={!isPremiumActive || isBoostActive}
            loading={isActivatingBoost}
            style={styles.actionButton}
            onPress={() => void startBoost()}
          />
        </Card>
      </View>

      <View
        style={[
          styles.salesSection,
          selectedCategory !== "fire" && styles.hiddenSection,
        ]}
      >
        <View style={styles.sectionHeaderRow}>
          <View style={styles.sectionHeaderCopy}>
            <Text style={styles.sectionEyebrow}>Boost bakiyesi</Text>
            <Text style={styles.sectionTitle}>Fire</Text>
          </View>
          <View style={styles.balancePill}>
            <Animated.View style={fireIconStyle}>
              <Ionicons name="flame" size={17} color={theme.colors.primary} />
            </Animated.View>
            <Text style={styles.balanceText}>{fireBalance}</Text>
          </View>
        </View>

        <View style={styles.productList}>
          {firePackageValues.map((amount) => (
            <Card
              key={amount}
              style={[
                styles.productCard,
                amount === 500 && styles.featuredCard,
              ]}
            >
              <View style={styles.fireProductIcon}>
                <Ionicons name="flame" size={22} color="#FFFFFF" />
              </View>
              <View style={styles.productCopy}>
                <View style={styles.productTitleRow}>
                  <Text style={styles.productTitle}>{amount} Fire</Text>
                  {amount === 500 ? (
                    <Text style={styles.popularPill}>Önerilen</Text>
                  ) : null}
                </View>
                <Text style={styles.productCaption}>
                  {getFirePackageCaption(amount)}
                </Text>
              </View>
              <Button
                label="Yükle"
                variant={amount === 500 ? "secondary" : "primary"}
                loading={isPurchasingFirePackage}
                style={styles.actionButton}
                icon={<Ionicons name="flame" size={16} color="#FFFFFF" />}
                onPress={() => void buyFirePackage(amount)}
              />
            </Card>
          ))}
        </View>
      </View>

      <View
        style={[
          styles.salesSection,
          selectedCategory !== "badges" && styles.hiddenSection,
        ]}
      >
        <View style={styles.sectionHeaderRow}>
          <View style={styles.sectionHeaderCopy}>
            <Text style={styles.sectionEyebrow}>Profil vitrini</Text>
            <Text style={styles.sectionTitle}>Özel rozetler</Text>
          </View>
          <Text style={styles.sectionCount}>{paidBadgeProducts.length}</Text>
        </View>

        <View style={styles.productList}>
          {paidBadgeProducts.map((product) => {
            const owned = profile.badges.includes(product.badge);

            return (
              <Card key={product.badge} style={styles.productCard}>
                <View style={styles.badgeIcon}>
                  <BadgeIcon badge={product.badge} size={56} />
                </View>
                <View style={styles.productCopy}>
                  <Text style={styles.productTitle}>{product.title}</Text>
                  <Text numberOfLines={2} style={styles.productCaption}>
                    {product.description}
                  </Text>
                  <Text style={styles.productPrice}>
                    {owned ? "Profilinde aktif" : product.priceLabel}
                  </Text>
                </View>
                <Button
                  label={owned ? "Alındı" : "Satın al"}
                  variant={owned ? "ghost" : "primary"}
                  disabled={owned}
                  loading={isPurchasingBadge}
                  style={styles.actionButton}
                  onPress={() => void buyBadge(product.badge)}
                />
              </Card>
            );
          })}
        </View>
      </View>

      <View
        style={[
          styles.salesSection,
          selectedCategory !== "earned" && styles.hiddenSection,
        ]}
      >
        <View style={styles.sectionHeaderRow}>
          <View style={styles.sectionHeaderCopy}>
            <Text style={styles.sectionEyebrow}>Başarıyla kazan</Text>
            <Text style={styles.sectionTitle}>Görev rozetleri</Text>
          </View>
          <Text style={styles.sectionCount}>{earnedBadgeProducts.length}</Text>
        </View>

        <View style={styles.productList}>
          {earnedBadgeProducts.map((product) => {
            const owned = profile.badges.includes(product.badge);
            const canClaim = canClaimEarnedBadge(product.badge);
            const isLocked = !owned && !canClaim;

            return (
              <Card key={product.badge} style={styles.productCard}>
                <View style={styles.badgeIcon}>
                  <BadgeIcon badge={product.badge} size={56} />
                </View>
                <View style={styles.productCopy}>
                  <Text style={styles.productTitle}>{product.title}</Text>
                  <Text numberOfLines={2} style={styles.productCaption}>
                    {product.description}
                  </Text>
                  <Text
                    style={[
                      styles.productRequirement,
                      canClaim && styles.productRequirementReady,
                    ]}
                  >
                    {owned
                      ? "Kazanıldı"
                      : canClaim
                        ? "Kazanıma hazır"
                        : product.requirementLabel}
                  </Text>
                </View>
                <Button
                  label={owned ? "Sende" : isLocked ? "Kilitli" : "Kazan"}
                  variant={canClaim ? "secondary" : "ghost"}
                  disabled={owned || isLocked || isMatchesLoading}
                  loading={isClaimingTaskBadge}
                  style={styles.actionButton}
                  onPress={() =>
                    void claimEarnedBadge(
                      product.badge,
                      canClaim,
                      product.requirementLabel,
                    )
                  }
                />
              </Card>
            );
          })}
        </View>
      </View>

      <Button
        label="Satın alımları geri yükle"
        variant="ghost"
        loading={isRestoring}
        style={styles.restoreButton}
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
    noticeBanner: {
      minHeight: 42,
      borderRadius: theme.radius.md,
      borderWidth: 1,
      borderColor: "rgba(245, 158, 11, 0.24)",
      flexDirection: "row",
      alignItems: "center",
      gap: theme.spacing.sm,
      paddingHorizontal: theme.spacing.sm,
      backgroundColor: theme.isDark
        ? "rgba(245, 158, 11, 0.08)"
        : "rgba(245, 158, 11, 0.12)",
    },
    noticeText: {
      ...theme.typography.caption,
      color: theme.colors.warning,
      flex: 1,
    },
    categoryRail: {
      minHeight: 48,
      borderRadius: theme.radius.pill,
      borderWidth: 1,
      borderColor: theme.colors.border,
      flexDirection: "row",
      alignItems: "center",
      gap: 4,
      padding: 4,
      backgroundColor: theme.isDark
        ? "rgba(255, 255, 255, 0.04)"
        : "rgba(255, 255, 255, 0.72)",
    },
    categoryChip: {
      flex: 1,
      minHeight: 40,
      borderRadius: theme.radius.pill,
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      gap: 4,
      paddingHorizontal: 6,
    },
    categoryChipActive: {
      backgroundColor: theme.colors.primary,
      shadowColor: theme.colors.primary,
      shadowOpacity: 0.22,
      shadowRadius: 10,
      shadowOffset: { width: 0, height: 4 },
    },
    categoryChipPressed: {
      opacity: 0.84,
    },
    categoryChipText: {
      fontSize: 12,
      lineHeight: 16,
      fontWeight: "900",
      color: theme.colors.muted,
    },
    categoryChipTextActive: {
      color: "#FFFFFF",
    },
    hiddenSection: {
      display: "none",
    },
    salesSection: {
      gap: theme.spacing.sm,
    },
    sectionHeaderRow: {
      minHeight: 44,
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      gap: theme.spacing.md,
    },
    sectionHeaderCopy: {
      flex: 1,
      minWidth: 0,
      gap: theme.spacing.xxs,
    },
    sectionEyebrow: {
      ...theme.typography.caption,
      color: theme.colors.primary,
      textTransform: "uppercase",
    },
    sectionTitle: {
      ...theme.typography.heading,
      color: theme.colors.text,
    },
    sectionCount: {
      minWidth: 36,
      overflow: "hidden",
      borderRadius: theme.radius.pill,
      paddingHorizontal: theme.spacing.sm,
      paddingVertical: theme.spacing.xxs,
      backgroundColor: theme.colors.elevated,
      ...theme.typography.caption,
      color: theme.colors.primary,
      textAlign: "center",
      fontWeight: "900",
    },
    statusPill: {
      minHeight: 34,
      borderRadius: theme.radius.pill,
      borderWidth: 1,
      borderColor: "rgba(233, 64, 87, 0.22)",
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      gap: theme.spacing.xxs,
      paddingHorizontal: theme.spacing.sm,
      backgroundColor: theme.colors.surface,
    },
    statusPillActive: {
      borderColor: theme.colors.primary,
      backgroundColor: theme.colors.primary,
    },
    statusPillText: {
      ...theme.typography.caption,
      color: theme.colors.primary,
      fontWeight: "900",
    },
    statusPillTextActive: {
      color: "#FFFFFF",
    },
    balancePill: {
      minHeight: 38,
      minWidth: 82,
      borderRadius: theme.radius.pill,
      borderWidth: 1,
      borderColor: "rgba(233, 64, 87, 0.18)",
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      gap: theme.spacing.xxs,
      paddingHorizontal: theme.spacing.sm,
      backgroundColor: theme.colors.surface,
    },
    balanceText: {
      ...theme.typography.subheading,
      color: theme.colors.primary,
    },
    featureCard: {
      gap: theme.spacing.md,
      borderColor: "rgba(233, 64, 87, 0.18)",
      backgroundColor: theme.isDark ? "#171A24" : "#FFFFFF",
    },
    featureCardTop: {
      flexDirection: "row",
      alignItems: "center",
      gap: theme.spacing.sm,
    },
    featureIcon: {
      width: 48,
      height: 48,
      borderRadius: theme.radius.pill,
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: theme.colors.primary,
    },
    featureCopy: {
      flex: 1,
      minWidth: 0,
      gap: theme.spacing.xxs,
    },
    featureTitle: {
      ...theme.typography.subheading,
      color: theme.colors.text,
    },
    featureSubtitle: {
      ...theme.typography.caption,
      color: theme.colors.muted,
    },
    featureRows: {
      gap: theme.spacing.xs,
    },
    featureRow: {
      minHeight: 30,
      flexDirection: "row",
      alignItems: "center",
      gap: theme.spacing.xs,
    },
    featureRowText: {
      ...theme.typography.body,
      color: theme.colors.text,
      flex: 1,
    },
    productList: {
      gap: theme.spacing.sm,
    },
    productCard: {
      minHeight: 108,
      flexDirection: "row",
      alignItems: "center",
      gap: theme.spacing.sm,
      borderColor: theme.colors.border,
    },
    featuredCard: {
      borderColor: "rgba(138, 35, 135, 0.38)",
      backgroundColor: theme.isDark ? "rgba(192, 132, 252, 0.08)" : "#FFF7F8",
    },
    productCopy: {
      flex: 1,
      minWidth: 0,
      gap: theme.spacing.xxs,
    },
    productTitleRow: {
      flexDirection: "row",
      alignItems: "center",
      flexWrap: "wrap",
      gap: theme.spacing.xs,
    },
    productTitle: {
      ...theme.typography.subheading,
      flexShrink: 1,
      color: theme.colors.text,
    },
    productCaption: {
      ...theme.typography.caption,
      color: theme.colors.muted,
    },
    productPrice: {
      ...theme.typography.subheading,
      flexShrink: 1,
      color: theme.colors.primary,
    },
    productRequirement: {
      ...theme.typography.caption,
      color: theme.colors.muted,
    },
    productRequirementReady: {
      color: theme.colors.primary,
      fontWeight: "900",
    },
    popularPill: {
      ...theme.typography.caption,
      color: theme.isDark ? "#FCE7F3" : theme.colors.secondary,
      borderRadius: theme.radius.pill,
      paddingHorizontal: theme.spacing.xs,
      paddingVertical: 2,
      backgroundColor: theme.isDark
        ? "rgba(192, 132, 252, 0.16)"
        : "rgba(138, 35, 135, 0.10)",
      overflow: "hidden",
    },
    actionButton: {
      minWidth: 104,
      minHeight: 46,
      flexShrink: 0,
      paddingHorizontal: theme.spacing.sm,
    },
    restoreButton: {
      minHeight: 50,
      marginTop: theme.spacing.xs,
    },
    badgeIcon: {
      width: 58,
      height: 58,
      borderRadius: theme.radius.pill,
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: "transparent",
    },
    fireProductIcon: {
      width: 50,
      height: 50,
      borderRadius: theme.radius.pill,
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: theme.colors.primary,
    },
  });
