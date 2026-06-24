// Tinder benzeri kartin profil bilgilerini ve uyum skorlarini gosterir.
import { memo } from "react";
import { ImageBackground, Pressable, StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import type { CulturalCompatibility } from "@/domain/entities/Match";
import type { User } from "@/domain/entities/User";
import { Card } from "@/shared/components/Card";
import { PremiumVerifiedBadge } from "@/shared/components/PremiumVerifiedBadge";
import { formatDistanceKm } from "@/shared/utils/location";
import { formatScore } from "@/shared/utils/score";
import { isProfileBoostActive } from "@/shared/utils/profileBoost";
import { useTheme } from "@/shared/theme";

interface SwipeProfileCardProps {
  user: User;
  compatibility: CulturalCompatibility;
  height: number;
  onOpenSafety: () => void;
  onOpenProfile?: () => void;
  onOpenCompatibility?: () => void;
}

const SwipeProfileCardComponent = ({
  user,
  compatibility,
  height,
  onOpenSafety,
  onOpenProfile,
  onOpenCompatibility,
}: SwipeProfileCardProps) => {
  const theme = useTheme();
  const isCompactCard = height < 430;
  const styles = createStyles(theme);
  const primaryPhoto =
    user.photos.find((photo) => photo.isPrimary)?.uri ??
    "https://images.unsplash.com/photo-1524504388940-b1c1722653e1?auto=format&fit=crop&w=900&q=80";
  const hasActiveBoost = isProfileBoostActive(user.boostedUntil);
  const distanceLabel = formatDistanceKm(user.distanceKm);
  const isStarterProfile = (user.profileKind ?? "member") !== "member";
  const featuredPrompt = user.profilePrompts?.find((prompt) =>
    prompt.answer.trim(),
  );
  const scoreItems = (
    <>
      <View style={styles.scoreItem}>
        <Text style={styles.score}>{formatScore(compatibility.cultural)}</Text>
        <Text numberOfLines={1} style={styles.scoreLabel}>Kültür</Text>
      </View>
      <View style={styles.scoreItem}>
        <Text style={styles.score}>{formatScore(compatibility.interests)}</Text>
        <Text numberOfLines={1} style={styles.scoreLabel}>İlgi</Text>
      </View>
      <View style={styles.scoreItem}>
        <Text style={styles.score}>{formatScore(compatibility.lifestyle)}</Text>
        <Text style={styles.scoreLabel}>Tarz</Text>
      </View>
    </>
  );

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
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`${user.name} profili için güvenlik seçeneklerini aç`}
          hitSlop={8}
          onPress={onOpenSafety}
          style={({ pressed }) => [
            styles.safetyButton,
            pressed && styles.pressed,
          ]}
        >
          <Ionicons name="shield-outline" size={20} color="#FFFFFF" />
        </Pressable>
        <LinearGradient
          colors={["transparent", "rgba(0,0,0,0.28)", "rgba(0,0,0,0.78)"]}
          style={[
            styles.photoOverlay,
            isCompactCard && styles.compactPhotoOverlay,
          ]}
        >
          {onOpenProfile ? (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={`${user.name} profilini aç`}
              hitSlop={8}
              onPress={onOpenProfile}
              style={({ pressed }) => [
                styles.nameButton,
                pressed && styles.pressed,
              ]}
            >
              <View style={styles.nameContent}>
                <Text
                  numberOfLines={1}
                  adjustsFontSizeToFit
                  minimumFontScale={0.82}
                  style={styles.name}
                >
                  {user.name}, {user.age}
                </Text>
                {user.isPremium ? <PremiumVerifiedBadge size={19} /> : null}
              </View>
              <View style={styles.profileCta}>
                <Ionicons name="person-outline" size={15} color="#FFFFFF" />
                <Text numberOfLines={1} style={styles.profileCtaText}>
                  Profili gör
                </Text>
                <Ionicons name="chevron-forward" size={14} color="#FFFFFF" />
              </View>
            </Pressable>
          ) : (
            <View style={styles.nameContent}>
              <Text
                numberOfLines={1}
                adjustsFontSizeToFit
                minimumFontScale={0.82}
                style={styles.name}
              >
                {user.name}, {user.age}
              </Text>
              {user.isPremium ? <PremiumVerifiedBadge size={19} /> : null}
            </View>
          )}
          <View style={styles.metaRow}>
            <Ionicons name="location" size={16} color="#FFFFFF" />
            <Text numberOfLines={1} style={styles.city}>
              {distanceLabel ? `${distanceLabel} · ${user.city}` : user.city}
            </Text>
          </View>
          <Text numberOfLines={isCompactCard ? 1 : 2} style={styles.bio}>{user.bio}</Text>
          {!isCompactCard && featuredPrompt ? (
            <View style={styles.promptPreview}>
              <Text numberOfLines={1} style={styles.promptQuestion}>
                {featuredPrompt.question}
              </Text>
              <Text numberOfLines={1} style={styles.promptAnswer}>
                {featuredPrompt.answer}
              </Text>
            </View>
          ) : null}
          {onOpenCompatibility ? (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={`${user.name} ile uyum detayını aç`}
              hitSlop={8}
              onPress={onOpenCompatibility}
              style={({ pressed }) => [
                styles.scoreGrid,
                pressed && styles.pressed,
              ]}
            >
              {scoreItems}
            </Pressable>
          ) : (
            <View style={styles.scoreGrid}>{scoreItems}</View>
          )}
        </LinearGradient>
      </ImageBackground>
    </Card>
  );
};

export const SwipeProfileCard = memo(SwipeProfileCardComponent);

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
    compactPhotoOverlay: {
      padding: theme.spacing.sm,
      paddingTop: 96,
      gap: theme.spacing.xs
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
    pressed: {
      opacity: 0.76
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
      backgroundColor: "rgba(128, 128, 128, 0.90)"
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
      flex: 1,
      fontSize: 31,
      lineHeight: 36,
      fontWeight: "900",
      color: "#FFFFFF"
    },
    nameContent: {
      flex: 1,
      minWidth: 0,
      flexDirection: "row",
      alignItems: "center",
      gap: theme.spacing.xs,
    },
    nameButton: {
      flexDirection: "row",
      alignItems: "center",
      gap: theme.spacing.xs,
      minHeight: 42,
    },
    profileCta: {
      minHeight: 36,
      maxWidth: 118,
      flexShrink: 0,
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      gap: 3,
      paddingHorizontal: theme.spacing.sm,
      borderRadius: theme.radius.pill,
      borderWidth: 1,
      borderColor: "rgba(255, 255, 255, 0.30)",
      backgroundColor: "rgba(0, 0, 0, 0.34)",
    },
    profileCtaText: {
      ...theme.typography.caption,
      color: "#FFFFFF",
      fontWeight: "900",
      letterSpacing: 0,
    },
    metaRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: theme.spacing.xxs
    },
    city: {
      ...theme.typography.body,
      flex: 1,
      color: "#FFFFFF"
    },
    bio: {
      ...theme.typography.body,
      color: "rgba(255, 255, 255, 0.88)"
    },
    promptPreview: {
      gap: 2,
      borderRadius: 16,
      borderWidth: 1,
      borderColor: "rgba(255, 255, 255, 0.18)",
      paddingHorizontal: theme.spacing.sm,
      paddingVertical: theme.spacing.xs,
      backgroundColor: "rgba(0, 0, 0, 0.28)",
    },
    promptQuestion: {
      ...theme.typography.caption,
      color: "rgba(255, 255, 255, 0.72)",
      fontWeight: "800",
    },
    promptAnswer: {
      ...theme.typography.caption,
      color: "#FFFFFF",
      fontWeight: "900",
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
