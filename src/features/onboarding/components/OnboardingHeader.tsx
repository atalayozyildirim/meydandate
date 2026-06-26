import { StyleSheet, Text, View } from "react-native";
import { useTheme } from "@/shared/theme";

interface OnboardingHeaderProps {
  currentStep: number;
  totalSteps: number;
}

export const OnboardingHeader = ({ currentStep, totalSteps }: OnboardingHeaderProps) => {
  const theme = useTheme();
  const styles = createStyles(theme);

  return (
    <View style={styles.topBar}>
      <View style={styles.brandMark}>
        <Text style={styles.brandLetter}>e</Text>
      </View>
      <View style={styles.topCopy}>
        <Text style={styles.kicker}>Ehlibyte onboarding</Text>
        <Text style={styles.topTitle}>Kartını kur</Text>
      </View>
      <View style={styles.stepCounter}>
        <Text style={styles.stepCounterText}>
          {currentStep}/{totalSteps}
        </Text>
      </View>
    </View>
  );
};

const createStyles = (theme: ReturnType<typeof useTheme>) =>
  StyleSheet.create({
    topBar: {
      flexDirection: "row",
      alignItems: "center",
      gap: theme.spacing.sm,
    },
    brandMark: {
      width: 42,
      height: 42,
      borderRadius: 15,
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: theme.colors.text,
    },
    brandLetter: {
      fontSize: 27,
      lineHeight: 30,
      fontWeight: "900",
      color: theme.colors.background,
    },
    topCopy: {
      flex: 1,
      gap: 1,
    },
    topTitle: {
      fontSize: 26,
      lineHeight: 30,
      fontWeight: "900",
      color: theme.colors.text,
    },
    kicker: {
      ...theme.typography.caption,
      color: theme.colors.primary,
      textTransform: "uppercase",
    },
    stepCounter: {
      minWidth: 58,
      minHeight: 34,
      borderRadius: theme.radius.pill,
      alignItems: "center",
      justifyContent: "center",
      paddingHorizontal: theme.spacing.sm,
      backgroundColor: theme.colors.elevated,
      borderWidth: 1,
      borderColor: theme.colors.border,
    },
    stepCounterText: {
      ...theme.typography.caption,
      color: theme.colors.text,
    },
  });
