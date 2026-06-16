// Discover kartlarini, swipe aksiyonlarini ve match sonucunu yonetir.
import { useCallback, useEffect, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { LikeAction, Match } from "@/domain/entities/Match";
import type { User } from "@/domain/entities/User";
import { calculateCulturalMatchScore } from "@/domain/services/CulturalMatchScoring";
import { useAuthStore } from "@/features/auth/stores/authStore";
import { container } from "@/infrastructure/config/Container";
import { queryKeys } from "@/shared/constants/queryKeys";

export const useDiscoverDeck = () => {
  const queryClient = useQueryClient();
  const currentUser = useAuthStore((state) => state.currentUser);
  const [dismissedCandidateIds, setDismissedCandidateIds] = useState<Set<string>>(
    () => new Set(),
  );

  const candidatesQuery = useQuery({
    queryKey: [queryKeys.discover, currentUser?.id],
    enabled: Boolean(currentUser),
    retry: false,
    queryFn: async () => {
      try {
        return await container.userRepository.listDiscoverCandidates(currentUser?.id ?? "");
      } catch {
        return [];
      }
    }
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
    onSuccess: async (_result, variables) => {
      queryClient.setQueryData<User[] | undefined>(
        [queryKeys.discover, currentUser?.id],
        (currentCandidates) =>
          currentCandidates?.filter(
            (candidate) => candidate.id !== variables.targetUserId,
          ) ?? currentCandidates,
      );
      void Promise.all([
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

    return (candidatesQuery.data ?? [])
      .filter(
        (candidate) =>
          !currentUser.blockedUsers?.includes(candidate.id) &&
          !currentUser.mutedUsers?.includes(candidate.id),
      )
      .filter((candidate) => !dismissedCandidateIds.has(candidate.id))
      .map((candidate) => ({
        user: candidate,
        compatibility: calculateCulturalMatchScore(currentUser, candidate)
      }));
  }, [
    candidatesQuery.data,
    currentUser,
    dismissedCandidateIds,
    specialInviteQuery.data,
  ]);

  useEffect(() => {
    const candidateIds = new Set((candidatesQuery.data ?? []).map((item) => item.id));

    setDismissedCandidateIds((current) => {
      const next = new Set(
        [...current].filter((candidateId) => candidateIds.has(candidateId)),
      );
      const isSame =
        next.size === current.size &&
        [...next].every((candidateId) => current.has(candidateId));

      return isSame ? current : next;
    });
  }, [candidatesQuery.data]);

  const dismissCandidate = useCallback((targetUserId: string) => {
    setDismissedCandidateIds((current) => {
      if (current.has(targetUserId)) {
        return current;
      }

      const next = new Set(current);
      next.add(targetUserId);
      return next;
    });
  }, []);

  const restoreCandidate = useCallback((targetUserId: string) => {
    setDismissedCandidateIds((current) => {
      if (!current.has(targetUserId)) {
        return current;
      }

      const next = new Set(current);
      next.delete(targetUserId);
      return next;
    });
  }, []);

  const swipe = async (targetUserId: string, action: LikeAction): Promise<Match | null> => {
    const result = await swipeMutation.mutateAsync({ targetUserId, action });
    return result.match ?? null;
  };

  return {
    deck,
    specialInvite: specialInviteQuery.data ?? null,
    isLoading: candidatesQuery.isLoading || specialInviteQuery.isLoading,
    isRefreshing: candidatesQuery.isFetching || specialInviteQuery.isFetching,
    isSwiping: swipeMutation.isPending,
    isHandlingSpecialInvite: acceptSpecialInviteMutation.isPending || declineSpecialInviteMutation.isPending,
    dismissCandidate,
    restoreCandidate,
    swipe,
    refresh: async () => {
      await Promise.all([
        candidatesQuery.refetch(),
        specialInviteQuery.refetch(),
      ]);
    },
    acceptSpecialInvite: acceptSpecialInviteMutation.mutateAsync,
    declineSpecialInvite: declineSpecialInviteMutation.mutateAsync
  };
};
