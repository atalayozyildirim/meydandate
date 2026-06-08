// Kayıt sonrası profil, ilgi alanı ve giriş uygunluğu onboarding akışını yönetir.
import { useEffect, useState } from "react";
import { Alert, Image, Pressable, StyleSheet, Text, View } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
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

const MAX_KNOWLEDGE_TEST_ATTEMPTS = 2;
const KNOWLEDGE_TEST_LOCK_DURATION_MS = 60 * 60 * 1000;

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

const aleviKnowledgeQuestions = [
  {
    id: "cem",
    question: "Cem erkânında topluluğun temel ilkelerinden biri hangisidir?",
    options: [
      { id: "rizalik", label: "Rızalık ve saygı", correct: true },
      { id: "gosteris", label: "Gösteriş ve rekabet", correct: false },
      { id: "yalnizlik", label: "Yalnız kalmak", correct: false },
    ],
  },
  {
    id: "semah",
    question: "Semah en doğru nasıl tanımlanır?",
    options: [
      { id: "ibadet", label: "Cemlerde dönülen ritüel/ibadet ", correct: true },
      { id: "one1", label: "Geleneksel", correct: false },
      { id: "spor", label: "Ritual", correct: false },
    ],
  },
  {
    id: "muharrem",
    question: "Muharrem orucu hangi değerle ilişkilidir?",
    options: [
      { id: "yas", label: "Yas, sabır ve arınma", correct: true },
      { id: "tuketim", label: "Tüketim ve gösteriş", correct: false },
      { id: "zorunlu", label: "İsyan", correct: false },
    ],
  },
  {
    id: "lokma",
    question: "Muharrem orucu kaç gündür?",
    options: [
      { id: "paylasim", label: "11", correct: false },
      { id: "test", label: "12", correct: true },
      { id: "ceza", label: "14", correct: false },
    ],
  },
] as const;

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
  const form = useForm<OnboardingFormValues>({
    resolver: zodResolver(onboardingSchema),
    defaultValues: {
      name: currentUser?.name ?? "",
      age: currentUser?.age ?? 18,
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
  const hasPassedKnowledgeTest = aleviKnowledgeQuestions.every((question) =>
    Boolean(quizAnswers[question.id]),
  );
  const isKnowledgeTestLocked = lockedUntil !== null && lockedUntil > now;
  const remainingAttempts = Math.max(
    0,
    MAX_KNOWLEDGE_TEST_ATTEMPTS - failedAttempts,
  );

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
    option: (typeof aleviKnowledgeQuestions)[number]["options"][number],
  ) => {
    if (!attemptStateLoaded || isKnowledgeTestLocked) {
      return;
    }

    if (!option.correct) {
      const nextFailedAttempts = failedAttempts + 1;
      setQuizAnswers({});

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
        `Test sıfırlandı. ${MAX_KNOWLEDGE_TEST_ATTEMPTS - nextFailedAttempts} deneme hakkın kaldı.`,
      );
      return;
    }

    setQuizAnswers((current) => ({
      ...current,
      [questionId]: option.id,
    }));
  };

  return (
    <Screen>
      <LinearGradient
        colors={["#FF4458", "#FD267A", "#8A2387"]}
        style={styles.hero}
      >
        <View style={styles.heroMark}>
          <Text style={styles.heroLetter}>e</Text>
        </View>
        <Text style={styles.heroKicker}>Ehlibyte'e hoş geldin</Text>
        <Text style={styles.heroTitle}>
          Profilini kur, kartlarda görün, eşleşmeye başla.
        </Text>
        <View style={styles.heroSteps}>
          <View style={styles.heroStep}>
            <Ionicons name="person-circle" size={18} color="#FFFFFF" />
            <Text style={styles.heroStepText}>Profil</Text>
          </View>
          <View style={styles.heroStep}>
            <Ionicons name="albums" size={18} color="#FFFFFF" />
            <Text style={styles.heroStepText}>Swipe</Text>
          </View>
          <View style={styles.heroStep}>
            <Ionicons name="heart" size={18} color="#FFFFFF" />
            <Text style={styles.heroStepText}>Match</Text>
          </View>
        </View>
      </LinearGradient>

      <View style={styles.header}>
        <Text style={styles.kicker}>Onboarding</Text>
        <Text style={styles.title}>Kartını hazırla</Text>
        <Text style={styles.description}>
          Bu bilgiler profil kartında ve eşleşme önerilerinde kullanılır.
        </Text>
      </View>

      <View style={styles.quizCard}>
        <View style={styles.quizHeader}>
          <View>
            <Text style={styles.kicker}>Alevilik bilgi testi</Text>
            <Text style={styles.sectionTitle}>Giriş için tüm soruları geç</Text>
          </View>
          <View
            style={[
              styles.scoreBadge,
              hasPassedKnowledgeTest && styles.scoreBadgePassed,
            ]}
          >
            <Text style={styles.scoreText}>
              {Object.keys(quizAnswers).length}/4
            </Text>
          </View>
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
        {aleviKnowledgeQuestions.map((question) => (
          <View key={question.id} style={styles.quizQuestion}>
            <Text style={styles.quizQuestionText}>{question.question}</Text>
            <View style={styles.quizOptions}>
              {question.options.map((option) => {
                const selected = quizAnswers[question.id] === option.id;

                return (
                  <Pressable
                    key={option.id}
                    disabled={!attemptStateLoaded || isKnowledgeTestLocked}
                    onPress={() =>
                      void answerKnowledgeQuestion(question.id, option)
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
        ))}
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Kendinizi nasıl tanımlarsınız?</Text>
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

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>
          Alevi kültürü hayatınızda ne kadar önemli?
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

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>İlgi alanları</Text>
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

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Profil bilgileri</Text>
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
              ) : null}
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
        <Controller
          control={form.control}
          name="age"
          render={({ field, fieldState }) => (
            <Input
              label="Yaş"
              keyboardType="number-pad"
              value={String(field.value)}
              onChangeText={(value) => field.onChange(Number(value))}
              error={fieldState.error?.message}
            />
          )}
        />
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

      <Button
        label="Onboarding'i tamamla"
        disabled={!attemptStateLoaded || isKnowledgeTestLocked}
        loading={isCompleting}
        onPress={onSubmit}
      />
    </Screen>
  );
}

const createStyles = (theme: ReturnType<typeof useTheme>) =>
  StyleSheet.create({
    header: {
      gap: theme.spacing.xs,
      marginBottom: theme.spacing.lg,
    },
    hero: {
      minHeight: 300,
      borderRadius: 28,
      justifyContent: "flex-end",
      gap: theme.spacing.md,
      padding: theme.spacing.lg,
      marginBottom: theme.spacing.xl,
      shadowColor: theme.colors.shadow,
      shadowOpacity: 1,
      shadowRadius: 20,
      shadowOffset: { width: 0, height: 12 },
      elevation: 5,
    },
    heroMark: {
      width: 62,
      height: 62,
      borderRadius: 20,
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: "#FFFFFF",
    },
    heroLetter: {
      fontSize: 38,
      lineHeight: 42,
      fontWeight: "900",
      color: theme.colors.primary,
    },
    heroKicker: {
      ...theme.typography.caption,
      color: "rgba(255, 255, 255, 0.76)",
      textTransform: "uppercase",
    },
    heroTitle: {
      fontSize: 34,
      lineHeight: 39,
      fontWeight: "900",
      color: "#FFFFFF",
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
      backgroundColor: "rgba(255, 255, 255, 0.18)",
    },
    heroStepText: {
      ...theme.typography.caption,
      color: "#FFFFFF",
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
    section: {
      gap: theme.spacing.sm,
      marginBottom: theme.spacing.lg,
    },
    quizCard: {
      gap: theme.spacing.md,
      borderRadius: 24,
      padding: theme.spacing.md,
      marginBottom: theme.spacing.lg,
      backgroundColor: theme.colors.surface,
      borderWidth: 1,
      borderColor: "rgba(233, 64, 87, 0.12)",
    },
    quizHeader: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      gap: theme.spacing.md,
    },
    scoreBadge: {
      minWidth: 54,
      height: 38,
      borderRadius: theme.radius.pill,
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: theme.colors.elevated,
    },
    scoreBadgePassed: {
      backgroundColor: theme.colors.success,
    },
    scoreText: {
      ...theme.typography.caption,
      color: theme.colors.text,
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
    },
    quizQuestionText: {
      ...theme.typography.subheading,
      color: theme.colors.text,
    },
    quizOptions: {
      gap: theme.spacing.xs,
    },
    quizOption: {
      minHeight: 44,
      borderRadius: 16,
      borderWidth: 1,
      borderColor: theme.colors.border,
      paddingHorizontal: theme.spacing.md,
      justifyContent: "center",
      backgroundColor: "rgba(255, 255, 255, 0.78)",
    },
    quizOptionSelected: {
      borderColor: theme.colors.primary,
      backgroundColor: "#FFF0F3",
    },
    quizOptionDisabled: {
      opacity: 0.5,
    },
    quizOptionText: {
      ...theme.typography.body,
      color: theme.colors.text,
    },
    quizOptionTextSelected: {
      color: theme.colors.primary,
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
    previewPhoto: {
      width: "100%",
      height: 220,
      borderRadius: theme.radius.md,
      backgroundColor: theme.colors.elevated,
    },
  });
