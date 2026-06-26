import { View, Text, Pressable } from "react-native";
import { useTheme } from "@/shared/theme";
import { culturalKnowledgeQuestions } from "../hooks/useKnowledgeTest";

interface QuizStepProps {
  activeQuizIndex: number;
  quizAnswers: Record<string, string>;
  isKnowledgeTestLocked: boolean;
  attemptStateLoaded: boolean;
  remainingAttempts: number;
  lockedUntil: number | null;
  now: number;
  formatRemainingTime: (ms: number) => string;
  onAnswerQuestion: (
    questionId: string,
    option: (typeof culturalKnowledgeQuestions)[number]["options"][number],
  ) => void;
}

export const QuizStep = ({
  activeQuizIndex,
  quizAnswers,
  isKnowledgeTestLocked,
  attemptStateLoaded,
  remainingAttempts,
  lockedUntil,
  now,
  formatRemainingTime,
  onAnswerQuestion,
}: QuizStepProps) => {
  const theme = useTheme();
  const styles = createStyles(theme);

  const activeQuizQuestion = culturalKnowledgeQuestions[activeQuizIndex];
  const activeQuizAnswer = activeQuizQuestion
    ? quizAnswers[activeQuizQuestion.id]
    : undefined;
  const hasPassedKnowledgeTest = culturalKnowledgeQuestions.every(
    (question) => Boolean(quizAnswers[question.id]),
  );
  const answeredKnowledgeQuestionCount = Object.keys(quizAnswers).length;

  if (!activeQuizQuestion) {
    return null;
  }

  return (
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
              onPress={() => onAnswerQuestion(activeQuizQuestion.id, option)}
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
  );
};

const createStyles = (theme: ReturnType<typeof useTheme>) => ({
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
  } as const,
  quizHeader: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    justifyContent: "space-between" as const,
    gap: theme.spacing.md,
  } as const,
  quizTitleBlock: {
    flex: 1,
    gap: theme.spacing.xxs,
  } as const,
  kicker: {
    ...theme.typography.caption,
    color: theme.colors.primary,
    textTransform: "uppercase" as const,
  } as const,
  sectionTitle: {
    ...theme.typography.subheading,
    color: theme.colors.text,
  } as const,
  quizDots: {
    flexDirection: "row" as const,
    gap: theme.spacing.xs,
  } as const,
  quizDot: {
    flex: 1,
    height: 5,
    borderRadius: theme.radius.pill,
    backgroundColor: theme.colors.border,
  } as const,
  quizDotActive: {
    backgroundColor: theme.colors.muted,
  } as const,
  quizDotDone: {
    backgroundColor: theme.colors.primary,
  } as const,
  scoreBadge: {
    minWidth: 64,
    height: 46,
    borderRadius: theme.radius.pill,
    alignItems: "center" as const,
    justifyContent: "center" as const,
    backgroundColor: theme.isDark ? "#151515" : theme.colors.elevated,
    borderWidth: 1,
    borderColor: theme.colors.border,
  } as const,
  scoreBadgePassed: {
    backgroundColor: theme.colors.success,
    borderColor: theme.colors.success,
  } as const,
  scoreText: {
    ...theme.typography.subheading,
    color: theme.colors.text,
  } as const,
  scoreTextPassed: {
    color: theme.isDark ? "#052E16" : "#FFFFFF",
  } as const,
  quizStatus: {
    ...theme.typography.caption,
    color: theme.colors.muted,
  } as const,
  quizStatusLocked: {
    color: theme.colors.danger,
    fontWeight: "700" as const,
  } as const,
  quizOptions: {
    gap: theme.spacing.xs,
  } as const,
  quizOption: {
    minHeight: 52,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: theme.colors.border,
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.sm,
    justifyContent: "center" as const,
    backgroundColor: theme.isDark ? "#101010" : "#FAFAFA",
  } as const,
  quizOptionSelected: {
    borderColor: theme.colors.text,
    backgroundColor: theme.colors.text,
  } as const,
  quizOptionDisabled: {
    opacity: 0.5,
  } as const,
  quizOptionText: {
    ...theme.typography.body,
    color: theme.colors.text,
    flexShrink: 1,
  } as const,
  quizOptionTextSelected: {
    color: theme.colors.background,
    fontWeight: "700" as const,
  } as const,
  pressed: {
    opacity: 0.82,
  } as const,
});
