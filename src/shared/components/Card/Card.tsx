// Tekil bilgi bloklari ve listeler icin cerceveli kart bileseni.
import type { PropsWithChildren } from "react";
import { StyleSheet, View, type StyleProp, type ViewStyle } from "react-native";
import { useTheme } from "@/shared/theme";

interface CardProps extends PropsWithChildren {
  style?: StyleProp<ViewStyle>;
}

export const Card = ({ children, style }: CardProps) => {
  const theme = useTheme();
  const styles = createStyles(theme);

  return <View style={[styles.card, style]}>{children}</View>;
};

const createStyles = (theme: ReturnType<typeof useTheme>) =>
  StyleSheet.create({
    card: {
      backgroundColor: theme.colors.surface,
      borderRadius: theme.radius.md,
      borderWidth: 1,
      borderColor: "rgba(233, 64, 87, 0.10)",
      padding: theme.spacing.md,
    }
  });
