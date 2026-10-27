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
import { createActivityStyles } from "../components/activityStyles";
import { ActivityItem } from "../components/ActivityItem";
import { ActivityFilterBar } from "../components/ActivityFilterBar";

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

export default function ActivityScreen() {
  const router = useRouter();
  const theme = useTheme();
  const styles = createActivityStyles(theme);
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
  }> = ({ item }) => (
    <ActivityItem
      activity={item.activity}
      group={item.group}
      showGroup={item.showGroup}
      onPress={openActivity}
      styles={styles}
    />
  );

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

      <ActivityFilterBar
        unreadOnly={unreadOnly}
        onSelectFilter={setUnreadOnly}
        unreadCount={unreadCount}
        styles={styles}
      />

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
