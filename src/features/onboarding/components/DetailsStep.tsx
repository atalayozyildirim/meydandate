import { View } from "react-native";
import { Controller } from "react-hook-form";
import { useTheme } from "@/shared/theme";
import { Input } from "@/shared/components/Input";
import type { OnboardingFormValues } from "../schemas/onboardingSchema";

interface DetailsStepProps {
  form: any; // Use proper type from react-hook-form
}

export const DetailsStep = ({ form }: DetailsStepProps) => {
  const theme = useTheme();
  const styles = createStyles(theme);

  return (
    <View style={styles.stepCard}>
      <Controller
        control={form.control}
        name="bio"
        render={({ field, fieldState }) => (
          <Input
            label="Bio"
            multiline
            value={field.value}
            onChangeText={field.onChange}
            error={fieldState.error?.message}
          />
        )}
      />
      <Controller
        control={form.control}
        name="occupation"
        render={({ field }) => (
          <Input
            label="Meslek"
            value={field.value}
            onChangeText={field.onChange}
          />
        )}
      />
      <Controller
        control={form.control}
        name="hometown"
        render={({ field }) => (
          <Input
            label="Memleket"
            value={field.value}
            onChangeText={field.onChange}
          />
        )}
      />
      <Controller
        control={form.control}
        name="favoriteSong"
        render={({ field }) => (
          <Input
            label="Favori türkü"
            value={field.value}
            onChangeText={field.onChange}
          />
        )}
      />
      <Controller
        control={form.control}
        name="favoritePoet"
        render={({ field }) => (
          <Input
            label="Favori ozan"
            value={field.value}
            onChangeText={field.onChange}
          />
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
  } as const,
});
