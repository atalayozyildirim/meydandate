import { StyleSheet, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
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

  if (variant === "blue") {
    return (
      <View
        accessibilityLabel="Premium onaylı"
        style={styles.badge}
      >
        <LinearGradient
          colors={["#60A5FA", "#3B82F6", "#1D4ED8"]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.gradientBackground}
        >
          <Ionicons name="checkmark" size={size * 0.62} color="#FFFFFF" />
        </LinearGradient>
      </View>
    );
  }

  return (
    <View
      accessibilityLabel="Premium onaylı"
      style={styles.badge}
    >
      <Ionicons
        name="checkmark"
        size={size * 0.62}
        color={theme.colors.background}
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
      backgroundColor: variant === "blue" ? "transparent" : theme.colors.text,
      borderWidth: variant === "blue" ? 1.5 : 1,
      borderColor:
        variant === "blue" ? "rgba(147, 197, 253, 0.8)" : theme.colors.background,
      shadowColor: variant === "blue" ? "#3B82F6" : "transparent",
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: variant === "blue" ? 0.3 : 0,
      shadowRadius: variant === "blue" ? 4 : 0,
      elevation: variant === "blue" ? 3 : 0,
    },
    gradientBackground: {
      width: size - 3,
      height: size - 3,
      borderRadius: (size - 3) / 2,
      alignItems: "center",
      justifyContent: "center",
    },
  });
