// Bloklama, sikayet ve sessize alma aksiyonlarini tek hookta toplar.
import { useMutation, useQueryClient } from "@tanstack/react-query";
import type { ReportCategory } from "@/domain/entities/Match";
import { useAuthStore } from "@/features/auth/stores/authStore";
import { container } from "@/infrastructure/config/Container";
import { queryKeys } from "@/shared/constants/queryKeys";

export const useSafetyActions = () => {
  const queryClient = useQueryClient();
  const currentUser = useAuthStore((state) => state.currentUser);

  const ensureUserId = () => {
    if (!currentUser) {
      throw new Error("Guvenlik aksiyonu icin oturum gerekli.");
    }

    return currentUser.id;
  };

  const reportMutation = useMutation({
    mutationFn: ({ reportedUserId, category }: { reportedUserId: string; category: ReportCategory }) =>
      container.userRepository.reportUser(ensureUserId(), { reportedUserId, category })
  });

  const blockMutation = useMutation({
    mutationFn: async (blockedUserId: string) => {
      await container.userRepository.blockUser(ensureUserId(), blockedUserId);
      await queryClient.invalidateQueries({ queryKey: [queryKeys.discover] });
    }
  });

  const muteMutation = useMutation({
    mutationFn: (mutedUserId: string) => container.userRepository.muteUser(ensureUserId(), mutedUserId)
  });

  return {
    reportUser: reportMutation.mutateAsync,
    blockUser: blockMutation.mutateAsync,
    muteUser: muteMutation.mutateAsync,
    isWorking: reportMutation.isPending || blockMutation.isPending || muteMutation.isPending
  };
};
