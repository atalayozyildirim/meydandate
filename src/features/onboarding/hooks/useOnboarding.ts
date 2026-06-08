// Onboarding tamamlamayi repository ve auth store ile koordine eder.
import { useMutation } from "@tanstack/react-query";
import type { OnboardingProfile } from "@/domain/repositories/UserRepository";
import { useAuthStore } from "@/features/auth/stores/authStore";
import { moderateStrictTextFields } from "@/features/moderation/utils/strictTextModeration";
import { container } from "@/infrastructure/config/Container";

const onboardingTextFields = [
  { key: "name", label: "Profil adı" },
  { key: "city", label: "Şehir" },
  { key: "occupation", label: "Meslek" },
  { key: "bio", label: "Bio" },
  { key: "hometown", label: "Memleket" },
  { key: "favoriteSong", label: "Favori türkü" },
  { key: "favoritePoet", label: "Favori ozan" },
] satisfies Array<{ key: keyof OnboardingProfile; label: string }>;

export const useOnboarding = () => {
  const currentUser = useAuthStore((state) => state.currentUser);
  const setCurrentUser = useAuthStore((state) => state.setCurrentUser);

  const mutation = useMutation({
    mutationFn: async (profile: OnboardingProfile) => {
      if (!currentUser) {
        throw new Error("Onboarding icin oturum gerekli.");
      }

      const moderatedProfile = await moderateStrictTextFields({
        scope: "onboarding",
        userId: currentUser.id,
        payload: profile,
        fields: onboardingTextFields,
      });

      const updatedUser = await container.userRepository.completeOnboarding(currentUser.id, moderatedProfile);

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
