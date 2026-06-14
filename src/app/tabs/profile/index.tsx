// Kullanıcı profilini, rozetleri ve düzenleme geçişini gösterir.
import { Image, Pressable, StyleSheet, Text, View } from "react-native";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { BadgeIcon } from "@/shared/components/BadgeIcon";
import { Button } from "@/shared/components/Button";
import { Card } from "@/shared/components/Card";
import { Loading } from "@/shared/components/Loading";
import { Screen } from "@/shared/components/Screen";
import { badgeLabels, interestOptions } from "@/shared/constants/options";
import { useProfile } from "@/features/profile/hooks/useProfile";
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

  return (
    <Screen>
      <View style={styles.header}>
        <Text style={styles.kicker}>Profil</Text>
        <View style={styles.headerActions}>
          <Pressable
            onPress={() => router.push("/tabs/settings")}
            style={styles.iconButton}
          >
            <Ionicons
              name="settings-outline"
              size={22}
              color={theme.colors.text}
            />
          </Pressable>
          <Pressable
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
      <Text style={styles.name}>
        {profile.name}, {profile.age}
      </Text>
      <Text style={styles.city}>{profile.city}</Text>
      <Text style={styles.bio}>{profile.bio}</Text>

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
    storeText: {
      flex: 1,
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
  });
