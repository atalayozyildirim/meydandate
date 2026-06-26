import { useQuery } from "@tanstack/react-query";
import { container } from "@/infrastructure/config/Container";
import { queryKeys } from "@/shared/constants/queryKeys";

export const useFireLeaderboard = (limit = 5) => {
  const query = useQuery({
    queryKey: [queryKeys.fireLeaderboard, limit],
    retry: false,
    queryFn: () => container.userRepository.listFireLeaderboard(limit),
  });

  return {
    leaders: query.data ?? [],
    isLoading: query.isLoading,
    isRefreshing: query.isRefetching,
    error: query.error,
    refresh: query.refetch,
  };
};
