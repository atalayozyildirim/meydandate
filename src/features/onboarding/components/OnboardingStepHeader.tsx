import { StyleSheet, Text, View } from "react-native";
import { useTheme } from "@/shared/theme";

interface OnboardingStepHeaderProps {
  eyebrow: string;
  title: string;
  description: string;
}

export const OnboardingStepHeader = ({ eyebrow, title, description }: OnboardingStepHeaderProps) => {
  const theme = useTheme();
  const styles = createStyles(theme);

  return (
    <View style={styles.lessonHeader}>
      <Text style={styles.kicker}>{eyebrow}</Text>
      <Text style={styles.title}>{title}</Text>
      <Text style={styles.description}>{description}</Text>
    </View>
  );
};

const createStyles = (theme: ReturnType<typeof useTheme>) =>
  StyleSheet.create({
    lessonHeader: {
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
    description: {
      ...theme.typography.body,
      color: theme.colors.muted,
    },
  });
