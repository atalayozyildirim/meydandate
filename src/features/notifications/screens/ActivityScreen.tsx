import { useMemo, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  StyleSheet,
  Text,
  View,
  type ListRenderItem,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import type {
  ActivityType,
  UserActivity,
} from "@/domain/entities/Activity";
import { Avatar } from "@/shared/components/Avatar";
import { EmptyState } from "@/shared/components/EmptyState";
import { Screen } from "@/shared/components/Screen";
import {
  useActivities,
  useUnreadActivityCount,
} from "@/features/notifications/hooks/useActivities";
import { useTheme } from "@/shared/theme";

const activityIcons: Record<
  ActivityType,
  React.ComponentProps<typeof Ionicons>["name"]
> = {
  feed_like: "heart",
  feed_comment: "chatbubble",
  message: "paper-plane",
  match: "people",
  profile_like: "person-add",
  super_like: "flash",
  spotify_match: "musical-notes",
};

const startOfDay = (date: Date) =>
  new Date(date.getFullYear(), date.getMonth(), date.getDate());

const getDateGroup = (value: string) => {
  const date = startOfDay(new Date(value));
  const today = startOfDay(new Date());
  const difference = Math.round(
    (today.getTime() - date.getTime()) / (24 * 60 * 60 * 1000),
  );

  if (difference <= 0) return "Bugün";
  if (difference === 1) return "Dün";
  if (difference < 7) return "Bu hafta";
  return "Daha önce";
};

const formatRelativeTime = (value: string) => {
  const time = new Date(value).getTime();
  const differenceSeconds = Math.max(0, Math.floor((Date.now() - time) / 1000));

  if (differenceSeconds < 60) return "Şimdi";
  if (differenceSeconds < 3600) return `${Math.floor(differenceSeconds / 60)} dk`;
  if (differenceSeconds < 86400) return `${Math.floor(differenceSeconds / 3600)} sa`;

  return new Intl.DateTimeFormat("tr-TR", {
    day: "numeric",
    month: "short",
  }).format(new Date(value));
};

export default function ActivityScreen() {
  const router = useRouter();
  const theme = useTheme();
  const styles = createStyles(theme);
  const [unreadOnly, setUnreadOnly] = useState(false);
  const {
    activities,
    isLoading,
    isRefreshing,
    refresh,
    fetchMore,
    hasMore,
    isFetchingMore,
    markRead,
    markAllRead,
    isMarkingRead,
  } = useActivities(unreadOnly);
  const { unreadCount } = useUnreadActivityCount(false);

  const groupedActivities = useMemo(
    () =>
      activities.map((activity, index) => ({
        activity,
        group: getDateGroup(activity.createdAt),
        showGroup:
          index === 0 ||
          getDateGroup(activities[index - 1]?.createdAt ?? "") !==
            getDateGroup(activity.createdAt),
      })),
    [activities],
  );

  const openActivity = (activity: UserActivity) => {
    if (!activity.readAt) {
      void markRead(activity.id);
    }

    if (
      (activity.type === "feed_like" || activity.type === "feed_comment") &&
      activity.postId
    ) {
      router.push({
        pathname: "/tabs/feed/[postId]",
        params: { postId: activity.postId },
      });
      return;
    }

    if (activity.type === "message" && activity.conversationId) {
      router.push({
        pathname: "/tabs/chat/[conversationId]",
        params: { conversationId: activity.conversationId },
      });
      return;
    }

    if (activity.type === "match") {
      router.push("/tabs/matches");
      return;
    }

    if (activity.actor) {
      router.push({
        pathname: "/tabs/profile/[userId]",
        params: { userId: activity.actor.id },
      });
    }
  };

  const renderActivity: ListRenderItem<{
    activity: UserActivity;
    group: string;
    showGroup: boolean;
  }> = ({ item }) => {
    const { activity, group, showGroup } = item;
    const unread = !activity.readAt;

    return (
      <View>
        {showGroup ? <Text style={styles.groupTitle}>{group}</Text> : null}
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`${activity.title}. ${activity.body}`}
          onPress={() => openActivity(activity)}
          style={({ pressed }) => [
            styles.activityRow,
            unread && styles.activityRowUnread,
            pressed && styles.pressed,
          ]}
        >
          <View style={styles.avatarWrap}>
            <Avatar
              name={activity.actor?.name ?? "Ehlibyte"}
              uri={activity.actor?.photoUri}
              size={50}
            />
            <View style={styles.typeIcon}>
              <Ionicons
                name={activityIcons[activity.type]}
                size={13}
                color={theme.colors.onPrimary}
              />
            </View>
          </View>

          <View style={styles.activityCopy}>
            <View style={styles.activityTitleRow}>
              <Text numberOfLines={1} style={styles.activityTitle}>
                {activity.title}
              </Text>
              <Text style={styles.activityTime}>
                {formatRelativeTime(activity.createdAt)}
              </Text>
            </View>
            <Text numberOfLines={2} style={styles.activityBody}>
              {activity.body}
            </Text>
          </View>

          {unread ? <View style={styles.unreadDot} /> : null}
          <Ionicons
            name="chevron-forward"
            size={16}
            color={theme.colors.muted}
          />
        </Pressable>
      </View>
    );
  };

  return (
    <Screen scroll={false} style={styles.screen}>
      <View style={styles.header}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Geri dön"
          hitSlop={8}
          onPress={() => router.back()}
          style={({ pressed }) => [
            styles.headerButton,
            pressed && styles.pressed,
          ]}
        >
          <Ionicons name="chevron-back" size={23} color={theme.colors.text} />
        </Pressable>
        <View style={styles.headerCopy}>
          <Text style={styles.title}>Hareketler</Text>
          <Text style={styles.subtitle}>
            {unreadCount > 0 ? `${unreadCount} okunmamış` : "Hepsi güncel"}
          </Text>
        </View>
        {unreadCount > 0 ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Tüm hareketleri okundu işaretle"
            disabled={isMarkingRead}
            onPress={() => void markAllRead()}
            style={({ pressed }) => [
              styles.markAllButton,
              pressed && styles.pressed,
            ]}
          >
            {isMarkingRead ? (
              <ActivityIndicator size="small" color={theme.colors.text} />
            ) : (
              <>
                <Ionicons
                  name="checkmark-done"
                  size={16}
                  color={theme.colors.text}
                />
                <Text style={styles.markAllText}>Tümünü oku</Text>
              </>
            )}
          </Pressable>
        ) : null}
      </View>

      <View style={styles.filterFrame}>
        {[
          { label: "Tümü", value: false },
          { label: "Okunmamış", value: true },
        ].map((filter) => {
          const selected = unreadOnly === filter.value;

          return (
            <Pressable
              key={filter.label}
              accessibilityRole="button"
              accessibilityState={{ selected }}
              onPress={() => setUnreadOnly(filter.value)}
              style={({ pressed }) => [
                styles.filterButton,
                selected && styles.filterButtonSelected,
                pressed && styles.pressed,
              ]}
            >
              <Text
                style={[
                  styles.filterText,
                  selected && styles.filterTextSelected,
                ]}
              >
                {filter.label}
              </Text>
              {filter.value && unreadCount > 0 ? (
                <View
                  style={[
                    styles.filterCount,
                    selected && styles.filterCountSelected,
                  ]}
                >
                  <Text
                    style={[
                      styles.filterCountText,
                      selected && styles.filterCountTextSelected,
                    ]}
                  >
                    {unreadCount > 99 ? "99+" : unreadCount}
                  </Text>
                </View>
              ) : null}
            </Pressable>
          );
        })}
      </View>

      {isLoading ? (
        <View style={styles.loadingState}>
          <ActivityIndicator color={theme.colors.text} />
          <Text style={styles.loadingText}>Hareketler hazırlanıyor</Text>
        </View>
      ) : (
        <FlatList
          data={groupedActivities}
          keyExtractor={({ activity }) => activity.id}
          renderItem={renderActivity}
          contentInsetAdjustmentBehavior="automatic"
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          refreshing={isRefreshing}
          onRefresh={() => void refresh()}
          onEndReachedThreshold={0.4}
          onEndReached={() => {
            if (hasMore && !isFetchingMore) {
              void fetchMore();
            }
          }}
          initialNumToRender={12}
          maxToRenderPerBatch={12}
          updateCellsBatchingPeriod={50}
          windowSize={7}
          removeClippedSubviews
          ListEmptyComponent={
            <EmptyState
              title={unreadOnly ? "Okunmamış hareket yok" : "Henüz hareket yok"}
              description={
                unreadOnly
                  ? "Yeni etkileşimler geldiğinde burada görünecek."
                  : "Beğeniler, yorumlar, eşleşmeler ve mesajlar burada toplanacak."
              }
            />
          }
          ListFooterComponent={
            isFetchingMore ? (
              <View style={styles.listFooter}>
                <ActivityIndicator color={theme.colors.text} />
              </View>
            ) : null
          }
        />
      )}
    </Screen>
  );
}

const createStyles = (theme: ReturnType<typeof useTheme>) =>
  StyleSheet.create({
    screen: {
      flex: 1,
      padding: 0,
      paddingBottom: 0,
      backgroundColor: theme.colors.surface,
    },
    header: {
      minHeight: 70,
      flexDirection: "row",
      alignItems: "center",
      gap: theme.spacing.sm,
      paddingHorizontal: theme.spacing.lg,
      borderBottomWidth: 1,
      borderBottomColor: theme.colors.border,
    },
    headerButton: {
      width: 40,
      height: 40,
      borderRadius: theme.radius.pill,
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: theme.colors.elevated,
    },
    headerCopy: {
      flex: 1,
      minWidth: 0,
    },
    title: {
      ...theme.typography.heading,
      color: theme.colors.text,
      fontSize: 22,
      lineHeight: 27,
    },
    subtitle: {
      ...theme.typography.caption,
      color: theme.colors.muted,
      fontVariant: ["tabular-nums"],
    },
    markAllButton: {
      minHeight: 36,
      flexDirection: "row",
      alignItems: "center",
      gap: 5,
      paddingHorizontal: theme.spacing.sm,
      borderRadius: theme.radius.pill,
      backgroundColor: theme.colors.elevated,
      borderWidth: 1,
      borderColor: theme.colors.border,
    },
    markAllText: {
      ...theme.typography.caption,
      color: theme.colors.text,
      fontWeight: "800",
    },
    filterFrame: {
      minHeight: 58,
      flexDirection: "row",
      alignItems: "center",
      gap: theme.spacing.xs,
      paddingHorizontal: theme.spacing.lg,
      borderBottomWidth: 1,
      borderBottomColor: theme.colors.border,
    },
    filterButton: {
      minHeight: 36,
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      gap: 6,
      paddingHorizontal: theme.spacing.md,
      borderRadius: theme.radius.pill,
      backgroundColor: "transparent",
      borderWidth: 1,
      borderColor: theme.colors.border,
    },
    filterButtonSelected: {
      backgroundColor: theme.colors.primary,
      borderColor: theme.colors.primary,
    },
    filterText: {
      ...theme.typography.caption,
      color: theme.colors.text,
      fontWeight: "800",
    },
    filterTextSelected: {
      color: theme.colors.onPrimary,
    },
    filterCount: {
      minWidth: 20,
      height: 20,
      alignItems: "center",
      justifyContent: "center",
      paddingHorizontal: 5,
      borderRadius: theme.radius.pill,
      backgroundColor: theme.colors.elevated,
    },
    filterCountSelected: {
      backgroundColor: theme.colors.onPrimary,
    },
    filterCountText: {
      fontSize: 10,
      lineHeight: 12,
      fontWeight: "900",
      color: theme.colors.text,
      fontVariant: ["tabular-nums"],
    },
    filterCountTextSelected: {
      color: theme.colors.primary,
    },
    listContent: {
      flexGrow: 1,
      paddingBottom: 120,
      backgroundColor: theme.colors.surface,
    },
    groupTitle: {
      ...theme.typography.caption,
      color: theme.colors.muted,
      fontWeight: "900",
      textTransform: "uppercase",
      paddingHorizontal: theme.spacing.lg,
      paddingTop: theme.spacing.lg,
      paddingBottom: theme.spacing.xs,
    },
    activityRow: {
      minHeight: 82,
      flexDirection: "row",
      alignItems: "center",
      gap: theme.spacing.sm,
      paddingHorizontal: theme.spacing.lg,
      paddingVertical: theme.spacing.sm,
      backgroundColor: theme.colors.surface,
      borderBottomWidth: 1,
      borderBottomColor: theme.colors.border,
    },
    activityRowUnread: {
      backgroundColor: theme.colors.elevated,
    },
    avatarWrap: {
      position: "relative",
      width: 54,
      height: 54,
      alignItems: "center",
      justifyContent: "center",
    },
    typeIcon: {
      position: "absolute",
      right: -1,
      bottom: -1,
      width: 23,
      height: 23,
      borderRadius: theme.radius.pill,
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: theme.colors.primary,
      borderWidth: 2,
      borderColor: theme.colors.surface,
    },
    activityCopy: {
      flex: 1,
      minWidth: 0,
      gap: 3,
    },
    activityTitleRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: theme.spacing.xs,
    },
    activityTitle: {
      flex: 1,
      ...theme.typography.body,
      color: theme.colors.text,
      fontWeight: "800",
    },
    activityTime: {
      ...theme.typography.caption,
      color: theme.colors.muted,
      fontVariant: ["tabular-nums"],
    },
    activityBody: {
      ...theme.typography.caption,
      color: theme.colors.muted,
      lineHeight: 18,
    },
    unreadDot: {
      width: 8,
      height: 8,
      borderRadius: theme.radius.pill,
      backgroundColor: theme.colors.primary,
    },
    pressed: {
      opacity: 0.72,
    },
    loadingState: {
      flex: 1,
      alignItems: "center",
      justifyContent: "center",
      gap: theme.spacing.sm,
    },
    loadingText: {
      ...theme.typography.caption,
      color: theme.colors.muted,
    },
    listFooter: {
      minHeight: 64,
      alignItems: "center",
      justifyContent: "center",
    },
  });
