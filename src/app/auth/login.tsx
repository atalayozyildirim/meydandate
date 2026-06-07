// Kullanıcı giriş ekranını ve session başlatma akışını yönetir.
import { Alert, Pressable, StyleSheet, Text, View } from "react-native";
import { Link, useRouter } from "expo-router";
import { Controller, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { AuthScaffold } from "@/features/auth/components/AuthScaffold";
import { AuthLegalNotice } from "@/features/auth/components/AuthLegalNotice";
import { SocialAuthButtons } from "@/features/auth/components/SocialAuthButtons";
import type {
  LoginCredentials,
  SocialAuthProvider,
} from "@/domain/repositories/AuthRepository";
import {
  loginSchema,
  type LoginFormValues,
} from "@/features/auth/schemas/authSchemas";
import { useAuthStore } from "@/features/auth/stores/authStore";
import { Button } from "@/shared/components/Button";
import { Input } from "@/shared/components/Input";
import { formatPhoneNumberInput } from "@/shared/utils/phone";
import { useTheme } from "@/shared/theme";

export default function LoginScreen() {
  const router = useRouter();
  const theme = useTheme();
  const styles = createStyles(theme);
  const login = useAuthStore((state) => state.login);
  const socialLogin = useAuthStore((state) => state.socialLogin);
  const isSubmitting = useAuthStore((state) => state.isSubmitting);
  const form = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      phoneNumber: "",
    },
  });

  const onSubmit = form.handleSubmit(async (values: LoginFormValues) => {
    try {
      await login(values as unknown as LoginCredentials);
      router.push("/auth/otp");
    } catch (error) {
      Alert.alert(
        "Giriş başarısız",
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
        "Giriş başarısız",
        error instanceof Error ? error.message : "Tekrar deneyin.",
      );
    }
  };

  return (
    <AuthScaffold title="Hoş geldin" subtitle="Hesabına giriş yap.">
      <Controller
        control={form.control}
        name="phoneNumber"
        render={({ field, fieldState }) => (
          <Input
            label="Telefon numarası"
            keyboardType="phone-pad"
            textContentType="telephoneNumber"
            autoComplete="tel"
            maxLength={18}
            placeholder="Telefon numaranı gir"
            value={field.value}
            onBlur={field.onBlur}
            onChangeText={(value) => field.onChange(formatPhoneNumberInput(value))}
            error={fieldState.error?.message}
          />
        )}
      />
      <Button
        label="Doğrulama kodu gönder"
        loading={isSubmitting}
        onPress={onSubmit}
      />
      <SocialAuthButtons
        disabled={isSubmitting}
        onPress={(provider) => void onSocialLogin(provider)}
      />
      <AuthLegalNotice />
      <View style={styles.links}>
        <Link href="/auth/register" asChild>
          <Pressable>
            <Text style={styles.link}>Hesap oluştur</Text>
          </Pressable>
        </Link>
      </View>
    </AuthScaffold>
  );
}

const createStyles = (theme: ReturnType<typeof useTheme>) =>
  StyleSheet.create({
    links: {
      flexDirection: "row",
      justifyContent: "center",
      gap: theme.spacing.sm,
    },
    link: {
      ...theme.typography.caption,
      color: theme.colors.primary,
    },
  });
