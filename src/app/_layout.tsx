// Uygulama kok layout'u providerlari, session bootstrap'i ve stack router'i kurar.
import "react-native-gesture-handler";
import "react-native-url-polyfill/auto";
import "@/shared/utils/installCryptoPolyfill";
import { useEffect, useMemo } from "react";
import { Stack, useRouter } from "expo-router";
import {
  DarkTheme as NavigationDarkTheme,
  DefaultTheme as NavigationDefaultTheme,
  ThemeProvider as NavigationThemeProvider,
} from "@react-navigation/native";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { useAppOpenAd } from "@/features/ads";
import { ThemeProvider, useTheme } from "@/shared/theme";
import { useAuthStore } from "@/features/auth/stores/authStore";
import {
  registerPushNotifications,
  subscribeToPushNotificationResponses,
  type PushNotificationData,
} from "@/features/notifications/services/pushNotifications";

const queryClient = new QueryClient();

const AppOpenAdController = () => {
  const currentUser = useAuthStore((state) => state.currentUser);
  const isHydrated = useAuthStore((state) => state.isHydrated);
  const enabled = isHydrated && Boolean(currentUser) && !currentUser?.isPremium;

  useAppOpenAd({ enabled });

  return null;
};

const PushNotificationController = () => {
  const router = useRouter();
  const currentUser = useAuthStore((state) => state.currentUser);

  useEffect(() => {
    if (!currentUser) {
      return undefined;
    }

    let disposed = false;
    let unsubscribe = () => undefined;
    const openNotification = (data: PushNotificationData) => {
      if (data.conversationId) {
        router.push({
          pathname: "/tabs/chat/[conversationId]",
          params: { conversationId: data.conversationId },
        });
        return;
      }

      if (data.postId) {
        router.push({
          pathname: "/tabs/feed/[postId]",
          params: { postId: data.postId },
        });
        return;
      }

      if (data.userId) {
        router.push({
          pathname: "/tabs/profile/[userId]",
          params: { userId: data.userId },
        });
        return;
      }

      if (data.matchId || data.type === "match") {
        router.push("/tabs/matches");
      }
    };

    void registerPushNotifications(currentUser.id).catch((error) => {
      if (__DEV__) console.info("Push kaydı tamamlanamadı", error);
    });
    void subscribeToPushNotificationResponses(openNotification).then(
      (cleanup) => {
        if (disposed) {
          cleanup();
          return;
        }

        unsubscribe = cleanup;
      },
      (error) => {
        if (__DEV__) console.info("Push yönlendirmesi başlatılamadı", error);
      },
    );

    return () => {
      disposed = true;
      unsubscribe();
    };
  }, [currentUser?.id, router]);

  return null;
};

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
      <AppOpenAdController />
      <PushNotificationController />
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
