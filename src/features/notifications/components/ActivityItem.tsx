import React from "react";
import { Pressable, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import type { ActivityType, UserActivity } from "@/domain/entities/Activity";
import { Avatar } from "@/shared/components/Avatar";
import { useTheme } from "@/shared/theme";
import type { createActivityStyles } from "./activityStyles";

export const activityIcons: Record<
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

export const formatRelativeTime = (value: string) => {
  const time = new Date(value).getTime();
  const differenceSeconds = Math.max(0, Math.floor((Date.now() - time) / 1000));

  if (differenceSeconds < 60) return "Şimdi";
  if (differenceSeconds < 3600) return `${Math.floor(differenceSeconds / 60)} dk`;
  if (differenceSeconds < 86400) return `${Math.floor(differenceSeconds / 3600)} sa`;
  if (differenceSeconds < 604800) return `${Math.floor(differenceSeconds / 86400)} g`;
  return `${Math.floor(differenceSeconds / 604800)} h`;
};

interface ActivityItemProps {
  activity: UserActivity;
  group: string;
  showGroup: boolean;
  onPress: (activity: UserActivity) => void;
  styles: ReturnType<typeof createActivityStyles>;
}

export function ActivityItem({
  activity,
  group,
  showGroup,
  onPress,
  styles,
}: ActivityItemProps) {
  const theme = useTheme();
  const unread = !activity.readAt;

  return (
    <View>
      {showGroup ? <Text style={styles.groupTitle}>{group}</Text> : null}
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`${activity.title}. ${activity.body}`}
        onPress={() => onPress(activity)}
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
}
