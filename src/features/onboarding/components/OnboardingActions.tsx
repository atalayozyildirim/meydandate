import { StyleSheet, View } from "react-native";
import { Button } from "@/shared/components/Button";
import { useTheme } from "@/shared/theme";

interface OnboardingActionsProps {
  onBack: () => void;
  onNext: () => void;
  backDisabled?: boolean;
  nextDisabled?: boolean;
  nextLoading?: boolean;
  nextLabel?: string;
}

export const OnboardingActions = ({
  onBack,
  onNext,
  backDisabled = false,
  nextDisabled = false,
  nextLoading = false,
  nextLabel = "İleri",
}: OnboardingActionsProps) => {
  const theme = useTheme();
  const styles = createStyles(theme);

  return (
    <View style={styles.actionRow}>
      <Button
        label="Geri"
        variant="ghost"
        disabled={backDisabled}
        onPress={onBack}
        style={styles.backButton}
      />
      <Button
        label={nextLabel}
        disabled={nextDisabled}
        loading={nextLoading}
        onPress={onNext}
        style={styles.nextButton}
      />
    </View>
  );
};

const createStyles = (theme: ReturnType<typeof useTheme>) =>
  StyleSheet.create({
    actionRow: {
      flexDirection: "row",
      gap: theme.spacing.sm,
      marginTop: theme.spacing.xs,
    },
    backButton: {
      flex: 0.42,
    },
    nextButton: {
      flex: 0.58,
    },
  });
