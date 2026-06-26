import { View, Text } from "react-native";
import { Controller } from "react-hook-form";
import { useTheme } from "@/shared/theme";
import { OptionChip } from "@/shared/components/OptionChip";
import { interestOptions } from "@/shared/constants/options";
import type { OnboardingFormValues } from "../schemas/onboardingSchema";

interface InterestsStepProps {
  form: any; // Use proper type from react-hook-form
}

export const InterestsStep = ({ form }: InterestsStepProps) => {
  const theme = useTheme();
  const styles = createStyles(theme);

  return (
    <View style={styles.stepCard}>
      <Text style={styles.sectionTitle}>İlgi alanları</Text>
      <Text style={styles.description}>
        En az bir tane seç. Bunlar Keşfet kartlarında ortak sinyal üretir.
      </Text>
      <Controller
        control={form.control}
        name="interests"
        render={({ field, fieldState }) => (
          <>
            <View style={styles.chipWrap}>
              {interestOptions.map((option) => {
                const isSelected = field.value.includes(option.value);

                return (
                  <OptionChip
                    key={option.value}
                    label={option.label}
                    selected={isSelected}
                    onPress={() => {
                      field.onChange(
                        isSelected
                          ? field.value.filter(
                              (interest: string) => interest !== option.value,
                            )
                          : [...field.value, option.value],
                      );
                    }}
                  />
                );
              })}
            </View>
            {fieldState.error ? (
              <Text style={styles.error}>{fieldState.error.message}</Text>
            ) : null}
          </>
        )}
      />
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
  },
  sectionTitle: {
    ...theme.typography.subheading,
    color: theme.colors.text,
  },
  description: {
    ...theme.typography.body,
    color: theme.colors.muted,
  },
  chipWrap: {
    flexDirection: "row" as const,
    flexWrap: "wrap" as const,
    gap: theme.spacing.xs,
  },
  error: {
    ...theme.typography.caption,
    color: theme.colors.danger,
  },
});
