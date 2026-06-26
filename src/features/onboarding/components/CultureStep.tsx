import { View, Text } from "react-native";
import { Controller } from "react-hook-form";
import { useTheme } from "@/shared/theme";
import { OptionChip } from "@/shared/components/OptionChip";
import {
  culturalIdentityOptions,
  cultureImportanceOptions,
} from "@/shared/constants/options";
import type { OnboardingFormValues } from "../schemas/onboardingSchema";

interface CultureStepProps {
  form: any; // Use proper type from react-hook-form
}

export const CultureStep = ({ form }: CultureStepProps) => {
  const theme = useTheme();
  const styles = createStyles(theme);

  return (
    <View style={styles.stepCard}>
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>
          Kültürel yakınlığını nasıl anlatırsın?
        </Text>
        <Controller
          control={form.control}
          name="culturalIdentity"
          render={({ field }) => (
            <View style={styles.chipWrap}>
              {culturalIdentityOptions.map((option) => (
                <OptionChip
                  key={option.value}
                  label={option.label}
                  selected={field.value === option.value}
                  onPress={() => field.onChange(option.value)}
                />
              ))}
            </View>
          )}
        />
      </View>
      <View style={styles.sectionLast}>
        <Text style={styles.sectionTitle}>
          Bu kültür hayatında ne kadar önemli?
        </Text>
        <Controller
          control={form.control}
          name="cultureImportance"
          render={({ field }) => (
            <View style={styles.chipWrap}>
              {cultureImportanceOptions.map((option) => (
                <OptionChip
                  key={option.value}
                  label={option.label}
                  selected={field.value === option.value}
                  onPress={() => field.onChange(option.value)}
                />
              ))}
            </View>
          )}
        />
      </View>
    </View>
  );
};

const createStyles = (theme: ReturnType<typeof useTheme>) => ({
  stepCard: {
    gap: theme.spacing.md,
    borderRadius: 24,
    padding: theme.spacing.lg,
    marginBottom: theme.spacing.lg,
    backgroundColor: theme.isDark ? "#050505" : theme.colors.surface,
    borderWidth: 1,
    borderColor: theme.isDark
      ? "rgba(255, 255, 255, 0.12)"
      : "rgba(0, 0, 0, 0.10)",
  } as const,
  section: {
    gap: theme.spacing.sm,
    marginBottom: theme.spacing.lg,
  } as const,
  sectionLast: {
    gap: theme.spacing.sm,
  } as const,
  sectionTitle: {
    ...theme.typography.subheading,
    color: theme.colors.text,
  } as const,
  chipWrap: {
    flexDirection: "row" as const,
    flexWrap: "wrap" as const,
    gap: theme.spacing.xs,
  } as const,
});
