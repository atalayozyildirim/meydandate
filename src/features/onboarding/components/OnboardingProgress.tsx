import { StyleSheet, View } from "react-native";
import { useTheme } from "@/shared/theme";

interface OnboardingProgressProps {
  progress: number; // 0-1 arası değer
}

export const OnboardingProgress = ({ progress }: OnboardingProgressProps) => {
  const theme = useTheme();
  const styles = createStyles(theme);

  return (
    <View style={styles.progressTrack}>
      <View
        style={[
          styles.progressFill,
          { width: `${Math.max(8, Math.min(100, progress * 100))}%` },
        ]}
      />
    </View>
  );
};

const createStyles = (theme: ReturnType<typeof useTheme>) =>
  StyleSheet.create({
    progressTrack: {
      height: 7,
      borderRadius: theme.radius.pill,
      overflow: "hidden",
      backgroundColor: theme.isDark
        ? "rgba(255, 255, 255, 0.10)"
        : "rgba(0, 0, 0, 0.08)",
    },
    progressFill: {
      height: "100%",
      borderRadius: theme.radius.pill,
      backgroundColor: theme.colors.text,
    },
  });
