// Ana uygulama sekmelerini ve protected tab guard'ini tanimlar.
import { Redirect, Tabs } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import type { ColorValue } from "react-native";
import { Loading } from "@/shared/components/Loading";
import { useSession } from "@/features/auth/hooks/useSession";
import { useTheme } from "@/shared/theme";

type TabIconName =
  | "newspaper-outline"
  | "newspaper"
  | "flame-outline"
  | "flame"
  | "cart-outline"
  | "cart"
  | "chatbubbles-outline"
  | "chatbubbles"
  | "radio-outline"
  | "calendar-outline"
  | "person-outline"
  | "person"
  | "settings-outline";

const createTabIcon =
  (name: TabIconName, activeName: TabIconName = name) =>
  ({
    color,
    focused,
    size,
  }: {
    color: ColorValue;
    focused: boolean;
    size: number;
  }) => (
    <Ionicons
      name={(focused ? activeName : name) as any}
      color={String(color)}
      size={focused ? size + 2 : size}
    />
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
          marginTop: 1,
        },
        tabBarItemStyle: {
          borderRadius: 22,
          marginHorizontal: 2,
          paddingTop: 4,
        },
        tabBarActiveBackgroundColor: theme.isDark
          ? "rgba(255, 91, 112, 0.10)"
          : "rgba(233, 64, 87, 0.08)",
        tabBarInactiveBackgroundColor: "transparent",
        tabBarStyle: {
          position: "absolute",
          left: 18,
          right: 18,
          bottom: 14,
          minHeight: 60,
          paddingTop: 7,
          paddingBottom: 7,
          paddingHorizontal: 5,
          borderRadius: 24,
          backgroundColor: theme.isDark
            ? "rgba(23, 25, 35, 0.96)"
            : "rgba(255, 255, 255, 0.96)",
          borderTopWidth: 0,
          borderColor: "rgba(255, 91, 112, 0.16)",
          borderWidth: 1,
          shadowColor: theme.colors.shadow,
          shadowOpacity: 1,
          shadowRadius: 14,
          shadowOffset: { width: 0, height: 8 },
          elevation: 6,
        },
      }}
    >
      <Tabs.Screen
        name="feed/index"
        options={{
          title: "Akış",
          tabBarIcon: createTabIcon("newspaper-outline", "newspaper"),
        }}
      />
      <Tabs.Screen
        name="feed/[postId]"
        options={{
          tabBarButton: () => null,
          tabBarItemStyle: {
            display: "none",
          },
          tabBarStyle: {
            display: "none",
          },
        }}
      />
      <Tabs.Screen
        name="discover/index"
        options={{
          title: "Keşfet",
          tabBarIcon: createTabIcon("flame-outline", "flame"),
        }}
      />
      <Tabs.Screen
        name="store/index"
        options={{
          title: "Mağaza",
          tabBarIcon: createTabIcon("cart-outline", "cart"),
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
          tabBarIcon: createTabIcon("chatbubbles-outline", "chatbubbles"),
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
          tabBarIcon: createTabIcon("person-outline", "person"),
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
