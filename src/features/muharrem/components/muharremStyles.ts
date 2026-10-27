import { StyleSheet } from "react-native";
import type { useTheme } from "@/shared/theme";

export const createMuharremStyles = (theme: ReturnType<typeof useTheme>) =>
  StyleSheet.create({
    screen: {
      gap: theme.spacing.lg,
      paddingBottom: 104,
    },
    header: {
      gap: theme.spacing.xs,
      paddingTop: theme.spacing.xs,
    },
    headerIcon: {
      width: 56,
      height: 56,
      borderRadius: 18,
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: theme.colors.primary,
      shadowColor: theme.colors.shadow,
      shadowOpacity: 1,
      shadowRadius: 16,
      shadowOffset: { width: 0, height: 8 },
      elevation: 3,
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
    description: {
      ...theme.typography.body,
      color: theme.colors.muted,
      width: "100%",
      flexShrink: 1,
    },
    streakPanel: {
      minHeight: 104,
      borderRadius: 28,
      padding: theme.spacing.lg,
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      backgroundColor: theme.colors.success,
      shadowColor: "rgba(22, 163, 74, 0.24)",
      shadowOpacity: 1,
      shadowRadius: 18,
      shadowOffset: { width: 0, height: 10 },
      elevation: 4,
    },
    streakLeft: {
      flex: 1,
      flexDirection: "row",
      alignItems: "center",
      gap: theme.spacing.sm,
      minWidth: 0,
    },
    streakCopy: {
      flex: 1,
      minWidth: 0,
    },
    streakMeta: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      gap: theme.spacing.xs,
    },
    streakLabel: {
      ...theme.typography.caption,
      color: "rgba(255, 255, 255, 0.78)",
    },
    streakValue: {
      ...theme.typography.heading,
      color: "#FFFFFF",
      flexShrink: 1,
    },
    targetPill: {
      borderRadius: theme.radius.pill,
      paddingHorizontal: theme.spacing.sm,
      paddingVertical: theme.spacing.xs,
      backgroundColor: "rgba(255, 255, 255, 0.18)",
    },
    targetText: {
      ...theme.typography.caption,
      color: "#FFFFFF",
    },
    progressPanel: {
      gap: theme.spacing.sm,
    },
    disabledPanel: {
      opacity: 0.64,
    },
    progressTop: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
    },
    progressLabel: {
      ...theme.typography.subheading,
      color: theme.colors.text,
    },
    progressPercent: {
      ...theme.typography.subheading,
      color: theme.colors.primary,
    },
    progressTrack: {
      height: 12,
      borderRadius: theme.radius.pill,
      overflow: "hidden",
      backgroundColor: theme.colors.elevated,
    },
    progressFill: {
      height: "100%",
      borderRadius: theme.radius.pill,
      backgroundColor: theme.colors.primary,
    },
    calendarPanel: {
      gap: theme.spacing.md,
    },
    calendarHeader: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      flexWrap: "wrap",
      gap: theme.spacing.xs,
    },
    sectionTitle: {
      ...theme.typography.subheading,
      color: theme.colors.text,
    },
    calendarHint: {
      ...theme.typography.caption,
      color: theme.colors.muted,
    },
    daysGrid: {
      flexDirection: "row",
      flexWrap: "wrap",
      gap: theme.spacing.xs,
    },
    dayCell: {
      width: "48.5%",
      minHeight: 142,
      borderRadius: 24,
      alignItems: "center",
      justifyContent: "center",
      gap: theme.spacing.xxs,
      borderWidth: 1,
      borderColor: theme.colors.border,
      backgroundColor: theme.colors.surface,
      padding: theme.spacing.sm,
    },
    dayCellActive: {
      borderColor: theme.colors.primary,
      backgroundColor: theme.isDark ? "rgba(128, 128, 128, 0.12)" : "#F5F5F5",
    },
    dayCellPast: {
      opacity: 0.72,
    },
    dayCellAshura: {
      borderColor: theme.colors.secondary,
    },
    dayCellCompleted: {
      borderColor: theme.colors.success,
      backgroundColor: theme.isDark ? "rgba(74, 222, 128, 0.12)" : "#ECFDF3",
      opacity: 1,
    },
    dayCellDisabled: {
      opacity: 0.46,
    },
    pressed: {
      opacity: 0.82,
    },
    dayOrb: {
      width: 44,
      height: 44,
      borderRadius: theme.radius.pill,
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: theme.colors.elevated,
    },
    dayOrbActive: {
      backgroundColor: theme.colors.primary,
    },
    dayOrbAshura: {
      backgroundColor: theme.colors.secondary,
    },
    dayOrbCompleted: {
      backgroundColor: theme.colors.success,
    },
    dayNumber: {
      ...theme.typography.caption,
      color: theme.colors.text,
    },
    dayNumberCompleted: {
      color: theme.colors.success,
    },
    dayDate: {
      fontSize: 13,
      lineHeight: 17,
      fontWeight: "800",
      color: theme.colors.text,
      textAlign: "center",
    },
    dayNote: {
      fontSize: 11,
      lineHeight: 14,
      fontWeight: "600",
      color: theme.colors.muted,
      textAlign: "center",
    },
    reminderPanel: {
      minHeight: 94,
      borderRadius: 26,
      borderWidth: 1,
      borderColor: "rgba(128, 128, 128, 0.28)",
      padding: theme.spacing.md,
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      gap: theme.spacing.sm,
      backgroundColor: theme.isDark ? theme.colors.surface : "#F5F5F5",
      shadowColor: theme.colors.shadow,
      shadowOpacity: 1,
      shadowRadius: 16,
      shadowOffset: { width: 0, height: 8 },
      elevation: 4,
    },
    reminderPanelActive: {
      borderColor: "rgba(22, 163, 74, 0.34)",
      backgroundColor: theme.isDark ? "rgba(74, 222, 128, 0.12)" : "#ECFDF3",
    },
    reminderIcon: {
      width: 48,
      height: 48,
      borderRadius: theme.radius.pill,
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: theme.colors.primary,
    },
    reminderText: {
      flex: 1,
      gap: theme.spacing.xxs,
    },
    reminderTitle: {
      ...theme.typography.subheading,
      color: theme.colors.text,
    },
    reminderDescription: {
      ...theme.typography.caption,
      color: theme.colors.muted,
    },
    notePanel: {
      gap: theme.spacing.sm,
    },
    noteTitleRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: theme.spacing.xs,
    },
    noteInput: {
      minHeight: 118,
      borderRadius: 22,
      borderWidth: 1,
      borderColor: theme.colors.border,
      backgroundColor: theme.colors.surface,
      padding: theme.spacing.md,
      textAlignVertical: "top",
      ...theme.typography.body,
      color: theme.colors.text,
    },
    noteInputDisabled: {
      opacity: 0.58,
      backgroundColor: theme.colors.elevated,
    },
  });
