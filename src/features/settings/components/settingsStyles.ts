import { StyleSheet } from "react-native";
import type { useTheme } from "@/shared/theme";

export const createSettingsStyles = (theme: ReturnType<typeof useTheme>) =>
  StyleSheet.create({
    header: {
      flexDirection: "row",
      alignItems: "center",
      gap: theme.spacing.sm,
      marginBottom: theme.spacing.lg,
    },
    backButton: {
      width: 42,
      height: 42,
      borderRadius: theme.radius.pill,
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: theme.colors.elevated,
    },
    headerText: {
      flex: 1,
      gap: theme.spacing.xxs,
    },
    kicker: {
      ...theme.typography.caption,
      color: theme.colors.primary,
      textTransform: "uppercase",
    },
    title: {
      ...theme.typography.title,
      color: theme.colors.text,
    },
    section: {
      gap: theme.spacing.sm,
      marginBottom: theme.spacing.md,
    },
    sectionTitle: {
      ...theme.typography.subheading,
      color: theme.colors.text,
    },
    row: {
      flexDirection: "row",
      alignItems: "center",
      gap: theme.spacing.sm,
      paddingVertical: theme.spacing.xs,
    },
    rowIcon: {
      width: 38,
      height: 38,
      borderRadius: theme.radius.pill,
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: theme.colors.elevated,
    },
    rowIconDanger: {
      backgroundColor: "rgba(220, 38, 38, 0.10)",
    },
    toggleRow: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      gap: theme.spacing.sm,
    },
    rowBody: {
      flex: 1,
      gap: theme.spacing.xxs,
    },
    rowTitle: {
      ...theme.typography.body,
      color: theme.colors.text,
    },
    dangerText: {
      color: theme.colors.danger,
    },
    rowSubtitle: {
      ...theme.typography.caption,
      color: theme.colors.muted,
    },
    chipWrap: {
      flexDirection: "row",
      flexWrap: "wrap",
      gap: theme.spacing.xs,
    },
    pressed: {
      opacity: 0.78,
    },
  });
