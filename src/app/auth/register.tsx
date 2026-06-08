// Yeni kullanıcı kaydını başlatır ve onay testi akışına yönlendirir.
import { useState } from "react";
import { Alert, Pressable, StyleSheet, Text } from "react-native";
import { Link, useRouter } from "expo-router";
import { Controller, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { AuthScaffold } from "@/features/auth/components/AuthScaffold";
import { AuthLegalNotice } from "@/features/auth/components/AuthLegalNotice";
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
import { formatAuthErrorMessage } from "@/features/auth/utils/authErrorMessages";
import { Button } from "@/shared/components/Button";
import { Input } from "@/shared/components/Input";
import { formatPhoneNumberInput } from "@/shared/utils/phone";
import { useTheme } from "@/shared/theme";

export default function RegisterScreen() {
  const router = useRouter();
  const theme = useTheme();
  const styles = createStyles(theme);
  const register = useAuthStore((state) => state.register);
  const socialLogin = useAuthStore((state) => state.socialLogin);
  const isSubmitting = useAuthStore((state) => state.isSubmitting);
  const [acceptedLegal, setAcceptedLegal] = useState(false);
  const form = useForm<RegisterFormValues>({
    resolver: zodResolver(registerSchema),
    defaultValues: {
      name: "",
      phoneNumber: "",
    },
  });

  const onSubmit = form.handleSubmit(async (values: RegisterFormValues) => {
    if (!acceptedLegal) {
      Alert.alert("Sözleşme onayı gerekli", "Devam etmek için hukuki belgeleri kabul etmelisin.");
      return;
    }

    try {
      await register(values as unknown as RegisterPayload);
      router.push("/auth/otp");
    } catch (error) {
      Alert.alert(
        "Kayıt başarısız",
        formatAuthErrorMessage(error),
      );
    }
  });

  const onSocialLogin = async (provider: SocialAuthProvider) => {
    if (!acceptedLegal) {
      Alert.alert("Sözleşme onayı gerekli", "Devam etmek için hukuki belgeleri kabul etmelisin.");
      return;
    }

    try {
      await socialLogin(provider);
      router.replace("/");
    } catch (error) {
      Alert.alert(
        "Kayıt başarısız",
        formatAuthErrorMessage(error, provider),
      );
    }
  };

  return (
    <AuthScaffold title="Ehlibyte'e katıl" subtitle="Yeni hesabını oluştur.">
      <Controller
        control={form.control}
        name="name"
        render={({ field, fieldState }) => (
          <Input
            label="İsim"
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
      <AuthLegalNotice
        accepted={acceptedLegal}
        requireAcceptance
        onToggleAccepted={() => setAcceptedLegal((current) => !current)}
      />
      <Link href="/auth/login" asChild>
        <Pressable>
          <Text style={styles.link}>Zaten hesabım var</Text>
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
