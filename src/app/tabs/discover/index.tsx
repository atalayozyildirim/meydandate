// Discover sekmesi swipe kartlarini, animasyonlari ve match modalini calistirir.
import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import {
  Alert,
  Pressable,
  StyleSheet,
  Switch,
  Text,
  type StyleProp,
  type ViewStyle,
  useWindowDimensions,
  View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect, useRouter } from "expo-router";
import { Audio } from "expo-av";
import * as Location from "expo-location";
import LottieView from "lottie-react-native";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Gesture, GestureDetector } from "react-native-gesture-handler";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Animated, {
  interpolate,
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withSequence,
  withSpring,
  withTiming,
} from "react-native-reanimated";
import type {
  CulturalCompatibility,
  LikeAction,
  Match,
} from "@/domain/entities/Match";
import type { User } from "@/domain/entities/User";
import { SwipeProfileCard } from "@/features/discover/components/SwipeProfileCard";
import { useDiscoverDeck } from "@/features/discover/hooks/useDiscoverDeck";
import { useFire } from "@/features/fire/hooks/useFire";
import { AdMobBanner } from "@/features/ads";
import { MatchModal } from "@/features/match/components/MatchModal";
import { SafetySheet } from "@/features/profile/components/SafetySheet";
import { useAuthStore } from "@/features/auth/stores/authStore";
import { Avatar } from "@/shared/components/Avatar";
import { BottomSheet } from "@/shared/components/BottomSheet";
import { Button } from "@/shared/components/Button";
import { EmptyState } from "@/shared/components/EmptyState";
import { Loading } from "@/shared/components/Loading";
import { OptionChip } from "@/shared/components/OptionChip";
import { Screen } from "@/shared/components/Screen";
import { queryKeys } from "@/shared/constants/queryKeys";
import {
  cultureImportanceOptions,
  interestOptions,
} from "@/shared/constants/options";
import {
  clampMatchRadiusKm,
  DEFAULT_MATCH_RADIUS_KM,
} from "@/shared/utils/location";
import { formatScore } from "@/shared/utils/score";
import { sanitizePlainText } from "@/shared/utils/sanitize";
import { useTheme } from "@/shared/theme";
import { container } from "@/infrastructure/config/Container";
import { SecureStorageService } from "@/infrastructure/storage/SecureStorageService";

// eslint-disable-next-line global-require
const loveAnimation = require("../../../../assets/lottie/love.json");
// eslint-disable-next-line global-require
const discoverMusicTracks = [
  require("../../../../assets/music/felek.mp3"),
  require("../../../../assets/music/arayıarayı.mp3"),
] as const;

const SWIPE_THRESHOLD = 110;
const SUPER_LIKE_THRESHOLD = -120;
const OFFSCREEN_DISTANCE = 520;
const MAX_ROTATION_DEGREES = 14;
const locationRadiusOptions = [10, 25, 50, 100, 250] as const;
const discoverMusicPreferenceKey = "ehlibyte-discover-music-muted";
const discoverMusicStorage = new SecureStorageService();

interface LocationPreferenceArgs {
  enabled: boolean;
  radiusKm: number;
  refreshLocation?: boolean;
}

interface DiscoverCard {
  user: User;
  compatibility: CulturalCompatibility;
}

const getCultureImportanceLabel = (value: User["cultureImportance"]) =>
  cultureImportanceOptions.find((option) => option.value === value)?.label ??
  value;

const getInterestLabel = (value: User["interests"][number]) =>
  interestOptions.find((option) => option.value === value)?.label ?? value;

const getCompatibilityReasons = (currentUser: User | null, candidate: User) => {
  if (!currentUser) {
    return ["Profil detayları yüklendiğinde daha net sinyaller gösterilir."];
  }

  const reasons: string[] = [];
  const sharedInterests = currentUser.interests.filter((interest) =>
    candidate.interests.includes(interest),
  );

  if (sharedInterests.length > 0) {
    reasons.push(
      `Ortak ilgi: ${sharedInterests.slice(0, 3).map(getInterestLabel).join(", ")}`,
    );
  }

  if (
    currentUser.hometown &&
    candidate.hometown &&
    currentUser.hometown.toLocaleLowerCase("tr-TR") ===
      candidate.hometown.toLocaleLowerCase("tr-TR")
  ) {
    reasons.push(`Aynı memleket sinyali: ${sanitizePlainText(candidate.hometown, 80)}`);
  }

  if (
    currentUser.favoritePoet &&
    candidate.favoritePoet &&
    currentUser.favoritePoet.toLocaleLowerCase("tr-TR") ===
      candidate.favoritePoet.toLocaleLowerCase("tr-TR")
  ) {
    reasons.push(`Favori ozan ortak: ${sanitizePlainText(candidate.favoritePoet, 80)}`);
  }

  if (
    currentUser.favoriteSong &&
    candidate.favoriteSong &&
    currentUser.favoriteSong.toLocaleLowerCase("tr-TR") ===
      candidate.favoriteSong.toLocaleLowerCase("tr-TR")
  ) {
    reasons.push(`Favori türkü ortak: ${sanitizePlainText(candidate.favoriteSong, 80)}`);
  }

  if (currentUser.cultureImportance === candidate.cultureImportance) {
    reasons.push(
      `Kültür önemi aynı: ${getCultureImportanceLabel(candidate.cultureImportance)}`,
    );
  }

  if (candidate.profilePrompts?.some((prompt) => prompt.answer.trim())) {
    reasons.push("Profil sorularında sohbet açabilecek cevaplar var.");
  }

  return reasons.length > 0
    ? reasons
    : ["Uyum skoru; kültürel beyan, ilgi alanları ve yaşam tarzı sinyallerinden hesaplanıyor."];
};

const getLocationPreferenceErrorMessage = (error: unknown) => {
  const message = error instanceof Error ? error.message : "";

  if (/Konum izni verilmedi/i.test(message)) {
    return message;
  }

  if (/Location is required|latitude|longitude/i.test(message)) {
    return "Yakındaki eşleşmeyi açmak için konumunu bir kez yenilemen gerekiyor.";
  }

  if (
    /PGRST|PostgREST|schema cache|set_location_matching|function|permission denied|column/i.test(
      message,
    )
  ) {
    return "Konum tercihini şu an kaydedemedik. Birazdan tekrar dene.";
  }

  return message || "Konum tercihi güncellenemedi. Tekrar deneyin.";
};

const requestCurrentLocation = async () => {
  const permission = await Location.requestForegroundPermissionsAsync();

  if (permission.status !== "granted") {
    throw new Error(
      "Konum izni verilmedi. Yakındaki eşleşmeler için izin gerekli.",
    );
  }

  const position = await Location.getCurrentPositionAsync({
    accuracy: Location.Accuracy.Balanced,
  });

  return {
    latitude: position.coords.latitude,
    longitude: position.coords.longitude,
  };
};

interface SwipeActionButtonProps {
  accessibilityLabel: string;
  accentColor: string;
  disabled?: boolean;
  onPress: () => void;
  icon: ReactNode;
  background?: ReactNode;
  overlay?: ReactNode;
  style?: StyleProp<ViewStyle>;
}

const SwipeActionButton = ({
  accessibilityLabel,
  accentColor,
  disabled = false,
  onPress,
  icon,
  background,
  overlay,
  style,
}: SwipeActionButtonProps) => {
  const pressScale = useSharedValue(1);
  const glow = useSharedValue(0);

  const animatedShellStyle = useAnimatedStyle(() => ({
    transform: [{ scale: pressScale.value }],
  }));

  const animatedGlowStyle = useAnimatedStyle(() => ({
    opacity: glow.value * 0.28,
    transform: [
      {
        scale: interpolate(glow.value, [0, 1], [0.74, 1.08]),
      },
    ],
  }));

  return (
    <Animated.View
      style={[
        actionButtonBaseStyles.shell,
        style,
        disabled && actionButtonBaseStyles.disabled,
        animatedShellStyle,
      ]}
    >
      {background}
      <Animated.View
        pointerEvents="none"
        style={[
          actionButtonBaseStyles.glow,
          { backgroundColor: accentColor },
          animatedGlowStyle,
        ]}
      />
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={accessibilityLabel}
        accessibilityState={{ disabled }}
        disabled={disabled}
        hitSlop={8}
        onPress={onPress}
        onPressIn={() => {
          pressScale.value = withSpring(0.92, {
            damping: 12,
            stiffness: 280,
          });
          glow.value = withTiming(1, { duration: 120 });
        }}
        onPressOut={() => {
          pressScale.value = withSpring(1, { damping: 12, stiffness: 240 });
          glow.value = withTiming(0, { duration: 220 });
        }}
        style={actionButtonBaseStyles.hitbox}
      >
        {icon}
      </Pressable>
      {overlay}
    </Animated.View>
  );
};

const actionButtonBaseStyles = StyleSheet.create({
  shell: {
    position: "relative",
  },
  hitbox: {
    ...StyleSheet.absoluteFillObject,
    alignItems: "center",
    justifyContent: "center",
  },
  glow: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: 999,
  },
  disabled: {
    opacity: 0.5,
  },
});

export default function DiscoverScreen() {
  const router = useRouter();
  const theme = useTheme();
  const styles = createStyles(theme);
  const queryClient = useQueryClient();
  const insets = useSafeAreaInsets();
  const currentUser = useAuthStore((state) => state.currentUser);
  const setCurrentUser = useAuthStore((state) => state.setCurrentUser);
  const { height, width } = useWindowDimensions();
  const {
    deck,
    specialInvite,
    isLoading,
    isRefreshing,
    isHandlingSpecialInvite,
    dismissCandidate,
    restoreCandidate,
    swipe,
    isUndoingSwipe,
    undoLastSwipe,
    refresh,
    acceptSpecialInvite,
    declineSpecialInvite,
  } = useDiscoverDeck();
  const { fireBalance, sendFire, isSendingFire } = useFire();
  const [activeSafetyUser, setActiveSafetyUser] = useState<User | null>(null);
  const [compatibilityCard, setCompatibilityCard] =
    useState<DiscoverCard | null>(null);
  const [match, setMatch] = useState<Match | null>(null);
  const [isMatchVisible, setIsMatchVisible] = useState(false);
  const [isLocationSheetVisible, setIsLocationSheetVisible] = useState(false);
  const [isDiscoverFocused, setIsDiscoverFocused] = useState(false);
  const [isMusicPreferenceLoaded, setIsMusicPreferenceLoaded] = useState(false);
  const [isMusicMuted, setIsMusicMuted] = useState(false);
  const [isLoveEffectVisible, setIsLoveEffectVisible] = useState(false);
  const failedSwipeIdsRef = useRef<Set<string>>(new Set());
  const hasAutoOpenedLocationSheetRef = useRef(false);
  const soundRef = useRef<Audio.Sound | null>(null);
  const musicTrackIndexRef = useRef(0);
  const shouldPlayMusicRef = useRef(false);
  const [loveEffectKey, setLoveEffectKey] = useState(0);
  const locationMatchingEnabled = currentUser?.matchByLocation ?? false;
  const hasProfileLocation =
    typeof currentUser?.locationLatitude === "number" &&
    typeof currentUser?.locationLongitude === "number";
  const locationRadiusKm = clampMatchRadiusKm(
    currentUser?.matchRadiusKm ?? DEFAULT_MATCH_RADIUS_KM,
  );
  const locationUpdatedAt = currentUser?.locationUpdatedAt
    ? new Date(currentUser.locationUpdatedAt)
    : null;
  const locationUpdatedLabel =
    locationUpdatedAt && Number.isFinite(locationUpdatedAt.getTime())
      ? `${locationUpdatedAt.toLocaleDateString("tr-TR")} ${locationUpdatedAt.toLocaleTimeString(
          "tr-TR",
          {
            hour: "2-digit",
            minute: "2-digit",
          },
        )}`
      : null;
  const locationShortcutLabel = locationMatchingEnabled
    ? hasProfileLocation
      ? `${locationRadiusKm} km yakında`
      : "Konum yenilenmeli"
    : "Konuma göre kapalı";
  const locationSheetSubtitle = locationMatchingEnabled
    ? hasProfileLocation
      ? `Yakındaki profiller ${locationRadiusKm} km içinde. ${locationUpdatedLabel ? `Son: ${locationUpdatedLabel}` : ""}`
      : "Konumunu bir kez yenilemen gerekiyor."
    : "Yakındaki profilleri keşfet akışında öne çıkar.";

  const activeCard = deck[0];
  const nextCard = deck[1];
  const isCompactViewport = width < 380 || height < 720;
  const cardHeight = Math.min(
    Math.max(
      height * (isCompactViewport ? 0.5 : 0.58),
      isCompactViewport ? 360 : 430,
    ),
    isCompactViewport ? 470 : 540,
  );
  const sideActionSize = isCompactViewport ? 52 : 58;
  const miniActionSize = isCompactViewport ? 44 : 50;
  const fireActionSize = isCompactViewport ? 60 : 66;
  const sideIconSize = isCompactViewport ? 28 : 30;
  const secondaryIconSize = isCompactViewport ? 26 : 28;
  const fireIconSize = isCompactViewport ? 31 : 34;
  const translateX = useSharedValue(0);
  const translateY = useSharedValue(0);
  const fireScale = useSharedValue(1);
  const firePulse = useSharedValue(0);

  useFocusEffect(
    useCallback(() => {
      setIsDiscoverFocused(true);

      return () => {
        setIsDiscoverFocused(false);
      };
    }, []),
  );

  useEffect(() => {
    let mounted = true;

    void discoverMusicStorage
      .getItem(discoverMusicPreferenceKey)
      .then((storedPreference) => {
        if (!mounted) {
          return;
        }

        setIsMusicMuted(storedPreference === "true");
        setIsMusicPreferenceLoaded(true);
      })
      .catch(() => {
        if (mounted) {
          setIsMusicPreferenceLoaded(true);
        }
      });

    return () => {
      mounted = false;
    };
  }, []);

  useEffect(() => {
    if (!isMusicPreferenceLoaded) {
      return undefined;
    }

    let cancelled = false;
    shouldPlayMusicRef.current = isDiscoverFocused && !isMusicMuted;

    const unloadCurrentSound = async () => {
      const currentSound = soundRef.current;
      soundRef.current = null;

      if (currentSound) {
        await currentSound.unloadAsync().catch(() => undefined);
      }
    };

    const playTrack = async (trackIndex: number) => {
      if (cancelled || !shouldPlayMusicRef.current) {
        return;
      }

      await unloadCurrentSound();

      if (cancelled || !shouldPlayMusicRef.current) {
        return;
      }

      await Audio.setAudioModeAsync({
        playsInSilentModeIOS: true,
        staysActiveInBackground: false,
        shouldDuckAndroid: true,
      }).catch(() => undefined);

      const { sound } = await Audio.Sound.createAsync(
        discoverMusicTracks[trackIndex],
        {
          shouldPlay: true,
          isLooping: false,
          volume: 0.42,
        },
      );

      if (cancelled || !shouldPlayMusicRef.current) {
        await sound.unloadAsync().catch(() => undefined);
        return;
      }

      soundRef.current = sound;
      sound.setOnPlaybackStatusUpdate((status) => {
        if (
          !status.isLoaded ||
          cancelled ||
          !shouldPlayMusicRef.current ||
          !status.didJustFinish
        ) {
          return;
        }

        musicTrackIndexRef.current =
          (musicTrackIndexRef.current + 1) % discoverMusicTracks.length;
        void playTrack(musicTrackIndexRef.current).catch(() => undefined);
      });
    };

    if (!shouldPlayMusicRef.current) {
      void unloadCurrentSound();
      return () => {
        cancelled = true;
      };
    }

    void playTrack(musicTrackIndexRef.current).catch(() => undefined);

    return () => {
      cancelled = true;
      shouldPlayMusicRef.current = false;
      void unloadCurrentSound();
    };
  }, [isDiscoverFocused, isMusicMuted, isMusicPreferenceLoaded]);

  useEffect(() => {
    translateX.value = 0;
    translateY.value = 0;
  }, [activeCard?.user.id, translateX, translateY]);

  useEffect(() => {
    if (
      compatibilityCard &&
      compatibilityCard.user.id !== activeCard?.user.id
    ) {
      setCompatibilityCard(null);
    }
  }, [activeCard?.user.id, compatibilityCard]);

  useEffect(() => {
    if (
      hasAutoOpenedLocationSheetRef.current ||
      !locationMatchingEnabled ||
      hasProfileLocation
    ) {
      return;
    }

    hasAutoOpenedLocationSheetRef.current = true;
    setIsLocationSheetVisible(true);
  }, [hasProfileLocation, locationMatchingEnabled]);

  const locationMatchingMutation = useMutation({
    mutationFn: async ({
      enabled,
      radiusKm,
      refreshLocation = false,
    }: LocationPreferenceArgs) => {
      if (!currentUser) {
        throw new Error("Konum tercihi için oturum gerekli.");
      }

      const needsLocation = enabled && (refreshLocation || !hasProfileLocation);
      const coordinates = needsLocation
        ? await requestCurrentLocation()
        : undefined;

      return container.userRepository.setLocationMatching(currentUser.id, {
        enabled,
        radiusKm,
        latitude: coordinates?.latitude,
        longitude: coordinates?.longitude,
      });
    },
    onSuccess: async (updatedUser) => {
      setCurrentUser(updatedUser);
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: [queryKeys.profile] }),
        queryClient.invalidateQueries({ queryKey: [queryKeys.discover] }),
      ]);
    },
    onError: (error) => {
      Alert.alert(
        "Konum kaydedilemedi",
        getLocationPreferenceErrorMessage(error),
      );
    },
  });

  const updateLocationPreference = (
    enabled: boolean,
    radiusKm = locationRadiusKm,
    refreshLocation = false,
  ) => {
    if (locationMatchingMutation.isPending) {
      return;
    }

    locationMatchingMutation.mutate({ enabled, radiusKm, refreshLocation });
  };

  const openLocationSheet = () => {
    setIsLocationSheetVisible(true);
  };

  const showPremiumRequiredAlert = () => {
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
  };

  const showPremiumFeatureAlert = (feature: string, description: string) => {
    Alert.alert(feature, description, [
      { text: "Vazgeç", style: "cancel" },
      {
        text: "Premium'u incele",
        onPress: () => router.push("/tabs/store"),
      },
    ]);
  };

  const setDiscoverMusicMutedPreference = (nextValue: boolean) => {
    setIsMusicMuted(nextValue);
    void discoverMusicStorage
      .setItem(discoverMusicPreferenceKey, String(nextValue))
      .catch(() => undefined);
  };

  const playLoveEffect = () => {
    setLoveEffectKey((current) => current + 1);
    setIsLoveEffectVisible(true);
  };

  const ensureSwipeIsAllowed = (action: LikeAction) => {
    if (action !== "super_like" || currentUser?.isPremium) {
      return true;
    }

    showPremiumRequiredAlert();
    return false;
  };

  const handleUndoLastSwipe = async () => {
    if (!currentUser?.isPremium) {
      showPremiumFeatureAlert(
        "Geri al Premium",
        "Son kaydırmayı geri almak Ehlibyte Premium ile kullanılabilir.",
      );
      return;
    }

    try {
      const result = await undoLastSwipe();
      Alert.alert(
        "Geri alındı",
        result.matchRemoved
          ? "Son hamle ve açılan eşleşme kaldırıldı."
          : "Son hamle geri alındı; profil tekrar akışa eklendi.",
      );
    } catch (error) {
      Alert.alert(
        "Geri alınamadı",
        error instanceof Error ? error.message : "Son işlem geri alınamadı.",
      );
    }
  };

  const handleSwipeResult = async (
    targetUserId: string,
    action: LikeAction,
  ) => {
    try {
      const createdMatch = await swipe(targetUserId, action);

      if (createdMatch) {
        setMatch(createdMatch);
        setIsMatchVisible(true);
      }
    } catch (error) {
      failedSwipeIdsRef.current.add(targetUserId);
      restoreCandidate(targetUserId);
      Alert.alert(
        "Swipe hatası",
        error instanceof Error
          ? error.message
          : "İşlem tamamlanamadı, lütfen tekrar dene.",
      );
    }
  };

  const finalizeSwipeTransition = (targetUserId: string) => {
    if (failedSwipeIdsRef.current.has(targetUserId)) {
      failedSwipeIdsRef.current.delete(targetUserId);
      translateX.value = 0;
      translateY.value = 0;
      return;
    }

    dismissCandidate(targetUserId);
    translateX.value = 0;
    translateY.value = 0;
  };

  const triggerButtonSwipe = (action: LikeAction) => {
    if (!activeCard) {
      return;
    }

    if (!ensureSwipeIsAllowed(action)) {
      return;
    }

    const targetUserId = activeCard.user.id;
    dismissCandidate(targetUserId);
    void handleSwipeResult(targetUserId, action);
  };

  const handleLikeButtonPress = () => {
    playLoveEffect();
    triggerButtonSwipe("like");
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
    .minDistance(4)
    .onUpdate((event) => {
      translateX.value = event.translationX;
      translateY.value = event.translationY;
    })
    .onEnd((event) => {
      const targetUserId = activeCard?.user.id;

      if (!targetUserId) {
        translateX.value = withSpring(0);
        translateY.value = withSpring(0);
        return;
      }

      if (event.translationY < SUPER_LIKE_THRESHOLD) {
        if (!currentUser?.isPremium) {
          runOnJS(showPremiumRequiredAlert)();
          translateX.value = withSpring(0);
          translateY.value = withSpring(0);
          return;
        }
        runOnJS(handleSwipeResult)(targetUserId, "super_like");
        translateY.value = withTiming(
          -OFFSCREEN_DISTANCE,
          { duration: 190 },
          () => runOnJS(finalizeSwipeTransition)(targetUserId),
        );
        return;
      }

      if (event.translationX > SWIPE_THRESHOLD) {
        runOnJS(handleSwipeResult)(targetUserId, "like");
        translateX.value = withTiming(
          OFFSCREEN_DISTANCE,
          { duration: 180 },
          () => runOnJS(finalizeSwipeTransition)(targetUserId),
        );
        return;
      }

      if (event.translationX < -SWIPE_THRESHOLD) {
        runOnJS(handleSwipeResult)(targetUserId, "pass");
        translateX.value = withTiming(
          -OFFSCREEN_DISTANCE,
          { duration: 180 },
          () => runOnJS(finalizeSwipeTransition)(targetUserId),
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
    transform: [
      {
        scale:
          fireScale.value * interpolate(firePulse.value, [0, 1], [1, 1.08]),
      },
      { translateY: interpolate(firePulse.value, [0, 1], [0, -2]) },
    ],
  }));

  const fireAuraStyle = useAnimatedStyle(() => ({
    opacity: interpolate(firePulse.value, [0, 1], [0.14, 0.38]),
    transform: [
      {
        scale: interpolate(firePulse.value, [0, 1], [0.76, 1.08]),
      },
    ],
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
      firePulse.value = withSequence(
        withTiming(1, { duration: 130 }),
        withTiming(0, { duration: 420 }),
      );
      await sendFire({ targetUserId: activeCard.user.id, amount: 1 });
    } catch (error) {
      Alert.alert(
        "Fire gönderilemedi",
        error instanceof Error ? error.message : "Tekrar deneyin.",
      );
    }
  };

  const compatibilityReasons = compatibilityCard
    ? getCompatibilityReasons(currentUser ?? null, compatibilityCard.user)
    : [];

  if (isLoading) {
    return <Loading label="Profiller hazırlanıyor" />;
  }

  return (
    <Screen
      scroll={false}
      style={[
        styles.screen,
        {
          paddingBottom: Math.max(insets.bottom + 28, 36),
        },
      ]}
    >
      <View style={styles.header}>
        <View style={styles.headerLead}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Akışa dön"
            onPress={() => router.replace("/tabs/feed")}
            style={({ pressed }) => [
              styles.iconButton,
              styles.backButton,
              pressed && styles.pressed,
            ]}
          >
            <Ionicons name="chevron-back" size={20} color={theme.colors.text} />
          </Pressable>
          <View>
            <Text style={styles.kicker}>Ehlibyte</Text>
            <Text style={styles.title}>Keşfet</Text>
          </View>
        </View>
        <View style={styles.headerActions}>
          <View style={styles.countBadge}>
            <Ionicons name="flame" size={15} color={theme.colors.primary} />
            <Text style={styles.count}>{fireBalance}</Text>
          </View>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Seni beğenenleri aç"
            onPress={() => router.push("/tabs/likes")}
            style={({ pressed }) => [
              styles.iconButton,
              pressed && styles.pressed,
            ]}
          >
            <Ionicons
              name="heart-circle-outline"
              size={19}
              color={theme.colors.primary}
            />
          </Pressable>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Konum ve keşfet ayarlarını aç"
            onPress={openLocationSheet}
            style={({ pressed }) => [
              styles.iconButton,
              pressed && styles.pressed,
            ]}
          >
            <Ionicons
              name="settings-outline"
              size={18}
              color={theme.colors.text}
            />
          </Pressable>
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

      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Konuma göre eşleşme ayarlarını aç"
        onPress={openLocationSheet}
        style={({ pressed }) => [
          styles.locationShortcut,
          locationMatchingEnabled && styles.locationShortcutActive,
          pressed && styles.pressed,
        ]}
      >
        <View style={styles.locationShortcutMeta}>
          <View
            style={[
              styles.locationIconWrap,
              locationMatchingEnabled && styles.locationIconWrapActive,
            ]}
          >
            <Ionicons
              name={locationMatchingEnabled ? "location" : "location-outline"}
              size={16}
              color={
                locationMatchingEnabled
                  ? theme.colors.primary
                  : theme.colors.muted
              }
            />
          </View>
          <View style={styles.locationTextWrap}>
            <Text numberOfLines={1} style={styles.locationShortcutTitle}>
              Konuma göre eşleşme
            </Text>
            <Text numberOfLines={1} style={styles.locationShortcutSubtitle}>
              {locationShortcutLabel}
            </Text>
          </View>
        </View>
        <Ionicons name="chevron-forward" size={18} color={theme.colors.muted} />
      </Pressable>

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
                renderToHardwareTextureAndroid
                shouldRasterizeIOS
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
                renderToHardwareTextureAndroid
                shouldRasterizeIOS
                style={[styles.deckCard, styles.activeDeckCard, animatedStyle]}
              >
                <SwipeProfileCard
                  user={activeCard.user}
                  compatibility={activeCard.compatibility}
                  height={cardHeight}
                  onOpenSafety={() => setActiveSafetyUser(activeCard.user)}
                  onOpenProfile={() =>
                    router.push(`/tabs/profile/${activeCard.user.id}`)
                  }
                  onOpenCompatibility={() => setCompatibilityCard(activeCard)}
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
          <View style={[styles.actions, isCompactViewport && styles.compactActions]}>
            <SwipeActionButton
              accessibilityLabel="Bu profili geç"
              accentColor={theme.colors.danger}
              style={[
                styles.roundAction,
                styles.passAction,
                { width: sideActionSize, height: sideActionSize },
              ]}
              onPress={() => triggerButtonSwipe("pass")}
              icon={
                <Ionicons
                  name="close"
                  size={sideIconSize}
                  color={theme.colors.danger}
                />
              }
            />
            <SwipeActionButton
              accessibilityLabel="Son kaydırmayı geri al"
              accentColor={theme.colors.border}
              style={[
                styles.roundAction,
                styles.undoAction,
                { width: miniActionSize, height: miniActionSize },
              ]}
              disabled={isUndoingSwipe}
              onPress={() => void handleUndoLastSwipe()}
              icon={
                <Ionicons
                  name="arrow-undo-outline"
                  size={secondaryIconSize - 2}
                  color={theme.colors.warning}
                />
              }
            />
            <SwipeActionButton
              accessibilityLabel="Bu profile Fire gönder"
              disabled={isSendingFire}
              accentColor={theme.colors.primary}
              style={[
                styles.roundAction,
                styles.fireAction,
                { width: fireActionSize, height: fireActionSize },
              ]}
              onPress={() => void sendFireToActiveCard()}
              background={
                <Animated.View
                  pointerEvents="none"
                  style={[styles.fireAura, fireAuraStyle]}
                />
              }
              icon={
                <>
                  <Animated.View style={fireButtonStyle}>
                    <Ionicons
                      name="flame"
                      size={fireIconSize}
                      color={theme.colors.primary}
                    />
                  </Animated.View>
                  <View style={styles.fireBadge}>
                    <Text style={styles.fireBadgeText}>+1</Text>
                  </View>
                </>
              }
            />
            <SwipeActionButton
              accessibilityLabel="Super Like gönder"
              accentColor={theme.colors.secondary}
              style={[
                styles.roundAction,
                styles.superAction,
                { width: sideActionSize, height: sideActionSize },
              ]}
              onPress={() => triggerButtonSwipe("super_like")}
              icon={
                <Ionicons
                  name="flash-outline"
                  size={secondaryIconSize}
                  color={theme.colors.secondary}
                />
              }
            />
            <SwipeActionButton
              accessibilityLabel="Bu profili beğen"
              accentColor={theme.colors.primary}
              style={[
                styles.roundAction,
                styles.likeAction,
                { width: sideActionSize, height: sideActionSize },
              ]}
              onPress={handleLikeButtonPress}
              icon={
                <Ionicons
                  name="heart"
                  size={sideIconSize}
                  color={theme.colors.primary}
                />
              }
              overlay={
                isLoveEffectVisible ? (
                  <View pointerEvents="none" style={styles.loveEffect}>
                    <LottieView
                      key={loveEffectKey}
                      source={loveAnimation}
                      autoPlay
                      loop={false}
                      onAnimationFinish={() => setIsLoveEffectVisible(false)}
                      style={styles.loveEffectAnimation}
                    />
                  </View>
                ) : null
              }
            />
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
      <BottomSheet
        visible={isLocationSheetVisible}
        onClose={() => setIsLocationSheetVisible(false)}
      >
        <View style={styles.locationSheetHeader}>
          <View style={styles.locationSheetTitleWrap}>
            <Text style={styles.locationSheetTitle}>Konuma göre eşleşme</Text>
            <Text style={styles.locationSheetSubtitle}>
              {locationSheetSubtitle}
            </Text>
          </View>
          <Switch
            value={locationMatchingEnabled}
            disabled={!currentUser || locationMatchingMutation.isPending}
            onValueChange={(enabled) =>
              updateLocationPreference(enabled, locationRadiusKm, enabled)
            }
            trackColor={{
              true: theme.colors.primary,
              false: theme.colors.border,
            }}
            thumbColor="#FFFFFF"
          />
        </View>
        <View style={styles.musicSettingRow}>
          <View
            style={[
              styles.locationIconWrap,
              !isMusicMuted && styles.locationIconWrapActive,
            ]}
          >
            <Ionicons
              name={isMusicMuted ? "volume-mute-outline" : "volume-high-outline"}
              size={16}
              color={isMusicMuted ? theme.colors.muted : theme.colors.primary}
            />
          </View>
          <View style={styles.musicSettingTextWrap}>
            <Text style={styles.musicSettingTitle}>Keşfet müziği</Text>
            <Text style={styles.musicSettingSubtitle}>
              {isMusicMuted
                ? "Müzik kapalı; Keşfet sessiz açılır."
                : "Keşfet açılınca müzik otomatik çalar."}
            </Text>
          </View>
          <Switch
            value={!isMusicMuted}
            disabled={!isMusicPreferenceLoaded}
            onValueChange={(enabled) =>
              setDiscoverMusicMutedPreference(!enabled)
            }
            trackColor={{
              true: theme.colors.primary,
              false: theme.colors.border,
            }}
            thumbColor="#FFFFFF"
          />
        </View>
        <View style={styles.locationSheetInfoRow}>
          <View
            style={[
              styles.locationIconWrap,
              locationMatchingEnabled && styles.locationIconWrapActive,
            ]}
          >
            <Ionicons
              name={locationMatchingEnabled ? "navigate" : "navigate-outline"}
              size={16}
              color={
                locationMatchingEnabled
                  ? theme.colors.primary
                  : theme.colors.muted
              }
            />
          </View>
          <Text style={styles.locationSheetInfoText}>
            {hasProfileLocation
              ? `${locationRadiusKm} km yarıçap aktif`
              : "Konum kaydı henüz yok"}
          </Text>
        </View>
        <View style={styles.locationChipWrap}>
          {locationRadiusOptions.map((radiusKm) => (
            <OptionChip
              key={radiusKm}
              label={`${radiusKm} km`}
              selected={locationRadiusKm === radiusKm}
              disabled={!currentUser || locationMatchingMutation.isPending}
              onPress={() =>
                updateLocationPreference(
                  true,
                  radiusKm,
                  !locationMatchingEnabled || !hasProfileLocation,
                )
              }
            />
          ))}
        </View>
        <Button
          label={locationMatchingEnabled ? "Konumu yenile" : "Konumu kullan"}
          variant="ghost"
          loading={locationMatchingMutation.isPending}
          disabled={!currentUser}
          icon={
            <Ionicons name="locate" size={18} color={theme.colors.primary} />
          }
          onPress={() => updateLocationPreference(true, locationRadiusKm, true)}
        />
      </BottomSheet>
      <BottomSheet
        visible={Boolean(compatibilityCard)}
        onClose={() => setCompatibilityCard(null)}
      >
        {compatibilityCard ? (
          <>
            <View style={styles.compatibilityHeader}>
              <View style={styles.compatibilityIcon}>
                <Ionicons
                  name="star"
                  size={18}
                  color={theme.colors.primary}
                />
              </View>
              <View style={styles.compatibilityTitleWrap}>
                <Text style={styles.compatibilityTitle}>Uyum detayı</Text>
                <Text style={styles.compatibilitySubtitle}>
                  {sanitizePlainText(compatibilityCard.user.name, 80)} ile
                  eşleşme sinyalleri
                </Text>
              </View>
            </View>
            <View style={styles.compatibilityScoreGrid}>
              {[
                {
                  label: "Kültür",
                  value: compatibilityCard.compatibility.cultural,
                },
                {
                  label: "İlgi",
                  value: compatibilityCard.compatibility.interests,
                },
                {
                  label: "Tarz",
                  value: compatibilityCard.compatibility.lifestyle,
                },
              ].map((item) => (
                <View key={item.label} style={styles.compatibilityScoreItem}>
                  <Text style={styles.compatibilityScore}>
                    {formatScore(item.value)}
                  </Text>
                  <Text style={styles.compatibilityScoreLabel}>
                    {item.label}
                  </Text>
                </View>
              ))}
            </View>
            <View style={styles.compatibilityReasonList}>
              {compatibilityReasons.map((reason) => (
                <View key={reason} style={styles.compatibilityReason}>
                  <Ionicons
                    name="checkmark-circle"
                    size={16}
                    color={theme.colors.success}
                  />
                  <Text style={styles.compatibilityReasonText}>{reason}</Text>
                </View>
              ))}
            </View>
          </>
        ) : null}
      </BottomSheet>
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
    headerLead: {
      flexDirection: "row",
      alignItems: "center",
      gap: theme.spacing.sm,
      flexShrink: 1,
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
    backButton: {
      flexShrink: 0,
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
      width: "100%",
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      alignSelf: "center",
      gap: theme.spacing.sm,
      marginTop: -4,
      paddingHorizontal: theme.spacing.md,
      paddingVertical: 7,
      borderRadius: 32,
      borderWidth: 1,
      borderColor: "rgba(255, 91, 112, 0.18)",
      backgroundColor: theme.isDark ? "#141721" : "#FFFFFF",
      zIndex: 4,
    },
    compactActions: {
      gap: theme.spacing.xs,
      paddingHorizontal: theme.spacing.xs,
      paddingVertical: 6,
      borderRadius: 28,
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
      width: 53,
      height: 53,
      borderRadius: theme.radius.pill,
      alignItems: "center",
      justifyContent: "center",
      borderWidth: 1,
      overflow: "visible",
      backgroundColor: theme.isDark ? "#181C27" : "#FFFFFF",
    },
    locationShortcut: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      gap: theme.spacing.sm,
      minHeight: 56,
      paddingHorizontal: theme.spacing.md,
      paddingVertical: theme.spacing.sm,
      borderRadius: theme.radius.lg,
      borderWidth: 1,
      borderColor: "rgba(233, 64, 87, 0.14)",
      backgroundColor: theme.colors.surface,
    },
    locationShortcutActive: {
      borderColor: "rgba(233, 64, 87, 0.26)",
      backgroundColor: theme.isDark ? "#181822" : "#FFF7F8",
    },
    locationShortcutMeta: {
      flex: 1,
      flexDirection: "row",
      alignItems: "center",
      gap: theme.spacing.sm,
    },
    locationIconWrap: {
      width: 34,
      height: 34,
      borderRadius: 17,
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: theme.isDark ? "#141721" : "#F5F7FA",
      borderWidth: 1,
      borderColor: "rgba(156, 163, 175, 0.16)",
    },
    locationIconWrapActive: {
      borderColor: "rgba(233, 64, 87, 0.22)",
      backgroundColor: theme.isDark ? "#231821" : "#FFF1F4",
    },
    locationTextWrap: {
      flex: 1,
      gap: 2,
    },
    locationShortcutTitle: {
      ...theme.typography.caption,
      color: theme.colors.text,
      fontWeight: "700",
    },
    locationShortcutSubtitle: {
      ...theme.typography.caption,
      color: theme.colors.muted,
    },
    locationSheetHeader: {
      flexDirection: "row",
      alignItems: "center",
      gap: theme.spacing.md,
      marginBottom: theme.spacing.xs,
    },
    locationSheetTitleWrap: {
      flex: 1,
      gap: theme.spacing.xxs,
    },
    locationSheetTitle: {
      ...theme.typography.subheading,
      color: theme.colors.text,
    },
    locationSheetSubtitle: {
      ...theme.typography.caption,
      color: theme.colors.muted,
    },
    locationSheetInfoRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: theme.spacing.sm,
      minHeight: 44,
      paddingHorizontal: theme.spacing.sm,
      borderRadius: 18,
      borderWidth: 1,
      borderColor: "rgba(233, 64, 87, 0.14)",
      backgroundColor: theme.isDark ? "#161925" : "#FCFCFE",
    },
    locationSheetInfoText: {
      ...theme.typography.caption,
      flex: 1,
      color: theme.colors.text,
    },
    musicSettingRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: theme.spacing.sm,
      minHeight: 58,
      paddingHorizontal: theme.spacing.sm,
      paddingVertical: theme.spacing.xs,
      borderRadius: 18,
      borderWidth: 1,
      borderColor: "rgba(233, 64, 87, 0.14)",
      backgroundColor: theme.isDark ? "#161925" : "#FCFCFE",
    },
    musicSettingTextWrap: {
      flex: 1,
      minWidth: 0,
      gap: 2,
    },
    musicSettingTitle: {
      ...theme.typography.caption,
      color: theme.colors.text,
      fontWeight: "800",
    },
    musicSettingSubtitle: {
      ...theme.typography.caption,
      color: theme.colors.muted,
    },
    locationChipWrap: {
      flexDirection: "row",
      flexWrap: "wrap",
      gap: theme.spacing.sm,
      marginTop: theme.spacing.xs,
      marginBottom: theme.spacing.xs,
    },
    compatibilityHeader: {
      flexDirection: "row",
      alignItems: "center",
      gap: theme.spacing.sm,
    },
    compatibilityIcon: {
      width: 42,
      height: 42,
      borderRadius: theme.radius.pill,
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: theme.isDark ? "#231821" : "#FFF1F4",
      borderWidth: 1,
      borderColor: "rgba(233, 64, 87, 0.16)",
    },
    compatibilityTitleWrap: {
      flex: 1,
      gap: theme.spacing.xxs,
    },
    compatibilityTitle: {
      ...theme.typography.subheading,
      color: theme.colors.text,
    },
    compatibilitySubtitle: {
      ...theme.typography.caption,
      color: theme.colors.muted,
    },
    compatibilityScoreGrid: {
      flexDirection: "row",
      gap: theme.spacing.xs,
    },
    compatibilityScoreItem: {
      flex: 1,
      minHeight: 78,
      borderRadius: 18,
      alignItems: "center",
      justifyContent: "center",
      gap: 2,
      borderWidth: 1,
      borderColor: "rgba(233, 64, 87, 0.14)",
      backgroundColor: theme.isDark ? "#141721" : "#FFF7F8",
    },
    compatibilityScore: {
      fontSize: 24,
      lineHeight: 30,
      fontWeight: "900",
      color: theme.colors.text,
    },
    compatibilityScoreLabel: {
      ...theme.typography.caption,
      color: theme.colors.muted,
    },
    compatibilityReasonList: {
      gap: theme.spacing.xs,
    },
    compatibilityReason: {
      flexDirection: "row",
      alignItems: "flex-start",
      gap: theme.spacing.xs,
      borderRadius: 16,
      padding: theme.spacing.sm,
      backgroundColor: theme.colors.elevated,
    },
    compatibilityReasonText: {
      ...theme.typography.caption,
      flex: 1,
      color: theme.colors.text,
      lineHeight: 19,
    },
    passAction: {
      borderColor: theme.colors.danger,
      backgroundColor: theme.isDark ? "#1D1820" : "#FFF5F6",
    },
    superAction: {
      borderColor: theme.colors.secondary,
      backgroundColor: theme.isDark ? "#201B2E" : "#F8F0FF",
    },
    undoAction: {
      borderColor: "rgba(245, 158, 11, 0.32)",
      backgroundColor: theme.isDark ? "#211D16" : "#FFF8E7",
    },
    fireAction: {
      width: 62,
      height: 62,
      borderColor: theme.colors.primary,
      borderWidth: 2,
      backgroundColor: theme.isDark ? "#261821" : "#FFF0F3",
    },
    fireAura: {
      position: "absolute",
      width: "100%",
      height: "100%",
      borderRadius: 999,
      backgroundColor: "rgba(233, 64, 87, 0.28)",
    },
    fireBadge: {
      position: "absolute",
      right: -2,
      bottom: 3,
      minWidth: 22,
      height: 22,
      borderRadius: 11,
      alignItems: "center",
      justifyContent: "center",
      borderWidth: 2,
      borderColor: theme.isDark ? "#261821" : "#FFF0F3",
      backgroundColor: theme.colors.primary,
    },
    fireBadgeText: {
      ...theme.typography.caption,
      color: "#FFFFFF",
      fontSize: 11,
      lineHeight: 12,
      fontWeight: "900",
    },
    likeAction: {
      borderColor: theme.colors.primary,
      backgroundColor: theme.isDark ? "#221821" : "#FFF4F6",
    },
    loveEffect: {
      position: "absolute",
      left: -42,
      top: -48,
      width: 136,
      height: 126,
      zIndex: 8,
    },
    loveEffectAnimation: {
      width: "100%",
      height: "100%",
    },
    pressed: {
      opacity: 0.76,
    },
  });
