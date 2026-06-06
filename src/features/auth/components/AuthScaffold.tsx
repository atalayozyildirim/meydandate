// Auth ekranlarında sade Ehlibyte giriş/kayıt form düzenini sunar.
import type { PropsWithChildren } from "react";
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useTheme } from "@/shared/theme";

interface AuthScaffoldProps extends PropsWithChildren {
  title: string;
  subtitle: string;
}

export const AuthScaffold = ({ title, subtitle, children }: AuthScaffoldProps) => {
  const theme = useTheme();
  const styles = createStyles(theme);

  return (
    <SafeAreaView style={styles.safeArea}>
      <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} style={styles.keyboard}>
        <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
          <View style={styles.topBar}>
            <View style={styles.logoRow}>
              <View style={styles.brandMark}>
                <Text style={styles.brandLetter}>e</Text>
              </View>
              <Text style={styles.appName}>ehlibyte</Text>
            </View>
          </View>

          <View style={styles.formBlock}>
            <Text style={styles.title}>{title}</Text>
            <Text style={styles.subtitle}>{subtitle}</Text>
            <View style={styles.form}>{children}</View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const createStyles = (theme: ReturnType<typeof useTheme>) =>
  StyleSheet.create({
    safeArea: {
      flex: 1,
      backgroundColor: theme.colors.background
    },
    keyboard: {
      flex: 1
    },
    content: {
      flexGrow: 1,
      justifyContent: "space-between",
      paddingHorizontal: theme.spacing.lg,
      paddingVertical: theme.spacing.xl,
      gap: theme.spacing.xl
    },
    topBar: {
      paddingTop: theme.spacing.sm
    },
    logoRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: theme.spacing.sm
    },
    brandMark: {
      width: 42,
      height: 42,
      borderRadius: 13,
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: theme.colors.primary,
    },
    brandLetter: {
      fontSize: 26,
      lineHeight: 30,
      fontWeight: "900",
      color: "#FFFFFF"
    },
    appName: {
      ...theme.typography.heading,
      color: theme.colors.text
    },
    formBlock: {
      justifyContent: "center",
      gap: theme.spacing.xs,
      paddingBottom: theme.spacing.xxl
    },
    title: {
      fontSize: 38,
      lineHeight: 44,
      fontWeight: "900",
      color: "#111827"
    },
    subtitle: {
      ...theme.typography.body,
      color: "#6B7280",
      marginBottom: theme.spacing.lg
    },
    form: {
      gap: theme.spacing.md
    }
  });
