import { Image, StyleSheet, View } from "react-native";
import { useTheme } from "@/shared/theme";

const zulfiqarSwordImage = require("../../../assets/zulfiqar-sword.png");

interface ZulfiqarBadgeIconProps {
  size?: number;
}

export const ZulfiqarBadgeIcon = ({ size = 48 }: ZulfiqarBadgeIconProps) => {
  const theme = useTheme();
  const styles = createStyles(theme, size);

  return (
    <View style={styles.frame}>
      <View style={styles.innerRing} />
      <Image source={zulfiqarSwordImage} style={styles.swordImage} resizeMode="contain" />
    </View>
  );
};

const createStyles = (theme: ReturnType<typeof useTheme>, size: number) =>
  StyleSheet.create({
    frame: {
      width: size,
      height: size,
      borderRadius: size / 2,
      alignItems: "center",
      justifyContent: "center",
      overflow: "hidden",
      backgroundColor: theme.isDark ? "#10151C" : "#1D1B25",
      borderWidth: Math.max(1, size * 0.035),
      borderColor: "#D2B15F",
    },
    innerRing: {
      position: "absolute",
      width: size * 0.88,
      height: size * 0.88,
      borderRadius: size * 0.44,
      borderWidth: 1,
      borderColor: theme.isDark ? "rgba(210, 177, 95, 0.24)" : "rgba(210, 177, 95, 0.32)",
      backgroundColor: theme.isDark ? "rgba(255, 255, 255, 0.04)" : "rgba(255, 255, 255, 0.06)",
    },
    swordImage: {
      width: size * 0.98,
      height: size * 0.76,
      transform: [{ translateY: -size * 0.01 }],
    },
  });
