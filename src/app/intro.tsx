// Uygulamayi ilk kez acan kullanicilara temel deneyimi tanitir.
import { useRef, useState } from "react";
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { container } from "@/infrastructure/config/Container";
import { env } from "@/infrastructure/config/env";
import { useTheme } from "@/shared/theme";

type IntroIcon = "heart" | "people" | "shield-checkmark";

const slides: Array<{
  eyebrow: string;
  title: string;
  description: string;
  icon: IntroIcon;
  highlights: string[];
  colors: [string, string];
}> = [
  {
    eyebrow: "Sana yakın bir topluluk",
    title: "Tanış, paylaş, bağ kur.",
    description:
      "Ehlibyte; ortak kültür, ilgi alanları ve niyetler etrafında güvenli tanışmalar için tasarlandı.",
    icon: "heart",
    highlights: ["Gerçek profiller", "Anlamlı eşleşmeler", "Ortak ilgi alanları"],
    colors: ["#FF4458", "#8A2387"],
  },
  {
    eyebrow: "Meydan ve akış",
    title: "Sohbetin tam ortasında ol.",
    description:
      "Topluluk paylaşımlarını takip et, fotoğraflı postlar yayınla ve canlı Meydan odalarına katıl.",
    icon: "people",
    highlights: ["Fotoğraflı postlar", "Canlı oda sohbeti", "Muharrem takvimi"],
    colors: ["#8A2387", "#4F46E5"],
  },
  {
    eyebrow: "Önce güvenlik",
    title: "Kendin gibi, rahatça.",
    description:
      "Moderasyon, bildirme ve gizlilik araçlarıyla saygılı bir alanı birlikte koruyoruz.",
    icon: "shield-checkmark",
    highlights: ["İçerik moderasyonu", "Engelle ve bildir", "Gizlilik kontrolleri"],
    colors: ["#E94057", "#FF7A59"],
  },
];

export default function IntroScreen() {
  const router = useRouter();
  const theme = useTheme();
  const styles = createStyles(theme);
  const { width } = useWindowDimensions();
  const scrollRef = useRef<ScrollView>(null);
  const [activeIndex, setActiveIndex] = useState(0);
  const slideWidth = Math.max(width, 1);
  const isLastSlide = activeIndex === slides.length - 1;

  const finishIntro = async () => {
    await container.tokenStorage.setItem(env.introSeenKey, "true").catch(() => undefined);
    router.replace("/auth/login");
  };

  const showNext = () => {
    if (isLastSlide) {
      void finishIntro();
      return;
    }

    const nextIndex = activeIndex + 1;
    scrollRef.current?.scrollTo({ x: nextIndex * slideWidth, animated: true });
    setActiveIndex(nextIndex);
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.topBar}>
        <View style={styles.brand}>
          <View style={styles.brandMark}>
            <Text style={styles.brandLetter}>e</Text>
          </View>
          <Text style={styles.brandName}>Ehlibyte</Text>
        </View>
        <Pressable
          accessibilityRole="button"
          onPress={() => void finishIntro()}
          style={({ pressed }) => [styles.skipButton, pressed && styles.pressed]}
        >
          <Text style={styles.skipText}>Geç</Text>
        </Pressable>
      </View>

      <ScrollView
        ref={scrollRef}
        horizontal
        pagingEnabled
        bounces={false}
        style={styles.slides}
        showsHorizontalScrollIndicator={false}
        onMomentumScrollEnd={(event) => {
          setActiveIndex(Math.round(event.nativeEvent.contentOffset.x / slideWidth));
        }}
      >
        {slides.map((slide, index) => (
          <View key={slide.title} style={[styles.slide, { width: slideWidth }]}>
            <LinearGradient colors={slide.colors} style={styles.hero}>
              <View style={styles.orbitLarge} />
              <View style={styles.orbitSmall} />
              <View style={styles.heroIcon}>
                <Ionicons name={slide.icon} size={46} color="#FFFFFF" />
              </View>
              <View style={styles.floatingCard}>
                <Ionicons
                  name={index === 1 ? "radio" : index === 2 ? "lock-closed" : "star"}
                  size={18}
                  color="#FFFFFF"
                />
                <Text style={styles.floatingCardText}>
                  {index === 1 ? "Meydan canlı" : index === 2 ? "Güvenli alan" : "Yeni bağlar"}
                </Text>
              </View>
            </LinearGradient>

            <ScrollView
              style={styles.copyScroll}
              contentContainerStyle={styles.copy}
              showsVerticalScrollIndicator={false}
              bounces={false}
            >
              <Text style={styles.eyebrow}>{slide.eyebrow}</Text>
              <Text style={styles.title}>{slide.title}</Text>
              <Text style={styles.description}>{slide.description}</Text>
              <View style={styles.highlights}>
                {slide.highlights.map((highlight) => (
                  <View key={highlight} style={styles.highlight}>
                    <View style={styles.highlightIcon}>
                      <Ionicons name="checkmark" size={14} color={theme.colors.primary} />
                    </View>
                    <Text style={styles.highlightText}>{highlight}</Text>
                  </View>
                ))}
              </View>
            </ScrollView>
          </View>
        ))}
      </ScrollView>

      <View style={styles.footer}>
        <View style={styles.dots}>
          {slides.map((slide, index) => (
            <View
              key={slide.title}
              style={[styles.dot, index === activeIndex && styles.dotActive]}
            />
          ))}
        </View>
        <Pressable
          accessibilityRole="button"
          onPress={showNext}
          style={({ pressed }) => [styles.nextButton, pressed && styles.pressed]}
        >
          <Text style={styles.nextButtonText}>
            {isLastSlide ? "Ehlibyte'e başla" : "Devam et"}
          </Text>
          <Ionicons name="arrow-forward" size={19} color="#FFFFFF" />
        </Pressable>
      </View>
    </SafeAreaView>
  );
}

const createStyles = (theme: ReturnType<typeof useTheme>) =>
  StyleSheet.create({
    safeArea: {
      flex: 1,
      backgroundColor: theme.colors.background,
    },
    topBar: {
      minHeight: 62,
      paddingHorizontal: theme.spacing.lg,
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
    },
    brand: {
      flexDirection: "row",
      alignItems: "center",
      gap: theme.spacing.xs,
    },
    brandMark: {
      width: 34,
      height: 34,
      borderRadius: 12,
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: theme.colors.primary,
    },
    brandLetter: {
      fontSize: 23,
      lineHeight: 27,
      fontWeight: "900",
      color: "#FFFFFF",
    },
    brandName: {
      ...theme.typography.subheading,
      color: theme.colors.text,
      fontSize: 19,
    },
    skipButton: {
      minHeight: 36,
      paddingHorizontal: theme.spacing.md,
      alignItems: "center",
      justifyContent: "center",
      borderRadius: theme.radius.pill,
      backgroundColor: theme.colors.surface,
      borderWidth: 1,
      borderColor: theme.colors.border,
    },
    skipText: {
      ...theme.typography.caption,
      color: theme.colors.muted,
    },
    slide: {
      flex: 1,
      paddingHorizontal: theme.spacing.lg,
      paddingTop: theme.spacing.sm,
    },
    slides: {
      flex: 1,
    },
    hero: {
      minHeight: 300,
      borderRadius: 34,
      alignItems: "center",
      justifyContent: "center",
      overflow: "hidden",
      shadowColor: theme.colors.shadow,
      shadowOpacity: 1,
      shadowRadius: 24,
      shadowOffset: { width: 0, height: 14 },
      elevation: 6,
    },
    orbitLarge: {
      position: "absolute",
      width: 260,
      height: 260,
      borderRadius: 130,
      borderWidth: 1,
      borderColor: "rgba(255, 255, 255, 0.18)",
    },
    orbitSmall: {
      position: "absolute",
      width: 170,
      height: 170,
      borderRadius: 85,
      borderWidth: 1,
      borderColor: "rgba(255, 255, 255, 0.24)",
    },
    heroIcon: {
      width: 112,
      height: 112,
      borderRadius: 38,
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: "rgba(255, 255, 255, 0.18)",
      borderWidth: 1,
      borderColor: "rgba(255, 255, 255, 0.32)",
    },
    floatingCard: {
      position: "absolute",
      bottom: theme.spacing.lg,
      minHeight: 40,
      borderRadius: theme.radius.pill,
      flexDirection: "row",
      alignItems: "center",
      gap: theme.spacing.xs,
      paddingHorizontal: theme.spacing.md,
      backgroundColor: "rgba(17, 24, 39, 0.28)",
    },
    floatingCardText: {
      ...theme.typography.caption,
      color: "#FFFFFF",
    },
    copy: {
      paddingTop: theme.spacing.lg,
      paddingBottom: theme.spacing.md,
      gap: theme.spacing.sm,
    },
    copyScroll: {
      flex: 1,
      minHeight: 0,
    },
    eyebrow: {
      ...theme.typography.caption,
      color: theme.colors.primary,
      textTransform: "uppercase",
      letterSpacing: 0.8,
    },
    title: {
      ...theme.typography.title,
      color: theme.colors.text,
      fontSize: 35,
      lineHeight: 41,
    },
    description: {
      ...theme.typography.body,
      color: theme.colors.muted,
      fontSize: 16,
      lineHeight: 24,
    },
    highlights: {
      gap: theme.spacing.xs,
      paddingTop: theme.spacing.xs,
    },
    highlight: {
      flexDirection: "row",
      alignItems: "center",
      gap: theme.spacing.xs,
    },
    highlightIcon: {
      width: 24,
      height: 24,
      borderRadius: theme.radius.pill,
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: theme.colors.elevated,
    },
    highlightText: {
      ...theme.typography.caption,
      color: theme.colors.text,
      fontSize: 13,
      lineHeight: 18,
    },
    footer: {
      paddingHorizontal: theme.spacing.lg,
      paddingTop: theme.spacing.xs,
      paddingBottom: theme.spacing.md,
      gap: theme.spacing.md,
      backgroundColor: theme.colors.background,
    },
    dots: {
      minHeight: 12,
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      gap: theme.spacing.xs,
    },
    dot: {
      width: 7,
      height: 7,
      borderRadius: theme.radius.pill,
      backgroundColor: theme.colors.border,
    },
    dotActive: {
      width: 28,
      backgroundColor: theme.colors.primary,
    },
    nextButton: {
      minHeight: 56,
      borderRadius: theme.radius.pill,
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      gap: theme.spacing.xs,
      backgroundColor: theme.colors.primary,
      shadowColor: theme.colors.shadow,
      shadowOpacity: 1,
      shadowRadius: 16,
      shadowOffset: { width: 0, height: 8 },
      elevation: 4,
    },
    nextButtonText: {
      ...theme.typography.subheading,
      color: "#FFFFFF",
    },
    pressed: {
      opacity: 0.82,
    },
  });
