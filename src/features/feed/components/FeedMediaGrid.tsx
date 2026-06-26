import { useState } from "react";
import {
  Image,
  Modal,
  Pressable,
  StyleSheet,
  type StyleProp,
  Text,
  type GestureResponderEvent,
  View,
  type ViewStyle,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useTheme } from "@/shared/theme";

interface FeedMediaGridProps {
  imageUrls: string[];
  accessibilityLabel: string;
  compact?: boolean;
}

export const FeedMediaGrid = ({
  imageUrls,
  accessibilityLabel,
  compact = false,
}: FeedMediaGridProps) => {
  const theme = useTheme();
  const styles = createStyles(theme);
  const urls = imageUrls.filter(Boolean).slice(0, 4);
  const [activeIndex, setActiveIndex] = useState<number | null>(null);

  const openImage = (index: number) => (event: GestureResponderEvent) => {
    event.stopPropagation();
    setActiveIndex(index);
  };

  const closeImage = (event?: GestureResponderEvent) => {
    event?.stopPropagation();
    setActiveIndex(null);
  };

  const showPrevious = (event: GestureResponderEvent) => {
    event.stopPropagation();
    setActiveIndex((current) =>
      current === null ? 0 : (current - 1 + urls.length) % urls.length,
    );
  };

  const showNext = (event: GestureResponderEvent) => {
    event.stopPropagation();
    setActiveIndex((current) =>
      current === null ? 0 : (current + 1) % urls.length,
    );
  };

  if (urls.length === 0) {
    return null;
  }

  const renderTile = (
    url: string,
    index: number,
    style?: StyleProp<ViewStyle>,
  ) => (
    <Pressable
      key={`${url}-${index}`}
      accessibilityRole="imagebutton"
      accessibilityLabel={`${accessibilityLabel} ${index + 1} büyüt`}
      onPress={openImage(index)}
      style={({ pressed }) => [
        styles.tile,
        style,
        pressed && styles.pressed,
      ]}
    >
      <Image
        accessibilityLabel={`${accessibilityLabel} ${index + 1}`}
        source={{ uri: url }}
        resizeMode="cover"
        style={styles.gridImage}
      />
    </Pressable>
  );

  const viewer = (
    <Modal
      visible={activeIndex !== null}
      animationType="fade"
      transparent
      statusBarTranslucent
      onRequestClose={() => setActiveIndex(null)}
    >
      <Pressable style={styles.viewer} onPress={closeImage}>
        <View style={styles.viewerTopBar}>
          <Text style={styles.viewerCounter}>
            {(activeIndex ?? 0) + 1}/{urls.length}
          </Text>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Fotoğrafı kapat"
            onPress={closeImage}
            style={styles.viewerButton}
          >
            <Ionicons name="close" size={24} color="#FFFFFF" />
          </Pressable>
        </View>
        <Pressable
          accessibilityRole="image"
          accessibilityLabel={`${accessibilityLabel} büyütülmüş görünüm`}
          onPress={(event) => event.stopPropagation()}
          style={styles.viewerImageFrame}
        >
          {activeIndex !== null ? (
            <Image
              source={{ uri: urls[activeIndex] }}
              resizeMode="contain"
              style={styles.viewerImage}
            />
          ) : null}
        </Pressable>
        {urls.length > 1 ? (
          <View style={styles.viewerControls}>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Önceki fotoğraf"
              onPress={showPrevious}
              style={styles.viewerNavButton}
            >
              <Ionicons name="chevron-back" size={28} color="#FFFFFF" />
            </Pressable>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Sonraki fotoğraf"
              onPress={showNext}
              style={styles.viewerNavButton}
            >
              <Ionicons name="chevron-forward" size={28} color="#FFFFFF" />
            </Pressable>
          </View>
        ) : null}
      </Pressable>
    </Modal>
  );

  if (urls.length === 1) {
    const imageUrl = urls[0];

    if (!imageUrl) {
      return null;
    }

    return (
      <>
        <Pressable
          accessibilityRole="imagebutton"
          accessibilityLabel={`${accessibilityLabel} büyüt`}
          onPress={openImage(0)}
          style={({ pressed }) => [pressed && styles.pressed]}
        >
          <Image
            accessibilityLabel={accessibilityLabel}
            source={{ uri: imageUrl }}
            resizeMode="cover"
            style={[styles.singleImage, compact && styles.compactSingleImage]}
          />
        </Pressable>
        {viewer}
      </>
    );
  }

  return (
    <>
      {urls.length === 2 ? (
        <View style={[styles.grid, styles.twoGrid, compact && styles.compactGrid]}>
          {urls.map((url, index) => renderTile(url, index, styles.halfTile))}
        </View>
      ) : urls.length === 3 ? (
        <View style={[styles.grid, styles.threeGrid, compact && styles.compactGrid]}>
          {renderTile(urls[0] ?? "", 0, styles.featureTile)}
          <View style={styles.stackColumn}>
            {urls.slice(1).map((url, index) =>
              renderTile(url, index + 1, styles.stackTile),
            )}
          </View>
        </View>
      ) : (
        <View style={[styles.grid, styles.fourGrid, compact && styles.compactGrid]}>
          {urls.map((url, index) =>
            renderTile(url, index, [
              styles.quarterTile,
              compact && styles.compactQuarterTile,
            ]),
          )}
        </View>
      )}
      {viewer}
    </>
  );
};

const createStyles = (theme: ReturnType<typeof useTheme>) =>
  StyleSheet.create({
    singleImage: {
      width: "100%",
      aspectRatio: 4 / 3,
      borderRadius: 22,
      backgroundColor: theme.colors.elevated,
    },
    compactSingleImage: {
      aspectRatio: 16 / 10,
      borderRadius: 16,
    },
    grid: {
      width: "100%",
      borderRadius: 22,
      overflow: "hidden",
      flexDirection: "row",
      gap: 4,
      backgroundColor: theme.colors.elevated,
    },
    twoGrid: {
      height: 238,
    },
    threeGrid: {
      height: 258,
    },
    fourGrid: {
      minHeight: 238,
      flexWrap: "wrap",
    },
    compactGrid: {
      height: 158,
      minHeight: 0,
      borderRadius: 16,
    },
    tile: {
      backgroundColor: theme.colors.elevated,
      overflow: "hidden",
    },
    halfTile: {
      flex: 1,
    },
    featureTile: {
      flex: 1.1,
    },
    stackColumn: {
      flex: 0.9,
      gap: 4,
    },
    stackTile: {
      flex: 1,
    },
    quarterTile: {
      width: "49.4%",
      height: 117,
    },
    compactQuarterTile: {
      height: 77,
    },
    gridImage: {
      width: "100%",
      height: "100%",
    },
    viewer: {
      flex: 1,
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: "rgba(0, 0, 0, 0.96)",
    },
    viewerImageFrame: {
      width: "100%",
      height: "78%",
      alignItems: "center",
      justifyContent: "center",
    },
    viewerTopBar: {
      position: "absolute",
      top: 52,
      left: 20,
      right: 20,
      zIndex: 2,
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
    },
    viewerCounter: {
      color: "#FFFFFF",
      fontSize: 14,
      lineHeight: 18,
      fontWeight: "800",
    },
    viewerButton: {
      width: 44,
      height: 44,
      borderRadius: 22,
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: "rgba(255, 255, 255, 0.14)",
    },
    viewerImage: {
      width: "100%",
      height: "100%",
    },
    viewerControls: {
      position: "absolute",
      left: 20,
      right: 20,
      bottom: 50,
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
    },
    viewerNavButton: {
      width: 50,
      height: 50,
      borderRadius: 25,
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: "rgba(255, 255, 255, 0.14)",
    },
    pressed: {
      opacity: 0.9,
    },
  });
