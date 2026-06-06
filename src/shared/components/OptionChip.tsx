// Coklu secim ve segmented kontrol ihtiyaclari icin ortak chip bileseni.
import { Pressable, StyleSheet, Text } from "react-native";
import { useTheme } from "@/shared/theme";

interface OptionChipProps {
  label: string;
  selected: boolean;
  onPress: () => void;
}

export const OptionChip = ({ label, selected, onPress }: OptionChipProps) => {
  const theme = useTheme();
  const styles = createStyles(theme, selected);

  return (
    <Pressable accessibilityRole="button" onPress={onPress} style={({ pressed }) => [styles.chip, pressed && styles.pressed]}>
      <Text style={styles.label}>{label}</Text>
    </Pressable>
  );
};

const createStyles = (theme: ReturnType<typeof useTheme>, selected: boolean) =>
  StyleSheet.create({
    chip: {
      minHeight: 38,
      borderRadius: theme.radius.pill,
      paddingHorizontal: theme.spacing.md,
      alignItems: "center",
      justifyContent: "center",
      borderWidth: 1,
      borderColor: selected ? theme.colors.primary : theme.colors.border,
      backgroundColor: selected ? theme.colors.primary : "rgba(255, 255, 255, 0.78)"
    },
    pressed: {
      opacity: 0.8
    },
    label: {
      ...theme.typography.caption,
      color: selected ? "#FFFFFF" : theme.colors.text
    }
  });
