import { Image, Pressable, StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useLocalSearchParams, useRouter } from "expo-router";
import { BadgeIcon } from "@/shared/components/BadgeIcon";
import { Card } from "@/shared/components/Card";
import { EmptyState } from "@/shared/components/EmptyState";
import { Loading } from "@/shared/components/Loading";
import { Screen } from "@/shared/components/Screen";
import { badgeLabels, interestOptions } from "@/shared/constants/options";
import { useUserProfile } from "@/features/profile/hooks/useUserProfile";
import { sanitizePlainText } from "@/shared/utils/sanitize";
import { useTheme } from "@/shared/theme";

export default function PublicProfileScreen() {
  const { userId } = useLocalSearchParams<{ userId: string }>();
  const router = useRouter();
  const theme = useTheme();
  const styles = createStyles(theme);
  const { profile, isLoading, isError } = useUserProfile(userId);

  if (isLoading) {
    return <Loading label="Profil yükleniyor" />;
  }

  if (isError || !profile) {
    return (
      <Screen>
        <Pressable
          accessibilityRole="button"
          onPress={() => router.back()}
          style={styles.backButton}
        >
          <Ionicons name="arrow-back" size={22} color={theme.colors.text} />
        </Pressable>
        <EmptyState
          title="Profil bulunamadı"
          description="Bu kullanıcı artık görüntülenemiyor olabilir."
        />
      </Screen>
    );
  }

  const primaryPhoto = profile.photos[0]?.uri;

  return (
    <Screen>
      <View style={styles.header}>
        <Pressable
          accessibilityRole="button"
          onPress={() => router.back()}
          style={styles.backButton}
        >
          <Ionicons name="arrow-back" size={22} color={theme.colors.text} />
        </Pressable>
        <Text style={styles.kicker}>Topluluk profili</Text>
      </View>

      {primaryPhoto ? (
        <Image source={{ uri: primaryPhoto }} style={styles.photo} />
      ) : null}
      <Text style={styles.name}>
        {sanitizePlainText(profile.name, 80)}, {profile.age}
      </Text>
      <Text style={styles.city}>{sanitizePlainText(profile.city, 80)}</Text>
      <Text style={styles.bio}>{sanitizePlainText(profile.bio, 280)}</Text>

      <Card style={styles.section}>
        <Text style={styles.sectionTitle}>Rozetler</Text>
        {profile.badges.length === 0 ? (
          <Text style={styles.emptyBadgeText}>Henüz rozet kazanılmadı.</Text>
        ) : (
          <View style={styles.badgeGrid}>
            {profile.badges.map((badge) => (
              <View key={badge} style={styles.badgeItem}>
                <BadgeIcon badge={badge} size={44} />
                <Text style={styles.badgeLabel} numberOfLines={2}>
                  {badgeLabels[badge]}
                </Text>
              </View>
            ))}
          </View>
        )}
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
          Memleket: {sanitizePlainText(profile.hometown || "Belirtilmedi", 80)}
        </Text>
        <Text style={styles.detail}>
          Favori türkü:{" "}
          {sanitizePlainText(profile.favoriteSong || "Belirtilmedi", 120)}
        </Text>
        <Text style={styles.detail}>
          Favori ozan:{" "}
          {sanitizePlainText(profile.favoritePoet || "Belirtilmedi", 120)}
        </Text>
      </Card>
    </Screen>
  );
}

const createStyles = (theme: ReturnType<typeof useTheme>) =>
  StyleSheet.create({
    header: {
      flexDirection: "row",
      alignItems: "center",
      gap: theme.spacing.sm,
      marginBottom: theme.spacing.md,
    },
    backButton: {
      width: 42,
      height: 42,
      borderRadius: theme.radius.pill,
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: theme.colors.elevated,
    },
    kicker: {
      ...theme.typography.caption,
      color: theme.colors.primary,
      textTransform: "uppercase",
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
      color: theme.colors.text,
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
      gap: theme.spacing.sm,
    },
    badgeItem: {
      flexBasis: "47%",
      flexGrow: 1,
      minHeight: 66,
      flexDirection: "row",
      alignItems: "center",
      gap: theme.spacing.sm,
      borderRadius: theme.radius.pill,
      borderWidth: 1,
      borderColor: "rgba(255, 91, 112, 0.28)",
      paddingHorizontal: theme.spacing.sm,
      paddingVertical: theme.spacing.xs,
      backgroundColor: "rgba(255, 91, 112, 0.10)",
    },
    badgeLabel: {
      ...theme.typography.body,
      color: theme.colors.text,
      flexShrink: 1,
      fontWeight: "900",
      lineHeight: 19,
    },
    emptyBadgeText: {
      ...theme.typography.caption,
      color: theme.colors.muted,
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
  });
