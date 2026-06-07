// Telefonla giris yardimi ekranini sunar.
import { Alert, Pressable, StyleSheet, Text } from "react-native";
import { Link } from "expo-router";
import { Controller, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { AuthScaffold } from "@/features/auth/components/AuthScaffold";
import {
  forgotPasswordSchema,
  type ForgotPasswordFormValues,
} from "@/features/auth/schemas/authSchemas";
import { Button } from "@/shared/components/Button";
import { Input } from "@/shared/components/Input";
import { formatPhoneNumberInput } from "@/shared/utils/phone";
import { useTheme } from "@/shared/theme";

export default function ForgotPasswordScreen() {
  const theme = useTheme();
  const styles = createStyles(theme);
  const form = useForm<ForgotPasswordFormValues>({
    resolver: zodResolver(forgotPasswordSchema),
    defaultValues: {
      phoneNumber: "",
    },
  });

  const onSubmit = form.handleSubmit(async () => {
    Alert.alert(
      "Yardım talebi alındı",
      "Telefon doğrulama desteği için yönlendirme hazırlanacak.",
    );
  });

  return (
    <AuthScaffold
      title="Giriş yardımı"
      subtitle="Telefon numaranı gir, doğrulama adımlarını kontrol edelim."
    >
      <Controller
        control={form.control}
        name="phoneNumber"
        render={({ field, fieldState }) => (
          <Input
            label="Telefon numarasi"
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
      <Button label="Yardim al" onPress={onSubmit} />
      <Link href="/auth/login" asChild>
        <Pressable>
          <Text style={styles.link}>Girişe dön</Text>
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
