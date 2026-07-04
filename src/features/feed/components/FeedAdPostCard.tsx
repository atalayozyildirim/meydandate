// Feed icinde post gibi gorunen native reklam slotu.
import { StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { Avatar } from "@/shared/components/Avatar";
import { Card } from "@/shared/components/Card";
import { useTheme } from "@/shared/theme";
import { AdBanner } from "@/features/ads";

export const FeedAdPostCard = () => {
  const theme = useTheme();
  const styles = createStyles(theme);

  return (
    <Card style={styles.card}>
      <View style={styles.postRow}>
        <View style={styles.avatarColumn}>
          <Avatar name="Ehlibyte" size={44} />
          <View style={styles.avatarRail} />
        </View>

        <View style={styles.postContent}>
          <View style={styles.header}>
            <View style={styles.headerBody}>
              <View style={styles.nameRow}>
                <Text style={styles.name} numberOfLines={1}>
                  Sponsorlu içerik
                </Text>
                <View style={styles.sponsoredBadge}>
                  <Ionicons
                    name="megaphone-outline"
                    size={11}
                    color={theme.colors.muted}
                  />
                  <Text style={styles.sponsoredText}>Reklam</Text>
                </View>
              </View>
              <Text style={styles.meta}>Ehlibyte akışı</Text>
            </View>
          </View>

          <AdBanner style={styles.ad} />
        </View>
      </View>
    </Card>
  );
};

const createStyles = (theme: ReturnType<typeof useTheme>) =>
  StyleSheet.create({
    card: {
      borderRadius: 0,
      borderWidth: 0,
      borderBottomWidth: 1,
      borderBottomColor: theme.colors.border,
      padding: 0,
      backgroundColor: theme.colors.surface,
      shadowOpacity: 0,
      shadowRadius: 0,
      elevation: 0,
    },
    postRow: {
      flexDirection: "row",
      alignItems: "flex-start",
      gap: theme.spacing.sm,
      paddingHorizontal: theme.spacing.lg,
      paddingVertical: theme.spacing.md,
    },
    avatarColumn: {
      width: 44,
      alignItems: "center",
      alignSelf: "stretch",
    },
    avatarRail: {
      flex: 1,
      width: 2,
      minHeight: 22,
      marginTop: theme.spacing.xs,
      borderRadius: 1,
      backgroundColor: theme.colors.border,
    },
    postContent: {
      flex: 1,
      gap: theme.spacing.xs,
      minWidth: 0,
    },
    header: {
      flexDirection: "row",
      alignItems: "flex-start",
      gap: theme.spacing.xs,
    },
    headerBody: {
      flex: 1,
      minWidth: 0,
    },
    nameRow: {
      minWidth: 0,
      flexDirection: "row",
      alignItems: "center",
      gap: theme.spacing.xs,
    },
    name: {
      ...theme.typography.subheading,
      color: theme.colors.text,
      flexShrink: 1,
    },
    meta: {
      ...theme.typography.caption,
      color: theme.colors.muted,
      fontWeight: "500",
    },
    sponsoredBadge: {
      minHeight: 20,
      borderRadius: theme.radius.pill,
      flexDirection: "row",
      alignItems: "center",
      gap: 3,
      paddingHorizontal: 7,
      backgroundColor: theme.isDark
        ? "rgba(255, 255, 255, 0.08)"
        : "rgba(0, 0, 0, 0.04)",
      borderWidth: 1,
      borderColor: theme.isDark
        ? "rgba(255, 255, 255, 0.12)"
        : "rgba(0, 0, 0, 0.08)",
    },
    sponsoredText: {
      fontSize: 11,
      lineHeight: 14,
      fontWeight: "700",
      color: theme.colors.muted,
    },
    ad: {
      marginTop: theme.spacing.xs,
      paddingHorizontal: 0,
      paddingBottom: 0,
      borderTopWidth: 0,
      borderBottomWidth: 0,
      backgroundColor: theme.colors.surface,
    },
  });
