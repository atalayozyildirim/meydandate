// Bloklama, sikayet ve sessize alma aksiyonlarini tek hookta toplar.
import { useMutation, useQueryClient } from "@tanstack/react-query";
import type { ReportCategory } from "@/domain/entities/Match";
import { useAuthStore } from "@/features/auth/stores/authStore";
import { container } from "@/infrastructure/config/Container";
import { queryKeys } from "@/shared/constants/queryKeys";

export const useSafetyActions = () => {
  const queryClient = useQueryClient();
  const currentUser = useAuthStore((state) => state.currentUser);
  const setCurrentUser = useAuthStore((state) => state.setCurrentUser);

  const ensureUserId = () => {
    if (!currentUser) {
      throw new Error("Guvenlik aksiyonu icin oturum gerekli.");
    }

    return currentUser.id;
  };

  const reportMutation = useMutation({
    mutationFn: ({
      reportedUserId,
      category,
      description,
      evidence,
    }: {
      reportedUserId: string;
      category: ReportCategory;
      description?: string;
      evidence?: string[];
    }) =>
      container.userRepository.reportUser(ensureUserId(), {
        reportedUserId,
        category,
        description,
        evidence,
      })
  });

  const blockMutation = useMutation({
    mutationFn: async (blockedUserId: string) => {
      const userId = ensureUserId();
      await container.userRepository.blockUser(userId, blockedUserId);

      if (currentUser) {
        setCurrentUser({
          ...currentUser,
          blockedUsers: Array.from(new Set([...(currentUser.blockedUsers ?? []), blockedUserId])),
        });
      }

      await Promise.all([
        queryClient.invalidateQueries({ queryKey: [queryKeys.discover] }),
        queryClient.invalidateQueries({ queryKey: [queryKeys.profile, userId] }),
      ]);
    }
  });

  const muteMutation = useMutation({
    mutationFn: async (mutedUserId: string) => {
      const userId = ensureUserId();
      await container.userRepository.muteUser(userId, mutedUserId);

      if (currentUser) {
        setCurrentUser({
          ...currentUser,
          mutedUsers: Array.from(new Set([...(currentUser.mutedUsers ?? []), mutedUserId])),
        });
      }

      await queryClient.invalidateQueries({ queryKey: [queryKeys.profile, userId] });
      await queryClient.invalidateQueries({ queryKey: [queryKeys.discover] });
    }
  });

  return {
    reportUser: reportMutation.mutateAsync,
    blockUser: blockMutation.mutateAsync,
    muteUser: muteMutation.mutateAsync,
    isWorking: reportMutation.isPending || blockMutation.isPending || muteMutation.isPending
  };
};
