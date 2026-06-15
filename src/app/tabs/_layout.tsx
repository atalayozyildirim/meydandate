// Ana uygulama sekmelerini ve protected tab guard'ini tanimlar.
import { Redirect, Tabs } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { StyleSheet, View, type ColorValue } from "react-native";
import { BlurView } from "expo-blur";
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
        tabBarShowLabel: false,
        tabBarItemStyle: {
          borderRadius: 999,
          marginHorizontal: 4,
          marginVertical: 6,
        },
        tabBarActiveBackgroundColor: theme.isDark
          ? "rgba(255, 91, 112, 0.16)"
          : "rgba(255, 255, 255, 0.36)",
        tabBarInactiveBackgroundColor: "transparent",
        tabBarIconStyle: {
          marginTop: 0,
        },
        tabBarBackground: () => (
          <BlurView
            intensity={theme.isDark ? 52 : 70}
            tint={theme.isDark ? "dark" : "light"}
            style={StyleSheet.absoluteFill}
          >
            <View
              style={[
                styles.glassTint,
                {
                  backgroundColor: theme.isDark
                    ? "rgba(20, 23, 33, 0.42)"
                    : "rgba(255, 255, 255, 0.28)",
                },
              ]}
            />
            <View
              style={[
                styles.glassHighlight,
                {
                  backgroundColor: theme.isDark
                    ? "rgba(255, 255, 255, 0.20)"
                    : "rgba(255, 255, 255, 0.58)",
                },
              ]}
            />
          </BlurView>
        ),
        tabBarStyle: {
          position: "absolute",
          left: 34,
          right: 34,
          bottom: 18,
          height: 58,
          paddingTop: 0,
          paddingBottom: 0,
          paddingHorizontal: 7,
          borderRadius: 30,
          overflow: "hidden",
          backgroundColor: theme.isDark
            ? "rgba(20, 23, 33, 0.46)"
            : "rgba(255, 255, 255, 0.38)",
          borderTopWidth: 0,
          borderColor: theme.isDark
            ? "rgba(255, 255, 255, 0.13)"
            : "rgba(255, 255, 255, 0.52)",
          borderWidth: 1,
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
          tabBarStyle: {
            display: "none",
          },
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

const styles = StyleSheet.create({
  glassTint: {
    ...StyleSheet.absoluteFillObject,
  },
  glassHighlight: {
    position: "absolute",
    left: 10,
    right: 10,
    top: 1,
    height: 1,
    backgroundColor: "rgba(255, 255, 255, 0.38)",
  },
});
