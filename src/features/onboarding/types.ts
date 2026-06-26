export type OnboardingStepId =
  | "intro"
  | "quiz"
  | "culture"
  | "interests"
  | "profile"
  | "details"
  | "review";

export interface OnboardingStep {
  id: OnboardingStepId;
  eyebrow: string;
  title: string;
  description: string;
}

export interface KnowledgeTestAttemptState {
  failedAttempts: number;
  lockedUntil?: number;
}

export interface QuizAnswer {
  questionId: string;
  optionId: string;
}
