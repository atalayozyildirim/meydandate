import { Alert, Pressable, StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "expo-router";
import { calculateCulturalMatchScore } from "@/domain/services/CulturalMatchScoring";
import { useAuthStore } from "@/features/auth/stores/authStore";
import { useLikedMe } from "@/features/match/hooks/useMatches";
import { Avatar } from "@/shared/components/Avatar";
import { Button } from "@/shared/components/Button";
import { Card } from "@/shared/components/Card";
import { EmptyState } from "@/shared/components/EmptyState";
import { Loading } from "@/shared/components/Loading";
import { PremiumVerifiedBadge } from "@/shared/components/PremiumVerifiedBadge";
import { Screen } from "@/shared/components/Screen";
import { queryKeys } from "@/shared/constants/queryKeys";
import { container } from "@/infrastructure/config/Container";
import { formatScore } from "@/shared/utils/score";
import { sanitizePlainText } from "@/shared/utils/sanitize";
import { useTheme } from "@/shared/theme";

const formatLikedAt = (value: string) => {
  const date = new Date(value);

  if (!Number.isFinite(date.getTime())) {
    return "Yeni";
  }

  return date.toLocaleDateString("tr-TR", {
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
};

export default function LikedMeScreen() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const theme = useTheme();
  const styles = createStyles(theme);
  const currentUser = useAuthStore((state) => state.currentUser);
  const { likedMe, isLoading, isError, refetch } = useLikedMe();

  const respondMutation = useMutation({
    mutationFn: (targetUserId: string) => {
      if (!currentUser) {
        throw new Error("Beğeni için oturum gerekli.");
      }

      return container.matchRepository.swipe(
        currentUser.id,
        targetUserId,
        "like",
      );
    },
    onSuccess: async (result) => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: [queryKeys.likedMe] }),
        queryClient.invalidateQueries({ queryKey: [queryKeys.matches] }),
        queryClient.invalidateQueries({ queryKey: [queryKeys.conversations] }),
        queryClient.invalidateQueries({ queryKey: [queryKeys.discover] }),
      ]);

      Alert.alert(
        result.match ? "Eşleşme oldu" : "Beğeni gönderildi",
        result.match
          ? "Karşılıklı beğeni tamamlandı, sohbet açıldı."
          : "Bu kişiyi beğendin.",
        result.match
          ? [
              { text: "Tamam", style: "cancel" },
              {
                text: "Mesajlara git",
                onPress: () => router.push("/tabs/chat"),
              },
            ]
          : undefined,
      );
    },
    onError: (error) => {
      Alert.alert(
        "Beğeni gönderilemedi",
        error instanceof Error ? error.message : "Tekrar deneyin.",
      );
    },
  });

  if (!currentUser?.isPremium) {
    return (
      <Screen style={styles.screen}>
        <View style={styles.header}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Geri dön"
            hitSlop={8}
            onPress={() => router.back()}
            style={styles.backButton}
          >
            <Ionicons name="chevron-back" size={22} color={theme.colors.text} />
          </Pressable>
          <View style={styles.headerText}>
            <Text style={styles.kicker}>Premium</Text>
            <Text style={styles.title}>Seni beğenenler</Text>
          </View>
        </View>

        <Card style={styles.upsellCard}>
          <View style={styles.upsellIcon}>
            <Ionicons name="heart" size={24} color={theme.colors.onPrimary} />
          </View>
          <Text style={styles.upsellTitle}>Kim seni beğendi?</Text>
          <Text style={styles.upsellText}>
            Gelen beğenileri ve Super Like gönderenleri Premium ile gör,
            istersen tek dokunuşla karşılık ver.
          </Text>
          <Button
            label="Premium'u aç"
            icon={
              <Ionicons
                name="heart-outline"
                size={24}
                color={theme.colors.onPrimary}
              />
            }
            onPress={() => router.push("/tabs/store")}
          />
        </Card>
      </Screen>
    );
  }

  if (isLoading) {
    return <Loading label="Beğeniler yükleniyor" />;
  }

  return (
    <Screen style={styles.screen}>
      <View style={styles.header}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Geri dön"
          hitSlop={8}
          onPress={() => router.back()}
          style={styles.backButton}
        >
          <Ionicons name="chevron-back" size={22} color={theme.colors.text} />
        </Pressable>
        <View style={styles.headerText}>
          <Text style={styles.kicker}>Premium</Text>
          <Text style={styles.title}>Seni beğenenler</Text>
        </View>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Seni beğenenleri yenile"
          hitSlop={8}
          onPress={() => void refetch()}
          style={styles.backButton}
        >
          <Ionicons name="refresh" size={20} color={theme.colors.text} />
        </Pressable>
      </View>

      {isError ? (
        <EmptyState
          title="Liste yüklenemedi"
          description="Beğenileri şu an alamadık. Birazdan tekrar deneyebilirsin."
          actionLabel="Tekrar dene"
          onAction={() => void refetch()}
        />
      ) : likedMe.length === 0 ? (
        <EmptyState
          title="Şimdilik yeni beğeni yok"
          description="Profilin öne çıktıkça yeni beğeniler burada görünecek."
          actionLabel="Keşfet'e dön"
          onAction={() => router.replace("/tabs/discover")}
        />
      ) : (
        <View style={styles.list}>
          {likedMe.map((item) => {
            const compatibility = calculateCulturalMatchScore(
              currentUser,
              item.user,
            );
            const prompt = item.user.profilePrompts?.find((candidate) =>
              candidate.answer.trim(),
            );
            const isResponding =
              respondMutation.isPending &&
              respondMutation.variables === item.user.id;

            return (
              <Card key={item.user.id} style={styles.likeCard}>
                <View style={styles.likeHeader}>
                  <Avatar
                    name={item.user.name}
                    uri={item.user.photos[0]?.uri}
                    size={66}
                  />
                  <View style={styles.likeMeta}>
                    <View style={styles.nameRow}>
                      <Text numberOfLines={1} style={styles.likeName}>
                        {sanitizePlainText(item.user.name, 80)}, {item.user.age}
                      </Text>
                      {item.user.isPremium ? (
                        <PremiumVerifiedBadge size={17} />
                      ) : null}
                      <View
                        style={[
                          styles.likePill,
                          item.action === "super_like" && styles.superPill,
                        ]}
                      >
                        <Ionicons
                          name={
                            item.action === "super_like" ? "flash" : "heart"
                          }
                          size={13}
                          color={theme.colors.onPrimary}
                        />
                        <Text style={styles.likePillText}>
                          {item.action === "super_like" ? "Super" : "Beğeni"}
                        </Text>
                      </View>
                    </View>
                    <Text numberOfLines={1} style={styles.likeSubtext}>
                      {sanitizePlainText(item.user.city, 80)} ·{" "}
                      {formatLikedAt(item.likedAt)}
                    </Text>
                  </View>
                </View>

                {prompt ? (
                  <View style={styles.promptBox}>
                    <Text numberOfLines={1} style={styles.promptQuestion}>
                      {sanitizePlainText(prompt.question, 160)}
                    </Text>
                    <Text numberOfLines={2} style={styles.promptAnswer}>
                      {sanitizePlainText(prompt.answer, 220)}
                    </Text>
                  </View>
                ) : null}

                <View style={styles.scoreRow}>
                  <View style={styles.scoreBox}>
                    <Text style={styles.scoreValue}>
                      {formatScore(compatibility.cultural)}
                    </Text>
                    <Text style={styles.scoreLabel}>Kültür</Text>
                  </View>
                  <View style={styles.scoreBox}>
                    <Text style={styles.scoreValue}>
                      {formatScore(compatibility.interests)}
                    </Text>
                    <Text style={styles.scoreLabel}>İlgi</Text>
                  </View>
                  <View style={styles.scoreBox}>
                    <Text style={styles.scoreValue}>
                      {formatScore(compatibility.lifestyle)}
                    </Text>
                    <Text style={styles.scoreLabel}>Tarz</Text>
                  </View>
                </View>

                <View style={styles.actions}>
                  <Button
                    label="Profili aç"
                    variant="ghost"
                    style={styles.actionButton}
                    onPress={() =>
                      router.push({
                        pathname: "/tabs/profile/[userId]",
                        params: { userId: item.user.id },
                      })
                    }
                  />
                  <Button
                    label="Beğen"
                    loading={isResponding}
                    style={styles.actionButton}
                    icon={
                      <Ionicons
                        name="heart"
                        size={18}
                        color={theme.colors.onPrimary}
                      />
                    }
                    onPress={() => respondMutation.mutate(item.user.id)}
                  />
                </View>
              </Card>
            );
          })}
        </View>
      )}
    </Screen>
  );
}

const createStyles = (theme: ReturnType<typeof useTheme>) =>
  StyleSheet.create({
    screen: {
      gap: theme.spacing.md,
      paddingHorizontal: theme.spacing.md,
      paddingTop: theme.spacing.sm,
    },
    header: {
      flexDirection: "row",
      alignItems: "center",
      gap: theme.spacing.sm,
    },
    backButton: {
      width: 42,
      height: 42,
      borderRadius: theme.radius.pill,
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: theme.colors.elevated,
    },
    headerText: {
      flex: 1,
      minWidth: 0,
      gap: theme.spacing.xxs,
    },
    kicker: {
      ...theme.typography.caption,
      color: theme.colors.primary,
      textTransform: "uppercase",
    },
    title: {
      ...theme.typography.heading,
      color: theme.colors.text,
    },
    upsellCard: {
      alignItems: "center",
      gap: theme.spacing.md,
      paddingVertical: theme.spacing.xl,
    },
    upsellIcon: {
      width: 62,
      height: 62,
      borderRadius: theme.radius.pill,
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: theme.colors.primary,
    },
    upsellTitle: {
      ...theme.typography.subheading,
      color: theme.colors.text,
      textAlign: "center",
    },
    upsellText: {
      ...theme.typography.body,
      color: theme.colors.muted,
      textAlign: "center",
    },
    list: {
      gap: theme.spacing.md,
    },
    likeCard: {
      gap: theme.spacing.sm,
    },
    likeHeader: {
      flexDirection: "row",
      alignItems: "center",
      gap: theme.spacing.sm,
    },
    likeMeta: {
      flex: 1,
      minWidth: 0,
      gap: theme.spacing.xxs,
    },
    nameRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: theme.spacing.xs,
    },
    likeName: {
      ...theme.typography.subheading,
      flexShrink: 1,
      color: theme.colors.text,
    },
    likeSubtext: {
      ...theme.typography.caption,
      color: theme.colors.muted,
    },
    likePill: {
      minHeight: 28,
      borderRadius: theme.radius.pill,
      flexDirection: "row",
      alignItems: "center",
      gap: 4,
      paddingHorizontal: theme.spacing.sm,
      backgroundColor: theme.colors.primary,
    },
    superPill: {
      backgroundColor: theme.colors.secondary,
    },
    likePillText: {
      ...theme.typography.caption,
      color: theme.colors.onPrimary,
      fontWeight: "900",
    },
    promptBox: {
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
    scoreRow: {
      flexDirection: "row",
      gap: theme.spacing.xs,
    },
    scoreBox: {
      flex: 1,
      minHeight: 62,
      borderRadius: theme.radius.lg,
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: theme.isDark ? "#111111" : "#F5F5F5",
      borderWidth: 1,
      borderColor: "rgba(128, 128, 128, 0.12)",
    },
    scoreValue: {
      fontSize: 19,
      lineHeight: 24,
      fontWeight: "900",
      color: theme.colors.text,
    },
    scoreLabel: {
      ...theme.typography.caption,
      color: theme.colors.muted,
    },
    actions: {
      flexDirection: "row",
      gap: theme.spacing.sm,
    },
    actionButton: {
      flex: 1,
      minHeight: 46,
    },
  });
