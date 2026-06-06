// Liste ve akislarda veri olmadiginda kullanilan bos durum bileseni.
import { StyleSheet, Text, View } from "react-native";
import { Button } from "@/shared/components/Button";
import { useTheme } from "@/shared/theme";

interface EmptyStateProps {
  title: string;
  description: string;
  actionLabel?: string;
  onAction?: () => void;
}

export const EmptyState = ({ title, description, actionLabel, onAction }: EmptyStateProps) => {
  const theme = useTheme();
  const styles = createStyles(theme);

  return (
    <View style={styles.container}>
      <Text style={styles.title}>{title}</Text>
      <Text style={styles.description}>{description}</Text>
      {actionLabel && onAction ? <Button label={actionLabel} onPress={onAction} variant="secondary" /> : null}
    </View>
  );
};

const createStyles = (theme: ReturnType<typeof useTheme>) =>
  StyleSheet.create({
    container: {
      flex: 1,
      alignItems: "center",
      justifyContent: "center",
      gap: theme.spacing.sm,
      padding: theme.spacing.lg
    },
    title: {
      ...theme.typography.heading,
      color: theme.colors.text,
      textAlign: "center"
    },
    description: {
      ...theme.typography.body,
      color: theme.colors.muted,
      textAlign: "center"
    }
  });
