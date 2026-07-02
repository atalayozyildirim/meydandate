// Uygulama kok layout'u providerlari, session bootstrap'i ve stack router'i kurar.
import "react-native-gesture-handler";
import "react-native-url-polyfill/auto";
import "@/shared/utils/installCryptoPolyfill";
import { useEffect, useMemo } from "react";
import { Stack } from "expo-router";
import {
  DarkTheme as NavigationDarkTheme,
  DefaultTheme as NavigationDefaultTheme,
  ThemeProvider as NavigationThemeProvider,
} from "@react-navigation/native";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { ThemeProvider, useTheme } from "@/shared/theme";
import { useAuthStore } from "@/features/auth/stores/authStore";

const queryClient = new QueryClient();

const RootNavigator = () => {
  const theme = useTheme();
  const initializeSession = useAuthStore((state) => state.initializeSession);
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

  return (
    <NavigationThemeProvider value={navigationTheme}>
      <Stack
        screenOptions={{
          headerShown: false,
          contentStyle: { backgroundColor: theme.colors.background },
        }}
      >
        <Stack.Screen
          name="feed-compose"
          options={{
            presentation: "fullScreenModal",
            contentStyle: { backgroundColor: theme.colors.surface },
          }}
        />
      </Stack>
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
