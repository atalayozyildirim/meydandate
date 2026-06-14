// Gorev rozetlerini Supabase RPC uzerinden kazanmayi yonetir.
import { useMutation, useQueryClient } from "@tanstack/react-query";
import type { Badge } from "@/domain/entities/User";
import { useAuthStore } from "@/features/auth/stores/authStore";
import { container } from "@/infrastructure/config/Container";
import { queryKeys } from "@/shared/constants/queryKeys";

export const useBadges = () => {
  const queryClient = useQueryClient();
  const currentUser = useAuthStore((state) => state.currentUser);
  const setCurrentUser = useAuthStore((state) => state.setCurrentUser);

  const claimTaskBadgeMutation = useMutation({
    mutationFn: (badge: Badge) => {
      if (!currentUser) {
        throw new Error("Rozet kazanmak için oturum gerekli.");
      }

      return container.userRepository.claimTaskBadge(currentUser.id, badge);
    },
    onSuccess: async (updatedUser) => {
      setCurrentUser(updatedUser);
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: [queryKeys.profile] }),
        queryClient.invalidateQueries({ queryKey: [queryKeys.publicProfile] }),
      ]);
    },
  });

  return {
    claimTaskBadge: claimTaskBadgeMutation.mutateAsync,
    isClaimingTaskBadge: claimTaskBadgeMutation.isPending,
  };
};
