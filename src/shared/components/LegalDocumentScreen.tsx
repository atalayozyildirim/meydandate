// Hukuki dokuman ekranlari icin ortak baslik, metin ve geri donus davranisi.
import type { PropsWithChildren } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { Button } from "@/shared/components/Button";
import { Card } from "@/shared/components/Card";
import { Screen } from "@/shared/components/Screen";
import { useTheme } from "@/shared/theme";

interface LegalDocument {
  title: string;
  body: string;
}

interface LegalDocumentScreenProps {
  document: LegalDocument;
}

export const LegalDocumentScreen = ({
  document,
  children,
}: PropsWithChildren<LegalDocumentScreenProps>) => {
  const router = useRouter();
  const theme = useTheme();
  const styles = createStyles(theme);

  return (
    <Screen>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} style={styles.iconButton}>
          <Ionicons name="chevron-back" size={22} color={theme.colors.text} />
        </Pressable>
        <Text style={styles.kicker}>Legal</Text>
      </View>
      <Text style={styles.title}>{document.title}</Text>
      <Card style={styles.card}>
        <Text style={styles.body}>{document.body}</Text>
      </Card>
      {children}
      <Button label="Geri don" variant="ghost" onPress={() => router.back()} />
    </Screen>
  );
};

const createStyles = (theme: ReturnType<typeof useTheme>) =>
  StyleSheet.create({
    header: {
      flexDirection: "row",
      alignItems: "center",
      gap: theme.spacing.sm,
      marginBottom: theme.spacing.md
    },
    iconButton: {
      width: 40,
      height: 40,
      borderRadius: theme.radius.pill,
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: theme.colors.elevated
    },
    kicker: {
      ...theme.typography.caption,
      color: theme.colors.primary,
      textTransform: "uppercase"
    },
    title: {
      ...theme.typography.title,
      color: theme.colors.text,
      marginBottom: theme.spacing.md
    },
    card: {
      marginBottom: theme.spacing.md
    },
    body: {
      ...theme.typography.body,
      color: theme.colors.text
    }
  });
