import { Pressable, StyleSheet, Text, View } from "react-native";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useTheme } from "@/shared/theme";

interface AuthLegalNoticeProps {
  accepted?: boolean;
  onToggleAccepted?: () => void;
  requireAcceptance?: boolean;
}

export const AuthLegalNotice = ({
  accepted = false,
  onToggleAccepted,
  requireAcceptance = false,
}: AuthLegalNoticeProps) => {
  const router = useRouter();
  const theme = useTheme();
  const styles = createStyles(theme, accepted);

  const openLegal = (path: string) => {
    router.push(path);
  };

  const copy = requireAcceptance
    ? "Kayıt olarak aşağıdaki belgeleri okuduğunu ve kabul ettiğini onaylıyorsun."
    : "Devam ederek aşağıdaki belgelerdeki koşulları kabul etmiş olursun.";

  return (
    <View style={styles.container}>
      {requireAcceptance ? (
        <Pressable
          accessibilityRole="checkbox"
          accessibilityState={{ checked: accepted }}
          onPress={onToggleAccepted}
          style={styles.acceptanceRow}
        >
          <View style={styles.checkbox}>
            {accepted ? (
              <Ionicons
                name="checkmark"
                size={15}
                color={theme.colors.onPrimary}
              />
            ) : null}
          </View>
          <Text style={styles.copy}>{copy}</Text>
        </Pressable>
      ) : (
        <Text style={styles.copy}>{copy}</Text>
      )}

      <View style={styles.linkRow}>
        <Pressable onPress={() => openLegal("/legal/terms-of-service")}>
          <Text style={styles.link}>Kullanım Şartları</Text>
        </Pressable>
        <Text style={styles.separator}>•</Text>
        <Pressable onPress={() => openLegal("/legal/privacy-policy")}>
          <Text style={styles.link}>Gizlilik Politikası</Text>
        </Pressable>
        <Text style={styles.separator}>•</Text>
        <Pressable onPress={() => openLegal("/legal/consent-management")}>
          <Text style={styles.link}>Rıza Yönetimi</Text>
        </Pressable>
      </View>
    </View>
  );
};

const createStyles = (theme: ReturnType<typeof useTheme>, accepted: boolean) =>
  StyleSheet.create({
    container: {
      gap: theme.spacing.xs,
      paddingTop: theme.spacing.xs,
    },
    acceptanceRow: {
      flexDirection: "row",
      alignItems: "flex-start",
      gap: theme.spacing.sm,
    },
    checkbox: {
      width: 22,
      height: 22,
      borderRadius: theme.radius.sm,
      alignItems: "center",
      justifyContent: "center",
      borderWidth: 1,
      borderColor: accepted ? theme.colors.primary : theme.colors.border,
      backgroundColor: accepted ? theme.colors.primary : theme.colors.surface,
      marginTop: 1,
    },
    copy: {
      ...theme.typography.caption,
      flex: 1,
      color: theme.colors.muted,
    },
    linkRow: {
      flexDirection: "row",
      flexWrap: "wrap",
      alignItems: "center",
      justifyContent: "center",
      gap: theme.spacing.xs,
    },
    link: {
      ...theme.typography.caption,
      color: theme.colors.primary,
    },
    separator: {
      ...theme.typography.caption,
      color: theme.colors.muted,
    },
  });
