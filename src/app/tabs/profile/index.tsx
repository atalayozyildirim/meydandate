// Kullanıcı profilini, rozetleri ve düzenleme geçişini gösterir.
import { Alert, Image, Pressable, StyleSheet, Text, View } from "react-native";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { Button } from "@/shared/components/Button";
import { Card } from "@/shared/components/Card";
import { Loading } from "@/shared/components/Loading";
import { Screen } from "@/shared/components/Screen";
import { badgeLabels, interestOptions } from "@/shared/constants/options";
import { paidBadgeProducts } from "@/shared/constants/badges";
import { usePremium } from "@/features/premium/hooks/usePremium";
import { env } from "@/infrastructure/config/env";
import { useProfile } from "@/features/profile/hooks/useProfile";
import { useTheme } from "@/shared/theme";

export default function ProfileScreen() {
  const router = useRouter();
  const theme = useTheme();
  const styles = createStyles(theme);
  const { profile, isLoading } = useProfile();
  const { purchaseBadge, isPurchasingBadge } = usePremium();
  const isMockPaymentMode = !env.useRevenueCatPayments;

  if (isLoading || !profile) {
    return <Loading label="Profil yükleniyor" />;
  }

  const primaryPhoto = profile.photos[0]?.uri;

  const buyBadge = async (badge: (typeof paidBadgeProducts)[number]["badge"]) => {
    try {
      const result = await purchaseBadge(badge);
      Alert.alert(
        isMockPaymentMode ? "Demo rozet eklendi" : "Rozet eklendi",
        isMockPaymentMode
          ? `${badgeLabels[result.badge]} gerçek ödeme alınmadan demo olarak profiline eklendi.`
          : `${badgeLabels[result.badge]} profiline eklendi.`,
      );
    } catch (error) {
      Alert.alert(
        "Rozet alınamadı",
        error instanceof Error ? error.message : "Tekrar deneyin.",
      );
    }
  };

  return (
    <Screen>
      <View style={styles.header}>
        <Text style={styles.kicker}>Profil</Text>
        <View style={styles.headerActions}>
          <Pressable onPress={() => router.push("/tabs/settings")} style={styles.iconButton}>
            <Ionicons name="settings-outline" size={22} color={theme.colors.text} />
          </Pressable>
          <Pressable onPress={() => router.push("/tabs/profile/edit")} style={styles.iconButton}>
            <Ionicons name="create-outline" size={22} color={theme.colors.text} />
          </Pressable>
        </View>
      </View>
      {primaryPhoto ? <Image source={{ uri: primaryPhoto }} style={styles.photo} /> : null}
      <Text style={styles.name}>
        {profile.name}, {profile.age}
      </Text>
      <Text style={styles.city}>{profile.city}</Text>
      <Text style={styles.bio}>{profile.bio}</Text>

      <Card style={styles.section}>
        <Text style={styles.sectionTitle}>Rozetler</Text>
        <View style={styles.chipWrap}>
          {profile.badges.map((badge) => (
            <View key={badge} style={styles.badge}>
              <Text style={styles.badgeText}>{badgeLabels[badge]}</Text>
            </View>
          ))}
        </View>
      </Card>

      <Card style={styles.premiumCard}>
        <View style={styles.premiumIcon}>
          <Ionicons name="star-outline" size={22} color="#FFFFFF" />
        </View>
        <View style={styles.storeText}>
          <Text style={styles.sectionTitle}>Ehlibyte Premium</Text>
          <Text style={styles.storeDescription}>
            Reklamları kaldır, Super Like ve öncelikli görünürlük kazan.
          </Text>
        </View>
        <Button
          label={profile.isPremium ? "Aktif" : "İncele"}
          variant={profile.isPremium ? "ghost" : "primary"}
          disabled={profile.isPremium}
          style={styles.storeButton}
          onPress={() => router.push("/tabs/premium")}
        />
      </Card>

      <Card style={styles.section}>
        <Text style={styles.sectionTitle}>Rozet mağazası</Text>
        {isMockPaymentMode ? (
          <Text style={styles.storeNotice}>
            Geliştirme modunda rozetler gerçek ödeme almadan demo olarak eklenir.
          </Text>
        ) : null}
        {paidBadgeProducts.map((product) => {
          const owned = profile.badges.includes(product.badge);

          return (
            <View key={product.badge} style={styles.storeItem}>
              <View style={styles.storeIcon}>
                <Ionicons name="ribbon-outline" size={22} color={theme.colors.primary} />
              </View>
              <View style={styles.storeText}>
                <Text style={styles.storeTitle}>{product.title}</Text>
                <Text style={styles.storeDescription}>{product.description}</Text>
                <Text style={styles.storePrice}>{owned ? "Sende var" : product.priceLabel}</Text>
              </View>
              <Button
                label={owned ? "Alındı" : "Al"}
                variant={owned ? "ghost" : "primary"}
                disabled={owned}
                loading={isPurchasingBadge}
                style={styles.storeButton}
                onPress={() => void buyBadge(product.badge)}
              />
            </View>
          );
        })}
      </Card>

      <Card style={styles.section}>
        <Text style={styles.sectionTitle}>İlgi alanları</Text>
        <View style={styles.chipWrap}>
          {profile.interests.map((interest) => (
            <View key={interest} style={styles.interest}>
              <Text style={styles.interestText}>
                {interestOptions.find((option) => option.value === interest)?.label ?? interest}
              </Text>
            </View>
          ))}
        </View>
      </Card>

      <Card style={styles.section}>
        <Text style={styles.sectionTitle}>Kültürel detaylar</Text>
        <Text style={styles.detail}>Memleket: {profile.hometown || "Belirtilmedi"}</Text>
        <Text style={styles.detail}>Favori türkü: {profile.favoriteSong || "Belirtilmedi"}</Text>
        <Text style={styles.detail}>Favori ozan: {profile.favoritePoet || "Belirtilmedi"}</Text>
      </Card>

      <Button label="Profili düzenle" onPress={() => router.push("/tabs/profile/edit")} />
    </Screen>
  );
}

const createStyles = (theme: ReturnType<typeof useTheme>) =>
  StyleSheet.create({
    header: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      marginBottom: theme.spacing.md
    },
    headerActions: {
      flexDirection: "row",
      alignItems: "center",
      gap: theme.spacing.xs
    },
    kicker: {
      ...theme.typography.caption,
      color: theme.colors.primary,
      textTransform: "uppercase"
    },
    iconButton: {
      width: 42,
      height: 42,
      borderRadius: theme.radius.pill,
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: theme.colors.elevated
    },
    photo: {
      width: "100%",
      height: 360,
      borderRadius: theme.radius.md,
      marginBottom: theme.spacing.md,
      backgroundColor: theme.colors.elevated
    },
    name: {
      ...theme.typography.title,
      color: theme.colors.text
    },
    city: {
      ...theme.typography.body,
      color: theme.colors.muted,
      marginBottom: theme.spacing.sm
    },
    bio: {
      ...theme.typography.body,
      color: theme.colors.text,
      marginBottom: theme.spacing.lg
    },
    section: {
      gap: theme.spacing.sm,
      marginBottom: theme.spacing.md
    },
    premiumCard: {
      flexDirection: "row",
      alignItems: "center",
      gap: theme.spacing.sm,
      marginBottom: theme.spacing.md
    },
    premiumIcon: {
      width: 42,
      height: 42,
      borderRadius: theme.radius.pill,
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: theme.colors.primary
    },
    sectionTitle: {
      ...theme.typography.subheading,
      color: theme.colors.text
    },
    chipWrap: {
      flexDirection: "row",
      flexWrap: "wrap",
      gap: theme.spacing.xs
    },
    badge: {
      borderRadius: theme.radius.pill,
      paddingHorizontal: theme.spacing.md,
      paddingVertical: theme.spacing.xs,
      backgroundColor: theme.colors.primary
    },
    badgeText: {
      ...theme.typography.caption,
      color: "#FFFFFF"
    },
    storeItem: {
      minHeight: 96,
      borderRadius: 20,
      borderWidth: 1,
      borderColor: theme.colors.border,
      padding: theme.spacing.sm,
      flexDirection: "row",
      alignItems: "center",
      gap: theme.spacing.sm,
      backgroundColor: "rgba(255, 255, 255, 0.76)"
    },
    storeIcon: {
      width: 42,
      height: 42,
      borderRadius: theme.radius.pill,
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: theme.colors.elevated
    },
    storeText: {
      flex: 1,
      gap: theme.spacing.xxs
    },
    storeTitle: {
      ...theme.typography.subheading,
      color: theme.colors.text
    },
    storeDescription: {
      ...theme.typography.caption,
      color: theme.colors.muted
    },
    storePrice: {
      ...theme.typography.caption,
      color: theme.colors.primary
    },
    storeNotice: {
      ...theme.typography.caption,
      color: theme.colors.warning
    },
    storeButton: {
      minHeight: 42,
      paddingHorizontal: theme.spacing.sm
    },
    interest: {
      borderRadius: theme.radius.pill,
      paddingHorizontal: theme.spacing.md,
      paddingVertical: theme.spacing.xs,
      backgroundColor: theme.colors.elevated
    },
    interestText: {
      ...theme.typography.caption,
      color: theme.colors.text
    },
    detail: {
      ...theme.typography.body,
      color: theme.colors.muted
    }
  });
