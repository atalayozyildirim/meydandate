import { View, Image, Text } from "react-native";
import { useState } from "react";
import { Controller } from "react-hook-form";
import { Ionicons } from "@expo/vector-icons";
import { useTheme } from "@/shared/theme";
import { Button } from "@/shared/components/Button";
import { Input } from "@/shared/components/Input";
import { usePhotoUpload } from "@/shared/hooks/usePhotoUpload";
import { useAuthStore } from "@/features/auth/stores/authStore";
import type { OnboardingFormValues } from "../schemas/onboardingSchema";

interface ProfileStepProps {
  form: any; // Use proper type from react-hook-form
  selectedPhotoUri: string;
  imagePicker: {
    isPicking: boolean;
    pickImageAsset: (options?: {
      allowsEditing?: boolean;
      aspect?: [number, number];
      base64?: boolean;
      quality?: number;
    }) => Promise<{ uri: string; mimeType?: string } | null>;
  };
}

export const ProfileStep = ({ form, selectedPhotoUri, imagePicker }: ProfileStepProps) => {
  const theme = useTheme();
  const styles = createStyles(theme);
  const photoUpload = usePhotoUpload();
  const currentUser = useAuthStore((state) => state.currentUser);
  const [isUploadingPhoto, setIsUploadingPhoto] = useState(false);

  return (
    <View style={styles.stepCard}>
      <Controller
        control={form.control}
        name="photoUri"
        render={({ field }) => (
          <View style={styles.photoRow}>
            {selectedPhotoUri ? (
              <Image
                source={{ uri: selectedPhotoUri }}
                style={styles.previewPhoto}
              />
            ) : (
              <View style={styles.emptyPhoto}>
                <Ionicons
                  name="person-add-outline"
                  size={28}
                  color={theme.colors.muted}
                />
                <Text style={styles.emptyPhotoText}>
                  Profil fotoğrafı ekleyebilirsin
                </Text>
              </View>
            )}
            <Button
              label={
                selectedPhotoUri ? "Fotoğrafı değiştir" : "Fotoğraf yükle"
              }
              variant="secondary"
              loading={imagePicker.isPicking || isUploadingPhoto}
              onPress={async () => {
                const asset = await imagePicker.pickImageAsset();

                if (!asset?.uri) {
                  return;
                }

                const previousUri = field.value ?? "";
                field.onChange(asset.uri);

                if (!currentUser) {
                  return;
                }

                setIsUploadingPhoto(true);
                const publicUrl = await photoUpload.uploadPhoto({
                  userId: currentUser.id,
                  fileUri: asset.uri,
                  contentType: asset.mimeType,
                });
                setIsUploadingPhoto(false);

                if (publicUrl) {
                  field.onChange(publicUrl);
                  return;
                }

                field.onChange(previousUri);
              }}
            />
          </View>
        )}
      />
      <Controller
        control={form.control}
        name="name"
        render={({ field, fieldState }) => (
          <Input
            label="İsim"
            value={field.value}
            onChangeText={field.onChange}
            error={fieldState.error?.message}
          />
        )}
      />
      <View style={styles.twoColumn}>
        <View style={styles.twoColumnItem}>
          <Controller
            control={form.control}
            name="age"
            render={({ field, fieldState }) => (
              <Input
                label="Yaş"
                keyboardType="number-pad"
                value={field.value ? String(field.value) : ""}
                onChangeText={(value) => field.onChange(Number(value))}
                error={fieldState.error?.message}
              />
            )}
          />
        </View>
        <View style={styles.twoColumnItem}>
          <Controller
            control={form.control}
            name="city"
            render={({ field, fieldState }) => (
              <Input
                label="Şehir"
                value={field.value}
                onChangeText={field.onChange}
                error={fieldState.error?.message}
              />
            )}
          />
        </View>
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
  photoRow: {
    gap: theme.spacing.sm,
  } as const,
  emptyPhoto: {
    minHeight: 150,
    borderRadius: 22,
    alignItems: "center" as const,
    justifyContent: "center" as const,
    gap: theme.spacing.xs,
    backgroundColor: theme.colors.elevated,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderStyle: "dashed" as const,
  } as const,
  emptyPhotoText: {
    ...theme.typography.caption,
    color: theme.colors.muted,
  } as const,
  previewPhoto: {
    width: "100%",
    height: 220,
    borderRadius: theme.radius.md,
    backgroundColor: theme.colors.elevated,
  } as const,
  twoColumn: {
    flexDirection: "row" as const,
    gap: theme.spacing.sm,
  } as const,
  twoColumnItem: {
    flex: 1,
  } as const,
});
