// Onay testini repository ve auth store ile koordine eder.
import { useMutation } from "@tanstack/react-query";
import { useAuthStore } from "@/features/auth/stores/authStore";
import { container } from "@/infrastructure/config/Container";

export const useApprovalTest = () => {
  const currentUser = useAuthStore((state) => state.currentUser);
  const setCurrentUser = useAuthStore((state) => state.setCurrentUser);

  const mutation = useMutation({
    mutationFn: async () => {
      if (!currentUser) {
        throw new Error("Onay testi icin oturum gerekli.");
      }

      return container.userRepository.updateProfile(currentUser.id, {
        hasPassedEntryTest: true,
      });
    },
    onSuccess: (updatedUser) => setCurrentUser(updatedUser),
  });

  return {
    completeApprovalTest: mutation.mutateAsync,
    isCompletingApproval: mutation.isPending,
  };
};
