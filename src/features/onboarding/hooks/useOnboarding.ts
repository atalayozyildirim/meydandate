// Onboarding tamamlamayi repository ve auth store ile koordine eder.
import { useMutation } from "@tanstack/react-query";
import type { OnboardingProfile } from "@/domain/repositories/UserRepository";
import { useAuthStore } from "@/features/auth/stores/authStore";
import { container } from "@/infrastructure/config/Container";

export const useOnboarding = () => {
  const currentUser = useAuthStore((state) => state.currentUser);
  const setCurrentUser = useAuthStore((state) => state.setCurrentUser);

  const mutation = useMutation({
    mutationFn: async (profile: OnboardingProfile) => {
      if (!currentUser) {
        throw new Error("Onboarding icin oturum gerekli.");
      }

      return container.userRepository.completeOnboarding(currentUser.id, profile);
    },
    onSuccess: (updatedUser) => setCurrentUser(updatedUser)
  });

  return {
    completeOnboarding: mutation.mutateAsync,
    isCompleting: mutation.isPending
  };
};
