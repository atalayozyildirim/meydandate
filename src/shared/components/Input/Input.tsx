// Form alanlari icin label, hata ve tema destekli input bileseni.
import { StyleSheet, Text, TextInput, type TextInputProps, View } from "react-native";
import { useTheme } from "@/shared/theme";

interface InputProps extends TextInputProps {
  label: string;
  error?: string | undefined;
}

export const Input = ({ label, error, style, ...props }: InputProps) => {
  const theme = useTheme();
  const styles = createStyles(theme, Boolean(error));

  return (
    <View style={styles.container}>
      <Text style={styles.label}>{label}</Text>
      <TextInput
        placeholderTextColor={theme.colors.muted}
        style={[styles.input, style]}
        selectionColor={theme.colors.primary}
        {...props}
      />
      {error ? <Text style={styles.error}>{error}</Text> : null}
    </View>
  );
};

const createStyles = (theme: ReturnType<typeof useTheme>, hasError: boolean) =>
  StyleSheet.create({
    container: {
      gap: theme.spacing.xs
    },
    label: {
      ...theme.typography.caption,
      color: theme.colors.muted,
      textTransform: "uppercase"
    },
    input: {
      minHeight: 54,
      borderWidth: 1,
      borderColor: hasError ? theme.colors.danger : theme.colors.border,
      backgroundColor: theme.colors.surface,
      borderRadius: theme.radius.pill,
      color: theme.colors.text,
      paddingHorizontal: theme.spacing.md,
      ...theme.typography.body
    },
    error: {
      ...theme.typography.caption,
      color: theme.colors.danger
    }
  });
