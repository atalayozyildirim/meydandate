// Tinder benzeri kartin profil bilgilerini ve uyum skorlarini gosterir.
import { ImageBackground, Pressable, StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import type { CulturalCompatibility } from "@/domain/entities/Match";
import type { User } from "@/domain/entities/User";
import { Card } from "@/shared/components/Card";
import { formatDistanceKm } from "@/shared/utils/location";
import { formatScore } from "@/shared/utils/score";
import { isProfileBoostActive } from "@/shared/utils/profileBoost";
import { useTheme } from "@/shared/theme";

interface SwipeProfileCardProps {
  user: User;
  compatibility: CulturalCompatibility;
  height: number;
  onOpenSafety: () => void;
}

export const SwipeProfileCard = ({ user, compatibility, height, onOpenSafety }: SwipeProfileCardProps) => {
  const theme = useTheme();
  const styles = createStyles(theme);
  const primaryPhoto =
    user.photos.find((photo) => photo.isPrimary)?.uri ??
    "https://images.unsplash.com/photo-1524504388940-b1c1722653e1?auto=format&fit=crop&w=900&q=80";
  const hasActiveBoost = isProfileBoostActive(user.boostedUntil);
  const distanceLabel = formatDistanceKm(user.distanceKm);
  const isStarterProfile = (user.profileKind ?? "member") !== "member";

  return (
    <Card style={[styles.card, { height }]}>
      <ImageBackground source={{ uri: primaryPhoto }} style={styles.photo} imageStyle={styles.photoImage}>
        <View pointerEvents="none" style={styles.topBadges}>
          {isStarterProfile ? (
            <View style={[styles.statusPill, styles.guidePill]}>
              <Ionicons name="compass" size={13} color="#FFFFFF" />
              <Text style={styles.statusPillText}>Rehber</Text>
            </View>
          ) : null}
          {hasActiveBoost ? (
            <View style={[styles.statusPill, styles.boostPill]}>
              <Ionicons name="flash" size={13} color="#FFFFFF" />
              <Text style={styles.statusPillText}>Boost</Text>
            </View>
          ) : null}
          {(user.fireScore ?? 0) > 0 ? (
            <View style={[styles.statusPill, styles.firePill]}>
              <Ionicons name="flame" size={13} color="#FFFFFF" />
              <Text style={styles.statusPillText}>{user.fireScore} Fire</Text>
            </View>
          ) : null}
          {user.isPremium ? (
            <View style={[styles.statusPill, styles.premiumPill]}>
              <Ionicons name="star" size={13} color="#FFFFFF" />
              <Text style={styles.statusPillText}>Premium</Text>
            </View>
          ) : null}
        </View>
        <Pressable accessibilityRole="button" onPress={onOpenSafety} style={styles.safetyButton}>
          <Ionicons name="shield-outline" size={20} color="#FFFFFF" />
        </Pressable>
        <LinearGradient colors={["transparent", "rgba(0,0,0,0.28)", "rgba(0,0,0,0.78)"]} style={styles.photoOverlay}>
          <Text style={styles.name}>
            {user.name}, {user.age}
          </Text>
          <View style={styles.metaRow}>
            <Ionicons name="location" size={16} color="#FFFFFF" />
            <Text style={styles.city}>
              {distanceLabel ? `${distanceLabel} · ${user.city}` : user.city}
            </Text>
          </View>
          <Text numberOfLines={2} style={styles.bio}>{user.bio}</Text>
          <View style={styles.scoreGrid}>
            <View style={styles.scoreItem}>
              <Text style={styles.score}>{formatScore(compatibility.cultural)}</Text>
              <Text style={styles.scoreLabel}>Kultur</Text>
            </View>
            <View style={styles.scoreItem}>
              <Text style={styles.score}>{formatScore(compatibility.interests)}</Text>
              <Text style={styles.scoreLabel}>Ilgi</Text>
            </View>
            <View style={styles.scoreItem}>
              <Text style={styles.score}>{formatScore(compatibility.lifestyle)}</Text>
              <Text style={styles.scoreLabel}>Tarz</Text>
            </View>
          </View>
        </LinearGradient>
      </ImageBackground>
    </Card>
  );
};

const createStyles = (theme: ReturnType<typeof useTheme>) =>
  StyleSheet.create({
    card: {
      padding: 0,
      overflow: "hidden",
      borderRadius: 30,
      borderWidth: 0
    },
    photo: {
      flex: 1,
      justifyContent: "space-between"
    },
    photoImage: {
      borderRadius: 30
    },
    photoOverlay: {
      padding: theme.spacing.md,
      paddingTop: 140,
      gap: theme.spacing.sm
    },
    safetyButton: {
      alignSelf: "flex-end",
      margin: theme.spacing.md,
      width: 42,
      height: 42,
      borderRadius: theme.radius.pill,
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: "rgba(0, 0, 0, 0.38)"
    },
    topBadges: {
      position: "absolute",
      top: theme.spacing.md,
      left: theme.spacing.md,
      right: 68,
      zIndex: 2,
      flexDirection: "row",
      flexWrap: "wrap",
      gap: theme.spacing.xs
    },
    statusPill: {
      minHeight: 30,
      borderRadius: theme.radius.pill,
      paddingHorizontal: theme.spacing.sm,
      flexDirection: "row",
      alignItems: "center",
      gap: theme.spacing.xxs,
      borderWidth: 1,
      borderColor: "rgba(255, 255, 255, 0.24)"
    },
    boostPill: {
      backgroundColor: "rgba(245, 158, 11, 0.88)"
    },
    firePill: {
      backgroundColor: "rgba(233, 64, 87, 0.90)"
    },
    premiumPill: {
      backgroundColor: "rgba(138, 35, 135, 0.88)"
    },
    guidePill: {
      backgroundColor: "rgba(15, 23, 42, 0.72)"
    },
    statusPillText: {
      ...theme.typography.caption,
      color: "#FFFFFF"
    },
    name: {
      fontSize: 31,
      lineHeight: 36,
      fontWeight: "900",
      color: "#FFFFFF"
    },
    metaRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: theme.spacing.xxs
    },
    city: {
      ...theme.typography.body,
      color: "#FFFFFF"
    },
    bio: {
      ...theme.typography.body,
      color: "rgba(255, 255, 255, 0.88)"
    },
    scoreGrid: {
      flexDirection: "row",
      gap: theme.spacing.xs,
      marginTop: theme.spacing.xs
    },
    scoreItem: {
      flex: 1,
      borderRadius: 16,
      padding: theme.spacing.xs,
      backgroundColor: "rgba(255, 255, 255, 0.16)",
      borderWidth: 1,
      borderColor: "rgba(255, 255, 255, 0.18)"
    },
    score: {
      ...theme.typography.subheading,
      color: "#FFFFFF"
    },
    scoreLabel: {
      ...theme.typography.caption,
      color: "rgba(255, 255, 255, 0.72)"
    }
  });
