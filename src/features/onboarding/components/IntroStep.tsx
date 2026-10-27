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
      <View style={styles.sampleCardTop}>
        <View style={styles.sampleAvatar}>
          <Text style={styles.sampleAvatarText}>
            {"Ç".charAt(0).toLocaleUpperCase("tr-TR")}
          </Text>
        </View>
        <View style={styles.sampleSignalBadge}>
          <Ionicons
            name="sparkles"
            size={16}
            color={theme.isDark ? "#050505" : "#FFFFFF"}
          />
          <Text style={styles.sampleSignalText}>Uyum %82</Text>
        </View>
      </View>
      <View style={styles.sampleCardCopy}>
        <Text style={styles.sampleName}>{"Senin kartın"}</Text>
        <Text style={styles.sampleMeta}>
          Profil bilgileri, müzik sinyali ve ilgi alanları burada
          birleşir.
        </Text>
      </View>
      <View style={styles.sampleStats}>
        <View style={styles.sampleStat}>
          <Text style={styles.sampleStatValue}>%68</Text>
          <Text style={styles.sampleStatLabel}>Kültür</Text>
        </View>
        <View style={styles.sampleStat}>
          <Text style={styles.sampleStatValue}>%55</Text>
          <Text style={styles.sampleStatLabel}>Müzik</Text>
        </View>
        <View style={styles.sampleStat}>
          <Text style={styles.sampleStatValue}>%81</Text>
          <Text style={styles.sampleStatLabel}>Sohbet</Text>
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
  sampleCardTop: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    justifyContent: "space-between" as const,
    gap: theme.spacing.sm,
  } as const,
  sampleAvatar: {
    width: 56,
    height: 56,
    borderRadius: 21,
    alignItems: "center" as const,
    justifyContent: "center" as const,
    backgroundColor: theme.colors.text,
  } as const,
  sampleAvatarText: {
    fontSize: 28,
    lineHeight: 32,
    fontWeight: "900" as const,
    color: theme.colors.background,
  } as const,
  sampleSignalBadge: {
    minHeight: 34,
    borderRadius: theme.radius.pill,
    flexDirection: "row" as const,
    alignItems: "center" as const,
    gap: theme.spacing.xxs,
    paddingHorizontal: theme.spacing.md,
    backgroundColor: theme.colors.text,
  } as const,
  sampleSignalText: {
    ...theme.typography.caption,
    color: theme.colors.background,
  } as const,
  sampleCardCopy: {
    gap: theme.spacing.xs,
  } as const,
  sampleName: {
    fontSize: 28,
    lineHeight: 32,
    fontWeight: "900" as const,
    color: theme.colors.text,
  } as const,
  sampleMeta: {
    ...theme.typography.body,
    color: theme.colors.muted,
  } as const,
  sampleStats: {
    flexDirection: "row" as const,
    gap: theme.spacing.xs,
  } as const,
  sampleStat: {
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
  sampleStatValue: {
    fontSize: 20,
    lineHeight: 24,
    fontWeight: "900" as const,
    color: theme.colors.text,
  } as const,
  sampleStatLabel: {
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
