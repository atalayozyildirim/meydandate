// Uygulama kok layout'u providerlari, session bootstrap'i ve stack router'i kurar.
import "react-native-gesture-handler";
import { useEffect, useMemo } from "react";
import * as Crypto from "expo-crypto";
import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import {
  DarkTheme as NavigationDarkTheme,
  DefaultTheme as NavigationDefaultTheme,
  ThemeProvider as NavigationThemeProvider,
} from "@react-navigation/native";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { ThemeProvider, useTheme } from "@/shared/theme";
import { useAuthStore } from "@/features/auth/stores/authStore";
import { initializeAdMob } from "@/features/ads";
import { registerPushNotifications } from "@/features/notifications/services/pushNotifications";

// WebCrypto polyfill for Supabase PKCE flow
if (typeof global.crypto === "undefined") {
  global.crypto = {
    subtle: {
      digest: async (algorithm: AlgorithmIdentifier, data: Uint8Array) => {
        if (algorithm === "SHA-256") {
          const dataString = new TextDecoder().decode(data);
          const hash = await Crypto.digestStringAsync(
            Crypto.CryptoDigestAlgorithm.SHA256,
            dataString
          );
          // Convert hex string to ArrayBuffer format expected by WebCrypto
          const hashBytes = new Uint8Array(
            hash.match(/.{1,2}/g)?.map((byte) => parseInt(byte, 16)) || []
          );
          return hashBytes.buffer;
        }
        throw new Error(`Unsupported algorithm: ${algorithm}`);
      },
    },
    getRandomValues: (array: Uint8Array) => {
      for (let i = 0; i < array.length; i++) {
        array[i] = Math.floor(Math.random() * 256);
      }
      return array;
    },
  } as any;
}

const queryClient = new QueryClient();

const RootNavigator = () => {
  const theme = useTheme();
  const initializeSession = useAuthStore((state) => state.initializeSession);
  const currentUser = useAuthStore((state) => state.currentUser);
  const navigationTheme = useMemo(() => {
    const baseTheme = theme.isDark ? NavigationDarkTheme : NavigationDefaultTheme;

    return {
      ...baseTheme,
      dark: theme.isDark,
      colors: {
        ...baseTheme.colors,
        primary: theme.colors.primary,
        background: theme.colors.background,
        card: theme.colors.surface,
        text: theme.colors.text,
        border: theme.colors.border,
        notification: theme.colors.primary,
      },
    };
  }, [theme]);

  useEffect(() => {
    void initializeSession();
  }, [initializeSession]);

  useEffect(() => {
    void initializeAdMob();
  }, []);

  useEffect(() => {
    if (!currentUser) {
      return;
    }

    void registerPushNotifications(currentUser.id).catch((error) => {
      if (__DEV__) console.info("Push token kaydedilemedi:", error);
    });
  }, [currentUser?.id]);

  return (
    <NavigationThemeProvider value={navigationTheme}>
      <StatusBar style={theme.isDark ? "light" : "dark"} />
      <Stack
        screenOptions={{
          headerShown: false,
          contentStyle: { backgroundColor: theme.colors.background },
        }}
      />
    </NavigationThemeProvider>
  );
};

export default function RootLayout() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <QueryClientProvider client={queryClient}>
        <ThemeProvider>
          <RootNavigator />
        </ThemeProvider>
      </QueryClientProvider>
    </GestureHandlerRootView>
  );
}
