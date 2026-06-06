// Apple ve Google giriş aksiyonlarını sade mobil butonlar olarak sunar.
import { Pressable, StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import type { SocialAuthProvider } from "@/domain/repositories/AuthRepository";
import { useTheme } from "@/shared/theme";

interface SocialAuthButtonsProps {
  onPress: (provider: SocialAuthProvider) => void;
  disabled?: boolean;
}

export const SocialAuthButtons = ({ onPress, disabled = false }: SocialAuthButtonsProps) => {
  const theme = useTheme();
  const styles = createStyles(theme);

  return (
    <View style={styles.container}>
      <View style={styles.dividerRow}>
        <View style={styles.divider} />
        <Text style={styles.dividerText}>veya</Text>
        <View style={styles.divider} />
      </View>
      <Pressable
        accessibilityRole="button"
        disabled={disabled}
        onPress={() => onPress("apple")}
        style={({ pressed }) => [styles.socialButton, pressed && styles.pressed]}
      >
        <Ionicons name="logo-apple" size={22} color="#111827" />
        <Text style={styles.socialLabel}>Apple ile devam et</Text>
      </Pressable>
      <Pressable
        accessibilityRole="button"
        disabled={disabled}
        onPress={() => onPress("google")}
        style={({ pressed }) => [styles.socialButton, pressed && styles.pressed]}
      >
        <Ionicons name="logo-google" size={20} color="#111827" />
        <Text style={styles.socialLabel}>Google ile devam et</Text>
      </Pressable>
    </View>
  );
};

const createStyles = (theme: ReturnType<typeof useTheme>) =>
  StyleSheet.create({
    container: {
      gap: theme.spacing.sm
    },
    dividerRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: theme.spacing.sm,
      marginVertical: theme.spacing.xs
    },
    divider: {
      flex: 1,
      height: 1,
      backgroundColor: theme.colors.border
    },
    dividerText: {
      ...theme.typography.caption,
      color: theme.colors.muted
    },
    socialButton: {
      minHeight: 54,
      borderRadius: theme.radius.pill,
      borderWidth: 1,
      borderColor: theme.colors.border,
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      gap: theme.spacing.sm,
      backgroundColor: "#FFFFFF"
    },
    pressed: {
      opacity: 0.82
    },
    socialLabel: {
      ...theme.typography.subheading,
      color: "#111827"
    }
  });
