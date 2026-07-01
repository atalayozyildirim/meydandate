import { RefreshControl, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import type { User } from "@/domain/entities/User";
import { useFireLeaderboard } from "@/features/fire/hooks/useFireLeaderboard";
import { Avatar } from "@/shared/components/Avatar";
import { EmptyState } from "@/shared/components/EmptyState";
import { Loading } from "@/shared/components/Loading";
import { PremiumVerifiedBadge } from "@/shared/components/PremiumVerifiedBadge";
import { useTheme } from "@/shared/theme";

const formatFireScore = (score?: number) =>
  new Intl.NumberFormat("tr-TR").format(Math.max(0, score ?? 0));

export default function FireLeaderboardScreen() {
  const router = useRouter();
  const theme = useTheme();
  const styles = createStyles(theme);
  const { leaders, isLoading, isRefreshing, refresh } = useFireLeaderboard(5);
  const topLeader = leaders[0];
  const restLeaders = leaders.slice(1, 5);

  const openProfile = (user: User) => {
    router.push({
      pathname: "/tabs/profile/[userId]",
      params: { userId: user.id },
    });
  };

  if (isLoading) {
    return <Loading label="Fire liderleri hazırlanıyor" />;
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView
        contentContainerStyle={styles.screen}
        refreshControl={
          <RefreshControl
            refreshing={isRefreshing}
            onRefresh={() => void refresh()}
            tintColor={theme.colors.text}
          />
        }
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.header}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Geri"
            onPress={() => router.back()}
            style={({ pressed }) => [styles.backButton, pressed && styles.pressed]}
          >
            <Ionicons name="chevron-back" size={28} color={theme.colors.text} />
          </Pressable>
          <View style={styles.headerCopy}>
            <Text style={styles.eyebrow}>FIRE</Text>
            <Text style={styles.title}>Liderler</Text>
            <Text style={styles.subtitle}>En çok Fire alan ilk 5 profil.</Text>
          </View>
        </View>

        {topLeader ? (
          <>
            <Pressable
              accessibilityRole="button"
              onPress={() => openProfile(topLeader)}
              style={({ pressed }) => [styles.heroCard, pressed && styles.pressed]}
            >
              <View style={styles.heroRank}>
                <Text style={styles.heroRankText}>1</Text>
              </View>
              <View style={styles.heroMain}>
                <Avatar
                  name={topLeader.name}
                  uri={topLeader.photos[0]?.uri}
                  size={84}
                />
                <View style={styles.heroTextBlock}>
                  <View style={styles.nameRow}>
                    <Text style={styles.heroName} numberOfLines={1}>
                      {topLeader.name}
                    </Text>
                    {topLeader.isPremium ? (
                      <PremiumVerifiedBadge size={18} variant="inverse" />
                    ) : null}
                  </View>
                  <Text style={styles.heroMeta} numberOfLines={1}>
                    {topLeader.city}
                  </Text>
                </View>
              </View>
              <View style={styles.heroScoreRow}>
                <View style={styles.scorePill}>
                  <Ionicons name="flame" size={18} color={theme.colors.onPrimary} />
                  <Text style={styles.scorePillText}>
                    {formatFireScore(topLeader.fireScore)}
                  </Text>
                </View>
                <Text style={styles.heroHint}>Profili gör</Text>
              </View>
            </Pressable>

            {restLeaders.length > 0 ? (
              <>
                <View style={styles.sectionHeader}>
                  <Text style={styles.sectionTitle}>İlk 5</Text>
                  <Text style={styles.sectionMeta}>Anlık sıralama</Text>
                </View>

                <View style={styles.listCard}>
                  {restLeaders.map((leader, index) => (
                    <LeaderboardRow
                      key={leader.id}
                      leader={leader}
                      rank={index + 2}
                      onPress={() => openProfile(leader)}
                      isLast={index === restLeaders.length - 1}
                    />
                  ))}
                </View>
              </>
            ) : (
              <View style={styles.nextLeadersCard}>
                <Ionicons name="flame-outline" size={22} color={theme.colors.muted} />
                <View style={styles.nextLeadersCopy}>
                  <Text style={styles.nextLeadersTitle}>Sıralama yeni başlıyor</Text>
                  <Text style={styles.nextLeadersText}>
                    Daha fazla Fire geldikçe diğer profiller burada görünecek.
                  </Text>
                </View>
              </View>
            )}
          </>
        ) : (
          <View style={styles.emptyFrame}>
            <EmptyState
              title="Henüz lider yok"
              description="Fire gönderimleri başladıkça en çok ilgi alan ilk 5 profil burada sıralanacak."
            />
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

interface LeaderboardRowProps {
  leader: User;
  rank: number;
  onPress: () => void;
  isLast: boolean;
}

const LeaderboardRow = ({ leader, rank, onPress, isLast }: LeaderboardRowProps) => {
  const theme = useTheme();
  const styles = createStyles(theme);

  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      style={({ pressed }) => [
        styles.row,
        !isLast && styles.rowBorder,
        pressed && styles.pressed,
      ]}
    >
      <View style={styles.rankBadge}>
        <Text style={styles.rankText}>{rank}</Text>
      </View>
      <Avatar name={leader.name} uri={leader.photos[0]?.uri} size={52} />
      <View style={styles.rowCopy}>
        <View style={styles.nameRow}>
          <Text style={styles.rowName} numberOfLines={1}>
            {leader.name}
          </Text>
          {leader.isPremium ? (
            <PremiumVerifiedBadge size={16} variant="inverse" />
          ) : null}
        </View>
        <Text style={styles.rowMeta} numberOfLines={1}>
          {leader.city}
          {leader.bio ? ` · ${leader.bio}` : ""}
        </Text>
      </View>
      <View style={styles.rowScore}>
        <Ionicons name="flame" size={15} color={theme.colors.text} />
        <Text style={styles.rowScoreText}>{formatFireScore(leader.fireScore)}</Text>
      </View>
    </Pressable>
  );
};

const createStyles = (theme: ReturnType<typeof useTheme>) =>
  StyleSheet.create({
    safeArea: {
      flex: 1,
      backgroundColor: theme.colors.surface,
    },
    screen: {
      flexGrow: 1,
      gap: theme.spacing.lg,
      paddingHorizontal: theme.spacing.lg,
      paddingTop: theme.spacing.sm,
      paddingBottom: 128,
      backgroundColor: theme.colors.surface,
    },
    header: {
      flexDirection: "row",
      alignItems: "center",
      gap: theme.spacing.md,
      minHeight: 74,
    },
    backButton: {
      width: 48,
      height: 48,
      borderRadius: theme.radius.pill,
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: theme.colors.elevated,
      borderWidth: 1,
      borderColor: theme.colors.border,
    },
    headerCopy: {
      flex: 1,
    },
    eyebrow: {
      ...theme.typography.caption,
      color: theme.colors.muted,
      fontSize: 12,
      fontWeight: "900",
      letterSpacing: 0,
    },
    title: {
      ...theme.typography.heading,
      color: theme.colors.text,
      fontSize: 38,
      lineHeight: 44,
    },
    subtitle: {
      ...theme.typography.body,
      color: theme.colors.muted,
      marginTop: 2,
    },
    heroCard: {
      gap: theme.spacing.lg,
      borderRadius: 32,
      padding: theme.spacing.lg,
      backgroundColor: theme.colors.elevated,
      borderWidth: 1,
      borderColor: theme.colors.border,
      shadowColor: theme.colors.shadow,
      shadowOpacity: theme.isDark ? 0 : 1,
      shadowRadius: 22,
      shadowOffset: { width: 0, height: 14 },
      elevation: 3,
    },
    heroRank: {
      width: 52,
      height: 52,
      borderRadius: theme.radius.pill,
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: theme.colors.primary,
    },
    heroRankText: {
      ...theme.typography.heading,
      color: theme.colors.onPrimary,
      fontSize: 26,
      lineHeight: 30,
    },
    heroMain: {
      flexDirection: "row",
      alignItems: "center",
      gap: theme.spacing.md,
    },
    heroTextBlock: {
      flex: 1,
      minWidth: 0,
    },
    nameRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: theme.spacing.xs,
      minWidth: 0,
    },
    heroName: {
      ...theme.typography.heading,
      flexShrink: 1,
      color: theme.colors.text,
      fontSize: 32,
      lineHeight: 38,
    },
    heroMeta: {
      ...theme.typography.body,
      color: theme.colors.muted,
      marginTop: 2,
    },
    heroScoreRow: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      gap: theme.spacing.md,
    },
    scorePill: {
      minHeight: 46,
      flexDirection: "row",
      alignItems: "center",
      gap: theme.spacing.xs,
      borderRadius: theme.radius.pill,
      paddingHorizontal: theme.spacing.md,
      backgroundColor: theme.colors.primary,
    },
    scorePillText: {
      ...theme.typography.subheading,
      color: theme.colors.onPrimary,
      fontVariant: ["tabular-nums"],
    },
    heroHint: {
      ...theme.typography.caption,
      color: theme.colors.muted,
      fontWeight: "800",
    },
    sectionHeader: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      marginTop: theme.spacing.xs,
    },
    sectionTitle: {
      ...theme.typography.subheading,
      color: theme.colors.text,
      fontSize: 22,
    },
    sectionMeta: {
      ...theme.typography.caption,
      color: theme.colors.muted,
    },
    listCard: {
      borderRadius: 26,
      overflow: "hidden",
      backgroundColor: theme.colors.elevated,
      borderWidth: 1,
      borderColor: theme.colors.border,
    },
    nextLeadersCard: {
      minHeight: 92,
      flexDirection: "row",
      alignItems: "center",
      gap: theme.spacing.sm,
      borderRadius: 26,
      paddingHorizontal: theme.spacing.md,
      paddingVertical: theme.spacing.md,
      backgroundColor: theme.colors.elevated,
      borderWidth: 1,
      borderColor: theme.colors.border,
    },
    nextLeadersCopy: {
      flex: 1,
      minWidth: 0,
      gap: 2,
    },
    nextLeadersTitle: {
      ...theme.typography.subheading,
      color: theme.colors.text,
      fontSize: 17,
      lineHeight: 22,
    },
    nextLeadersText: {
      ...theme.typography.caption,
      color: theme.colors.muted,
    },
    row: {
      minHeight: 84,
      flexDirection: "row",
      alignItems: "center",
      gap: theme.spacing.sm,
      paddingHorizontal: theme.spacing.md,
      paddingVertical: theme.spacing.sm,
    },
    rowBorder: {
      borderBottomWidth: 1,
      borderBottomColor: theme.colors.border,
    },
    rankBadge: {
      width: 34,
      height: 34,
      borderRadius: theme.radius.pill,
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: theme.colors.surface,
      borderWidth: 1,
      borderColor: theme.colors.border,
    },
    rankText: {
      ...theme.typography.caption,
      color: theme.colors.text,
      fontWeight: "900",
      fontVariant: ["tabular-nums"],
    },
    rowCopy: {
      flex: 1,
      minWidth: 0,
    },
    rowName: {
      ...theme.typography.subheading,
      flexShrink: 1,
      color: theme.colors.text,
      fontSize: 17,
      lineHeight: 22,
    },
    rowMeta: {
      ...theme.typography.caption,
      color: theme.colors.muted,
      marginTop: 3,
    },
    rowScore: {
      minHeight: 34,
      flexDirection: "row",
      alignItems: "center",
      gap: 4,
      borderRadius: theme.radius.pill,
      paddingHorizontal: theme.spacing.sm,
      backgroundColor: theme.colors.surface,
      borderWidth: 1,
      borderColor: theme.colors.border,
    },
    rowScoreText: {
      ...theme.typography.caption,
      color: theme.colors.text,
      fontWeight: "900",
      fontVariant: ["tabular-nums"],
    },
    emptyFrame: {
      minHeight: 420,
      justifyContent: "center",
    },
    pressed: {
      opacity: 0.84,
    },
  });
