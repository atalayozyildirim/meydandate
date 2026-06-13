// Mesaj balonlarini gonderen kisiye gore hizalar ve okundu durumunu gosterir.
import { StyleSheet, Text, View } from "react-native";
import type { Message } from "@/domain/entities/Message";
import { formatDateTime } from "@/shared/utils/date";
import { useTheme } from "@/shared/theme";

interface MessageBubbleProps {
  message: Message;
  isOwn: boolean;
}

export const MessageBubble = ({ message, isOwn }: MessageBubbleProps) => {
  const theme = useTheme();
  const trimmed = message.body.trim();
  const isHeart = trimmed === "❤️";
  const styles = createStyles(theme, isOwn, isHeart);

  return (
    <View style={styles.row}>
      <View style={styles.bubble}>
        <Text style={styles.body}>{message.body}</Text>
        <Text style={styles.meta}>
          {formatDateTime(message.createdAt)} · {message.status}
        </Text>
      </View>
    </View>
  );
};

const createStyles = (
  theme: ReturnType<typeof useTheme>,
  isOwn: boolean,
  isHeart: boolean,
) =>
  StyleSheet.create({
    row: {
      flexDirection: "row",
      justifyContent: isOwn ? "flex-end" : "flex-start"
    },
    bubble: {
      maxWidth: isHeart ? 92 : "78%",
      borderRadius: theme.radius.lg,
      padding: isHeart ? theme.spacing.sm : theme.spacing.md,
      gap: theme.spacing.xs,
      backgroundColor: isOwn ? theme.colors.primary : theme.colors.elevated
    },
    body: {
      ...(isHeart ? { fontSize: 40, lineHeight: 46, fontWeight: "800" as const } : theme.typography.body),
      color: isOwn ? "#FFFFFF" : theme.colors.text
    },
    meta: {
      ...theme.typography.caption,
      color: isOwn ? "rgba(255,255,255,0.74)" : theme.colors.muted
    }
  });
