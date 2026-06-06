// Guvenlik aksiyonlari gibi alt panel akislari icin basit bottom sheet.
import type { PropsWithChildren } from "react";
import { Modal, Pressable, StyleSheet, View } from "react-native";
import Animated, { FadeIn, SlideInDown, SlideOutDown } from "react-native-reanimated";
import { useTheme } from "@/shared/theme";

interface BottomSheetProps extends PropsWithChildren {
  visible: boolean;
  onClose: () => void;
}

export const BottomSheet = ({ visible, onClose, children }: BottomSheetProps) => {
  const theme = useTheme();
  const styles = createStyles(theme);

  return (
    <Modal animationType="none" transparent visible={visible} onRequestClose={onClose}>
      <Animated.View entering={FadeIn.duration(160)} style={styles.overlay}>
        <Pressable style={StyleSheet.absoluteFill} onPress={onClose} />
        <Animated.View entering={SlideInDown.springify().damping(18)} exiting={SlideOutDown} style={styles.sheet}>
          <View style={styles.handle} />
          {children}
        </Animated.View>
      </Animated.View>
    </Modal>
  );
};

const createStyles = (theme: ReturnType<typeof useTheme>) =>
  StyleSheet.create({
    overlay: {
      flex: 1,
      justifyContent: "flex-end",
      backgroundColor: theme.colors.overlay
    },
    sheet: {
      borderTopLeftRadius: theme.radius.lg,
      borderTopRightRadius: theme.radius.lg,
      padding: theme.spacing.lg,
      gap: theme.spacing.sm,
      backgroundColor: theme.colors.surface
    },
    handle: {
      alignSelf: "center",
      width: 44,
      height: 4,
      borderRadius: theme.radius.pill,
      backgroundColor: theme.colors.border,
      marginBottom: theme.spacing.sm
    }
  });
