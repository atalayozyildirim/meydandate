// Karsilikli begeni oldugunda modern eslesme modalini gosterir.
import { StyleSheet, Text, View } from "react-native";
import { useRouter } from "expo-router";
import type { Match } from "@/domain/entities/Match";
import { Avatar } from "@/shared/components/Avatar";
import { Button } from "@/shared/components/Button";
import { AppModal } from "@/shared/components/Modal";
import { useAuthStore } from "@/features/auth/stores/authStore";
import { useTheme } from "@/shared/theme";

interface MatchModalProps {
  match: Match | null;
  visible: boolean;
  onClose: () => void;
}

export const MatchModal = ({ match, visible, onClose }: MatchModalProps) => {
  const router = useRouter();
  const theme = useTheme();
  const styles = createStyles(theme);
  const currentUser = useAuthStore((state) => state.currentUser);

  if (!match || !currentUser) {
    return null;
  }

  const partner = match.users.find((user) => user.id !== currentUser.id) ?? match.users[1];

  return (
    <AppModal visible={visible} onClose={onClose}>
      <View style={styles.content}>
        <Text style={styles.title}>Eslesme olustu!</Text>
        <Text style={styles.subtitle}>{partner.name} ile karsilikli begeni yakaladiniz.</Text>
        <View style={styles.avatarRow}>
          <Avatar name={currentUser.name} uri={currentUser.photos[0]?.uri} size={86} />
          <Avatar name={partner.name} uri={partner.photos[0]?.uri} size={86} />
        </View>
        <Button
          label="Mesaj gonder"
          onPress={() => {
            onClose();
            router.push("/tabs/chat");
          }}
        />
        <Button label="Devam et" variant="ghost" onPress={onClose} />
      </View>
    </AppModal>
  );
};

const createStyles = (theme: ReturnType<typeof useTheme>) =>
  StyleSheet.create({
    content: {
      gap: theme.spacing.md,
      alignItems: "center"
    },
    title: {
      ...theme.typography.title,
      color: theme.colors.primary,
      textAlign: "center"
    },
    subtitle: {
      ...theme.typography.body,
      color: theme.colors.muted,
      textAlign: "center"
    },
    avatarRow: {
      flexDirection: "row",
      gap: theme.spacing.md,
      marginVertical: theme.spacing.sm
    }
  });
