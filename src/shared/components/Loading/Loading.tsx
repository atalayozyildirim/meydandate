// Yukleme durumlari icin merkezlenmis spinner ve kisa metin gosterir.
import { ActivityIndicator, StyleSheet, Text, View } from "react-native";
import { useTheme } from "@/shared/theme";

interface LoadingProps {
  label?: string;
}

export const Loading = ({ label = "Yukleniyor" }: LoadingProps) => {
  const theme = useTheme();
  const styles = createStyles(theme);

  return (
    <View style={styles.container}>
      <ActivityIndicator color={theme.colors.primary} size="large" />
      <Text style={styles.label}>{label}</Text>
    </View>
  );
};

const createStyles = (theme: ReturnType<typeof useTheme>) =>
  StyleSheet.create({
    container: {
      flex: 1,
      alignItems: "center",
      justifyContent: "center",
      gap: theme.spacing.sm
    },
    label: {
      ...theme.typography.body,
      color: theme.colors.muted
    }
  });
