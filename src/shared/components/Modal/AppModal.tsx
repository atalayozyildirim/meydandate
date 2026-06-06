// Eslesme ve raporlama gibi odakli akislarda kullanilan modal kapsayici.
import type { PropsWithChildren } from "react";
import { Modal, Pressable, StyleSheet, View } from "react-native";
import { useTheme } from "@/shared/theme";

interface AppModalProps extends PropsWithChildren {
  visible: boolean;
  onClose: () => void;
}

export const AppModal = ({ visible, onClose, children }: AppModalProps) => {
  const theme = useTheme();
  const styles = createStyles(theme);

  return (
    <Modal animationType="fade" transparent visible={visible} onRequestClose={onClose}>
      <Pressable style={styles.overlay} onPress={onClose}>
        <Pressable style={styles.content}>{children}</Pressable>
      </Pressable>
    </Modal>
  );
};

const createStyles = (theme: ReturnType<typeof useTheme>) =>
  StyleSheet.create({
    overlay: {
      flex: 1,
      alignItems: "center",
      justifyContent: "center",
      padding: theme.spacing.lg,
      backgroundColor: theme.colors.overlay
    },
    content: {
      width: "100%",
      maxWidth: 420,
      borderRadius: theme.radius.lg,
      padding: theme.spacing.lg,
      backgroundColor: theme.colors.surface
    }
  });
