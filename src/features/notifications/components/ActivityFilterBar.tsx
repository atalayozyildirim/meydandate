import React from "react";
import { Pressable, Text, View } from "react-native";
import type { createActivityStyles } from "./activityStyles";

interface ActivityFilterBarProps {
  unreadOnly: boolean;
  onSelectFilter: (unreadOnly: boolean) => void;
  unreadCount: number;
  styles: ReturnType<typeof createActivityStyles>;
}

export function ActivityFilterBar({
  unreadOnly,
  onSelectFilter,
  unreadCount,
  styles,
}: ActivityFilterBarProps) {
  const filters = [
    { label: "Tümü", value: false },
    { label: "Okunmamış", value: true },
  ];

  return (
    <View style={styles.filterFrame}>
      {filters.map((filter) => {
        const selected = unreadOnly === filter.value;

        return (
          <Pressable
            key={filter.label}
            accessibilityRole="button"
            accessibilityState={{ selected }}
            onPress={() => onSelectFilter(filter.value)}
            style={({ pressed }) => [
              styles.filterButton,
              selected && styles.filterButtonSelected,
              pressed && styles.pressed,
            ]}
          >
            <Text
              style={[
                styles.filterText,
                selected && styles.filterTextSelected,
              ]}
            >
              {filter.label}
            </Text>
            {filter.value && unreadCount > 0 ? (
              <View
                style={[
                  styles.filterCount,
                  selected && styles.filterCountSelected,
                ]}
              >
                <Text
                  style={[
                    styles.filterCountText,
                    selected && styles.filterCountTextSelected,
                  ]}
                >
                  {unreadCount > 99 ? "99+" : unreadCount}
                </Text>
              </View>
            ) : null}
          </Pressable>
        );
      })}
    </View>
  );
}
