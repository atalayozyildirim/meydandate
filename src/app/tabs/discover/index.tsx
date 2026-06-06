// Discover sekmesi swipe kartlarini, animasyonlari ve match modalini calistirir.
import { useEffect, useState } from "react";
import { Pressable, StyleSheet, Text, useWindowDimensions, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { Gesture, GestureDetector } from "react-native-gesture-handler";
import Animated, {
  interpolate,
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withSpring
} from "react-native-reanimated";
import type { LikeAction, Match } from "@/domain/entities/Match";
import type { User } from "@/domain/entities/User";
import { SwipeProfileCard } from "@/features/discover/components/SwipeProfileCard";
import { useDiscoverDeck } from "@/features/discover/hooks/useDiscoverDeck";
import { AdMobBanner } from "@/features/ads";
import { MatchModal } from "@/features/match/components/MatchModal";
import { SafetySheet } from "@/features/profile/components/SafetySheet";
import { EmptyState } from "@/shared/components/EmptyState";
import { Loading } from "@/shared/components/Loading";
import { Screen } from "@/shared/components/Screen";
import { useTheme } from "@/shared/theme";

const SWIPE_THRESHOLD = 110;
const SUPER_LIKE_THRESHOLD = -120;
const OFFSCREEN_DISTANCE = 520;
const MAX_ROTATION_DEGREES = 14;

export default function DiscoverScreen() {
  const theme = useTheme();
  const styles = createStyles(theme);
  const { height } = useWindowDimensions();
  const { deck, isLoading, swipe } = useDiscoverDeck();
  const [activeSafetyUser, setActiveSafetyUser] = useState<User | null>(null);
  const [match, setMatch] = useState<Match | null>(null);
  const [isMatchVisible, setIsMatchVisible] = useState(false);
  const activeCard = deck[0];
  const cardHeight = Math.min(Math.max(height * 0.58, 430), 540);
  const translateX = useSharedValue(0);
  const translateY = useSharedValue(0);

  useEffect(() => {
    translateX.value = 0;
    translateY.value = 0;
  }, [activeCard?.user.id, translateX, translateY]);

  const completeSwipe = async (action: LikeAction) => {
    if (!activeCard) {
      return;
    }

    const createdMatch = await swipe(activeCard.user.id, action);

    if (createdMatch) {
      setMatch(createdMatch);
      setIsMatchVisible(true);
    }

    translateX.value = 0;
    translateY.value = 0;
  };

  const gesture = Gesture.Pan()
    .onUpdate((event) => {
      translateX.value = event.translationX;
      translateY.value = event.translationY;
    })
    .onEnd((event) => {
      if (event.translationY < SUPER_LIKE_THRESHOLD) {
        translateY.value = withSpring(-OFFSCREEN_DISTANCE, {}, () => runOnJS(completeSwipe)("super_like"));
        return;
      }

      if (event.translationX > SWIPE_THRESHOLD) {
        translateX.value = withSpring(OFFSCREEN_DISTANCE, {}, () => runOnJS(completeSwipe)("like"));
        return;
      }

      if (event.translationX < -SWIPE_THRESHOLD) {
        translateX.value = withSpring(-OFFSCREEN_DISTANCE, {}, () => runOnJS(completeSwipe)("pass"));
        return;
      }

      translateX.value = withSpring(0);
      translateY.value = withSpring(0);
    });

  const animatedStyle = useAnimatedStyle(() => {
    const rotation = interpolate(
      translateX.value,
      [-SWIPE_THRESHOLD, 0, SWIPE_THRESHOLD],
      [-MAX_ROTATION_DEGREES, 0, MAX_ROTATION_DEGREES]
    );

    return {
      transform: [
        { translateX: translateX.value },
        { translateY: translateY.value },
        { rotate: `${rotation}deg` }
      ]
    };
  });

  if (isLoading) {
    return <Loading label="Profiller hazirlaniyor" />;
  }

  return (
    <Screen scroll={false} style={styles.screen}>
      <View style={styles.header}>
        <View>
          <Text style={styles.kicker}>Ehlibyte</Text>
          <Text style={styles.title}>Keşfet</Text>
        </View>
        <View style={styles.countBadge}>
          <Ionicons name="flame" size={15} color={theme.colors.primary} />
          <Text style={styles.count}>{deck.length}</Text>
        </View>
      </View>

      {activeCard ? (
        <>
          <View style={[styles.deckArea, { height: cardHeight }]}>
            <GestureDetector gesture={gesture}>
              <Animated.View style={[styles.deckCard, animatedStyle]}>
                <SwipeProfileCard
                  user={activeCard.user}
                  compatibility={activeCard.compatibility}
                  height={cardHeight}
                  onOpenSafety={() => setActiveSafetyUser(activeCard.user)}
                />
              </Animated.View>
            </GestureDetector>
          </View>
          <View style={styles.actions}>
            <Pressable style={[styles.roundAction, styles.passAction]} onPress={() => void completeSwipe("pass")}>
              <Ionicons name="close" size={28} color={theme.colors.danger} />
            </Pressable>
            <Pressable style={[styles.roundAction, styles.superAction]} onPress={() => void completeSwipe("super_like")}>
              <Ionicons name="star" size={24} color={theme.colors.secondary} />
            </Pressable>
            <Pressable style={[styles.roundAction, styles.likeAction]} onPress={() => void completeSwipe("like")}>
              <Ionicons name="heart" size={28} color={theme.colors.primary} />
            </Pressable>
          </View>
          <AdMobBanner style={styles.adBanner} />
        </>
      ) : (
        <EmptyState
          title="Simdilik yeni profil yok"
          description="Yeni profiller geldiginde Discover akisi otomatik yenilenecek."
        />
      )}

      <SafetySheet visible={Boolean(activeSafetyUser)} user={activeSafetyUser} onClose={() => setActiveSafetyUser(null)} />
      <MatchModal match={match} visible={isMatchVisible} onClose={() => setIsMatchVisible(false)} />
    </Screen>
  );
}

const createStyles = (theme: ReturnType<typeof useTheme>) =>
  StyleSheet.create({
    screen: {
      gap: theme.spacing.sm,
      paddingHorizontal: theme.spacing.md,
      paddingTop: theme.spacing.sm,
      paddingBottom: 98
    },
    header: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      minHeight: 48
    },
    kicker: {
      ...theme.typography.caption,
      color: theme.colors.primary,
      textTransform: "uppercase"
    },
    title: {
      ...theme.typography.heading,
      color: theme.colors.text
    },
    count: {
      ...theme.typography.caption,
      color: theme.colors.primary
    },
    countBadge: {
      minHeight: 34,
      borderRadius: theme.radius.pill,
      flexDirection: "row",
      alignItems: "center",
      gap: theme.spacing.xxs,
      paddingHorizontal: theme.spacing.sm,
      backgroundColor: theme.colors.surface,
      borderWidth: 1,
      borderColor: "rgba(233, 64, 87, 0.14)"
    },
    deckArea: {
      width: "100%",
      justifyContent: "center"
    },
    deckCard: {
      height: "100%",
      justifyContent: "center"
    },
    actions: {
      flexDirection: "row",
      justifyContent: "center",
      alignItems: "center",
      gap: theme.spacing.lg,
      marginTop: -30,
      zIndex: 4
    },
    adBanner: {
      marginHorizontal: theme.spacing.sm
    },
    roundAction: {
      width: 58,
      height: 58,
      borderRadius: theme.radius.pill,
      alignItems: "center",
      justifyContent: "center",
      borderWidth: 1,
      backgroundColor: theme.colors.surface,
      shadowColor: theme.colors.shadow,
      shadowOpacity: 1,
      shadowRadius: 18,
      shadowOffset: { width: 0, height: 10 },
      elevation: 5
    },
    passAction: {
      borderColor: theme.colors.danger
    },
    superAction: {
      borderColor: theme.colors.secondary
    },
    likeAction: {
      borderColor: theme.colors.primary
    }
  });
