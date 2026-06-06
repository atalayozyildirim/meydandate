import { useEffect, useState } from "react";
import { Alert, Pressable, StyleSheet, Text, View } from "react-native";
import { Redirect, useRouter } from "expo-router";
import { Controller, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { AuthScaffold } from "@/features/auth/components/AuthScaffold";
import { otpSchema, type OtpFormValues } from "@/features/auth/schemas/authSchemas";
import { useAuthStore } from "@/features/auth/stores/authStore";
import { Button } from "@/shared/components/Button";
import { Input } from "@/shared/components/Input";
import { testAccount } from "@/shared/constants/testAccount";
import { env } from "@/infrastructure/config/env";
import { formatOtpInput, formatPhoneNumberInput } from "@/shared/utils/phone";
import { useTheme } from "@/shared/theme";

const RESEND_SECONDS = 60;

export default function OtpScreen() {
  const router = useRouter();
  const theme = useTheme();
  const styles = createStyles(theme);
  const pendingOtp = useAuthStore((state) => state.pendingOtp);
  const verifyOtp = useAuthStore((state) => state.verifyOtp);
  const resendOtp = useAuthStore((state) => state.resendOtp);
  const clearPendingOtp = useAuthStore((state) => state.clearPendingOtp);
  const isSubmitting = useAuthStore((state) => state.isSubmitting);
  const [resendSeconds, setResendSeconds] = useState(RESEND_SECONDS);
  const form = useForm<OtpFormValues>({
    resolver: zodResolver(otpSchema),
    defaultValues: { token: "" },
  });
  const token = form.watch("token");

  useEffect(() => {
    if (resendSeconds <= 0) {
      return;
    }

    const timer = setInterval(() => {
      setResendSeconds((current) => Math.max(0, current - 1));
    }, 1000);

    return () => clearInterval(timer);
  }, [resendSeconds]);

  if (!pendingOtp) {
    return <Redirect href="/auth/login" />;
  }

  const onSubmit = form.handleSubmit(async (values) => {
    try {
      const purpose = pendingOtp.purpose;
      await verifyOtp(values.token);
      router.replace(purpose === "register" ? "/approval-test" : "/");
    } catch (error) {
      Alert.alert(
        "Kod doğrulanamadı",
        error instanceof Error ? error.message : "Tekrar deneyin.",
      );
    }
  });

  const resend = async () => {
    try {
      await resendOtp();
      setResendSeconds(RESEND_SECONDS);
      Alert.alert("Kod gönderildi", "Yeni doğrulama kodu telefonuna gönderildi.");
    } catch (error) {
      Alert.alert(
        "Kod gönderilemedi",
        error instanceof Error ? error.message : "Tekrar deneyin.",
      );
    }
  };

  const goBack = () => {
    clearPendingOtp();
    router.back();
  };

  return (
    <AuthScaffold
      title="Telefonunu doğrula"
      subtitle={`${formatPhoneNumberInput(pendingOtp.phoneNumber)} numarasına gönderilen 6 haneli kodu gir.`}
    >
      <Controller
        control={form.control}
        name="token"
        render={({ field, fieldState }) => (
          <Input
            label="Doğrulama kodu"
            keyboardType="number-pad"
            textContentType="oneTimeCode"
            autoComplete="sms-otp"
            autoFocus
            maxLength={7}
            placeholder="123 456"
            value={field.value}
            onBlur={field.onBlur}
            onChangeText={(value) => field.onChange(formatOtpInput(value))}
            error={fieldState.error?.message}
          />
        )}
      />

      {env.useMockServices ? (
        <View style={styles.demoCode}>
          <Text style={styles.demoCodeText}>Demo doğrulama kodu: {formatOtpInput(testAccount.otp)}</Text>
        </View>
      ) : null}

      <Button
        label="Telefonu doğrula"
        loading={isSubmitting}
        disabled={token.replace(/\D/g, "").length !== 6}
        onPress={onSubmit}
      />
      <Button
        label={resendSeconds > 0 ? `Tekrar gönder (${resendSeconds})` : "Kodu tekrar gönder"}
        variant="ghost"
        disabled={isSubmitting || resendSeconds > 0}
        onPress={() => void resend()}
      />
      <Pressable accessibilityRole="button" onPress={goBack}>
        <Text style={styles.backLink}>Telefon numarasını değiştir</Text>
      </Pressable>
    </AuthScaffold>
  );
}

const createStyles = (theme: ReturnType<typeof useTheme>) =>
  StyleSheet.create({
    demoCode: {
      borderRadius: theme.radius.md,
      padding: theme.spacing.sm,
      backgroundColor: theme.colors.elevated,
    },
    demoCodeText: {
      ...theme.typography.caption,
      color: theme.colors.text,
      textAlign: "center",
    },
    backLink: {
      ...theme.typography.caption,
      color: theme.colors.primary,
      textAlign: "center",
    },
  });
