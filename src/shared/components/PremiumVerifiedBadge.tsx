import { StyleSheet, View } from "react-native";
import { Svg, Path } from "react-native-svg";
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

  const checkmarkPath = "M4.5 12l3.5 3.5L15.5 8";

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
          <Svg
            width={size * 0.6}
            height={size * 0.6}
            viewBox="0 0 20 20"
            style={styles.icon}
          >
            <Path
              d={checkmarkPath}
              fill="none"
              stroke="#FFFFFF"
              strokeWidth={2.5}
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </Svg>
        </LinearGradient>
      </View>
    );
  }

  return (
    <View
      accessibilityLabel="Premium onaylı"
      style={styles.badge}
    >
      <Svg
        width={size * 0.6}
        height={size * 0.6}
        viewBox="0 0 20 20"
        style={styles.icon}
      >
        <Path
          d={checkmarkPath}
          fill="none"
          stroke={theme.colors.background}
          strokeWidth={2.5}
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </Svg>
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
    icon: {
      opacity: 0.95,
    },
  });
