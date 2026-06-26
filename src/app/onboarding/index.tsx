import {
  Alert,
  ScrollView,
  StyleSheet,
  View,
} from "react-native";
import { Redirect, useRouter } from "expo-router";
import { useSession } from "@/features/auth/hooks/useSession";
import { useAuthStore } from "@/features/auth/stores/authStore";
import { isPermanentBanError } from "@/features/moderation/utils/permanentBan";
import { useOnboarding } from "@/features/onboarding";
import {
  useKnowledgeTest,
  culturalKnowledgeQuestions,
  useOnboardingSteps,
  toProfilePayload,
  clearKnowledgeTestAttemptState,
  OnboardingStepComponent,
  onboardingSteps,
  useOnboardingForm,
  OnboardingHeader,
  OnboardingProgress,
  OnboardingStepHeader,
  OnboardingActions,
} from "@/features/onboarding";
import { Screen } from "@/shared/components/Screen";
import { useImagePicker } from "@/shared/hooks/useImagePicker";
import { useTheme } from "@/shared/theme";

export default function OnboardingScreen() {
  const router = useRouter();
  const theme = useTheme();
  const styles = createStyles(theme);
  const { currentUser } = useSession();
  const { completeOnboarding, isCompleting } = useOnboarding();
  const applyPermanentBan = useAuthStore((state) => state.applyPermanentBan);
  const imagePicker = useImagePicker();

  const { form, selectedPhotoUri, formValues } = useOnboardingForm();

  const knowledgeTest = useKnowledgeTest();

  const onSubmit = form.handleSubmit(async (values) => {
    if (knowledgeTest.isKnowledgeTestLocked) {
      Alert.alert(
        "Test geçici olarak kilitli",
        `${knowledgeTest.formatRemainingTime((knowledgeTest.lockedUntil ?? Date.now()) - Date.now())} sonra tekrar deneyebilirsin.`,
      );
      return;
    }

    if (!knowledgeTest.hasPassedKnowledgeTest) {
      Alert.alert(
        "Test tamamlanmadı",
        "Devam etmek için bilgi testindeki tüm soruları cevapla.",
      );
      return;
    }

    try {
      await completeOnboarding(toProfilePayload(values));
      await clearKnowledgeTestAttemptState();
      await knowledgeTest.resetKnowledgeTest();
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

  const stepManager = useOnboardingSteps({
    form,
    isKnowledgeTestLocked: knowledgeTest.isKnowledgeTestLocked,
    totalQuizQuestions: culturalKnowledgeQuestions.length,
    onSubmit: () => void onSubmit(),
  });

  if (!currentUser) {
    return <Redirect href="/auth/login" />;
  }

  const isNextDisabled =
    isCompleting ||
    (stepManager.activeStep.id === "quiz" &&
      (!knowledgeTest.attemptStateLoaded || knowledgeTest.isKnowledgeTestLocked));

  return (
    <Screen scroll={false} style={styles.screenContent}>
      <ScrollView
        contentContainerStyle={styles.flowContent}
        showsVerticalScrollIndicator={false}
      >
        <OnboardingHeader
          currentStep={stepManager.activeStepIndex + 1}
          totalSteps={onboardingSteps.length}
        />

        <OnboardingProgress progress={stepManager.stepProgress} />

        <OnboardingStepHeader
          eyebrow={stepManager.activeStep.eyebrow}
          title={stepManager.activeStep.title}
          description={stepManager.activeStep.description}
        />

        <OnboardingStepComponent
          stepId={stepManager.activeStep.id}
          activeQuizIndex={stepManager.activeQuizIndex}
          quizAnswers={knowledgeTest.quizAnswers}
          isKnowledgeTestLocked={knowledgeTest.isKnowledgeTestLocked}
          attemptStateLoaded={knowledgeTest.attemptStateLoaded}
          remainingAttempts={knowledgeTest.remainingAttempts}
          lockedUntil={knowledgeTest.lockedUntil}
          now={Date.now()}
          formatRemainingTime={knowledgeTest.formatRemainingTime}
          onAnswerQuestion={knowledgeTest.answerKnowledgeQuestion}
          form={form}
          selectedPhotoUri={selectedPhotoUri}
          imagePicker={imagePicker}
          formValues={formValues}
        />
      </ScrollView>

      <OnboardingActions
        onBack={stepManager.goBack}
        onNext={() => void stepManager.goNext()}
        backDisabled={stepManager.isFirstStep || isCompleting}
        nextDisabled={isNextDisabled}
        nextLoading={stepManager.isLastStep && isCompleting}
        nextLabel={stepManager.nextButtonLabel}
      />
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
  });
