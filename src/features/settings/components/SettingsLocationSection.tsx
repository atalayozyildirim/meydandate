import React from "react";
import { Switch, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { Card } from "@/shared/components/Card";
import { OptionChip } from "@/shared/components/OptionChip";
import { Button } from "@/shared/components/Button";
import { useTheme } from "@/shared/theme";
import type { createSettingsStyles } from "./settingsStyles";

const locationRadiusOptions = [10, 25, 50, 100, 250] as const;

interface SettingsLocationSectionProps {
  locationMatchEnabled: boolean;
  locationSubtitle: string;
  matchRadiusKm: number;
  hasProfileLocation: boolean;
  isPending: boolean;
  disabled: boolean;
  onUpdatePreference: (
    enabled: boolean,
    radiusKm: number,
    refreshLocation: boolean,
  ) => void;
  styles: ReturnType<typeof createSettingsStyles>;
}

export function SettingsLocationSection({
  locationMatchEnabled,
  locationSubtitle,
  matchRadiusKm,
  hasProfileLocation,
  isPending,
  disabled,
  onUpdatePreference,
  styles,
}: SettingsLocationSectionProps) {
  const theme = useTheme();

  return (
    <Card style={styles.section}>
      <Text style={styles.sectionTitle}>Eşleşme</Text>
      <View style={styles.toggleRow}>
        <View style={styles.rowIcon}>
          <Ionicons
            name="navigate-outline"
            size={20}
            color={theme.colors.primary}
          />
        </View>
        <View style={styles.rowBody}>
          <Text style={styles.rowTitle}>Konuma göre eşleşme</Text>
          <Text style={styles.rowSubtitle}>{locationSubtitle}</Text>
        </View>
        <Switch
          value={locationMatchEnabled}
          disabled={disabled || isPending}
          onValueChange={(enabled) =>
            onUpdatePreference(enabled, matchRadiusKm, enabled)
          }
          trackColor={{
            true: theme.colors.primary,
            false: theme.colors.border,
          }}
          thumbColor="#FFFFFF"
        />
      </View>
      <View style={styles.chipWrap}>
        {locationRadiusOptions.map((radiusKm) => (
          <OptionChip
            key={radiusKm}
            label={`${radiusKm} km`}
            selected={matchRadiusKm === radiusKm}
            disabled={disabled || isPending}
            onPress={() =>
              onUpdatePreference(
                true,
                radiusKm,
                !locationMatchEnabled || !hasProfileLocation,
              )
            }
          />
        ))}
      </View>
      <Button
        label={locationMatchEnabled ? "Konumu yenile" : "Konumu kullan"}
        variant="ghost"
        loading={isPending}
        disabled={disabled}
        icon={
          <Ionicons name="locate" size={18} color={theme.colors.primary} />
        }
        onPress={() => onUpdatePreference(true, matchRadiusKm, true)}
      />
    </Card>
  );
}
