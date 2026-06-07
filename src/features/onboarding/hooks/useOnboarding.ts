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

      const updatedUser = await container.userRepository.completeOnboarding(currentUser.id, profile);

      try {
        await container.matchRepository.claimSpecialInvite(updatedUser.id);
      } catch {
        // Davet kontrolü yardımcı bir akıştır; onboarding sonucunu bloke etmez.
      }

      return updatedUser;
    },
    onSuccess: (updatedUser) => setCurrentUser(updatedUser)
  });

  return {
    completeOnboarding: mutation.mutateAsync,
    isCompleting: mutation.isPending
  };
};
