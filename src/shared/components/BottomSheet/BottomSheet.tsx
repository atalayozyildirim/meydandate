// Guvenlik aksiyonlari gibi alt panel akislari icin basit bottom sheet.
import { useEffect, useState, type PropsWithChildren } from "react";
import { Modal, Pressable, StyleSheet, useWindowDimensions, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Animated, {
  Easing,
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from "react-native-reanimated";
import { useTheme } from "@/shared/theme";

interface BottomSheetProps extends PropsWithChildren {
  visible: boolean;
  onClose: () => void;
}

export const BottomSheet = ({ visible, onClose, children }: BottomSheetProps) => {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const { height } = useWindowDimensions();
  const [isMounted, setIsMounted] = useState(visible);
  const progress = useSharedValue(0);
  const styles = createStyles(theme);

  useEffect(() => {
    if (visible) {
      setIsMounted(true);
      return;
    }

    progress.value = withTiming(
      0,
      {
        duration: 180,
        easing: Easing.in(Easing.cubic),
      },
      (finished) => {
        if (finished) {
          runOnJS(setIsMounted)(false);
        }
      },
    );
  }, [progress, visible]);

  useEffect(() => {
    if (!isMounted || !visible) {
      return;
    }

    progress.value = 0;
    progress.value = withTiming(1, {
      duration: 240,
      easing: Easing.out(Easing.cubic),
    });
  }, [isMounted, progress, visible]);

  const overlayStyle = useAnimatedStyle(() => ({
    opacity: progress.value,
  }));

  const sheetAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: (1 - progress.value) * height }],
  }));

  if (!isMounted) {
    return null;
  }

  return (
    <Modal
      animationType="none"
      presentationStyle="overFullScreen"
      transparent
      visible={isMounted}
      statusBarTranslucent
      onRequestClose={onClose}
    >
      <Animated.View
        style={[styles.overlay, overlayStyle]}
      >
        <Pressable style={StyleSheet.absoluteFill} onPress={onClose} />
        <Animated.View
          style={[
            styles.sheet,
            sheetAnimatedStyle,
            {
              paddingBottom: Math.max(
                insets.bottom + theme.spacing.md,
                theme.spacing.lg,
              ),
            },
          ]}
        >
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
      ...StyleSheet.absoluteFillObject,
      justifyContent: "flex-end",
      backgroundColor: theme.colors.overlay
    },
    sheet: {
      position: "absolute",
      left: 0,
      right: 0,
      bottom: 0,
      maxHeight: "88%",
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
