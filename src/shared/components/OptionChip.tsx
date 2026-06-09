// Coklu secim ve segmented kontrol ihtiyaclari icin ortak chip bileseni.
import { Pressable, StyleSheet, Text } from "react-native";
import { useTheme } from "@/shared/theme";

interface OptionChipProps {
  label: string;
  selected: boolean;
  onPress: () => void;
  disabled?: boolean;
}

export const OptionChip = ({ label, selected, onPress, disabled = false }: OptionChipProps) => {
  const theme = useTheme();
  const styles = createStyles(theme, selected, disabled);

  return (
    <Pressable
      accessibilityRole="button"
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [styles.chip, pressed && styles.pressed]}
    >
      <Text style={styles.label}>{label}</Text>
    </Pressable>
  );
};

const createStyles = (
  theme: ReturnType<typeof useTheme>,
  selected: boolean,
  disabled: boolean,
) =>
  StyleSheet.create({
    chip: {
      minHeight: 38,
      borderRadius: theme.radius.pill,
      paddingHorizontal: theme.spacing.md,
      alignItems: "center",
      justifyContent: "center",
      borderWidth: 1,
      borderColor: selected ? theme.colors.primary : theme.colors.border,
      backgroundColor: selected ? theme.colors.primary : theme.colors.surface,
      opacity: disabled ? 0.52 : 1
    },
    pressed: {
      opacity: 0.8
    },
    label: {
      ...theme.typography.caption,
      color: selected ? "#FFFFFF" : theme.colors.text
    }
  });
