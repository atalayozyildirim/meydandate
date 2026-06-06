// Profil duzenleme ekraninda form, fotograf secimi ve ilgi alani guncellemesi yapilir.
import { useEffect } from "react";
import { Alert, Image, StyleSheet, Text, View } from "react-native";
import { useRouter } from "expo-router";
import { Controller, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import type { UserProfileUpdate } from "@/domain/entities/User";
import { profileSchema, type ProfileFormValues } from "@/features/profile/schemas/profileSchema";
import { useProfile } from "@/features/profile/hooks/useProfile";
import { Button } from "@/shared/components/Button";
import { Input } from "@/shared/components/Input";
import { Loading } from "@/shared/components/Loading";
import { OptionChip } from "@/shared/components/OptionChip";
import { Screen } from "@/shared/components/Screen";
import { culturalIdentityOptions, cultureImportanceOptions, interestOptions } from "@/shared/constants/options";
import { useImagePicker } from "@/shared/hooks/useImagePicker";
import { useTheme } from "@/shared/theme";

const toProfileUpdate = (values: ProfileFormValues): UserProfileUpdate => {
  const update: UserProfileUpdate = {
    name: values.name,
    age: values.age,
    city: values.city,
    bio: values.bio,
    culturalIdentity: values.culturalIdentity,
    cultureImportance: values.cultureImportance,
    interests: values.interests
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
    update.photos = [{ id: "profile-photo-primary", uri: values.photoUri, isPrimary: true }];
  }

  return update;
};

export default function ProfileEditScreen() {
  const router = useRouter();
  const theme = useTheme();
  const styles = createStyles(theme);
  const imagePicker = useImagePicker();
  const { profile, isLoading, updateProfile, isUpdating } = useProfile();
  const form = useForm<ProfileFormValues>({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      name: "",
      age: 18,
      city: "",
      occupation: "",
      bio: "",
      hometown: "",
      favoriteSong: "",
      favoritePoet: "",
      culturalIdentity: "prefer_not_to_say",
      cultureImportance: "somewhat_important",
      interests: [],
      photoUri: ""
    }
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
      photoUri: profile.photos[0]?.uri ?? ""
    });
  }, [form, profile]);

  if (isLoading || !profile) {
    return <Loading label="Profil formu hazirlaniyor" />;
  }

  const onSubmit = form.handleSubmit(async (values) => {
    try {
      await updateProfile(toProfileUpdate(values));
      router.back();
    } catch (error) {
      Alert.alert("Profil guncellenemedi", error instanceof Error ? error.message : "Tekrar deneyin.");
    }
  });

  return (
    <Screen>
      <View style={styles.header}>
        <Text style={styles.kicker}>Profile</Text>
        <Text style={styles.title}>Profili duzenle</Text>
      </View>
      <Controller
        control={form.control}
        name="photoUri"
        render={({ field }) => (
          <View style={styles.photoSection}>
            {selectedPhotoUri ? <Image source={{ uri: selectedPhotoUri }} style={styles.photo} /> : null}
            <Button
              label="Fotografi degistir"
              variant="secondary"
              loading={imagePicker.isPicking}
              onPress={async () => {
                const uri = await imagePicker.pickImage();

                if (uri) {
                  field.onChange(uri);
                }
              }}
            />
          </View>
        )}
      />
      <Controller
        control={form.control}
        name="name"
        render={({ field, fieldState }) => (
          <Input label="Isim" value={field.value} onChangeText={field.onChange} error={fieldState.error?.message} />
        )}
      />
      <Controller
        control={form.control}
        name="age"
        render={({ field, fieldState }) => (
          <Input
            label="Yas"
            keyboardType="number-pad"
            value={String(field.value)}
            onChangeText={(value) => field.onChange(Number(value))}
            error={fieldState.error?.message}
          />
        )}
      />
      <Controller
        control={form.control}
        name="city"
        render={({ field, fieldState }) => (
          <Input label="Sehir" value={field.value} onChangeText={field.onChange} error={fieldState.error?.message} />
        )}
      />
      <Controller
        control={form.control}
        name="occupation"
        render={({ field }) => <Input label="Meslek" value={field.value} onChangeText={field.onChange} />}
      />
      <Controller
        control={form.control}
        name="bio"
        render={({ field, fieldState }) => (
          <Input label="Bio" multiline value={field.value} onChangeText={field.onChange} error={fieldState.error?.message} />
        )}
      />
      <Controller
        control={form.control}
        name="hometown"
        render={({ field }) => <Input label="Memleket" value={field.value} onChangeText={field.onChange} />}
      />
      <Controller
        control={form.control}
        name="favoriteSong"
        render={({ field }) => <Input label="Favori turku" value={field.value} onChangeText={field.onChange} />}
      />
      <Controller
        control={form.control}
        name="favoritePoet"
        render={({ field }) => <Input label="Favori ozan" value={field.value} onChangeText={field.onChange} />}
      />

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Kulturel beyan</Text>
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
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Ilgi alanlari</Text>
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
                            ? field.value.filter((interest) => interest !== option.value)
                            : [...field.value, option.value]
                        )
                      }
                    />
                  );
                })}
              </View>
              {fieldState.error ? <Text style={styles.error}>{fieldState.error.message}</Text> : null}
            </>
          )}
        />
      </View>

      <Button label="Kaydet" loading={isUpdating} onPress={onSubmit} />
    </Screen>
  );
}

const createStyles = (theme: ReturnType<typeof useTheme>) =>
  StyleSheet.create({
    header: {
      gap: theme.spacing.xs,
      marginBottom: theme.spacing.lg
    },
    kicker: {
      ...theme.typography.caption,
      color: theme.colors.primary,
      textTransform: "uppercase"
    },
    title: {
      ...theme.typography.title,
      color: theme.colors.text
    },
    photoSection: {
      gap: theme.spacing.sm,
      marginBottom: theme.spacing.md
    },
    photo: {
      width: "100%",
      height: 260,
      borderRadius: theme.radius.md,
      backgroundColor: theme.colors.elevated
    },
    section: {
      gap: theme.spacing.sm,
      marginTop: theme.spacing.md,
      marginBottom: theme.spacing.md
    },
    sectionTitle: {
      ...theme.typography.subheading,
      color: theme.colors.text
    },
    chipWrap: {
      flexDirection: "row",
      flexWrap: "wrap",
      gap: theme.spacing.xs
    },
    error: {
      ...theme.typography.caption,
      color: theme.colors.danger
    }
  });
