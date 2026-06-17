// Kullanici eslesmelerini ve premium liked-me listesini React Query ile getirir.
import { useQuery } from "@tanstack/react-query";
import { useAuthStore } from "@/features/auth/stores/authStore";
import { container } from "@/infrastructure/config/Container";
import { queryKeys } from "@/shared/constants/queryKeys";

export const useMatches = () => {
  const currentUser = useAuthStore((state) => state.currentUser);

  const query = useQuery({
    queryKey: [queryKeys.matches, currentUser?.id],
    enabled: Boolean(currentUser),
    queryFn: () => container.matchRepository.listMatches(currentUser?.id ?? "")
  });

  return {
    matches: query.data ?? [],
    isLoading: query.isLoading
  };
};

export const useLikedMe = () => {
  const currentUser = useAuthStore((state) => state.currentUser);

  const query = useQuery({
    queryKey: [queryKeys.likedMe, currentUser?.id],
    enabled: Boolean(currentUser?.isPremium),
    queryFn: () => container.matchRepository.listLikedMe(currentUser?.id ?? ""),
  });

  return {
    likedMe: query.data ?? [],
    isLoading: query.isLoading,
    isError: query.isError,
    error: query.error,
    refetch: query.refetch,
  };
};
