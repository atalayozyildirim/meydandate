// Discover kartlarini, swipe aksiyonlarini ve match sonucunu yonetir.
import { useMemo } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { LikeAction, Match } from "@/domain/entities/Match";
import { calculateCulturalMatchScore } from "@/domain/services/CulturalMatchScoring";
import { useAuthStore } from "@/features/auth/stores/authStore";
import { container } from "@/infrastructure/config/Container";
import { queryKeys } from "@/shared/constants/queryKeys";

export const useDiscoverDeck = () => {
  const queryClient = useQueryClient();
  const currentUser = useAuthStore((state) => state.currentUser);

  const candidatesQuery = useQuery({
    queryKey: [queryKeys.discover, currentUser?.id],
    enabled: Boolean(currentUser),
    queryFn: () => container.userRepository.listDiscoverCandidates(currentUser?.id ?? "")
  });

  const specialInviteQuery = useQuery({
    queryKey: [queryKeys.specialInvite, currentUser?.id],
    enabled: Boolean(currentUser),
    queryFn: async () => {
      const userId = currentUser?.id ?? "";

      try {
        await container.matchRepository.claimSpecialInvite(userId);
      } catch {
        // Davet claim'i yardimci kontrol; Discover akisini bloke etmez.
      }

      return container.matchRepository.getPendingSpecialInvite(userId);
    }
  });

  const swipeMutation = useMutation({
    mutationFn: ({ targetUserId, action }: { targetUserId: string; action: LikeAction }) => {
      if (!currentUser) {
        throw new Error("Swipe icin oturum gerekli.");
      }

      return container.matchRepository.swipe(currentUser.id, targetUserId, action);
    },
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: [queryKeys.discover] }),
        queryClient.invalidateQueries({ queryKey: [queryKeys.matches] }),
        queryClient.invalidateQueries({ queryKey: [queryKeys.conversations] })
      ]);
    }
  });

  const acceptSpecialInviteMutation = useMutation({
    mutationFn: (inviteId: string) => {
      if (!currentUser) {
        throw new Error("Davet icin oturum gerekli.");
      }

      return container.matchRepository.acceptSpecialInvite(currentUser.id, inviteId);
    },
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: [queryKeys.specialInvite] }),
        queryClient.invalidateQueries({ queryKey: [queryKeys.discover] }),
        queryClient.invalidateQueries({ queryKey: [queryKeys.matches] }),
        queryClient.invalidateQueries({ queryKey: [queryKeys.conversations] })
      ]);
    }
  });

  const declineSpecialInviteMutation = useMutation({
    mutationFn: (inviteId: string) => {
      if (!currentUser) {
        throw new Error("Davet icin oturum gerekli.");
      }

      return container.matchRepository.declineSpecialInvite(currentUser.id, inviteId);
    },
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: [queryKeys.specialInvite] }),
        queryClient.invalidateQueries({ queryKey: [queryKeys.discover] })
      ]);
    }
  });

  const deck = useMemo(() => {
    if (!currentUser) {
      return [];
    }

    if (specialInviteQuery.data) {
      return [];
    }

    return (candidatesQuery.data ?? []).map((candidate) => ({
      user: candidate,
      compatibility: calculateCulturalMatchScore(currentUser, candidate)
    }));
  }, [candidatesQuery.data, currentUser, specialInviteQuery.data]);

  const swipe = async (targetUserId: string, action: LikeAction): Promise<Match | null> => {
    const result = await swipeMutation.mutateAsync({ targetUserId, action });
    return result.match ?? null;
  };

  return {
    deck,
    specialInvite: specialInviteQuery.data ?? null,
    isLoading: candidatesQuery.isLoading || specialInviteQuery.isLoading,
    isSwiping: swipeMutation.isPending,
    isHandlingSpecialInvite: acceptSpecialInviteMutation.isPending || declineSpecialInviteMutation.isPending,
    swipe,
    acceptSpecialInvite: acceptSpecialInviteMutation.mutateAsync,
    declineSpecialInvite: declineSpecialInviteMutation.mutateAsync
  };
};
