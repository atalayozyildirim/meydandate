// Profil verisini okur ve guncellemeleri auth store ile senkronize eder.
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { UserProfileUpdate } from "@/domain/entities/User";
import { useAuthStore } from "@/features/auth/stores/authStore";
import { container } from "@/infrastructure/config/Container";
import { queryKeys } from "@/shared/constants/queryKeys";

export const useProfile = () => {
  const queryClient = useQueryClient();
  const currentUser = useAuthStore((state) => state.currentUser);
  const setCurrentUser = useAuthStore((state) => state.setCurrentUser);

  const query = useQuery({
    queryKey: [queryKeys.profile, currentUser?.id],
    enabled: Boolean(currentUser),
    queryFn: () => container.userRepository.getCurrentUser(currentUser?.id ?? "")
  });

  const updateMutation = useMutation({
    mutationFn: (update: UserProfileUpdate) => {
      if (!currentUser) {
        throw new Error("Profil guncellemek icin oturum gerekli.");
      }

      return container.userRepository.updateProfile(currentUser.id, update);
    },
    onSuccess: async (updatedUser) => {
      setCurrentUser(updatedUser);
      await queryClient.invalidateQueries({ queryKey: [queryKeys.profile] });
    }
  });

  return {
    profile: query.data ?? currentUser,
    isLoading: query.isLoading,
    updateProfile: updateMutation.mutateAsync,
    isUpdating: updateMutation.isPending
  };
};
