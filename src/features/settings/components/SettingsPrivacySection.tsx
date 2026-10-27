import React from "react";
import { Switch, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { Card } from "@/shared/components/Card";
import { useTheme } from "@/shared/theme";
import type { createSettingsStyles } from "./settingsStyles";

interface SettingsPrivacySectionProps {
  profileHidden: boolean;
  profileVisibilityPending: boolean;
  privacyStrict: boolean;
  onToggleProfileHidden: (hidden: boolean) => void;
  onTogglePrivacyStrict: (strict: boolean) => void;
  styles: ReturnType<typeof createSettingsStyles>;
}

export function SettingsPrivacySection({
  profileHidden,
  profileVisibilityPending,
  privacyStrict,
  onToggleProfileHidden,
  onTogglePrivacyStrict,
  styles,
}: SettingsPrivacySectionProps) {
  const theme = useTheme();

  return (
    <Card style={styles.section}>
      <Text style={styles.sectionTitle}>Gizlilik</Text>
      <View style={styles.toggleRow}>
        <View style={styles.rowIcon}>
          <Ionicons
            name="eye-off-outline"
            size={20}
            color={theme.colors.primary}
          />
        </View>
        <View style={styles.rowBody}>
          <Text style={styles.rowTitle}>Profili gizle</Text>
          <Text style={styles.rowSubtitle}>
            Profilini keşfet akışı dışında tut.
          </Text>
        </View>
        <Switch
          value={profileHidden}
          disabled={profileVisibilityPending}
          onValueChange={onToggleProfileHidden}
          trackColor={{
            true: theme.colors.primary,
            false: theme.colors.border,
          }}
          thumbColor="#FFFFFF"
        />
      </View>
      <View style={styles.toggleRow}>
        <View style={styles.rowIcon}>
          <Ionicons
            name="shield-checkmark-outline"
            size={20}
            color={theme.colors.primary}
          />
        </View>
        <View style={styles.rowBody}>
          <Text style={styles.rowTitle}>Gizlilik koruması</Text>
          <Text style={styles.rowSubtitle}>
            KVKK/GDPR tercihlerini daha sıkı uygula.
          </Text>
        </View>
        <Switch
          value={privacyStrict}
          onValueChange={onTogglePrivacyStrict}
          trackColor={{
            true: theme.colors.primary,
            false: theme.colors.border,
          }}
          thumbColor="#FFFFFF"
        />
      </View>
    </Card>
  );
}
