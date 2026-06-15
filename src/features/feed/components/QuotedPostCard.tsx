import { Image, Pressable, StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import type { FeedQuotedPost } from "@/domain/entities/Feed";
import { Avatar } from "@/shared/components/Avatar";
import { sanitizePlainText } from "@/shared/utils/sanitize";
import { useTheme } from "@/shared/theme";

interface QuotedPostCardProps {
  quotedPost: FeedQuotedPost;
  onPress?: () => void;
  compact?: boolean;
}

export const QuotedPostCard = ({
  quotedPost,
  onPress,
  compact = false,
}: QuotedPostCardProps) => {
  const theme = useTheme();
  const styles = createStyles(theme, compact);

  const content = (
    <View style={styles.content}>
      <View style={styles.header}>
        <Avatar
          name={quotedPost.authorName}
          uri={quotedPost.authorPhotoUrl ?? undefined}
          size={compact ? 22 : 26}
        />
        <Text numberOfLines={1} style={styles.author}>
          {sanitizePlainText(quotedPost.authorName, 80)}
        </Text>
        <Ionicons name="repeat-outline" size={13} color={theme.colors.muted} />
      </View>
      {quotedPost.body ? (
        <Text numberOfLines={compact ? 2 : 3} style={styles.body}>
          {sanitizePlainText(quotedPost.body, 260)}
        </Text>
      ) : null}
      {quotedPost.imageUrl ? (
        <Image
          source={{ uri: quotedPost.imageUrl }}
          resizeMode="cover"
          style={styles.image}
        />
      ) : null}
    </View>
  );

  if (!onPress) {
    return content;
  }

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${sanitizePlainText(quotedPost.authorName, 80)} alıntısını aç`}
      onPress={onPress}
      style={({ pressed }) => pressed && styles.pressed}
    >
      {content}
    </Pressable>
  );
};

const createStyles = (
  theme: ReturnType<typeof useTheme>,
  compact: boolean,
) =>
  StyleSheet.create({
    content: {
      gap: theme.spacing.xs,
      borderRadius: compact ? 16 : 18,
      borderWidth: 1,
      borderColor: theme.colors.border,
      padding: compact ? theme.spacing.xs : theme.spacing.sm,
      backgroundColor: theme.isDark
        ? "rgba(255, 255, 255, 0.035)"
        : "rgba(17, 24, 39, 0.025)",
    },
    header: {
      flexDirection: "row",
      alignItems: "center",
      gap: theme.spacing.xs,
    },
    author: {
      ...theme.typography.caption,
      flex: 1,
      color: theme.colors.text,
      fontWeight: "800",
    },
    body: {
      ...theme.typography.caption,
      color: theme.colors.text,
      lineHeight: 18,
    },
    image: {
      width: "100%",
      aspectRatio: compact ? 2.5 : 2.1,
      borderRadius: compact ? 12 : 14,
      backgroundColor: theme.colors.elevated,
    },
    pressed: {
      opacity: 0.78,
    },
  });
