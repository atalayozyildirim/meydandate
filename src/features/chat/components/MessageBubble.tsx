// Mesaj balonlarini gonderen kisiye gore hizalar ve okundu durumunu gosterir.
// Kalp mesajlari (❤️) icin assets/lottie/love.json animasyonu kullanilir.
import { useRef } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import Swipeable from "react-native-gesture-handler/Swipeable";
import LottieView from "lottie-react-native";
import type { Message } from "@/domain/entities/Message";
import { formatDateTime } from "@/shared/utils/date";
import { useTheme } from "@/shared/theme";

// eslint-disable-next-line global-require
const loveAnimation = require("../../../../assets/lottie/love.json");

interface MessageBubbleProps {
  message: Message;
  isOwn: boolean;
  disabled?: boolean;
  onDelete?: (messageId: string) => void;
  onReport?: (message: Message) => void;
}

export const MessageBubble = ({
  message,
  isOwn,
  disabled = false,
  onDelete,
  onReport,
}: MessageBubbleProps) => {
  const theme = useTheme();
  const trimmed = message.body.trim();
  const isHeart = trimmed === "❤️";
  const styles = createStyles(theme, isOwn, isHeart);
  const swipeableRef = useRef<Swipeable>(null);
  const canDelete = Boolean(onDelete);
  const canReport = Boolean(onReport) && !isOwn;

  const bubbleContent = isHeart ? (
    <View style={styles.heartBubble}>
      <LottieView
        source={loveAnimation}
        autoPlay
        loop={false}
        style={styles.lottieHeart}
      />
      <Text style={styles.heartMeta}>{formatDateTime(message.createdAt)}</Text>
    </View>
  ) : (
    <View style={styles.bubble}>
      <Text style={styles.body}>{message.body}</Text>
      <Text style={styles.meta}>
        {formatDateTime(message.createdAt)} · {message.status}
      </Text>
    </View>
  );

  return (
    <View style={styles.row}>
      <View style={styles.swipeFrame}>
        <Swipeable
          ref={swipeableRef}
          enabled={!disabled && (canDelete || canReport)}
          overshootLeft={false}
          overshootRight={false}
          renderLeftActions={() =>
            canReport ? (
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Mesajı şikayet et"
                onPress={() => {
                  swipeableRef.current?.close();
                  onReport?.(message);
                }}
                style={styles.reportAction}
              >
                <Ionicons name="flag-outline" size={18} color="#FFFFFF" />
              </Pressable>
            ) : null
          }
          renderRightActions={() => (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Mesajı sil"
              onPress={() => {
                swipeableRef.current?.close();
                onDelete?.(message.id);
              }}
              style={styles.deleteAction}
            >
              <Ionicons name="trash-outline" size={18} color="#FFFFFF" />
            </Pressable>
          )}
          onSwipeableRightOpen={() => {
            swipeableRef.current?.close();
            onDelete?.(message.id);
          }}
          onSwipeableLeftOpen={() => {
            swipeableRef.current?.close();
            onReport?.(message);
          }}
        >
          {bubbleContent}
        </Swipeable>
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
    swipeFrame: {
      maxWidth: isHeart ? 112 : "78%",
      minWidth: isHeart ? 112 : undefined,
    },
    deleteAction: {
      width: 58,
      marginLeft: theme.spacing.xs,
      borderRadius: theme.radius.lg,
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: theme.colors.danger,
    },
    reportAction: {
      width: 58,
      marginRight: theme.spacing.xs,
      borderRadius: theme.radius.lg,
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: theme.colors.warning,
    },
    bubble: {
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
