import { StyleSheet, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useTheme } from "@/shared/theme";

interface PremiumVerifiedBadgeProps {
  size?: number;
  variant?: "inverse" | "blue";
}

export const PremiumVerifiedBadge = ({
  size = 18,
  variant = "blue",
}: PremiumVerifiedBadgeProps) => {
  const theme = useTheme();
  const styles = createStyles(theme, size, variant);

  return (
    <View
      accessibilityLabel="Premium onaylı"
      style={styles.badge}
    >
      <Ionicons
        name="checkmark"
        size={Math.max(11, Math.round(size * 0.66))}
        color={variant === "blue" ? "#FFFFFF" : theme.colors.background}
      />
    </View>
  );
};

const createStyles = (
  theme: ReturnType<typeof useTheme>,
  size: number,
  variant: "inverse" | "blue",
) =>
  StyleSheet.create({
    badge: {
      width: size,
      height: size,
      borderRadius: size / 2,
      alignItems: "center",
      justifyContent: "center",
      flexShrink: 0,
      backgroundColor: variant === "blue" ? "#1D9BF0" : theme.colors.text,
      borderWidth: 1,
      borderColor:
        variant === "blue" ? "rgba(255, 255, 255, 0.82)" : theme.colors.background,
    },
  });
