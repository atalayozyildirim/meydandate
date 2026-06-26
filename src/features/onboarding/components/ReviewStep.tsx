import { View, Text, Image } from "react-native";
import { useTheme } from "@/shared/theme";
import {
  culturalIdentityOptions,
  cultureImportanceOptions,
} from "@/shared/constants/options";
import type { OnboardingFormValues } from "../schemas/onboardingSchema";

interface ReviewStepProps {
  formValues: OnboardingFormValues;
  selectedPhotoUri: string;
}

export const ReviewStep = ({ formValues, selectedPhotoUri }: ReviewStepProps) => {
  const theme = useTheme();
  const styles = createStyles(theme);

  const culturalIdentityLabel =
    culturalIdentityOptions.find(
      (option) => option.value === formValues.culturalIdentity,
    )?.label ?? "Seçilmedi";
  const cultureImportanceLabel =
    cultureImportanceOptions.find(
      (option) => option.value === formValues.cultureImportance,
    )?.label ?? "Seçilmedi";

  return (
    <View style={styles.stepCard}>
      <View style={styles.reviewHeader}>
        {selectedPhotoUri ? (
          <Image
            source={{ uri: selectedPhotoUri }}
            style={styles.reviewPhoto}
          />
        ) : (
          <View style={styles.reviewPhotoPlaceholder}>
            <Text style={styles.reviewPhotoInitial}>
              {(formValues.name || "E")
                .charAt(0)
                .toLocaleUpperCase("tr-TR")}
            </Text>
          </View>
        )}
        <View style={styles.reviewIdentity}>
          <Text style={styles.reviewName}>
            {formValues.name || "İsimsiz profil"}
            {formValues.age ? `, ${formValues.age}` : ""}
          </Text>
          <Text style={styles.description}>
            {formValues.city || "Şehir eklenmedi"}
          </Text>
        </View>
      </View>
      <View style={styles.reviewRow}>
        <Text style={styles.reviewLabel}>Kültür</Text>
        <Text style={styles.reviewValue}>{culturalIdentityLabel}</Text>
      </View>
      <View style={styles.reviewRow}>
        <Text style={styles.reviewLabel}>Önem</Text>
        <Text style={styles.reviewValue}>{cultureImportanceLabel}</Text>
      </View>
      <View style={styles.reviewRow}>
        <Text style={styles.reviewLabel}>İlgi alanı</Text>
        <Text style={styles.reviewValue}>
          {formValues.interests.length} seçim
        </Text>
      </View>
      <View style={styles.reviewBio}>
        <Text style={styles.reviewLabel}>Bio</Text>
        <Text style={styles.reviewBioText}>
          {formValues.bio || "Bio eklenmedi."}
        </Text>
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
  reviewHeader: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    gap: theme.spacing.md,
  } as const,
  reviewPhoto: {
    width: 74,
    height: 74,
    borderRadius: 26,
    backgroundColor: theme.colors.elevated,
  } as const,
  reviewPhotoPlaceholder: {
    width: 74,
    height: 74,
    borderRadius: 26,
    alignItems: "center" as const,
    justifyContent: "center" as const,
    backgroundColor: theme.colors.primary,
  } as const,
  reviewPhotoInitial: {
    fontSize: 28,
    lineHeight: 32,
    fontWeight: "900" as const,
    color: theme.colors.onPrimary,
  } as const,
  reviewIdentity: {
    flex: 1,
    gap: theme.spacing.xxs,
  } as const,
  reviewName: {
    ...theme.typography.heading,
    color: theme.colors.text,
  } as const,
  description: {
    ...theme.typography.body,
    color: theme.colors.muted,
  } as const,
  reviewRow: {
    minHeight: 48,
    borderRadius: 16,
    flexDirection: "row" as const,
    alignItems: "center" as const,
    justifyContent: "space-between" as const,
    gap: theme.spacing.md,
    paddingHorizontal: theme.spacing.md,
    backgroundColor: theme.colors.elevated,
  } as const,
  reviewLabel: {
    ...theme.typography.caption,
    color: theme.colors.muted,
    textTransform: "uppercase" as const,
  } as const,
  reviewValue: {
    ...theme.typography.caption,
    maxWidth: "58%",
    color: theme.colors.text,
    textAlign: "right" as const,
  } as const,
  reviewBio: {
    gap: theme.spacing.xs,
    borderRadius: 18,
    padding: theme.spacing.md,
    backgroundColor: theme.colors.elevated,
  } as const,
  reviewBioText: {
    ...theme.typography.body,
    color: theme.colors.text,
  } as const,
});
