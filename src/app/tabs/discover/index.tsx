// Discover sekmesi swipe kartlarini, animasyonlari ve match modalini calistirir.
import { useEffect, useState } from "react";
import {
  Alert,
  Pressable,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { Gesture, GestureDetector } from "react-native-gesture-handler";
import Animated, {
  interpolate,
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withSequence,
  withSpring,
  withTiming,
} from "react-native-reanimated";
import type { LikeAction, Match } from "@/domain/entities/Match";
import type { User } from "@/domain/entities/User";
import { SwipeProfileCard } from "@/features/discover/components/SwipeProfileCard";
import { useDiscoverDeck } from "@/features/discover/hooks/useDiscoverDeck";
import { useFire } from "@/features/fire/hooks/useFire";
import { AdMobBanner } from "@/features/ads";
import { MatchModal } from "@/features/match/components/MatchModal";
import { SafetySheet } from "@/features/profile/components/SafetySheet";
import { useAuthStore } from "@/features/auth/stores/authStore";
import { Avatar } from "@/shared/components/Avatar";
import { Button } from "@/shared/components/Button";
import { EmptyState } from "@/shared/components/EmptyState";
import { Loading } from "@/shared/components/Loading";
import { Screen } from "@/shared/components/Screen";
import { useTheme } from "@/shared/theme";

const SWIPE_THRESHOLD = 110;
const SUPER_LIKE_THRESHOLD = -120;
const OFFSCREEN_DISTANCE = 520;
const MAX_ROTATION_DEGREES = 14;

export default function DiscoverScreen() {
  const router = useRouter();
  const theme = useTheme();
  const styles = createStyles(theme);
  const currentUser = useAuthStore((state) => state.currentUser);
  const { height } = useWindowDimensions();
  const {
    deck,
    specialInvite,
    isLoading,
    isRefreshing,
    isSwiping,
    isHandlingSpecialInvite,
    swipe,
    refresh,
    acceptSpecialInvite,
    declineSpecialInvite,
  } = useDiscoverDeck();
  const { fireBalance, sendFire, isSendingFire } = useFire();
  const [activeSafetyUser, setActiveSafetyUser] = useState<User | null>(null);
  const [match, setMatch] = useState<Match | null>(null);
  const [isMatchVisible, setIsMatchVisible] = useState(false);

  const activeCard = deck[0];
  const nextCard = deck[1];
  const cardHeight = Math.min(Math.max(height * 0.58, 430), 540);
  const translateX = useSharedValue(0);
  const translateY = useSharedValue(0);
  const fireScale = useSharedValue(1);

  useEffect(() => {
    translateX.value = 0;
    translateY.value = 0;
  }, [activeCard?.user.id, translateX, translateY]);

  const completeSwipe = async (action: LikeAction) => {
    if (!activeCard) {
      return;
    }

    if (action === "super_like" && !currentUser?.isPremium) {
      translateX.value = 0;
      translateY.value = 0;
      Alert.alert(
        "Premium gerekli",
        "Super Like, Ehlibyte Premium ile kullanılabilir.",
        [
          { text: "Vazgeç", style: "cancel" },
          {
            text: "Premium'u incele",
            onPress: () => router.push("/tabs/store"),
          },
        ],
      );
      return;
    }

    try {
      const createdMatch = await swipe(activeCard.user.id, action);

      if (createdMatch) {
        setMatch(createdMatch);
        setIsMatchVisible(true);
      }
    } catch (error) {
      Alert.alert(
        "Swipe hatası",
        error instanceof Error
          ? error.message
          : "İşlem tamamlanamadı, lütfen tekrar dene.",
      );
    } finally {
      translateX.value = 0;
      translateY.value = 0;
    }
  };

  const handleAcceptSpecialInvite = async () => {
    if (!specialInvite) {
      return;
    }

    try {
      const createdMatch = await acceptSpecialInvite(specialInvite.id);
      setMatch(createdMatch);
      setIsMatchVisible(true);
    } catch (error) {
      Alert.alert(
        "Davet hatası",
        error instanceof Error ? error.message : "Davet kabul edilemedi.",
      );
    }
  };

  const handleDeclineSpecialInvite = async () => {
    if (!specialInvite) {
      return;
    }

    try {
      await declineSpecialInvite(specialInvite.id);
    } catch (error) {
      Alert.alert(
        "Davet hatası",
        error instanceof Error ? error.message : "Davet geçilemedi.",
      );
    }
  };

  const gesture = Gesture.Pan()
    .onUpdate((event) => {
      translateX.value = event.translationX;
      translateY.value = event.translationY;
    })
    .onEnd((event) => {
      if (event.translationY < SUPER_LIKE_THRESHOLD) {
        translateY.value = withSpring(-OFFSCREEN_DISTANCE, {}, () =>
          runOnJS(completeSwipe)("super_like"),
        );
        return;
      }

      if (event.translationX > SWIPE_THRESHOLD) {
        translateX.value = withSpring(OFFSCREEN_DISTANCE, {}, () =>
          runOnJS(completeSwipe)("like"),
        );
        return;
      }

      if (event.translationX < -SWIPE_THRESHOLD) {
        translateX.value = withSpring(-OFFSCREEN_DISTANCE, {}, () =>
          runOnJS(completeSwipe)("pass"),
        );
        return;
      }

      translateX.value = withSpring(0);
      translateY.value = withSpring(0);
    });

  const animatedStyle = useAnimatedStyle(() => {
    const rotation = interpolate(
      translateX.value,
      [-SWIPE_THRESHOLD, 0, SWIPE_THRESHOLD],
      [-MAX_ROTATION_DEGREES, 0, MAX_ROTATION_DEGREES],
    );

    return {
      transform: [
        { translateX: translateX.value },
        { translateY: translateY.value },
        { rotate: `${rotation}deg` },
      ],
    };
  });

  const likeStampStyle = useAnimatedStyle(() => ({
    opacity: Math.min(Math.max(translateX.value / SWIPE_THRESHOLD, 0), 1),
    transform: [{ rotate: "-12deg" }],
  }));

  const passStampStyle = useAnimatedStyle(() => ({
    opacity: Math.min(Math.max(-translateX.value / SWIPE_THRESHOLD, 0), 1),
    transform: [{ rotate: "12deg" }],
  }));

  const superStampStyle = useAnimatedStyle(() => ({
    opacity: Math.min(
      Math.max(-translateY.value / Math.abs(SUPER_LIKE_THRESHOLD), 0),
      1,
    ),
  }));

  const fireButtonStyle = useAnimatedStyle(() => ({
    transform: [{ scale: fireScale.value }],
  }));

  const sendFireToActiveCard = async () => {
    if (!activeCard) {
      return;
    }

    if (fireBalance < 1) {
      Alert.alert("Fire bakiyesi yok", "Mağazadan Fire paketi alabilirsin.", [
        { text: "Vazgeç", style: "cancel" },
        { text: "Mağaza", onPress: () => router.push("/tabs/store") },
      ]);
      return;
    }

    try {
      fireScale.value = withSequence(
        withTiming(1.18, { duration: 110 }),
        withSpring(1),
      );
      await sendFire({ targetUserId: activeCard.user.id, amount: 1 });
    } catch (error) {
      Alert.alert(
        "Fire gönderilemedi",
        error instanceof Error ? error.message : "Tekrar deneyin.",
      );
    }
  };

  if (isLoading) {
    return <Loading label="Profiller hazırlanıyor" />;
  }

  return (
    <Screen scroll={false} style={styles.screen}>
      <View style={styles.header}>
        <View>
          <Text style={styles.kicker}>Ehlibyte</Text>
          <Text style={styles.title}>Keşfet</Text>
        </View>
        <View style={styles.headerActions}>
          <View style={styles.countBadge}>
            <Ionicons name="flame" size={15} color={theme.colors.primary} />
            <Text style={styles.count}>{fireBalance}</Text>
          </View>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Keşfet listesini yenile"
            disabled={isRefreshing}
            onPress={() => void refresh()}
            style={({ pressed }) => [
              styles.iconButton,
              pressed && styles.pressed,
            ]}
          >
            <Ionicons name="refresh" size={18} color={theme.colors.text} />
          </Pressable>
        </View>
      </View>

      {specialInvite ? (
        <View style={styles.specialInvitePanel}>
          <View style={styles.specialInviteHeader}>
            <Avatar
              name={specialInvite.inviter.name}
              uri={specialInvite.inviter.photos[0]?.uri}
              size={72}
            />
            <View style={styles.specialInviteText}>
              <Text style={styles.specialInviteTitle}>
                {specialInvite.inviter.name} seni tanımak istiyor
              </Text>
              <Text style={styles.specialInviteDescription}>
                Kabul edersen karşılıklı eşleşme oluşur ve sohbet açılır.
              </Text>
            </View>
          </View>
          <View style={styles.specialInviteActions}>
            <Button
              label="Geç"
              variant="ghost"
              disabled={isHandlingSpecialInvite}
              style={styles.specialInviteButton}
              onPress={() => void handleDeclineSpecialInvite()}
            />
            <Button
              label="Kabul et"
              loading={isHandlingSpecialInvite}
              style={styles.specialInviteButton}
              icon={<Ionicons name="heart" size={18} color="#FFFFFF" />}
              onPress={() => void handleAcceptSpecialInvite()}
            />
          </View>
        </View>
      ) : activeCard ? (
        <>
          <View style={[styles.deckArea, { height: cardHeight }]}>
            {nextCard ? (
              <View
                pointerEvents="none"
                style={[styles.deckCard, styles.nextDeckCard]}
              >
                <SwipeProfileCard
                  user={nextCard.user}
                  compatibility={nextCard.compatibility}
                  height={cardHeight}
                  onOpenSafety={() => undefined}
                />
              </View>
            ) : null}
            <GestureDetector gesture={gesture}>
              <Animated.View
                style={[styles.deckCard, styles.activeDeckCard, animatedStyle]}
              >
                <SwipeProfileCard
                  user={activeCard.user}
                  compatibility={activeCard.compatibility}
                  height={cardHeight}
                  onOpenSafety={() => setActiveSafetyUser(activeCard.user)}
                />
                <View pointerEvents="none" style={styles.stampLayer}>
                  <Animated.Text
                    style={[
                      styles.swipeStamp,
                      styles.likeStamp,
                      likeStampStyle,
                    ]}
                  >
                    BEĞEN
                  </Animated.Text>
                  <Animated.Text
                    style={[
                      styles.swipeStamp,
                      styles.passStamp,
                      passStampStyle,
                    ]}
                  >
                    GEÇ
                  </Animated.Text>
                  <Animated.Text
                    style={[
                      styles.swipeStamp,
                      styles.superStamp,
                      superStampStyle,
                    ]}
                  >
                    SÜPER
                  </Animated.Text>
                </View>
              </Animated.View>
            </GestureDetector>
          </View>
          <View style={styles.deckMeta}>
            <Text style={styles.deckMetaText}>
              {activeCard.user.profileKind === "member"
                ? "Sağa beğen, sola geç, yukarı Super Like"
                : "Starter öneri · beğenirsen sohbet açılır"}
            </Text>
            <View style={styles.progressDots}>
              {deck.slice(0, 4).map((item, index) => (
                <View
                  key={item.user.id}
                  style={[
                    styles.progressDot,
                    index === 0 && styles.progressDotActive,
                  ]}
                />
              ))}
            </View>
          </View>
          <View style={styles.actions}>
            <Pressable
              disabled={isSwiping}
              style={({ pressed }) => [
                styles.roundAction,
                styles.passAction,
                pressed && styles.pressed,
              ]}
              onPress={() => void completeSwipe("pass")}
            >
              <Ionicons name="close" size={28} color={theme.colors.danger} />
            </Pressable>
            <Pressable
              disabled={isSwiping}
              style={({ pressed }) => [
                styles.roundAction,
                styles.infoAction,
                pressed && styles.pressed,
              ]}
              onPress={() => router.push(`/tabs/profile/${activeCard.user.id}`)}
            >
              <Ionicons
                name="information"
                size={22}
                color={theme.colors.text}
              />
            </Pressable>
            <Pressable
              disabled={isSendingFire}
              style={({ pressed }) => [
                styles.roundAction,
                styles.fireAction,
                pressed && styles.pressed,
              ]}
              onPress={() => void sendFireToActiveCard()}
            >
              <Animated.View style={fireButtonStyle}>
                <Ionicons name="flame" size={25} color={theme.colors.primary} />
              </Animated.View>
              <Text style={styles.fireActionText}>Fire</Text>
            </Pressable>
            <Pressable
              disabled={isSwiping}
              style={({ pressed }) => [
                styles.roundAction,
                styles.superAction,
                pressed && styles.pressed,
              ]}
              onPress={() => void completeSwipe("super_like")}
            >
              <Ionicons name="star" size={24} color={theme.colors.secondary} />
            </Pressable>
            <Pressable
              disabled={isSwiping}
              style={({ pressed }) => [
                styles.roundAction,
                styles.likeAction,
                pressed && styles.pressed,
              ]}
              onPress={() => void completeSwipe("like")}
            >
              <Ionicons name="heart" size={28} color={theme.colors.primary} />
            </Pressable>
          </View>
          <AdMobBanner style={styles.adBanner} />
        </>
      ) : (
        <EmptyState
          title="Şimdilik yeni profil yok"
          description={
            currentUser?.matchByLocation
              ? "Yakında yeni profil yoksa Ayarlar'dan mesafe aralığını genişletebilirsin."
              : "Yeni profiller geldiğinde Discover akışı otomatik yenilenecek."
          }
        />
      )}

      <SafetySheet
        visible={Boolean(activeSafetyUser)}
        user={activeSafetyUser}
        onClose={() => setActiveSafetyUser(null)}
      />
      <MatchModal
        match={match}
        visible={isMatchVisible}
        onClose={() => setIsMatchVisible(false)}
      />
    </Screen>
  );
}

const createStyles = (theme: ReturnType<typeof useTheme>) =>
  StyleSheet.create({
    screen: {
      gap: theme.spacing.sm,
      paddingHorizontal: theme.spacing.md,
      paddingTop: theme.spacing.sm,
      paddingBottom: 98,
    },
    header: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      minHeight: 48,
    },
    kicker: {
      ...theme.typography.caption,
      color: theme.colors.primary,
      textTransform: "uppercase",
    },
    title: {
      ...theme.typography.heading,
      color: theme.colors.text,
    },
    count: {
      ...theme.typography.caption,
      color: theme.colors.primary,
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
      borderColor: "rgba(233, 64, 87, 0.14)",
    },
    headerActions: {
      flexDirection: "row",
      alignItems: "center",
      gap: theme.spacing.xs,
    },
    iconButton: {
      width: 36,
      height: 36,
      borderRadius: theme.radius.pill,
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: theme.colors.surface,
      borderWidth: 1,
      borderColor: "rgba(233, 64, 87, 0.14)",
    },
    deckArea: {
      width: "100%",
      justifyContent: "center",
      alignItems: "center",
    },
    deckCard: {
      position: "absolute",
      left: 0,
      right: 0,
      height: "100%",
      justifyContent: "center",
    },
    activeDeckCard: {
      zIndex: 2,
    },
    nextDeckCard: {
      top: 12,
      opacity: 0.55,
      transform: [{ scale: 0.96 }],
    },
    stampLayer: {
      ...StyleSheet.absoluteFillObject,
      zIndex: 6,
    },
    swipeStamp: {
      position: "absolute",
      top: 34,
      borderRadius: 14,
      borderWidth: 3,
      paddingHorizontal: theme.spacing.md,
      paddingVertical: theme.spacing.xs,
      fontSize: 24,
      lineHeight: 30,
      fontWeight: "900",
      overflow: "hidden",
    },
    likeStamp: {
      left: theme.spacing.lg,
      color: theme.colors.success,
      borderColor: theme.colors.success,
    },
    passStamp: {
      right: theme.spacing.lg,
      color: theme.colors.danger,
      borderColor: theme.colors.danger,
    },
    superStamp: {
      alignSelf: "center",
      top: 88,
      color: theme.colors.secondary,
      borderColor: theme.colors.secondary,
    },
    deckMeta: {
      minHeight: 26,
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      gap: theme.spacing.sm,
      paddingHorizontal: theme.spacing.sm,
    },
    deckMetaText: {
      ...theme.typography.caption,
      flex: 1,
      color: theme.colors.muted,
    },
    progressDots: {
      flexDirection: "row",
      alignItems: "center",
      gap: 4,
    },
    progressDot: {
      width: 5,
      height: 5,
      borderRadius: 99,
      backgroundColor: theme.colors.border,
    },
    progressDotActive: {
      width: 18,
      backgroundColor: theme.colors.primary,
    },
    actions: {
      flexDirection: "row",
      justifyContent: "center",
      alignItems: "center",
      gap: theme.spacing.md,
      marginTop: -12,
      zIndex: 4,
    },
    adBanner: {
      marginHorizontal: theme.spacing.sm,
    },
    specialInvitePanel: {
      gap: theme.spacing.md,
      borderRadius: 22,
      borderWidth: 1,
      borderColor: "rgba(233, 64, 87, 0.16)",
      padding: theme.spacing.md,
      backgroundColor: theme.colors.surface,
      shadowColor: theme.colors.shadow,
      shadowOpacity: 1,
      shadowRadius: 18,
      shadowOffset: { width: 0, height: 10 },
      elevation: 4,
    },
    specialInviteHeader: {
      flexDirection: "row",
      alignItems: "center",
      gap: theme.spacing.md,
    },
    specialInviteText: {
      flex: 1,
      gap: theme.spacing.xxs,
    },
    specialInviteTitle: {
      ...theme.typography.subheading,
      color: theme.colors.text,
    },
    specialInviteDescription: {
      ...theme.typography.body,
      color: theme.colors.muted,
    },
    specialInviteActions: {
      flexDirection: "row",
      gap: theme.spacing.sm,
    },
    specialInviteButton: {
      flex: 1,
    },
    roundAction: {
      width: 54,
      height: 54,
      borderRadius: theme.radius.pill,
      alignItems: "center",
      justifyContent: "center",
      borderWidth: 1,
      backgroundColor: theme.colors.surface,
      shadowColor: theme.colors.shadow,
      shadowOpacity: 1,
      shadowRadius: 18,
      shadowOffset: { width: 0, height: 10 },
      elevation: 5,
    },
    passAction: {
      borderColor: theme.colors.danger,
    },
    superAction: {
      borderColor: theme.colors.secondary,
    },
    infoAction: {
      width: 46,
      height: 46,
      borderColor: theme.colors.border,
    },
    fireAction: {
      borderColor: theme.colors.primary,
      backgroundColor: theme.isDark ? "#241A22" : "#FFF1F4",
    },
    fireActionText: {
      position: "absolute",
      bottom: 6,
      ...theme.typography.caption,
      color: theme.colors.primary,
      fontSize: 10,
      lineHeight: 12,
      fontWeight: "900",
    },
    likeAction: {
      borderColor: theme.colors.primary,
    },
    pressed: {
      opacity: 0.76,
    },
  });
