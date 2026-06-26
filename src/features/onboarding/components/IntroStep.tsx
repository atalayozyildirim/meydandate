import { View, Text } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import { FontAwesome } from "@expo/vector-icons";
import { useTheme } from "@/shared/theme";

export const IntroStep = () => {
  const theme = useTheme();
  const styles = createStyles(theme);

  return (
    <LinearGradient
      colors={
        theme.isDark
          ? ["#101010", "#1B1B1B", "#2B2B2B"]
          : ["#FFFFFF", "#F4F4F4", "#E9E9E9"]
      }
      style={styles.introCard}
    >
      <View style={styles.mockCardTop}>
        <View style={styles.mockAvatar}>
          <Text style={styles.mockAvatarText}>
            {"Ç".charAt(0).toLocaleUpperCase("tr-TR")}
          </Text>
        </View>
        <View style={styles.mockSignalBadge}>
          <Ionicons
            name="sparkles"
            size={16}
            color={theme.isDark ? "#050505" : "#FFFFFF"}
          />
          <Text style={styles.mockSignalText}>Uyum %82</Text>
        </View>
      </View>
      <View style={styles.mockCardCopy}>
        <Text style={styles.mockName}>{"Senin kartın"}</Text>
        <Text style={styles.mockMeta}>
          Profil bilgileri, müzik sinyali ve ilgi alanları burada
          birleşir.
        </Text>
      </View>
      <View style={styles.mockStats}>
        <View style={styles.mockStat}>
          <Text style={styles.mockStatValue}>%68</Text>
          <Text style={styles.mockStatLabel}>Kültür</Text>
        </View>
        <View style={styles.mockStat}>
          <Text style={styles.mockStatValue}>%55</Text>
          <Text style={styles.mockStatLabel}>Müzik</Text>
        </View>
        <View style={styles.mockStat}>
          <Text style={styles.mockStatValue}>%81</Text>
          <Text style={styles.mockStatLabel}>Sohbet</Text>
        </View>
      </View>
      <View style={styles.introSignals}>
        <View style={styles.introSignal}>
          <Ionicons
            name="person-circle"
            size={18}
            color={theme.colors.text}
          />
          <Text style={styles.introSignalText}>Profil</Text>
        </View>
        <View style={styles.introSignal}>
          <FontAwesome
            name="spotify"
            size={15}
            color={theme.colors.text}
          />
          <Text style={styles.introSignalText}>Müzik</Text>
        </View>
        <View style={styles.introSignal}>
          <Ionicons name="radio" size={18} color={theme.colors.text} />
          <Text style={styles.introSignalText}>Meydan</Text>
        </View>
        <View style={styles.introSignal}>
          <Ionicons name="sparkles" size={18} color={theme.colors.text} />
          <Text style={styles.introSignalText}>Uyum</Text>
        </View>
      </View>
    </LinearGradient>
  );
};

const createStyles = (theme: ReturnType<typeof useTheme>) => ({
  introCard: {
    gap: theme.spacing.sm,
    borderRadius: 26,
    padding: theme.spacing.md,
    marginBottom: theme.spacing.xs,
    overflow: "hidden" as const,
    borderWidth: 1,
    borderColor: theme.isDark
      ? "rgba(255, 255, 255, 0.13)"
      : "rgba(0, 0, 0, 0.10)",
    shadowColor: theme.colors.shadow,
    shadowOpacity: 1,
    shadowRadius: 20,
    shadowOffset: { width: 0, height: 12 },
    elevation: 4,
  } as const,
  mockCardTop: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    justifyContent: "space-between" as const,
    gap: theme.spacing.sm,
  } as const,
  mockAvatar: {
    width: 56,
    height: 56,
    borderRadius: 21,
    alignItems: "center" as const,
    justifyContent: "center" as const,
    backgroundColor: theme.colors.text,
  } as const,
  mockAvatarText: {
    fontSize: 28,
    lineHeight: 32,
    fontWeight: "900" as const,
    color: theme.colors.background,
  } as const,
  mockSignalBadge: {
    minHeight: 34,
    borderRadius: theme.radius.pill,
    flexDirection: "row" as const,
    alignItems: "center" as const,
    gap: theme.spacing.xxs,
    paddingHorizontal: theme.spacing.md,
    backgroundColor: theme.colors.text,
  } as const,
  mockSignalText: {
    ...theme.typography.caption,
    color: theme.colors.background,
  } as const,
  mockCardCopy: {
    gap: theme.spacing.xs,
  } as const,
  mockName: {
    fontSize: 28,
    lineHeight: 32,
    fontWeight: "900" as const,
    color: theme.colors.text,
  } as const,
  mockMeta: {
    ...theme.typography.body,
    color: theme.colors.muted,
  } as const,
  mockStats: {
    flexDirection: "row" as const,
    gap: theme.spacing.xs,
  } as const,
  mockStat: {
    flex: 1,
    minHeight: 58,
    borderRadius: 18,
    justifyContent: "center" as const,
    paddingHorizontal: theme.spacing.sm,
    backgroundColor: theme.isDark
      ? "rgba(255, 255, 255, 0.08)"
      : "rgba(0, 0, 0, 0.06)",
    borderWidth: 1,
    borderColor: theme.isDark
      ? "rgba(255, 255, 255, 0.12)"
      : "rgba(0, 0, 0, 0.08)",
  } as const,
  mockStatValue: {
    fontSize: 20,
    lineHeight: 24,
    fontWeight: "900" as const,
    color: theme.colors.text,
  } as const,
  mockStatLabel: {
    ...theme.typography.caption,
    color: theme.colors.muted,
  } as const,
  introSignals: {
    flexDirection: "row" as const,
    flexWrap: "wrap" as const,
    gap: theme.spacing.xs,
  } as const,
  introSignal: {
    minHeight: 36,
    borderRadius: theme.radius.pill,
    flexDirection: "row" as const,
    alignItems: "center" as const,
    gap: theme.spacing.xxs,
    paddingHorizontal: theme.spacing.sm,
    backgroundColor: theme.isDark
      ? "rgba(255, 255, 255, 0.07)"
      : "rgba(0, 0, 0, 0.05)",
  } as const,
  introSignalText: {
    ...theme.typography.caption,
    color: theme.colors.text,
  } as const,
});
