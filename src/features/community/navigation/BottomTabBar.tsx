import React from "react";
import { Platform, Pressable, StyleSheet, Text, View } from "react-native";
import { BlurView } from "expo-blur";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { colors, Icon, ui, type IconName } from "../ui";
import type { Tab } from "./types";

interface TabItem {
  id: Tab;
  label: string;
  icon: IconName;
  active: IconName;
}

const tabs: readonly TabItem[] = [
  { id: "feed", label: "Meydan", icon: "flame-outline", active: "flame" },
  { id: "home", label: "Gündem", icon: "home-outline", active: "home" },
  {
    id: "communities",
    label: "Topluluk",
    icon: "people-outline",
    active: "people",
  },
  { id: "culture", label: "Kültür", icon: "book-outline", active: "book" },
  {
    id: "profile",
    label: "Profil",
    icon: "person-outline",
    active: "person",
  },
] as const;

interface BottomTabBarProps {
  activeTab: Tab;
  onTabChange: (tab: Tab) => void;
}

export function BottomTabBar({ activeTab, onTabChange }: BottomTabBarProps) {
  const insets = useSafeAreaInsets();

  return (
    <BlurView
      intensity={Platform.OS === "ios" ? 85 : 100}
      tint="light"
      style={styles.blur}
    >
      <View
        accessibilityRole="tablist"
        style={[
          styles.nav,
          {
            paddingBottom: Math.max(insets.bottom, 10),
          },
        ]}
      >
        {tabs.map((tab) => {
          const isSelected = activeTab === tab.id;
          return (
            <Pressable
              key={tab.id}
              accessibilityRole="tab"
              accessibilityLabel={tab.label}
              accessibilityState={{ selected: isSelected }}
              onPress={() => onTabChange(tab.id)}
              style={({ pressed }) => [styles.navItem, pressed && ui.pressed]}
            >
              <Icon
                name={isSelected ? tab.active : tab.icon}
                size={24}
                color={isSelected ? colors.wine : colors.ink}
              />
              <Text
                style={[
                  styles.navLabel,
                  isSelected && { color: colors.wine, fontWeight: "600" },
                ]}
              >
                {tab.label}
              </Text>
            </Pressable>
          );
        })}
      </View>
    </BlurView>
  );
}

const styles = StyleSheet.create({
  blur: {
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: "rgba(106, 27, 41, 0.12)",
    backgroundColor:
      Platform.OS === "ios" ? "rgba(247, 244, 237, 0.85)" : colors.paper,
  },
  nav: {
    flexDirection: "row",
    backgroundColor: "transparent",
    borderTopWidth: 0,
    paddingTop: 8,
  },
  navItem: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 4,
    gap: 3,
  },
  navLabel: {
    fontSize: 11,
    color: colors.muted,
  },
});
