// Google/Apple OAuth deep link dönüşünde Supabase session'ını tamamlar.
import { useEffect, useMemo, useState } from "react";
import { StyleSheet, Text, View } from "react-native";
import * as Linking from "expo-linking";
import { useLocalSearchParams, useRouter } from "expo-router";
import { Button } from "@/shared/components/Button";
import { Loading } from "@/shared/components/Loading";
import { Screen } from "@/shared/components/Screen";
import { useAuthStore } from "@/features/auth/stores/authStore";
import { formatAuthErrorMessage } from "@/features/auth/utils/authErrorMessages";
import { useTheme } from "@/shared/theme";

const buildCallbackUrlFromParams = (params: Record<string, string | string[]>) => {
  const searchParams = new URLSearchParams();

  Object.entries(params).forEach(([key, value]) => {
    if (Array.isArray(value)) {
      value.forEach((item) => searchParams.append(key, item));
      return;
    }

    if (value) {
      searchParams.set(key, value);
    }
  });

  const queryString = searchParams.toString();
  return `${Linking.createURL("auth/callback")}${queryString ? `?${queryString}` : ""}`;
};

const hasOAuthPayload = (params: Record<string, string | string[]>) =>
  ["code", "access_token", "refresh_token", "error", "error_description", "error_code"].some(
    (key) => {
      const value = params[key];

      return Array.isArray(value) ? value.some(Boolean) : Boolean(value);
    },
  );

const hasOAuthPayloadInUrl = (callbackUrl: string) => {
  try {
    const url = new URL(callbackUrl);
    const hashParams = new URLSearchParams(url.hash.replace(/^#/, ""));

    return ["code", "access_token", "refresh_token", "error", "error_description", "error_code"].some(
      (key) => Boolean(url.searchParams.get(key) ?? hashParams.get(key)),
    );
  } catch {
    return false;
  }
};

export default function AuthCallbackScreen() {
  const router = useRouter();
  const theme = useTheme();
  const styles = createStyles(theme);
  const incomingUrl = Linking.useURL();
  const params = useLocalSearchParams<Record<string, string | string[]>>();
  const completeSocialLoginCallback = useAuthStore((state) => state.completeSocialLoginCallback);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isDone, setIsDone] = useState(false);
  const fallbackUrl = useMemo(() => buildCallbackUrlFromParams(params), [params]);
  const callbackUrl = incomingUrl ?? fallbackUrl;
  const hasCallbackPayload = useMemo(
    () => (incomingUrl ? hasOAuthPayloadInUrl(incomingUrl) : hasOAuthPayload(params)),
    [incomingUrl, params],
  );

  useEffect(() => {
    if (hasCallbackPayload || isDone) {
      return;
    }

    let redirectTimeout: ReturnType<typeof setTimeout> | null = null;

    const timeout = setTimeout(() => {
      setErrorMessage("Sosyal giriş iptal edildi.");
      setIsDone(true);

      redirectTimeout = setTimeout(() => {
        router.replace("/auth/login");
      }, 700);
    }, 350);

    return () => {
      clearTimeout(timeout);
      if (redirectTimeout) {
        clearTimeout(redirectTimeout);
      }
    };
  }, [hasCallbackPayload, isDone, router]);

  useEffect(() => {
    let isMounted = true;

    const complete = async () => {
      if (isDone || !callbackUrl || !hasCallbackPayload) {
        return;
      }

      try {
        await completeSocialLoginCallback(callbackUrl);

        if (isMounted) {
          setIsDone(true);
          router.replace("/");
        }
      } catch (error) {
        if (isMounted) {
          setErrorMessage(formatAuthErrorMessage(error));
          setIsDone(true);
        }
      }
    };

    void complete();

    return () => {
      isMounted = false;
    };
  }, [callbackUrl, completeSocialLoginCallback, hasCallbackPayload, incomingUrl, isDone, router]);

  if (!isDone && !errorMessage) {
    return <Loading label="Giriş tamamlanıyor" />;
  }

  return (
    <Screen style={styles.screen}>
      <View style={styles.panel}>
        <Text style={styles.title}>Giriş tamamlanamadı</Text>
        <Text style={styles.description}>
          {errorMessage ?? "Google veya Apple dönüşü işlenemedi. Tekrar deneyin."}
        </Text>
        <Button label="Girişe dön" onPress={() => router.replace("/auth/login")} />
      </View>
    </Screen>
  );
}

const createStyles = (theme: ReturnType<typeof useTheme>) =>
  StyleSheet.create({
    screen: {
      justifyContent: "center",
    },
    panel: {
      gap: theme.spacing.md,
      borderRadius: 22,
      borderWidth: 1,
      borderColor: theme.colors.border,
      padding: theme.spacing.lg,
      backgroundColor: theme.colors.surface,
    },
    title: {
      ...theme.typography.title,
      color: theme.colors.text,
    },
    description: {
      ...theme.typography.body,
      color: theme.colors.muted,
    },
  });
