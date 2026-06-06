// Tutarlı aksiyon butonlari icin ortak Pressable bileseni.
import type { ReactNode } from "react";
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  type StyleProp,
  type ViewStyle,
} from "react-native";
import { useTheme } from "@/shared/theme";

type ButtonVariant = "primary" | "secondary" | "ghost" | "danger";

interface ButtonProps {
  label?: string;
  children?: ReactNode;
  onPress?: () => void;
  variant?: ButtonVariant;
  disabled?: boolean;
  loading?: boolean;
  icon?: ReactNode;
  style?: StyleProp<ViewStyle>;
}

export const Button = ({
  label,
  children,
  onPress,
  variant = "primary",
  disabled = false,
  loading = false,
  icon,
  style,
}: ButtonProps) => {
  const theme = useTheme();
  const styles = createStyles(theme, variant, disabled);

  return (
    <Pressable
      accessibilityRole="button"
      disabled={disabled || loading}
      onPress={onPress}
      style={({ pressed }) => [styles.button, pressed && styles.pressed, style]}
    >
      {loading ? <ActivityIndicator color={styles.label.color} /> : icon}
      {children ? children : <Text style={styles.label}>{label}</Text>}
    </Pressable>
  );
};

const createStyles = (
  theme: ReturnType<typeof useTheme>,
  variant: ButtonVariant,
  disabled: boolean,
) => {
  const backgroundByVariant = {
    primary: theme.colors.primary,
    secondary: theme.colors.secondary,
    ghost: "transparent",
    danger: theme.colors.danger,
  };
  const textByVariant = {
    primary: "#FFFFFF",
    secondary: "#FFFFFF",
    ghost: theme.colors.primary,
    danger: "#FFFFFF",
  };

  return StyleSheet.create({
    button: {
      minHeight: 54,
      borderRadius: theme.radius.pill,
      alignItems: "center",
      justifyContent: "center",
      flexDirection: "row",
      gap: theme.spacing.xs,
      paddingHorizontal: theme.spacing.md,
      backgroundColor: disabled ? theme.colors.border : backgroundByVariant[variant],
      borderWidth: variant === "ghost" ? 1 : 0,
      borderColor: variant === "ghost" ? theme.colors.border : "transparent",
      shadowColor: variant === "ghost" ? "transparent" : theme.colors.shadow,
      shadowOpacity: variant === "ghost" ? 0 : 1,
      shadowRadius: 14,
      shadowOffset: { width: 0, height: 8 },
      elevation: variant === "ghost" ? 0 : 3,
    },
    pressed: {
      opacity: 0.82,
    },
    label: {
      ...theme.typography.subheading,
      color: disabled ? theme.colors.muted : textByVariant[variant],
    },
  });
};
