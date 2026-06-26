// Profil düzenleme ekranında form, fotoğraf seçimi ve ilgi alanı güncellemesi yapılır.
import { useEffect, useRef, useState } from "react";
import { Alert, Image, Pressable, StyleSheet, Text, View } from "react-native";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { Controller, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import type { ProfilePromptAnswer, UserProfileUpdate } from "@/domain/entities/User";
import { useAuthStore } from "@/features/auth/stores/authStore";
import { isPermanentBanError } from "@/features/moderation/utils/permanentBan";
import {
  profileSchema,
  type ProfileFormValues,
} from "@/features/profile/schemas/profileSchema";
import { useProfile } from "@/features/profile/hooks/useProfile";
import { Button } from "@/shared/components/Button";
import { Card } from "@/shared/components/Card";
import { Input } from "@/shared/components/Input";
import { Loading } from "@/shared/components/Loading";
import { OptionChip } from "@/shared/components/OptionChip";
import { Screen } from "@/shared/components/Screen";
import {
  culturalIdentityOptions,
  cultureImportanceOptions,
  interestOptions,
  profilePromptOptions,
} from "@/shared/constants/options";
import { useImagePicker } from "@/shared/hooks/useImagePicker";
import { usePhotoUpload } from "@/shared/hooks/usePhotoUpload";
import { useTheme } from "@/shared/theme";

const getProfilePromptDefaults = (
  currentPrompts: ProfilePromptAnswer[] = [],
): ProfilePromptAnswer[] =>
  profilePromptOptions.map((prompt) => {
    const existing = currentPrompts.find(
      (candidate) => candidate.questionId === prompt.questionId,
    );

    return {
      questionId: prompt.questionId,
      question: prompt.question,
      answer: existing?.answer ?? "",
    };
  });

const toProfileUpdate = (values: ProfileFormValues): UserProfileUpdate => {
  const profilePrompts: ProfilePromptAnswer[] = values.profilePrompts.flatMap(
    (prompt) => {
      const questionId = prompt.questionId ?? "";
      const question = prompt.question ?? "";
      const answer = prompt.answer?.trim() ?? "";

      if (!questionId || !question || !answer) {
        return [];
      }

      return [{ questionId, question, answer }];
    },
  );
  const update: UserProfileUpdate = {
    name: values.name,
    age: values.age,
    city: values.city,
    bio: values.bio,
    culturalIdentity: values.culturalIdentity,
    cultureImportance: values.cultureImportance,
    interests: values.interests,
    profilePrompts,
  };

  if (values.occupation) {
    update.occupation = values.occupation;
  }

  if (values.hometown) {
    update.hometown = values.hometown;
  }

  if (values.favoriteSong) {
    update.favoriteSong = values.favoriteSong;
  }

  if (values.favoritePoet) {
    update.favoritePoet = values.favoritePoet;
  }

  if (values.photoUri) {
    update.photos = [
      { id: "profile-photo-primary", uri: values.photoUri, isPrimary: true },
    ];
  }

  return update;
};

export default function ProfileEditScreen() {
  const router = useRouter();
  const theme = useTheme();
  const styles = createStyles(theme);
  const imagePicker = useImagePicker();
  const photoUpload = usePhotoUpload();
  const { profile, isLoading, updateProfile, isUpdating } = useProfile();
  const applyPermanentBan = useAuthStore((state) => state.applyPermanentBan);
  const currentUser = useAuthStore((state) => state.currentUser);
  const hasUnsavedChanges = useRef(false);
  const [isUploadingPhoto, setIsUploadingPhoto] = useState(false);
  const form = useForm<ProfileFormValues>({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      name: "",
      age: undefined,
      city: "",
      occupation: "",
      bio: "",
      hometown: "",
      favoriteSong: "",
      favoritePoet: "",
      culturalIdentity: "prefer_not_to_say",
      cultureImportance: "somewhat_important",
      interests: [],
      profilePrompts: getProfilePromptDefaults(),
      photoUri: "",
    },
  });
  const selectedPhotoUri = form.watch("photoUri");

  useEffect(() => {
    if (!profile) {
      return;
    }

    form.reset({
      name: profile.name,
      age: profile.age,
      city: profile.city,
      occupation: profile.occupation ?? "",
      bio: profile.bio,
      hometown: profile.hometown ?? "",
      favoriteSong: profile.favoriteSong ?? "",
      favoritePoet: profile.favoritePoet ?? "",
      culturalIdentity: profile.culturalIdentity,
      cultureImportance: profile.cultureImportance,
      interests: profile.interests,
      profilePrompts: getProfilePromptDefaults(profile.profilePrompts),
      photoUri: profile.photos[0]?.uri ?? "",
    });
    hasUnsavedChanges.current = false;
  }, [form, profile]);

  // Form değişikliklerini takip et
  useEffect(() => {
    const subscription = form.watch(() => {
      hasUnsavedChanges.current = true;
    });
    return () => subscription.unsubscribe();
  }, [form]);

  // Kaydedilmemiş değişiklik varsa kullanıcıyı uyar
  const handleBack = () => {
    if (hasUnsavedChanges.current) {
      Alert.alert(
        "Kaydedilmemiş değişiklikler",
        "Yaptığın değişiklikleri kaydetmeden çıkacaksın. Devam etmek istiyor musun?",
        [
          {
            text: "İptal",
            style: "cancel",
          },
          {
            text: "Çık",
            style: "destructive",
            onPress: () => router.back(),
          },
        ],
      );
    } else {
      router.back();
    }
  };

  if (isLoading || !profile) {
    return <Loading label="Profil formu hazırlanıyor" />;
  }

  const onSubmit = form.handleSubmit(async (values) => {
    try {
      await updateProfile(toProfileUpdate(values));
      hasUnsavedChanges.current = false;
      router.back();
    } catch (error) {
      if (isPermanentBanError(error)) {
        Alert.alert(
          "Kalıcı ban",
          error instanceof Error
            ? error.message
            : "Ağır güvenlik ihlali nedeniyle hesap kalıcı olarak banlandı.",
          [
            {
              text: "Tamam",
              style: "destructive",
              onPress: () => void applyPermanentBan(),
            },
          ],
          { cancelable: false },
        );
        return;
      }

      Alert.alert(
        "Profil güncellenemedi",
        error instanceof Error ? error.message : "Tekrar deneyin.",
      );
    }
  });

  return (
    <Screen style={styles.screen}>
      <View style={styles.header}>
        <Pressable
          accessibilityRole="button"
          onPress={handleBack}
          style={styles.backButton}
        >
          <Ionicons name="chevron-back" size={23} color={theme.colors.text} />
        </Pressable>
        <View style={styles.headerText}>
          <Text style={styles.kicker}>Profil</Text>
          <Text style={styles.title}>Profili düzenle</Text>
        </View>
        <Button
          label="Kaydet"
          loading={isUpdating}
          style={styles.headerSaveButton}
          onPress={onSubmit}
        />
      </View>

      <Card style={styles.photoCard}>
        <Controller
          control={form.control}
          name="photoUri"
          render={({ field }) => (
            <>
              {selectedPhotoUri ? (
                <Image
                  source={{ uri: selectedPhotoUri }}
                  style={styles.photo}
                />
              ) : (
                <View style={styles.photoFallback}>
                  <Ionicons name="person" size={30} color="#FFFFFF" />
                </View>
              )}
              <View style={styles.photoText}>
                <Text style={styles.sectionTitle}>Profil fotoğrafı</Text>
                <Text style={styles.helperText}>
                  Net ve güncel bir fotoğraf seç.
                </Text>
              </View>
              <Button
                label="Değiştir"
                variant="ghost"
                style={styles.photoButton}
                loading={imagePicker.isPicking || isUploadingPhoto}
                icon={
                  <Ionicons
                    name="image-outline"
                    size={18}
                    color={theme.colors.primary}
                  />
                }
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

                    try {
                      await updateProfile({
                        photos: [
                          {
                            id: "profile-photo-primary",
                            uri: publicUrl,
                            isPrimary: true,
                          },
                        ],
                      });
                    } catch (error) {
                      field.onChange(previousUri);
                      Alert.alert(
                        "Profil fotoğrafı kaydedilemedi",
                        error instanceof Error ? error.message : "Tekrar deneyin.",
                      );
                    }
                    return;
                  }

                  field.onChange(previousUri);
                }}
              />
            </>
          )}
        />
      </Card>

      <Card style={styles.section}>
        <Text style={styles.sectionTitle}>Temel bilgiler</Text>
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
          <View style={styles.column}>
            <Controller
              control={form.control}
              name="age"
              render={({ field, fieldState }) => (
                <Input
                  label="Yaş"
                  keyboardType="number-pad"
                  value={String(field.value)}
                  onChangeText={(value) => field.onChange(Number(value))}
                  error={fieldState.error?.message}
                />
              )}
            />
          </View>
          <View style={styles.column}>
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
          name="bio"
          render={({ field, fieldState }) => (
            <Input
              label="Bio"
              value={field.value}
              onChangeText={field.onChange}
              error={fieldState.error?.message}
            />
          )}
        />
      </Card>

      <Card style={styles.section}>
        <Text style={styles.sectionTitle}>Kişisel detaylar</Text>
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
      </Card>

      <Card style={styles.section}>
        <View style={styles.sectionHeading}>
          <Text style={styles.sectionTitle}>Profil soruları</Text>
          <Text style={styles.helperText}>Keşfet kartında sohbet başlatan cevaplar.</Text>
        </View>
        {profilePromptOptions.map((prompt, index) => (
          <Controller
            key={prompt.questionId}
            control={form.control}
            name={`profilePrompts.${index}.answer`}
            render={({ field, fieldState }) => (
              <Input
                label={prompt.question}
                value={field.value}
                onChangeText={field.onChange}
                maxLength={220}
                multiline
                style={styles.multilineInput}
                error={fieldState.error?.message}
              />
            )}
          />
        ))}
      </Card>

      <Card style={styles.section}>
        <Text style={styles.sectionTitle}>Kültürel beyan</Text>
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
      </Card>

      <Card style={styles.section}>
        <Text style={styles.sectionTitle}>İlgi alanları</Text>
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
                      onPress={() =>
                        field.onChange(
                          isSelected
                            ? field.value.filter(
                                (interest) => interest !== option.value,
                              )
                            : [...field.value, option.value],
                        )
                      }
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
      </Card>
    </Screen>
  );
}

const createStyles = (theme: ReturnType<typeof useTheme>) =>
  StyleSheet.create({
    screen: {
      gap: theme.spacing.md,
      paddingHorizontal: theme.spacing.md,
      paddingTop: theme.spacing.sm,
    },
    header: {
      flexDirection: "row",
      alignItems: "center",
      gap: theme.spacing.xs,
      marginBottom: theme.spacing.xs,
    },
    backButton: {
      width: 42,
      height: 42,
      borderRadius: theme.radius.pill,
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: theme.colors.elevated,
    },
    headerText: {
      flex: 1,
      gap: theme.spacing.xxs,
    },
    headerSaveButton: {
      minHeight: 36,
      paddingHorizontal: theme.spacing.md,
    },
    kicker: {
      ...theme.typography.caption,
      color: theme.colors.primary,
      textTransform: "uppercase",
    },
    title: {
      ...theme.typography.heading,
      color: theme.colors.text,
    },
    photoCard: {
      flexDirection: "row",
      alignItems: "center",
      gap: theme.spacing.sm,
    },
    photo: {
      width: 72,
      height: 72,
      borderRadius: theme.radius.pill,
      backgroundColor: theme.colors.elevated,
    },
    photoFallback: {
      width: 72,
      height: 72,
      borderRadius: theme.radius.pill,
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: theme.colors.primary,
    },
    photoText: {
      flex: 1,
      gap: theme.spacing.xxs,
    },
    helperText: {
      ...theme.typography.caption,
      color: theme.colors.muted,
    },
    photoButton: {
      minHeight: 42,
      paddingHorizontal: theme.spacing.sm,
    },
    section: {
      gap: theme.spacing.sm,
    },
    sectionHeading: {
      gap: theme.spacing.xxs,
    },
    sectionTitle: {
      ...theme.typography.subheading,
      color: theme.colors.text,
    },
    chipWrap: {
      flexDirection: "row",
      flexWrap: "wrap",
      gap: theme.spacing.xs,
    },
    twoColumn: {
      flexDirection: "row",
      gap: theme.spacing.sm,
    },
    column: {
      flex: 1,
    },
    multilineInput: {
      minHeight: 92,
      borderRadius: theme.radius.lg,
      paddingTop: theme.spacing.sm,
      textAlignVertical: "top",
    },
    error: {
      ...theme.typography.caption,
      color: theme.colors.danger,
    },
  });
