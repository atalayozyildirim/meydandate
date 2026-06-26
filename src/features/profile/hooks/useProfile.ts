// Profil verisini okur ve guncellemeleri auth store ile senkronize eder.
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { UserProfileUpdate } from "@/domain/entities/User";
import { useAuthStore } from "@/features/auth/stores/authStore";
import { moderateStrictTextFields } from "@/features/moderation/utils/strictTextModeration";
import { container } from "@/infrastructure/config/Container";
import { queryKeys } from "@/shared/constants/queryKeys";
import { invalidateProfileCaches } from "@/features/profile/utils/invalidateProfileCaches";

const profileTextFields = [
  { key: "name", label: "Profil adı" },
  { key: "city", label: "Şehir" },
  { key: "occupation", label: "Meslek" },
  { key: "bio", label: "Bio" },
  { key: "hometown", label: "Memleket" },
  { key: "favoriteSong", label: "Favori türkü" },
  { key: "favoritePoet", label: "Favori ozan" },
] satisfies Array<{ key: keyof UserProfileUpdate; label: string }>;

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
    mutationFn: async (update: UserProfileUpdate) => {
      if (!currentUser) {
        throw new Error("Profil guncellemek icin oturum gerekli.");
      }

      const moderatedUpdate = await moderateStrictTextFields({
        scope: "profile",
        userId: currentUser.id,
        payload: update,
        fields: profileTextFields,
      });

      return container.userRepository.updateProfile(currentUser.id, moderatedUpdate);
    },
    onSuccess: async (updatedUser, update) => {
      setCurrentUser(updatedUser);

      if (update.photos) {
        await invalidateProfileCaches(queryClient);
        return;
      }

      await queryClient.invalidateQueries({ queryKey: [queryKeys.profile] });
    },
  });

  return {
    profile: query.data ?? currentUser,
    isLoading: query.isLoading,
    updateProfile: updateMutation.mutateAsync,
    isUpdating: updateMutation.isPending
  };
};
