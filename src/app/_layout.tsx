// Uygulama kok layout'u providerlari, session bootstrap'i ve stack router'i kurar.
import "react-native-gesture-handler";
import { useEffect } from "react";
import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { ThemeProvider, useTheme } from "@/shared/theme";
import { useAuthStore } from "@/features/auth/stores/authStore";
import { initializeAdMob } from "@/features/ads";
import { registerPushNotifications } from "@/features/notifications/services/pushNotifications";

const queryClient = new QueryClient();

const RootNavigator = () => {
  const theme = useTheme();
  const initializeSession = useAuthStore((state) => state.initializeSession);
  const currentUser = useAuthStore((state) => state.currentUser);

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
    <>
      <StatusBar style={theme.isDark ? "light" : "dark"} />
      <Stack
        screenOptions={{
          headerShown: false,
          contentStyle: { backgroundColor: theme.colors.background },
        }}
      />
    </>
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
