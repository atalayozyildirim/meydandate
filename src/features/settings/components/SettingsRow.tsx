import React from "react";
import { Pressable, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useTheme } from "@/shared/theme";
import type { createSettingsStyles } from "./settingsStyles";

export interface SettingsRowProps {
  title: string;
  subtitle: string;
  icon?: keyof typeof Ionicons.glyphMap;
  danger?: boolean;
  onPress?: () => void;
  styles: ReturnType<typeof createSettingsStyles>;
}

export function SettingsRow({
  title,
  subtitle,
  icon,
  danger = false,
  onPress,
  styles,
}: SettingsRowProps) {
  const theme = useTheme();

  return (
    <Pressable onPress={onPress} style={styles.row}>
      {icon ? (
        <View style={[styles.rowIcon, danger && styles.rowIconDanger]}>
          <Ionicons
            name={icon}
            size={20}
            color={danger ? theme.colors.danger : theme.colors.primary}
          />
        </View>
      ) : null}
      <View style={styles.rowBody}>
        <Text style={[styles.rowTitle, danger && styles.dangerText]}>
          {title}
        </Text>
        <Text style={styles.rowSubtitle}>{subtitle}</Text>
      </View>
      {onPress ? (
        <Ionicons name="chevron-forward" size={20} color={theme.colors.muted} />
      ) : null}
    </Pressable>
  );
}
