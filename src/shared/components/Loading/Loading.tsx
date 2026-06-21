// Yukleme durumlari icin markali, hafif animasyonlu bekleme ekrani gosterir.
import { useEffect, useRef } from "react";
import { Animated, Easing, StyleSheet, Text, View } from "react-native";
import { useTheme } from "@/shared/theme";

interface LoadingProps {
  label?: string;
}

export const Loading = ({ label = "Yukleniyor" }: LoadingProps) => {
  const theme = useTheme();
  const styles = createStyles(theme);
  const progress = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const animation = Animated.loop(
      Animated.timing(progress, {
        toValue: 1,
        duration: 1450,
        easing: Easing.inOut(Easing.quad),
        useNativeDriver: true,
      }),
    );

    animation.start();

    return () => animation.stop();
  }, [progress]);

  const markStyle = {
    opacity: progress.interpolate({
      inputRange: [0, 0.5, 1],
      outputRange: [0.88, 1, 0.88],
    }),
    transform: [
      {
        scale: progress.interpolate({
          inputRange: [0, 0.5, 1],
          outputRange: [0.98, 1, 0.98],
        }),
      },
    ],
  };
  const barStyle = {
    transform: [
      {
        translateX: progress.interpolate({
          inputRange: [0, 1],
          outputRange: [-46, 46],
        }),
      },
    ],
  };

  return (
    <View style={styles.container}>
      <Animated.View style={[styles.mark, markStyle]}>
        <Text style={styles.letter}>e</Text>
      </Animated.View>
      <Text style={styles.label}>{label}</Text>
      <View style={styles.track}>
        <Animated.View style={[styles.indicator, barStyle]} />
      </View>
      <Text style={styles.subLabel}>Hazırlanıyor</Text>
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
      backgroundColor: theme.colors.background,
      paddingHorizontal: theme.spacing.xl,
    },
    mark: {
      width: 78,
      height: 78,
      borderRadius: 24,
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: theme.colors.elevated,
      borderWidth: 1,
      borderColor: theme.colors.border,
      shadowColor: theme.colors.shadow,
      shadowOpacity: theme.isDark ? 0 : 1,
      shadowRadius: 18,
      shadowOffset: { width: 0, height: 10 },
      elevation: 2,
    },
    letter: {
      fontSize: 58,
      lineHeight: 64,
      fontWeight: "900",
      color: theme.colors.text,
    },
    label: {
      ...theme.typography.subheading,
      color: theme.colors.text,
      marginTop: theme.spacing.sm,
      textAlign: "center",
    },
    track: {
      width: 132,
      height: 3,
      borderRadius: theme.radius.pill,
      overflow: "hidden",
      backgroundColor: theme.colors.elevated,
      marginTop: theme.spacing.xs,
    },
    indicator: {
      width: 42,
      height: 3,
      borderRadius: theme.radius.pill,
      backgroundColor: theme.colors.text,
    },
    subLabel: {
      ...theme.typography.caption,
      color: theme.colors.muted,
      textAlign: "center",
    },
  });
