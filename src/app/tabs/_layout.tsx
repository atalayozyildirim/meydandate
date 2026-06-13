// Ana uygulama sekmelerini ve protected tab guard'ini tanimlar.
import { Redirect, Tabs } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import type { ColorValue } from "react-native";
import { Loading } from "@/shared/components/Loading";
import { useSession } from "@/features/auth/hooks/useSession";
import { useTheme } from "@/shared/theme";

type TabIconName =
  | "newspaper-outline"
  | "flame-outline"
  | "cart-outline"
  | "heart-outline"
  | "chatbubbles-outline"
  | "radio-outline"
  | "calendar-outline"
  | "person-outline"
  | "settings-outline";

const createTabIcon =
  (name: TabIconName) =>
  ({ color, size }: { color: ColorValue; size: number }) => (
    <Ionicons name={name as any} color={String(color)} size={size} />
  );

export default function TabsLayout() {
  const theme = useTheme();
  const { currentUser, isHydrated } = useSession();

  if (!isHydrated) {
    return <Loading label="Sekmeler hazırlanıyor" />;
  }

  if (!currentUser) {
    return <Redirect href="/auth/login" />;
  }

  if (!currentUser.hasPassedEntryTest) {
    return <Redirect href="/approval-test" />;
  }

  if (!currentUser.hasCompletedOnboarding) {
    return <Redirect href="/onboarding" />;
  }

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: theme.colors.primary,
        tabBarInactiveTintColor: theme.colors.muted,
        tabBarLabelStyle: {
          fontSize: 10,
          fontWeight: "800",
        },
        tabBarItemStyle: {
          paddingTop: 3,
        },
        tabBarStyle: {
          position: "absolute",
          left: 18,
          right: 18,
          bottom: 14,
          minHeight: 62,
          paddingTop: 8,
          paddingBottom: 8,
          borderRadius: 26,
          backgroundColor: theme.colors.surface,
          borderTopWidth: 0,
          borderColor: "rgba(233, 64, 87, 0.10)",
          borderWidth: 1,
          shadowColor: theme.colors.shadow,
          shadowOpacity: 1,
          shadowRadius: 18,
          shadowOffset: { width: 0, height: 10 },
          elevation: 8,
        },
      }}
    >
      <Tabs.Screen
        name="feed/index"
        options={{
          title: "Akış",
          tabBarIcon: createTabIcon("newspaper-outline"),
        }}
      />
      <Tabs.Screen
        name="discover/index"
        options={{
          title: "Keşfet",
          tabBarIcon: createTabIcon("flame-outline"),
        }}
      />
      <Tabs.Screen
        name="store/index"
        options={{
          title: "Mağaza",
          tabBarIcon: createTabIcon("cart-outline"),
        }}
      />
      <Tabs.Screen
        name="matches/index"
        options={{
          href: null,
        }}
      />
      <Tabs.Screen
        name="chat/index"
        options={{
          title: "Mesaj",
          tabBarIcon: createTabIcon("chatbubbles-outline"),
        }}
      />
      <Tabs.Screen
        name="meydan/index"
        options={{
          href: null,
        }}
      />
      <Tabs.Screen
        name="muharrem/index"
        options={{
          href: null,
        }}
      />
      <Tabs.Screen
        name="profile/index"
        options={{
          title: "Profil",
          tabBarIcon: createTabIcon("person-outline"),
        }}
      />
      <Tabs.Screen
        name="premium/index"
        options={{
          href: null,
        }}
      />
      <Tabs.Screen
        name="settings/index"
        options={{
          href: null,
        }}
      />
      <Tabs.Screen
        name="chat/[conversationId]"
        options={{
          href: null,
          tabBarStyle: {
            display: "none",
          },
        }}
      />
      <Tabs.Screen
        name="profile/edit"
        options={{
          href: null,
          tabBarStyle: {
            display: "none",
          },
        }}
      />
      <Tabs.Screen
        name="profile/[userId]"
        options={{
          href: null,
          tabBarStyle: {
            display: "none",
          },
        }}
      />
    </Tabs>
  );
}
