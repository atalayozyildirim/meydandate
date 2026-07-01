// Uygulama kok layout'u providerlari, session bootstrap'i ve stack router'i kurar.
import "react-native-gesture-handler";
import { useEffect, useMemo } from "react";
import { Stack, useRouter } from "expo-router";
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
import {
  registerPushNotifications,
  subscribeToPushNotificationResponses,
} from "@/features/notifications/services/pushNotifications";

const queryClient = new QueryClient();

const RootNavigator = () => {
  const router = useRouter();
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

  useEffect(() => {
    if (!currentUser) {
      return;
    }

    let unsubscribe: (() => void) | undefined;
    let isActive = true;

    void subscribeToPushNotificationResponses((data) => {
      if (data.type === "message" && data.conversationId) {
        router.push({
          pathname: "/tabs/chat/[conversationId]",
          params: { conversationId: data.conversationId },
        });
        return;
      }

      if (
        (data.type === "feed_like" || data.type === "feed_comment") &&
        data.postId
      ) {
        router.push({
          pathname: "/tabs/feed/[postId]",
          params: { postId: data.postId },
        });
        return;
      }

      if (data.type === "match") {
        router.push("/tabs/discover/matches");
        return;
      }

      if (data.type === "like" || data.type === "super_like") {
        router.push("/tabs/discover/likes");
        return;
      }

      if (data.type === "admin_event") {
        router.push("/tabs/feed");
      }
    })
      .then((cleanup) => {
        if (!isActive) {
          cleanup();
          return;
        }

        unsubscribe = cleanup;
      })
      .catch((error) => {
        if (__DEV__) console.info("Push yönlendirmesi kurulamadı:", error);
      });

    return () => {
      isActive = false;
      unsubscribe?.();
    };
  }, [currentUser?.id, router]);

  return (
    <NavigationThemeProvider value={navigationTheme}>
      <StatusBar style={theme.isDark ? "light" : "dark"} />
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
