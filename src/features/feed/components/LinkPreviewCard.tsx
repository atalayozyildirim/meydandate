import { Image, Linking, Pressable, StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import type { FeedLinkPreview } from "@/domain/entities/Feed";
import { sanitizePlainText } from "@/shared/utils/sanitize";
import { useTheme } from "@/shared/theme";

interface LinkPreviewCardProps {
  preview: FeedLinkPreview;
}

const getHost = (url: string) => {
  try {
    return new URL(url).hostname.replace(/^www\./i, "");
  } catch {
    return url.replace(/^https?:\/\//i, "").split("/")[0] ?? url;
  }
};

export const LinkPreviewCard = ({ preview }: LinkPreviewCardProps) => {
  const theme = useTheme();
  const styles = createStyles(theme);
  const siteName = preview.siteName || getHost(preview.url);
  const title = preview.title || siteName;

  return (
    <Pressable
      accessibilityRole="link"
      accessibilityLabel={`${sanitizePlainText(title, 140)} bağlantısını aç`}
      onPress={() => void Linking.openURL(preview.url)}
      style={({ pressed }) => [styles.card, pressed && styles.pressed]}
    >
      {preview.imageUrl ? (
        <Image
          source={{ uri: preview.imageUrl }}
          resizeMode="cover"
          style={styles.image}
        />
      ) : (
        <View style={styles.fallbackImage}>
          <Ionicons name="link-outline" size={22} color={theme.colors.primary} />
        </View>
      )}
      <View style={styles.copy}>
        <Text numberOfLines={1} style={styles.site}>
          {sanitizePlainText(siteName, 80)}
        </Text>
        <Text numberOfLines={2} style={styles.title}>
          {sanitizePlainText(title, 140)}
        </Text>
        {preview.description ? (
          <Text numberOfLines={2} style={styles.description}>
            {sanitizePlainText(preview.description, 220)}
          </Text>
        ) : null}
      </View>
    </Pressable>
  );
};

const createStyles = (theme: ReturnType<typeof useTheme>) =>
  StyleSheet.create({
    card: {
      overflow: "hidden",
      borderRadius: 18,
      borderWidth: 1,
      borderColor: theme.colors.border,
      backgroundColor: theme.isDark ? "#151824" : "#FFFFFF",
    },
    image: {
      width: "100%",
      aspectRatio: 1.9,
      backgroundColor: theme.colors.elevated,
    },
    fallbackImage: {
      minHeight: 72,
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: "rgba(233, 64, 87, 0.08)",
    },
    copy: {
      gap: 3,
      padding: theme.spacing.sm,
    },
    site: {
      ...theme.typography.caption,
      color: theme.colors.muted,
      fontWeight: "700",
    },
    title: {
      ...theme.typography.caption,
      color: theme.colors.text,
      fontWeight: "800",
      lineHeight: 18,
    },
    description: {
      ...theme.typography.caption,
      color: theme.colors.muted,
      lineHeight: 17,
    },
    pressed: {
      opacity: 0.78,
    },
  });
