import { useEffect, useState } from "react";
import { Alert } from "react-native";
import { culturalKnowledgeQuestions as aleviQuestions } from "@/shared/constants/alevi";
import type { KnowledgeTestAttemptState } from "../types";
import {
  MAX_KNOWLEDGE_TEST_ATTEMPTS,
  KNOWLEDGE_TEST_LOCK_DURATION_MS,
} from "../constants";
import {
  formatRemainingTime,
  clearKnowledgeTestAttemptState,
  saveKnowledgeTestAttemptState,
  loadKnowledgeTestAttemptState,
} from "../utils/knowledgeTestUtils";

const getRandomQuestions = (
  questions: typeof aleviQuestions,
  count: number,
) => {
  const shuffled = [...questions].sort(() => 0.5 - Math.random());
  return shuffled.slice(0, count);
};

export const culturalKnowledgeQuestions = getRandomQuestions(aleviQuestions, 5);

export const useKnowledgeTest = () => {
  const [quizAnswers, setQuizAnswers] = useState<Record<string, string>>({});
  const [failedAttempts, setFailedAttempts] = useState(0);
  const [lockedUntil, setLockedUntil] = useState<number | null>(null);
  const [attemptStateLoaded, setAttemptStateLoaded] = useState(false);
  const [now, setNow] = useState(Date.now());

  const isKnowledgeTestLocked = lockedUntil !== null && lockedUntil > now;
  const remainingAttempts = Math.max(
    0,
    MAX_KNOWLEDGE_TEST_ATTEMPTS - failedAttempts,
  );
  const hasPassedKnowledgeTest = culturalKnowledgeQuestions.every((question) =>
    Boolean(quizAnswers[question.id]),
  );
  const answeredKnowledgeQuestionCount = Object.keys(quizAnswers).length;

  useEffect(() => {
    let isMounted = true;

    const loadAttemptState = async () => {
      try {
        const parsedState = await loadKnowledgeTestAttemptState();

        if (!parsedState) {
          setAttemptStateLoaded(true);
          return;
        }

        const parsedLockedUntil =
          typeof parsedState.lockedUntil === "number"
            ? parsedState.lockedUntil
            : null;

        if (parsedLockedUntil && parsedLockedUntil > Date.now()) {
          if (isMounted) {
            setFailedAttempts(MAX_KNOWLEDGE_TEST_ATTEMPTS);
            setLockedUntil(parsedLockedUntil);
          }
          setAttemptStateLoaded(true);
          return;
        }

        if (parsedLockedUntil) {
          await clearKnowledgeTestAttemptState();
          setAttemptStateLoaded(true);
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
          "Beş deneme hakkını kullandın. 15 dakika sonra tekrar deneyebilirsin.",
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

  const resetKnowledgeTest = async () => {
    await clearKnowledgeTestAttemptState();
    setQuizAnswers({});
    setFailedAttempts(0);
    setLockedUntil(null);
  };

  return {
    quizAnswers,
    failedAttempts,
    lockedUntil,
    attemptStateLoaded,
    isKnowledgeTestLocked,
    remainingAttempts,
    hasPassedKnowledgeTest,
    answeredKnowledgeQuestionCount,
    answerKnowledgeQuestion,
    resetKnowledgeTest,
    formatRemainingTime,
  };
};
