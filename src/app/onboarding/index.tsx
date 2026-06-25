import { useEffect, useState } from "react";
import {
  Alert,
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import { FontAwesome } from "@expo/vector-icons";
import { Redirect, useRouter } from "expo-router";
import { Controller, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import type { OnboardingProfile } from "@/domain/repositories/UserRepository";
import { useSession } from "@/features/auth/hooks/useSession";
import { useAuthStore } from "@/features/auth/stores/authStore";
import { isPermanentBanError } from "@/features/moderation/utils/permanentBan";
import { useOnboarding } from "@/features/onboarding/hooks/useOnboarding";
import {
  onboardingSchema,
  type OnboardingFormValues,
} from "@/features/onboarding/schemas/onboardingSchema";
import { container } from "@/infrastructure/config/Container";
import { env } from "@/infrastructure/config/env";
import { Button } from "@/shared/components/Button";
import { Input } from "@/shared/components/Input";
import { OptionChip } from "@/shared/components/OptionChip";
import { Screen } from "@/shared/components/Screen";
import {
  culturalIdentityOptions,
  cultureImportanceOptions,
  interestOptions,
} from "@/shared/constants/options";
import { useImagePicker } from "@/shared/hooks/useImagePicker";
import { useTheme } from "@/shared/theme";
import { culturalKnowledgeQuestions as aleviQuestions } from "@/shared/constants/alevi";

const MAX_KNOWLEDGE_TEST_ATTEMPTS = 2;
const KNOWLEDGE_TEST_LOCK_DURATION_MS = 60 * 60 * 1000;

const getRandomQuestions = (
  questions: typeof aleviQuestions,
  count: number,
) => {
  const shuffled = [...questions].sort(() => 0.5 - Math.random());
  return shuffled.slice(0, count);
};

const culturalKnowledgeQuestions = getRandomQuestions(aleviQuestions, 5);

type OnboardingStepId =
  | "intro"
  | "quiz"
  | "culture"
  | "interests"
  | "profile"
  | "details"
  | "review";

const onboardingSteps: Array<{
  id: OnboardingStepId;
  eyebrow: string;
  title: string;
  description: string;
}> = [
  {
    id: "intro",
    eyebrow: "Kart",
    title: "Kartın nasıl çalışır?",
    description: "Profil, müzik ve uyum sinyalleri keşifte birlikte çalışır.",
  },
  {
    id: "quiz",
    eyebrow: "Yol ve erkân",
    title: "Bilgi testini geç",
    description: "Soruları sırayla cevapla; doğru cevaplar ilerlemeni açar.",
  },
  {
    id: "culture",
    eyebrow: "Kimlik",
    title: "Kültürel yakınlığını seç",
    description: "Bu sinyaller uyum detaylarında ve önerilerde kullanılır.",
  },
  {
    id: "interests",
    eyebrow: "İlgi",
    title: "Seni anlatan alanları seç",
    description: "En az bir ilgi alanı seçerek kartını kişiselleştir.",
  },
  {
    id: "profile",
    eyebrow: "Profil",
    title: "Temel bilgilerini gir",
    description: "İsim, yaş ve şehir profil kartında görünür.",
  },
  {
    id: "details",
    eyebrow: "Detay",
    title: "Sohbet başlatan detaylar ekle",
    description: "Bio ve sevdiğin kültürel detaylar daha iyi eşleşme sağlar.",
  },
  {
    id: "review",
    eyebrow: "Kontrol",
    title: "Kartını son kez kontrol et",
    description: "Her şey hazırsa onboarding'i tamamlayabilirsin.",
  },
];

const stepValidationFields: Record<
  OnboardingStepId,
  Array<keyof OnboardingFormValues>
> = {
  intro: [],
  quiz: [],
  culture: ["culturalIdentity", "cultureImportance"],
  interests: ["interests"],
  profile: ["photoUri", "name", "age", "city"],
  details: ["occupation", "bio", "hometown", "favoriteSong", "favoritePoet"],
  review: [
    "photoUri",
    "name",
    "age",
    "city",
    "occupation",
    "bio",
    "hometown",
    "favoriteSong",
    "favoritePoet",
    "culturalIdentity",
    "cultureImportance",
    "interests",
  ],
};

interface KnowledgeTestAttemptState {
  failedAttempts: number;
  lockedUntil?: number;
}

const formatRemainingTime = (remainingMs: number) => {
  const totalMinutes = Math.max(1, Math.ceil(remainingMs / 60_000));
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;

  return hours > 0 ? `${hours} saat ${minutes} dakika` : `${minutes} dakika`;
};

const clearKnowledgeTestAttemptState = () =>
  container.tokenStorage
    .deleteItem(env.knowledgeTestAttemptKey)
    .catch(() => undefined);

const saveKnowledgeTestAttemptState = (state: KnowledgeTestAttemptState) =>
  container.tokenStorage
    .setItem(env.knowledgeTestAttemptKey, JSON.stringify(state))
    .catch(() => undefined);

const toProfilePayload = (values: OnboardingFormValues): OnboardingProfile => {
  const payload: OnboardingProfile = {
    name: values.name,
    age: values.age,
    city: values.city,
    bio: values.bio,
    culturalIdentity: values.culturalIdentity,
    cultureImportance: values.cultureImportance,
    interests: values.interests,
  };

  if (values.occupation) {
    payload.occupation = values.occupation;
  }

  if (values.hometown) {
    payload.hometown = values.hometown;
  }

  if (values.favoriteSong) {
    payload.favoriteSong = values.favoriteSong;
  }

  if (values.favoritePoet) {
    payload.favoritePoet = values.favoritePoet;
  }

  if (values.photoUri) {
    payload.photoUri = values.photoUri;
  }

  return payload;
};

export default function OnboardingScreen() {
  const router = useRouter();
  const theme = useTheme();
  const styles = createStyles(theme);
  const { currentUser } = useSession();
  const { completeOnboarding, isCompleting } = useOnboarding();
  const applyPermanentBan = useAuthStore((state) => state.applyPermanentBan);
  const imagePicker = useImagePicker();
  const [quizAnswers, setQuizAnswers] = useState<Record<string, string>>({});
  const [failedAttempts, setFailedAttempts] = useState(0);
  const [lockedUntil, setLockedUntil] = useState<number | null>(null);
  const [attemptStateLoaded, setAttemptStateLoaded] = useState(false);
  const [now, setNow] = useState(Date.now());
  const [activeStepIndex, setActiveStepIndex] = useState(0);
  const [activeQuizIndex, setActiveQuizIndex] = useState(0);
  const form = useForm<OnboardingFormValues>({
    resolver: zodResolver(onboardingSchema),
    defaultValues: {
      name: currentUser?.name ?? "",
      age: currentUser?.age ?? 0,
      city: currentUser?.city ?? "",
      occupation: currentUser?.occupation ?? "",
      bio: currentUser?.bio ?? "",
      hometown: currentUser?.hometown ?? "",
      favoriteSong: currentUser?.favoriteSong ?? "",
      favoritePoet: currentUser?.favoritePoet ?? "",
      culturalIdentity: currentUser?.culturalIdentity ?? "prefer_not_to_say",
      cultureImportance: currentUser?.cultureImportance ?? "somewhat_important",
      interests: currentUser?.interests ?? [],
      photoUri: currentUser?.photos[0]?.uri ?? "",
    },
  });
  const selectedPhotoUri = form.watch("photoUri");
  const hasPassedKnowledgeTest = culturalKnowledgeQuestions.every((question) =>
    Boolean(quizAnswers[question.id]),
  );
  const activeStep = onboardingSteps[activeStepIndex] ?? onboardingSteps[0];
  const activeQuizQuestion = culturalKnowledgeQuestions[activeQuizIndex];
  const activeQuizAnswer = activeQuizQuestion
    ? quizAnswers[activeQuizQuestion.id]
    : undefined;
  const answeredKnowledgeQuestionCount = Object.keys(quizAnswers).length;
  const isKnowledgeTestLocked = lockedUntil !== null && lockedUntil > now;
  const remainingAttempts = Math.max(
    0,
    MAX_KNOWLEDGE_TEST_ATTEMPTS - failedAttempts,
  );
  const formValues = form.watch();
  const isFirstStep = activeStepIndex === 0;
  const isLastStep = activeStep.id === "review";
  const isLastQuizQuestion =
    activeQuizIndex === culturalKnowledgeQuestions.length - 1;
  const stepProgress =
    activeStep.id === "quiz"
      ? (activeStepIndex +
          (activeQuizIndex + 1) / culturalKnowledgeQuestions.length) /
        onboardingSteps.length
      : (activeStepIndex + 1) / onboardingSteps.length;

  useEffect(() => {
    let isMounted = true;

    const loadAttemptState = async () => {
      try {
        const storedState = await container.tokenStorage.getItem(
          env.knowledgeTestAttemptKey,
        );

        if (!storedState) {
          return;
        }

        const parsedState = JSON.parse(
          storedState,
        ) as KnowledgeTestAttemptState;
        const parsedLockedUntil =
          typeof parsedState.lockedUntil === "number"
            ? parsedState.lockedUntil
            : null;

        if (parsedLockedUntil && parsedLockedUntil > Date.now()) {
          if (isMounted) {
            setFailedAttempts(MAX_KNOWLEDGE_TEST_ATTEMPTS);
            setLockedUntil(parsedLockedUntil);
          }
          return;
        }

        if (parsedLockedUntil) {
          await clearKnowledgeTestAttemptState();
          return;
        }

        if (isMounted) {
          setFailedAttempts(
            Math.max(
              0,
              Math.min(
                parsedState.failedAttempts || 0,
                MAX_KNOWLEDGE_TEST_ATTEMPTS - 1,
              ),
            ),
          );
        }
      } catch {
        await clearKnowledgeTestAttemptState();
      } finally {
        if (isMounted) {
          setAttemptStateLoaded(true);
        }
      }
    };

    void loadAttemptState();

    return () => {
      isMounted = false;
    };
  }, []);

  useEffect(() => {
    if (!isKnowledgeTestLocked || lockedUntil === null) {
      return;
    }

    const timer = setInterval(() => {
      const currentTime = Date.now();
      setNow(currentTime);

      if (currentTime >= lockedUntil) {
        setFailedAttempts(0);
        setLockedUntil(null);
        void clearKnowledgeTestAttemptState();
      }
    }, 1_000);

    return () => clearInterval(timer);
  }, [isKnowledgeTestLocked, lockedUntil]);

  if (!currentUser) {
    return <Redirect href="/auth/login" />;
  }

  const onSubmit = form.handleSubmit(async (values) => {
    if (isKnowledgeTestLocked) {
      Alert.alert(
        "Test geçici olarak kilitli",
        `${formatRemainingTime((lockedUntil ?? now) - now)} sonra tekrar deneyebilirsin.`,
      );
      return;
    }

    if (!hasPassedKnowledgeTest) {
      Alert.alert(
        "Test tamamlanmadı",
        "Devam etmek için bilgi testindeki tüm soruları cevapla.",
      );
      return;
    }

    try {
      await completeOnboarding(toProfilePayload(values));
      void clearKnowledgeTestAttemptState();
      router.replace("/tabs/feed");
    } catch (error) {
      if (isPermanentBanError(error)) {
        Alert.alert(
          "Kalıcı ban",
          error instanceof Error
            ? error.message
            : "Ağır güvenlik ihlali nedeniyle hesap kalıcı olarak banlandı.",
          [
            {
              text: "Tamam",
              style: "destructive",
              onPress: () => void applyPermanentBan(),
            },
          ],
          { cancelable: false },
        );
        return;
      }

      Alert.alert(
        "Onboarding tamamlanamadı",
        error instanceof Error ? error.message : "Tekrar deneyin.",
      );
    }
  });

  const answerKnowledgeQuestion = async (
    questionId: string,
    option: (typeof culturalKnowledgeQuestions)[number]["options"][number],
  ) => {
    if (!attemptStateLoaded || isKnowledgeTestLocked) {
      return;
    }

    if (!option.correct) {
      const nextFailedAttempts = failedAttempts + 1;
      // Remove only the wrong answer, keep correct ones
      setQuizAnswers((current) => {
        const newAnswers = { ...current };
        delete newAnswers[questionId];
        return newAnswers;
      });

      if (nextFailedAttempts >= MAX_KNOWLEDGE_TEST_ATTEMPTS) {
        const nextLockedUntil = Date.now() + KNOWLEDGE_TEST_LOCK_DURATION_MS;
        const nextState: KnowledgeTestAttemptState = {
          failedAttempts: nextFailedAttempts,
          lockedUntil: nextLockedUntil,
        };

        setFailedAttempts(nextFailedAttempts);
        setLockedUntil(nextLockedUntil);
        setNow(Date.now());
        await saveKnowledgeTestAttemptState(nextState);

        Alert.alert(
          "Test geçici olarak kilitlendi",
          "İki deneme hakkını kullandın. 1 saat sonra tekrar deneyebilirsin.",
        );
        return;
      }

      const nextState: KnowledgeTestAttemptState = {
        failedAttempts: nextFailedAttempts,
      };
      setFailedAttempts(nextFailedAttempts);
      await saveKnowledgeTestAttemptState(nextState);

      Alert.alert(
        "Yanlış cevap",
        `Bu soruyu tekrar cevapla. ${MAX_KNOWLEDGE_TEST_ATTEMPTS - nextFailedAttempts} deneme hakkın kaldı.`,
      );
      return;
    }

    setQuizAnswers((current) => ({
      ...current,
      [questionId]: option.id,
    }));
  };

  const goBack = () => {
    if (activeStep.id === "quiz" && activeQuizIndex > 0) {
      setActiveQuizIndex((index) => Math.max(0, index - 1));
      return;
    }

    setActiveStepIndex((index) => Math.max(0, index - 1));
  };

  const validateStepFields = async (stepId: OnboardingStepId) => {
    const fields = stepValidationFields[stepId];

    if (fields.length === 0) {
      return true;
    }

    return form.trigger(fields);
  };

  const goNext = async () => {
    if (activeStep.id === "quiz") {
      if (isKnowledgeTestLocked) {
        Alert.alert(
          "Test geçici olarak kilitli",
          `${formatRemainingTime((lockedUntil ?? now) - now)} sonra tekrar deneyebilirsin.`,
        );
        return;
      }

      if (!activeQuizQuestion || !activeQuizAnswer) {
        Alert.alert("Cevap gerekli", "Devam etmek için bu soruyu cevapla.");
        return;
      }

      if (!isLastQuizQuestion) {
        setActiveQuizIndex((index) =>
          Math.min(culturalKnowledgeQuestions.length - 1, index + 1),
        );
        return;
      }

      setActiveStepIndex((index) =>
        Math.min(onboardingSteps.length - 1, index + 1),
      );
      return;
    }

    if (isLastStep) {
      void onSubmit();
      return;
    }

    const isStepValid = await validateStepFields(activeStep.id);

    if (!isStepValid) {
      return;
    }

    setActiveStepIndex((index) =>
      Math.min(onboardingSteps.length - 1, index + 1),
    );
  };

  const nextButtonLabel =
    activeStep.id === "intro"
      ? "Teste başla"
      : activeStep.id === "quiz"
        ? isLastQuizQuestion
          ? "Bilgilere geç"
          : "Sonraki soru"
        : isLastStep
          ? "Tamamla"
          : "İleri";
  const isNextDisabled =
    isCompleting ||
    (activeStep.id === "quiz" &&
      (!attemptStateLoaded || isKnowledgeTestLocked || !activeQuizAnswer));
  const culturalIdentityLabel =
    culturalIdentityOptions.find(
      (option) => option.value === formValues.culturalIdentity,
    )?.label ?? "Seçilmedi";
  const cultureImportanceLabel =
    cultureImportanceOptions.find(
      (option) => option.value === formValues.cultureImportance,
    )?.label ?? "Seçilmedi";

  return (
    <Screen scroll={false} style={styles.screenContent}>
      <ScrollView
        contentContainerStyle={styles.flowContent}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.topBar}>
          <View style={styles.brandMark}>
            <Text style={styles.brandLetter}>e</Text>
          </View>
          <View style={styles.topCopy}>
            <Text style={styles.kicker}>Ehlibyte onboarding</Text>
            <Text style={styles.topTitle}>Kartını kur</Text>
          </View>
          <View style={styles.stepCounter}>
            <Text style={styles.stepCounterText}>
              {activeStepIndex + 1}/{onboardingSteps.length}
            </Text>
          </View>
        </View>

        <View style={styles.progressTrack}>
          <View
            style={[
              styles.progressFill,
              { width: `${Math.max(8, Math.min(100, stepProgress * 100))}%` },
            ]}
          />
        </View>

        <View style={styles.lessonHeader}>
          <Text style={styles.kicker}>{activeStep.eyebrow}</Text>
          <Text style={styles.title}>{activeStep.title}</Text>
          <Text style={styles.description}>{activeStep.description}</Text>
        </View>

        {activeStep.id === "intro" ? (
          <LinearGradient
            colors={
              theme.isDark
                ? ["#101010", "#1B1B1B", "#2B2B2B"]
                : ["#FFFFFF", "#F4F4F4", "#E9E9E9"]
            }
            style={styles.introCard}
          >
            <View style={styles.mockCardTop}>
              <View style={styles.mockAvatar}>
                <Text style={styles.mockAvatarText}>
                  {"Ç".charAt(0).toLocaleUpperCase("tr-TR")}
                </Text>
              </View>
              <View style={styles.mockSignalBadge}>
                <Ionicons
                  name="sparkles"
                  size={16}
                  color={theme.isDark ? "#050505" : "#FFFFFF"}
                />
                <Text style={styles.mockSignalText}>Uyum %82</Text>
              </View>
            </View>
            <View style={styles.mockCardCopy}>
              <Text style={styles.mockName}>{"Senin kartın"}</Text>
              <Text style={styles.mockMeta}>
                Profil bilgileri, müzik sinyali ve ilgi alanları burada
                birleşir.
              </Text>
            </View>
            <View style={styles.mockStats}>
              <View style={styles.mockStat}>
                <Text style={styles.mockStatValue}>%68</Text>
                <Text style={styles.mockStatLabel}>Kültür</Text>
              </View>
              <View style={styles.mockStat}>
                <Text style={styles.mockStatValue}>%55</Text>
                <Text style={styles.mockStatLabel}>Müzik</Text>
              </View>
              <View style={styles.mockStat}>
                <Text style={styles.mockStatValue}>%81</Text>
                <Text style={styles.mockStatLabel}>Sohbet</Text>
              </View>
            </View>
            <View style={styles.introSignals}>
              <View style={styles.introSignal}>
                <Ionicons
                  name="person-circle"
                  size={18}
                  color={theme.colors.text}
                />
                <Text style={styles.introSignalText}>Profil</Text>
              </View>
              <View style={styles.introSignal}>
                <FontAwesome
                  name="spotify"
                  size={15}
                  color={theme.colors.text}
                />
                <Text style={styles.introSignalText}>Müzik</Text>
              </View>
              <View style={styles.introSignal}>
                <Ionicons name="radio" size={18} color={theme.colors.text} />
                <Text style={styles.introSignalText}>Meydan</Text>
              </View>
              <View style={styles.introSignal}>
                <Ionicons name="sparkles" size={18} color={theme.colors.text} />
                <Text style={styles.introSignalText}>Uyum</Text>
              </View>
            </View>
          </LinearGradient>
        ) : null}

        {activeStep.id === "quiz" && activeQuizQuestion ? (
          <View style={styles.stepCard}>
            <View style={styles.quizHeader}>
              <View style={styles.quizTitleBlock}>
                <Text style={styles.kicker}>
                  Soru {activeQuizIndex + 1}/{culturalKnowledgeQuestions.length}
                </Text>
                <Text style={styles.sectionTitle}>
                  {activeQuizQuestion.question}
                </Text>
              </View>
              <View
                style={[
                  styles.scoreBadge,
                  hasPassedKnowledgeTest && styles.scoreBadgePassed,
                ]}
              >
                <Text
                  style={[
                    styles.scoreText,
                    hasPassedKnowledgeTest && styles.scoreTextPassed,
                  ]}
                >
                  {answeredKnowledgeQuestionCount}/
                  {culturalKnowledgeQuestions.length}
                </Text>
              </View>
            </View>
            <View style={styles.quizDots}>
              {culturalKnowledgeQuestions.map((question, index) => {
                const isAnswered = Boolean(quizAnswers[question.id]);

                return (
                  <View
                    key={question.id}
                    style={[
                      styles.quizDot,
                      index === activeQuizIndex && styles.quizDotActive,
                      isAnswered && styles.quizDotDone,
                    ]}
                  />
                );
              })}
            </View>
            <Text
              style={[
                styles.quizStatus,
                isKnowledgeTestLocked && styles.quizStatusLocked,
              ]}
            >
              {isKnowledgeTestLocked
                ? `Test kilitli. ${formatRemainingTime((lockedUntil ?? now) - now)} sonra tekrar deneyebilirsin.`
                : `Kalan deneme hakkı: ${remainingAttempts}`}
            </Text>
            <View style={styles.quizOptions}>
              {activeQuizQuestion.options.map((option) => {
                const selected = activeQuizAnswer === option.id;

                return (
                  <Pressable
                    key={option.id}
                    disabled={!attemptStateLoaded || isKnowledgeTestLocked}
                    onPress={() =>
                      void answerKnowledgeQuestion(
                        activeQuizQuestion.id,
                        option,
                      )
                    }
                    style={({ pressed }) => [
                      styles.quizOption,
                      selected && styles.quizOptionSelected,
                      isKnowledgeTestLocked && styles.quizOptionDisabled,
                      pressed && styles.pressed,
                    ]}
                  >
                    <Text
                      style={[
                        styles.quizOptionText,
                        selected && styles.quizOptionTextSelected,
                      ]}
                    >
                      {option.label}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          </View>
        ) : null}

        {activeStep.id === "culture" ? (
          <View style={styles.stepCard}>
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>
                Kültürel yakınlığını nasıl anlatırsın?
              </Text>
              <Controller
                control={form.control}
                name="culturalIdentity"
                render={({ field }) => (
                  <View style={styles.chipWrap}>
                    {culturalIdentityOptions.map((option) => (
                      <OptionChip
                        key={option.value}
                        label={option.label}
                        selected={field.value === option.value}
                        onPress={() => field.onChange(option.value)}
                      />
                    ))}
                  </View>
                )}
              />
            </View>
            <View style={styles.sectionLast}>
              <Text style={styles.sectionTitle}>
                Bu kültür hayatında ne kadar önemli?
              </Text>
              <Controller
                control={form.control}
                name="cultureImportance"
                render={({ field }) => (
                  <View style={styles.chipWrap}>
                    {cultureImportanceOptions.map((option) => (
                      <OptionChip
                        key={option.value}
                        label={option.label}
                        selected={field.value === option.value}
                        onPress={() => field.onChange(option.value)}
                      />
                    ))}
                  </View>
                )}
              />
            </View>
          </View>
        ) : null}

        {activeStep.id === "interests" ? (
          <View style={styles.stepCard}>
            <Text style={styles.sectionTitle}>İlgi alanları</Text>
            <Text style={styles.description}>
              En az bir tane seç. Bunlar Keşfet kartlarında ortak sinyal üretir.
            </Text>
            <Controller
              control={form.control}
              name="interests"
              render={({ field, fieldState }) => (
                <>
                  <View style={styles.chipWrap}>
                    {interestOptions.map((option) => {
                      const isSelected = field.value.includes(option.value);

                      return (
                        <OptionChip
                          key={option.value}
                          label={option.label}
                          selected={isSelected}
                          onPress={() => {
                            field.onChange(
                              isSelected
                                ? field.value.filter(
                                    (interest) => interest !== option.value,
                                  )
                                : [...field.value, option.value],
                            );
                          }}
                        />
                      );
                    })}
                  </View>
                  {fieldState.error ? (
                    <Text style={styles.error}>{fieldState.error.message}</Text>
                  ) : null}
                </>
              )}
            />
          </View>
        ) : null}

        {activeStep.id === "profile" ? (
          <View style={styles.stepCard}>
            <Controller
              control={form.control}
              name="photoUri"
              render={({ field }) => (
                <View style={styles.photoRow}>
                  {selectedPhotoUri ? (
                    <Image
                      source={{ uri: selectedPhotoUri }}
                      style={styles.previewPhoto}
                    />
                  ) : (
                    <View style={styles.emptyPhoto}>
                      <Ionicons
                        name="person-add-outline"
                        size={28}
                        color={theme.colors.muted}
                      />
                      <Text style={styles.emptyPhotoText}>
                        Profil fotoğrafı ekleyebilirsin
                      </Text>
                    </View>
                  )}
                  <Button
                    label={
                      selectedPhotoUri ? "Fotoğrafı değiştir" : "Fotoğraf yükle"
                    }
                    variant="secondary"
                    loading={imagePicker.isPicking}
                    onPress={async () => {
                      const uri = await imagePicker.pickImage();

                      if (uri) {
                        field.onChange(uri);
                      }
                    }}
                  />
                </View>
              )}
            />
            <Controller
              control={form.control}
              name="name"
              render={({ field, fieldState }) => (
                <Input
                  label="İsim"
                  value={field.value}
                  onChangeText={field.onChange}
                  error={fieldState.error?.message}
                />
              )}
            />
            <View style={styles.twoColumn}>
              <View style={styles.twoColumnItem}>
                <Controller
                  control={form.control}
                  name="age"
                  render={({ field, fieldState }) => (
                    <Input
                      label="Yaş"
                      keyboardType="number-pad"
                      value={field.value ? String(field.value) : ""}
                      onChangeText={(value) => field.onChange(Number(value))}
                      error={fieldState.error?.message}
                    />
                  )}
                />
              </View>
              <View style={styles.twoColumnItem}>
                <Controller
                  control={form.control}
                  name="city"
                  render={({ field, fieldState }) => (
                    <Input
                      label="Şehir"
                      value={field.value}
                      onChangeText={field.onChange}
                      error={fieldState.error?.message}
                    />
                  )}
                />
              </View>
            </View>
          </View>
        ) : null}

        {activeStep.id === "details" ? (
          <View style={styles.stepCard}>
            <Controller
              control={form.control}
              name="bio"
              render={({ field, fieldState }) => (
                <Input
                  label="Bio"
                  multiline
                  value={field.value}
                  onChangeText={field.onChange}
                  error={fieldState.error?.message}
                />
              )}
            />
            <Controller
              control={form.control}
              name="occupation"
              render={({ field }) => (
                <Input
                  label="Meslek"
                  value={field.value}
                  onChangeText={field.onChange}
                />
              )}
            />
            <Controller
              control={form.control}
              name="hometown"
              render={({ field }) => (
                <Input
                  label="Memleket"
                  value={field.value}
                  onChangeText={field.onChange}
                />
              )}
            />
            <Controller
              control={form.control}
              name="favoriteSong"
              render={({ field }) => (
                <Input
                  label="Favori türkü"
                  value={field.value}
                  onChangeText={field.onChange}
                />
              )}
            />
            <Controller
              control={form.control}
              name="favoritePoet"
              render={({ field }) => (
                <Input
                  label="Favori ozan"
                  value={field.value}
                  onChangeText={field.onChange}
                />
              )}
            />
          </View>
        ) : null}

        {activeStep.id === "review" ? (
          <View style={styles.stepCard}>
            <View style={styles.reviewHeader}>
              {selectedPhotoUri ? (
                <Image
                  source={{ uri: selectedPhotoUri }}
                  style={styles.reviewPhoto}
                />
              ) : (
                <View style={styles.reviewPhotoPlaceholder}>
                  <Text style={styles.reviewPhotoInitial}>
                    {(formValues.name || "E")
                      .charAt(0)
                      .toLocaleUpperCase("tr-TR")}
                  </Text>
                </View>
              )}
              <View style={styles.reviewIdentity}>
                <Text style={styles.reviewName}>
                  {formValues.name || "İsimsiz profil"}
                  {formValues.age ? `, ${formValues.age}` : ""}
                </Text>
                <Text style={styles.description}>
                  {formValues.city || "Şehir eklenmedi"}
                </Text>
              </View>
            </View>
            <View style={styles.reviewRow}>
              <Text style={styles.reviewLabel}>Kültür</Text>
              <Text style={styles.reviewValue}>{culturalIdentityLabel}</Text>
            </View>
            <View style={styles.reviewRow}>
              <Text style={styles.reviewLabel}>Önem</Text>
              <Text style={styles.reviewValue}>{cultureImportanceLabel}</Text>
            </View>
            <View style={styles.reviewRow}>
              <Text style={styles.reviewLabel}>İlgi alanı</Text>
              <Text style={styles.reviewValue}>
                {formValues.interests.length} seçim
              </Text>
            </View>
            <View style={styles.reviewBio}>
              <Text style={styles.reviewLabel}>Bio</Text>
              <Text style={styles.reviewBioText}>
                {formValues.bio || "Bio eklenmedi."}
              </Text>
            </View>
          </View>
        ) : null}
      </ScrollView>

      <View style={styles.actionRow}>
        <Button
          label="Geri"
          variant="ghost"
          disabled={isFirstStep || isCompleting}
          onPress={goBack}
          style={styles.backButton}
        />
        <Button
          label={nextButtonLabel}
          disabled={isNextDisabled}
          loading={isLastStep && isCompleting}
          onPress={() => void goNext()}
          style={styles.nextButton}
        />
      </View>
    </Screen>
  );
}

const createStyles = (theme: ReturnType<typeof useTheme>) =>
  StyleSheet.create({
    screenContent: {
      flex: 1,
      gap: theme.spacing.sm,
      paddingBottom: theme.spacing.lg,
    },
    flowContent: {
      gap: theme.spacing.sm,
      paddingBottom: theme.spacing.md,
    },
    topBar: {
      flexDirection: "row",
      alignItems: "center",
      gap: theme.spacing.sm,
    },
    brandMark: {
      width: 42,
      height: 42,
      borderRadius: 15,
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: theme.colors.text,
    },
    brandLetter: {
      fontSize: 27,
      lineHeight: 30,
      fontWeight: "900",
      color: theme.colors.background,
    },
    topCopy: {
      flex: 1,
      gap: 1,
    },
    topTitle: {
      fontSize: 26,
      lineHeight: 30,
      fontWeight: "900",
      color: theme.colors.text,
    },
    stepCounter: {
      minWidth: 58,
      minHeight: 34,
      borderRadius: theme.radius.pill,
      alignItems: "center",
      justifyContent: "center",
      paddingHorizontal: theme.spacing.sm,
      backgroundColor: theme.colors.elevated,
      borderWidth: 1,
      borderColor: theme.colors.border,
    },
    stepCounterText: {
      ...theme.typography.caption,
      color: theme.colors.text,
    },
    lessonHeader: {
      gap: theme.spacing.xxs,
    },
    introCard: {
      gap: theme.spacing.sm,
      borderRadius: 26,
      padding: theme.spacing.md,
      marginBottom: theme.spacing.xs,
      overflow: "hidden",
      borderWidth: 1,
      borderColor: theme.isDark
        ? "rgba(255, 255, 255, 0.13)"
        : "rgba(0, 0, 0, 0.10)",
      shadowColor: theme.colors.shadow,
      shadowOpacity: 1,
      shadowRadius: 20,
      shadowOffset: { width: 0, height: 12 },
      elevation: 4,
    },
    mockCardTop: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      gap: theme.spacing.sm,
    },
    mockAvatar: {
      width: 56,
      height: 56,
      borderRadius: 21,
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: theme.colors.text,
    },
    mockAvatarText: {
      fontSize: 28,
      lineHeight: 32,
      fontWeight: "900",
      color: theme.colors.background,
    },
    mockSignalBadge: {
      minHeight: 34,
      borderRadius: theme.radius.pill,
      flexDirection: "row",
      alignItems: "center",
      gap: theme.spacing.xxs,
      paddingHorizontal: theme.spacing.md,
      backgroundColor: theme.colors.text,
    },
    mockSignalText: {
      ...theme.typography.caption,
      color: theme.colors.background,
    },
    mockCardCopy: {
      gap: theme.spacing.xs,
    },
    mockName: {
      fontSize: 28,
      lineHeight: 32,
      fontWeight: "900",
      color: theme.colors.text,
    },
    mockMeta: {
      ...theme.typography.body,
      color: theme.colors.muted,
    },
    mockStats: {
      flexDirection: "row",
      gap: theme.spacing.xs,
    },
    mockStat: {
      flex: 1,
      minHeight: 58,
      borderRadius: 18,
      justifyContent: "center",
      paddingHorizontal: theme.spacing.sm,
      backgroundColor: theme.isDark
        ? "rgba(255, 255, 255, 0.08)"
        : "rgba(0, 0, 0, 0.06)",
      borderWidth: 1,
      borderColor: theme.isDark
        ? "rgba(255, 255, 255, 0.12)"
        : "rgba(0, 0, 0, 0.08)",
    },
    mockStatValue: {
      fontSize: 20,
      lineHeight: 24,
      fontWeight: "900",
      color: theme.colors.text,
    },
    mockStatLabel: {
      ...theme.typography.caption,
      color: theme.colors.muted,
    },
    introSignals: {
      flexDirection: "row",
      flexWrap: "wrap",
      gap: theme.spacing.xs,
    },
    introSignal: {
      minHeight: 36,
      borderRadius: theme.radius.pill,
      flexDirection: "row",
      alignItems: "center",
      gap: theme.spacing.xxs,
      paddingHorizontal: theme.spacing.sm,
      backgroundColor: theme.isDark
        ? "rgba(255, 255, 255, 0.07)"
        : "rgba(0, 0, 0, 0.05)",
    },
    introSignalText: {
      ...theme.typography.caption,
      color: theme.colors.text,
    },
    header: {
      gap: theme.spacing.sm,
      marginBottom: theme.spacing.lg,
    },
    hero: {
      minHeight: 268,
      borderRadius: 30,
      justifyContent: "space-between",
      gap: theme.spacing.md,
      padding: 22,
      marginBottom: theme.spacing.xl,
      overflow: "hidden",
      borderWidth: 1,
      borderColor: theme.isDark
        ? "rgba(255, 255, 255, 0.10)"
        : "rgba(0, 0, 0, 0.08)",
      backgroundColor: theme.colors.elevated,
      shadowColor: theme.colors.shadow,
      shadowOpacity: 1,
      shadowRadius: 24,
      shadowOffset: { width: 0, height: 12 },
      elevation: 5,
    },
    heroTopRow: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      gap: theme.spacing.md,
    },
    heroMark: {
      width: 58,
      height: 58,
      borderRadius: 20,
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: theme.isDark ? "#FFFFFF" : "#0A0A0A",
    },
    heroLetter: {
      fontSize: 36,
      lineHeight: 40,
      fontWeight: "900",
      color: theme.isDark ? "#0A0A0A" : "#FFFFFF",
    },
    heroCounter: {
      minHeight: 36,
      borderRadius: theme.radius.pill,
      flexDirection: "row",
      alignItems: "center",
      gap: theme.spacing.xxs,
      paddingHorizontal: theme.spacing.md,
      backgroundColor: theme.isDark
        ? "rgba(255, 255, 255, 0.10)"
        : "rgba(0, 0, 0, 0.07)",
      borderWidth: 1,
      borderColor: theme.isDark
        ? "rgba(255, 255, 255, 0.10)"
        : "rgba(0, 0, 0, 0.06)",
    },
    heroCounterText: {
      ...theme.typography.caption,
      color: theme.isDark ? "#FFFFFF" : "#0A0A0A",
    },
    heroCopy: {
      gap: theme.spacing.xs,
    },
    heroKicker: {
      ...theme.typography.caption,
      color: theme.isDark
        ? "rgba(255, 255, 255, 0.62)"
        : "rgba(10, 10, 10, 0.56)",
      textTransform: "uppercase",
    },
    heroTitle: {
      fontSize: 31,
      lineHeight: 36,
      fontWeight: "900",
      color: theme.isDark ? "#FFFFFF" : "#0A0A0A",
      maxWidth: 330,
    },
    heroSubtitle: {
      ...theme.typography.body,
      maxWidth: 320,
      color: theme.isDark
        ? "rgba(255, 255, 255, 0.62)"
        : "rgba(10, 10, 10, 0.58)",
    },
    heroSteps: {
      flexDirection: "row",
      gap: theme.spacing.xs,
      flexWrap: "wrap",
    },
    heroStep: {
      minHeight: 36,
      borderRadius: theme.radius.pill,
      flexDirection: "row",
      alignItems: "center",
      gap: theme.spacing.xxs,
      paddingHorizontal: theme.spacing.md,
      backgroundColor: theme.isDark
        ? "rgba(255, 255, 255, 0.10)"
        : "rgba(0, 0, 0, 0.07)",
      borderWidth: 1,
      borderColor: theme.isDark
        ? "rgba(255, 255, 255, 0.10)"
        : "rgba(0, 0, 0, 0.06)",
    },
    heroStepText: {
      ...theme.typography.caption,
      color: theme.isDark ? "#FFFFFF" : "#0A0A0A",
    },
    kicker: {
      ...theme.typography.caption,
      color: theme.colors.primary,
      textTransform: "uppercase",
    },
    title: {
      ...theme.typography.title,
      color: theme.colors.text,
    },
    description: {
      ...theme.typography.body,
      color: theme.colors.muted,
    },
    summaryRow: {
      flexDirection: "row",
      gap: theme.spacing.xs,
      marginTop: theme.spacing.xs,
    },
    summaryItem: {
      minWidth: 78,
      minHeight: 54,
      borderRadius: 18,
      justifyContent: "center",
      paddingHorizontal: theme.spacing.md,
      backgroundColor: theme.colors.elevated,
      borderWidth: 1,
      borderColor: theme.colors.border,
    },
    summaryValue: {
      fontSize: 18,
      lineHeight: 22,
      fontWeight: "900",
      color: theme.colors.text,
    },
    summaryLabel: {
      ...theme.typography.caption,
      color: theme.colors.muted,
      textTransform: "uppercase",
    },
    progressCard: {
      gap: theme.spacing.md,
      borderRadius: 24,
      padding: theme.spacing.lg,
      marginBottom: theme.spacing.lg,
      backgroundColor: theme.colors.elevated,
      borderWidth: 1,
      borderColor: theme.colors.border,
    },
    progressHeader: {
      gap: theme.spacing.xs,
    },
    progressTrack: {
      height: 7,
      borderRadius: theme.radius.pill,
      overflow: "hidden",
      backgroundColor: theme.isDark
        ? "rgba(255, 255, 255, 0.10)"
        : "rgba(0, 0, 0, 0.08)",
    },
    progressFill: {
      height: "100%",
      borderRadius: theme.radius.pill,
      backgroundColor: theme.colors.text,
    },
    stepPills: {
      flexDirection: "row",
      flexWrap: "wrap",
      gap: theme.spacing.xs,
    },
    stepPill: {
      minHeight: 30,
      borderRadius: theme.radius.pill,
      justifyContent: "center",
      paddingHorizontal: theme.spacing.sm,
      backgroundColor: theme.colors.surface,
      borderWidth: 1,
      borderColor: theme.colors.border,
    },
    stepPillActive: {
      backgroundColor: theme.colors.primary,
      borderColor: theme.colors.primary,
    },
    stepPillDone: {
      backgroundColor: theme.isDark ? "#151515" : "#F5F5F5",
    },
    stepPillText: {
      ...theme.typography.caption,
      color: theme.colors.muted,
    },
    stepPillTextActive: {
      color: theme.colors.onPrimary,
    },
    stepPillTextDone: {
      color: theme.colors.text,
    },
    section: {
      gap: theme.spacing.sm,
      marginBottom: theme.spacing.lg,
    },
    sectionLast: {
      gap: theme.spacing.sm,
    },
    stepCard: {
      gap: theme.spacing.md,
      borderRadius: 24,
      padding: theme.spacing.lg,
      marginBottom: theme.spacing.lg,
      backgroundColor: theme.isDark ? "#050505" : theme.colors.surface,
      borderWidth: 1,
      borderColor: theme.isDark
        ? "rgba(255, 255, 255, 0.12)"
        : "rgba(0, 0, 0, 0.10)",
    },
    quizCard: {
      gap: theme.spacing.md,
      borderRadius: 24,
      padding: theme.spacing.lg,
      marginBottom: theme.spacing.lg,
      backgroundColor: theme.isDark ? "#050505" : theme.colors.surface,
      borderWidth: 1,
      borderColor: theme.isDark
        ? "rgba(255, 255, 255, 0.12)"
        : "rgba(0, 0, 0, 0.10)",
    },
    quizHeader: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      gap: theme.spacing.md,
    },
    quizTitleBlock: {
      flex: 1,
      gap: theme.spacing.xxs,
    },
    quizDots: {
      flexDirection: "row",
      gap: theme.spacing.xs,
    },
    quizDot: {
      flex: 1,
      height: 5,
      borderRadius: theme.radius.pill,
      backgroundColor: theme.colors.border,
    },
    quizDotActive: {
      backgroundColor: theme.colors.muted,
    },
    quizDotDone: {
      backgroundColor: theme.colors.primary,
    },
    scoreBadge: {
      minWidth: 64,
      height: 46,
      borderRadius: theme.radius.pill,
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: theme.isDark ? "#151515" : theme.colors.elevated,
      borderWidth: 1,
      borderColor: theme.colors.border,
    },
    scoreBadgePassed: {
      backgroundColor: theme.colors.success,
      borderColor: theme.colors.success,
    },
    scoreText: {
      ...theme.typography.subheading,
      color: theme.colors.text,
    },
    scoreTextPassed: {
      color: theme.isDark ? "#052E16" : "#FFFFFF",
    },
    quizStatus: {
      ...theme.typography.caption,
      color: theme.colors.muted,
    },
    quizStatusLocked: {
      color: theme.colors.danger,
      fontWeight: "700",
    },
    quizQuestion: {
      gap: theme.spacing.sm,
      paddingTop: theme.spacing.xs,
    },
    quizQuestionText: {
      ...theme.typography.subheading,
      color: theme.colors.text,
    },
    quizOptions: {
      gap: theme.spacing.xs,
    },
    quizOption: {
      minHeight: 52,
      borderRadius: 18,
      borderWidth: 1,
      borderColor: theme.colors.border,
      paddingHorizontal: theme.spacing.md,
      paddingVertical: theme.spacing.sm,
      justifyContent: "center",
      backgroundColor: theme.isDark ? "#101010" : "#FAFAFA",
    },
    quizOptionSelected: {
      borderColor: theme.colors.text,
      backgroundColor: theme.colors.text,
    },
    quizOptionDisabled: {
      opacity: 0.5,
    },
    quizOptionText: {
      ...theme.typography.body,
      color: theme.colors.text,
      flexShrink: 1,
    },
    quizOptionTextSelected: {
      color: theme.colors.background,
      fontWeight: "700",
    },
    pressed: {
      opacity: 0.82,
    },
    sectionTitle: {
      ...theme.typography.subheading,
      color: theme.colors.text,
    },
    chipWrap: {
      flexDirection: "row",
      flexWrap: "wrap",
      gap: theme.spacing.xs,
    },
    error: {
      ...theme.typography.caption,
      color: theme.colors.danger,
    },
    photoRow: {
      gap: theme.spacing.sm,
    },
    emptyPhoto: {
      minHeight: 150,
      borderRadius: 22,
      alignItems: "center",
      justifyContent: "center",
      gap: theme.spacing.xs,
      backgroundColor: theme.colors.elevated,
      borderWidth: 1,
      borderColor: theme.colors.border,
      borderStyle: "dashed",
    },
    emptyPhotoText: {
      ...theme.typography.caption,
      color: theme.colors.muted,
    },
    previewPhoto: {
      width: "100%",
      height: 220,
      borderRadius: theme.radius.md,
      backgroundColor: theme.colors.elevated,
    },
    twoColumn: {
      flexDirection: "row",
      gap: theme.spacing.sm,
    },
    twoColumnItem: {
      flex: 1,
    },
    reviewHeader: {
      flexDirection: "row",
      alignItems: "center",
      gap: theme.spacing.md,
    },
    reviewPhoto: {
      width: 74,
      height: 74,
      borderRadius: 26,
      backgroundColor: theme.colors.elevated,
    },
    reviewPhotoPlaceholder: {
      width: 74,
      height: 74,
      borderRadius: 26,
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: theme.colors.primary,
    },
    reviewPhotoInitial: {
      fontSize: 28,
      lineHeight: 32,
      fontWeight: "900",
      color: theme.colors.onPrimary,
    },
    reviewIdentity: {
      flex: 1,
      gap: theme.spacing.xxs,
    },
    reviewName: {
      ...theme.typography.heading,
      color: theme.colors.text,
    },
    reviewRow: {
      minHeight: 48,
      borderRadius: 16,
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      gap: theme.spacing.md,
      paddingHorizontal: theme.spacing.md,
      backgroundColor: theme.colors.elevated,
    },
    reviewLabel: {
      ...theme.typography.caption,
      color: theme.colors.muted,
      textTransform: "uppercase",
    },
    reviewValue: {
      ...theme.typography.caption,
      maxWidth: "58%",
      color: theme.colors.text,
      textAlign: "right",
    },
    reviewBio: {
      gap: theme.spacing.xs,
      borderRadius: 18,
      padding: theme.spacing.md,
      backgroundColor: theme.colors.elevated,
    },
    reviewBioText: {
      ...theme.typography.body,
      color: theme.colors.text,
    },
    actionRow: {
      flexDirection: "row",
      gap: theme.spacing.sm,
      marginTop: theme.spacing.xs,
    },
    backButton: {
      flex: 0.42,
    },
    nextButton: {
      flex: 0.58,
    },
  });
