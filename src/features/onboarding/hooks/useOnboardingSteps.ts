import { useState } from "react";
import type { UseFormReturn } from "react-hook-form";
import type { OnboardingStepId } from "../types";
import { onboardingSteps, stepValidationFields } from "../constants";
import type { OnboardingFormValues } from "../schemas/onboardingSchema";

interface UseOnboardingStepsProps {
  form: UseFormReturn<OnboardingFormValues>;
  isKnowledgeTestLocked: boolean;
  totalQuizQuestions: number;
  onSubmit: () => void;
}

export const useOnboardingSteps = ({
  form,
  isKnowledgeTestLocked,
  totalQuizQuestions,
  onSubmit,
}: UseOnboardingStepsProps) => {
  const [activeStepIndex, setActiveStepIndex] = useState(0);
  const [activeQuizIndex, setActiveQuizIndex] = useState(0);

  const activeStep = onboardingSteps[activeStepIndex] ?? onboardingSteps[0];
  const isLastStep = activeStep.id === "review";
  const isFirstStep = activeStepIndex === 0;
  const isLastQuizQuestion = activeQuizIndex === totalQuizQuestions - 1;

  const stepProgress =
    activeStep.id === "quiz"
      ? (activeStepIndex +
          (activeQuizIndex + 1) / totalQuizQuestions) /
        onboardingSteps.length
      : (activeStepIndex + 1) / onboardingSteps.length;

  const validateStepFields = async (stepId: OnboardingStepId) => {
    const fields = stepValidationFields[stepId];

    if (fields.length === 0) {
      return true;
    }

    return form.trigger(fields);
  };

  const goBack = () => {
    if (activeStep.id === "quiz" && activeQuizIndex > 0) {
      setActiveQuizIndex((index) => Math.max(0, index - 1));
      return;
    }

    setActiveStepIndex((index) => Math.max(0, index - 1));
  };

  const goNext = async () => {
    if (activeStep.id === "quiz") {
      if (isKnowledgeTestLocked) {
        return false;
      }

      if (!isLastQuizQuestion) {
        setActiveQuizIndex((index) =>
          Math.min(totalQuizQuestions - 1, index + 1),
        );
        return true;
      }

      setActiveStepIndex((index) =>
        Math.min(onboardingSteps.length - 1, index + 1),
      );
      setActiveQuizIndex(0);
      return true;
    }

    if (isLastStep) {
      onSubmit();
      return true;
    }

    const isStepValid = await validateStepFields(activeStep.id);

    if (!isStepValid) {
      return false;
    }

    setActiveStepIndex((index) =>
      Math.min(onboardingSteps.length - 1, index + 1),
    );
    return true;
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

  return {
    activeStep,
    activeStepIndex,
    activeQuizIndex,
    stepProgress,
    isFirstStep,
    isLastStep,
    isLastQuizQuestion,
    nextButtonLabel,
    goBack,
    goNext,
    validateStepFields,
  };
};
