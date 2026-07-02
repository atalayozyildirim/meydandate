// Kullanıcı profilini, rozetleri ve düzenleme geçişini gösterir.
import { Image, Pressable, StyleSheet, Text, View } from "react-native";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { BadgeIcon } from "@/shared/components/BadgeIcon";
import { Button } from "@/shared/components/Button";
import { Card } from "@/shared/components/Card";
import { Loading } from "@/shared/components/Loading";
import { PremiumVerifiedBadge } from "@/shared/components/PremiumVerifiedBadge";
import { Screen } from "@/shared/components/Screen";
import { badgeLabels, interestOptions } from "@/shared/constants/options";
import { useProfile } from "@/features/profile/hooks/useProfile";
import { shouldShowVerifiedBadge } from "@/shared/utils/userRole";
import { useTheme } from "@/shared/theme";

export default function ProfileScreen() {
  const router = useRouter();
  const theme = useTheme();
  const styles = createStyles(theme);
  const { profile, isLoading } = useProfile();

  if (isLoading || !profile) {
    return <Loading label="Profil yükleniyor" />;
  }

  const primaryPhoto = profile.photos[0]?.uri;
  const visibleProfilePrompts =
    profile.profilePrompts?.filter((prompt) => prompt.answer.trim()) ?? [];

  return (
    <Screen>
      <View style={styles.header}>
        <Text style={styles.kicker}>Profil</Text>
        <View style={styles.headerActions}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Ayarları aç"
            hitSlop={8}
            onPress={() => router.push("/tabs/profile/settings")}
            style={styles.iconButton}
          >
            <Ionicons
              name="settings-outline"
              size={22}
              color={theme.colors.text}
            />
          </Pressable>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Profili düzenle"
            hitSlop={8}
            onPress={() => router.push("/tabs/profile/edit")}
            style={styles.iconButton}
          >
            <Ionicons
              name="create-outline"
              size={22}
              color={theme.colors.text}
            />
          </Pressable>
        </View>
      </View>
      {primaryPhoto ? (
        <Image source={{ uri: primaryPhoto }} style={styles.photo} />
      ) : null}
      <View style={styles.nameRow}>
        <Text numberOfLines={1} style={styles.name}>
          {profile.name}, {profile.age}
        </Text>
        {shouldShowVerifiedBadge(profile) ? <PremiumVerifiedBadge size={21} /> : null}
      </View>
      <Text style={styles.city}>{profile.city}</Text>
      <Text style={styles.bio}>{profile.bio}</Text>

      {visibleProfilePrompts.length > 0 ? (
        <Card style={styles.section}>
          <Text style={styles.sectionTitle}>Profil soruları</Text>
          {visibleProfilePrompts.map((prompt) => (
            <View key={prompt.questionId} style={styles.promptItem}>
              <Text style={styles.promptQuestion}>{prompt.question}</Text>
              <Text style={styles.promptAnswer}>{prompt.answer}</Text>
            </View>
          ))}
        </Card>
      ) : null}

      <Card style={styles.section}>
        <Text style={styles.sectionTitle}>Rozetler</Text>
        {profile.badges.length === 0 ? (
          <Text style={styles.emptyBadgeText}>Henüz rozet kazanılmadı.</Text>
        ) : (
          <View style={styles.badgeGrid}>
            {profile.badges.map((badge) => (
              <View key={badge} style={styles.badgeItem}>
                <BadgeIcon badge={badge} size={36} />
                <Text style={styles.badgeLabel} numberOfLines={2}>
                  {badgeLabels[badge]}
                </Text>
              </View>
            ))}
          </View>
        )}
      </Card>

      <Card style={styles.premiumCard}>
        <View style={styles.premiumIcon}>
          <Ionicons name="flame-outline" size={22} color="#FFFFFF" />
        </View>
        <View style={styles.storeText}>
          <Text style={styles.sectionTitle}>Ehlibyte Premium</Text>
          <Text style={styles.storeDescription}>
            Reklamları kaldır, Super Like ve öncelikli görünürlük kazan.
          </Text>
        </View>
        <Button
          label={profile.isPremium ? "Aktif ✓" : "Mağazayı gör"}
          variant="primary"
          disabled={profile.isPremium}
          style={styles.storeButton}
          onPress={() => router.push("/tabs/store")}
        />
      </Card>

      <Card style={styles.section}>
        <Text style={styles.sectionTitle}>İlgi alanları</Text>
        <View style={styles.chipWrap}>
          {profile.interests.map((interest) => (
            <View key={interest} style={styles.interest}>
              <Text style={styles.interestText}>
                {interestOptions.find((option) => option.value === interest)
                  ?.label ?? interest}
              </Text>
            </View>
          ))}
        </View>
      </Card>

      <Card style={styles.section}>
        <Text style={styles.sectionTitle}>Kültürel detaylar</Text>
        <Text style={styles.detail}>
          Memleket: {profile.hometown || "Belirtilmedi"}
        </Text>
        <Text style={styles.detail}>
          Favori türkü: {profile.favoriteSong || "Belirtilmedi"}
        </Text>
        <Text style={styles.detail}>
          Favori ozan: {profile.favoritePoet || "Belirtilmedi"}
        </Text>
      </Card>

      <Button
        label="Profili düzenle"
        onPress={() => router.push("/tabs/profile/edit")}
      />
    </Screen>
  );
}

const createStyles = (theme: ReturnType<typeof useTheme>) =>
  StyleSheet.create({
    header: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      marginBottom: theme.spacing.md,
    },
    headerActions: {
      flexDirection: "row",
      alignItems: "center",
      gap: theme.spacing.xs,
    },
    kicker: {
      ...theme.typography.caption,
      color: theme.colors.primary,
      textTransform: "uppercase",
    },
    iconButton: {
      width: 42,
      height: 42,
      borderRadius: theme.radius.pill,
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: theme.colors.elevated,
    },
    photo: {
      width: "100%",
      height: 360,
      borderRadius: theme.radius.md,
      marginBottom: theme.spacing.md,
      backgroundColor: theme.colors.elevated,
    },
    name: {
      ...theme.typography.title,
      flexShrink: 1,
      color: theme.colors.text,
    },
    nameRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: theme.spacing.xs,
    },
    city: {
      ...theme.typography.body,
      color: theme.colors.muted,
      marginBottom: theme.spacing.sm,
    },
    bio: {
      ...theme.typography.body,
      color: theme.colors.text,
      marginBottom: theme.spacing.lg,
    },
    section: {
      gap: theme.spacing.sm,
      marginBottom: theme.spacing.md,
    },
    premiumCard: {
      flexDirection: "row",
      alignItems: "center",
      gap: theme.spacing.sm,
      marginBottom: theme.spacing.md,
    },
    premiumIcon: {
      width: 42,
      height: 42,
      borderRadius: theme.radius.pill,
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: theme.colors.primary,
    },
    sectionTitle: {
      ...theme.typography.subheading,
      color: theme.colors.text,
    },
    chipWrap: {
      flexDirection: "row",
      flexWrap: "wrap",
      gap: theme.spacing.xs,
    },
    badgeGrid: {
      flexDirection: "row",
      flexWrap: "wrap",
      gap: theme.spacing.xs,
    },
    badgeItem: {
      flexBasis: "48%",
      flexGrow: 1,
      minWidth: 0,
      minHeight: 56,
      flexDirection: "row",
      alignItems: "center",
      gap: theme.spacing.xs,
      borderRadius: theme.radius.md,
      borderWidth: 1,
      borderColor: "rgba(128, 128, 128, 0.28)",
      paddingHorizontal: theme.spacing.sm,
      paddingVertical: theme.spacing.xs,
      backgroundColor: "rgba(128, 128, 128, 0.10)",
    },
    badgeLabel: {
      color: theme.colors.text,
      flex: 1,
      minWidth: 0,
      flexShrink: 1,
      fontSize: 14,
      fontWeight: "700",
      lineHeight: 17,
    },
    emptyBadgeText: {
      ...theme.typography.caption,
      color: theme.colors.muted,
    },
    storeText: {
      flex: 1,
      minWidth: 0,
      gap: theme.spacing.xxs,
    },
    storeDescription: {
      ...theme.typography.caption,
      color: theme.colors.muted,
    },
    storeButton: {
      minHeight: 42,
      paddingHorizontal: theme.spacing.sm,
    },
    interest: {
      borderRadius: theme.radius.pill,
      paddingHorizontal: theme.spacing.md,
      paddingVertical: theme.spacing.xs,
      backgroundColor: theme.colors.elevated,
    },
    interestText: {
      ...theme.typography.caption,
      color: theme.colors.text,
    },
    detail: {
      ...theme.typography.body,
      color: theme.colors.muted,
    },
    promptItem: {
      gap: theme.spacing.xxs,
      borderRadius: theme.radius.lg,
      padding: theme.spacing.sm,
      backgroundColor: theme.colors.elevated,
    },
    promptQuestion: {
      ...theme.typography.caption,
      color: theme.colors.muted,
      fontWeight: "800",
    },
    promptAnswer: {
      ...theme.typography.body,
      color: theme.colors.text,
    },
  });
