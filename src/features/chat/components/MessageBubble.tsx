// Mesaj balonlarini gonderen kisiye gore hizalar ve okundu durumunu gosterir.
// Kalp mesajlari (❤️) icin assets/lottie/love.json animasyonu kullanilir.
import { StyleSheet, Text, View } from "react-native";
import LottieView from "lottie-react-native";
import type { Message } from "@/domain/entities/Message";
import { formatDateTime } from "@/shared/utils/date";
import { useTheme } from "@/shared/theme";

// eslint-disable-next-line global-require
const loveAnimation = require("../../../../assets/lottie/love.json");

interface MessageBubbleProps {
  message: Message;
  isOwn: boolean;
}

export const MessageBubble = ({ message, isOwn }: MessageBubbleProps) => {
  const theme = useTheme();
  const trimmed = message.body.trim();
  const isHeart = trimmed === "❤️";
  const styles = createStyles(theme, isOwn, isHeart);

  if (isHeart) {
    return (
      <View style={styles.row}>
        <View style={styles.heartBubble}>
          <LottieView
            source={loveAnimation}
            autoPlay
            loop={false}
            style={styles.lottieHeart}
          />
          <Text style={styles.heartMeta}>
            {formatDateTime(message.createdAt)}
          </Text>
        </View>
      </View>
    );
  }

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
      maxWidth: "78%",
      borderRadius: theme.radius.lg,
      padding: theme.spacing.md,
      gap: theme.spacing.xs,
      backgroundColor: isOwn ? theme.colors.primary : theme.colors.elevated
    },
    body: {
      ...theme.typography.body,
      color: isOwn ? "#FFFFFF" : theme.colors.text
    },
    meta: {
      ...theme.typography.caption,
      color: isOwn ? "rgba(255,255,255,0.74)" : theme.colors.muted
    },
    heartBubble: {
      alignItems: isOwn ? "flex-end" : "flex-start",
      gap: 2,
    },
    lottieHeart: {
      width: 100,
      height: 100,
    },
    heartMeta: {
      ...theme.typography.caption,
      color: theme.colors.muted,
      fontSize: 10,
    },
  });
