import type { OnboardingStepId } from "../types";
import { IntroStep } from "./IntroStep";
import { QuizStep } from "./QuizStep";
import { CultureStep } from "./CultureStep";
import { InterestsStep } from "./InterestsStep";
import { ProfileStep } from "./ProfileStep";
import { DetailsStep } from "./DetailsStep";
import { ReviewStep } from "./ReviewStep";

interface OnboardingStepProps {
  stepId: OnboardingStepId;
  // Quiz step props
  activeQuizIndex?: number;
  quizAnswers?: Record<string, string>;
  isKnowledgeTestLocked?: boolean;
  attemptStateLoaded?: boolean;
  remainingAttempts?: number;
  lockedUntil?: number | null;
  now?: number;
  formatRemainingTime?: (ms: number) => string;
  onAnswerQuestion?: (
    questionId: string,
    option: any,
  ) => void;
  // Form step props
  form?: any;
  selectedPhotoUri?: string;
  imagePicker?: {
    isPicking: boolean;
    pickImageAsset: (options?: {
      allowsEditing?: boolean;
      aspect?: [number, number];
      base64?: boolean;
      quality?: number;
    }) => Promise<{ uri: string; mimeType?: string } | null>;
  };
  // Review step props
  formValues?: any;
}

export const OnboardingStep = (props: OnboardingStepProps) => {
  switch (props.stepId) {
    case "intro":
      return <IntroStep />;

    case "quiz":
      return (
        <QuizStep
          activeQuizIndex={props.activeQuizIndex ?? 0}
          quizAnswers={props.quizAnswers ?? {}}
          isKnowledgeTestLocked={props.isKnowledgeTestLocked ?? false}
          attemptStateLoaded={props.attemptStateLoaded ?? false}
          remainingAttempts={props.remainingAttempts ?? 0}
          lockedUntil={props.lockedUntil ?? null}
          now={props.now ?? Date.now()}
          formatRemainingTime={props.formatRemainingTime ?? (() => "")}
          onAnswerQuestion={props.onAnswerQuestion ?? (() => {})}
        />
      );

    case "culture":
      return <CultureStep form={props.form} />;

    case "interests":
      return <InterestsStep form={props.form} />;

    case "profile":
      return (
        <ProfileStep
          form={props.form}
          selectedPhotoUri={props.selectedPhotoUri ?? ""}
          imagePicker={props.imagePicker!}
        />
      );

    case "details":
      return <DetailsStep form={props.form} />;

    case "review":
      return (
        <ReviewStep
          formValues={props.formValues}
          selectedPhotoUri={props.selectedPhotoUri ?? ""}
        />
      );

    default:
      return null;
  }
};
