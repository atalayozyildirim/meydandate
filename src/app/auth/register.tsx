// Yeni kullanici kaydini baslatir ve onay testi akisine yonlendirir.
import { Alert, Pressable, StyleSheet, Text } from "react-native";
import { Link, useRouter } from "expo-router";
import { Controller, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { AuthScaffold } from "@/features/auth/components/AuthScaffold";
import { SocialAuthButtons } from "@/features/auth/components/SocialAuthButtons";
import type {
  RegisterPayload,
  SocialAuthProvider,
} from "@/domain/repositories/AuthRepository";
import {
  registerSchema,
  type RegisterFormValues,
} from "@/features/auth/schemas/authSchemas";
import { useAuthStore } from "@/features/auth/stores/authStore";
import { Button } from "@/shared/components/Button";
import { Input } from "@/shared/components/Input";
import { useTheme } from "@/shared/theme";

export default function RegisterScreen() {
  const router = useRouter();
  const theme = useTheme();
  const styles = createStyles(theme);
  const register = useAuthStore((state) => state.register);
  const socialLogin = useAuthStore((state) => state.socialLogin);
  const isSubmitting = useAuthStore((state) => state.isSubmitting);
  const form = useForm<RegisterFormValues>({
    resolver: zodResolver(registerSchema),
    defaultValues: {
      name: "",
      phoneNumber: "",
    },
  });

  const onSubmit = form.handleSubmit(async (values: RegisterFormValues) => {
    try {
      await register(values as unknown as RegisterPayload);
      router.replace("/approval-test");
    } catch (error) {
      Alert.alert(
        "Kayit basarisiz",
        error instanceof Error ? error.message : "Tekrar deneyin.",
      );
    }
  });

  const onSocialLogin = async (provider: SocialAuthProvider) => {
    try {
      await socialLogin(provider);
      router.replace("/");
    } catch (error) {
      Alert.alert(
        "Kayıt başarısız",
        error instanceof Error ? error.message : "Tekrar dene.",
      );
    }
  };

  return (
    <AuthScaffold title="Ehlibyte'e katil" subtitle="Yeni hesabını olustur.">
      <Controller
        control={form.control}
        name="name"
        render={({ field, fieldState }) => (
          <Input
            label="Isim"
            value={field.value}
            onBlur={field.onBlur}
            onChangeText={field.onChange}
            error={fieldState.error?.message}
          />
        )}
      />
      <Controller
        control={form.control}
        name="phoneNumber"
        render={({ field, fieldState }) => (
          <Input
            label="Telefon numarası"
            keyboardType="phone-pad"
            value={field.value}
            onBlur={field.onBlur}
            onChangeText={field.onChange}
            error={fieldState.error?.message}
          />
        )}
      />
      <Button
        label="Telefon ile kaydol"
        loading={isSubmitting}
        onPress={onSubmit}
      />
      <SocialAuthButtons
        disabled={isSubmitting}
        onPress={(provider) => void onSocialLogin(provider)}
      />
      <Link href="/auth/login" asChild>
        <Pressable>
          <Text style={styles.link}>Zaten hesabim var</Text>
        </Pressable>
      </Link>
    </AuthScaffold>
  );
}

const createStyles = (theme: ReturnType<typeof useTheme>) =>
  StyleSheet.create({
    link: {
      ...theme.typography.caption,
      color: theme.colors.primary,
      textAlign: "center",
    },
  });
